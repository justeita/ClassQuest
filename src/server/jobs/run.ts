/**
 * Job runner generasi cerita: ekstraksi PDF → pipeline AI → simpan versi.
 *
 * Kontrak: `docs/06-backend/jobs-and-limits.md` (siklus job, stage/progress,
 * `error_code`), `docs/03-ai-pipeline/pipeline.md` (tahapan dan fallback),
 * `docs/01-architecture/data-flow.md` (bentuk `Job`), dan
 * `docs/06-backend/persistence.md` (kolom `jobs`, `stories`, `story_versions`).
 *
 * Pembagian tanggung jawab:
 *
 * - `runJob()` melakukan **seluruh** pekerjaan dan tidak pernah melempar.
 *   Semua ketergantungan (provider, jam, database) bisa di-inject lewat `deps`
 *   supaya bisa dites tanpa jaringan dan tanpa provider nyata.
 * - `scheduleJob()` (`./schedule.ts`) hanya membungkus `runJob()` dengan
 *   `after()` dari `next/server`.
 *
 * Janji yang dipegang:
 *
 * - **PDF hanya di memori.** Bytes dioper dari route ke runner di invocation
 *   yang sama; tidak ada penulisan disk, bucket, atau kolom database. Setelah
 *   ekstraksi, referensi ke bytes dilepas.
 * - **Teks PDF tidak bocor.** Teks tidak di-log, tidak masuk pesan error, dan
 *   tidak masuk kolom database selain `story_versions.story` (hasil pipeline).
 * - **Tidak ada job yang tertinggal di `running`.** Error apa pun berakhir
 *   `failed` dengan `error_code` dari tabel kontrak.
 * - **Satu transaksi untuk versi + status story.**
 */

import type { Client } from "@libsql/client";

import { createLlmProvider } from "@/ai/factory";
import {
  generateStory,
  STAGE_PROGRESS,
  type GenerateStoryResult,
  type JobStage,
  type PipelineMeta,
  type ProgressEvent,
} from "@/ai/pipeline";
import { PROMPT_VERSION } from "@/ai/prompt";
import type { LlmProvider } from "@/ai/provider";
import { toAssetManifest } from "@/assets/manifest";
import { loadAiConfig } from "@/server/config";
import { getReadyDb } from "@/server/db";
import {
  extractPdfText,
  type PdfTextExtraction,
} from "@/server/pdf/extract-text";
import { PdfExtractError } from "@/server/pdf/errors";
import { validateStory } from "@/story/validate";

/* -------------------------------------------------------------------------- */
/* Kode error job                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Kode yang boleh muncul di kolom `jobs.error_code`.
 *
 * Tiga kode pertama berasal dari `PdfExtractError` (`api-contract.md`).
 * `INTERNAL` adalah kode generik untuk kesalahan tak terduga; kontrak menulis
 * `INTERNAL` (HTTP 500) dan task menyebut `INTERNAL_ERROR` — lihat laporan.
 */
export const JOB_ERROR_CODES = [
  "PDF_UNREADABLE",
  "TOO_MANY_PAGES",
  "NO_TEXT_LAYER",
  "INTERNAL",
] as const;

export type JobErrorCode = (typeof JOB_ERROR_CODES)[number];

/** Pesan statis per kode; tidak pernah memuat isi PDF atau pesan runtime. */
export const JOB_ERROR_MESSAGES: Record<JobErrorCode, string> = {
  PDF_UNREADABLE:
    "File PDF tidak bisa dibaca. Coba simpan ulang file lalu unggah lagi.",
  TOO_MANY_PAGES:
    "PDF melebihi batas 40 halaman. Pilih bagian materi yang lebih pendek.",
  NO_TEXT_LAYER:
    "PDF ini sepertinya hasil scan, jadi teksnya tidak bisa dibaca.",
  INTERNAL: "Terjadi kesalahan internal. Coba lagi beberapa saat lagi.",
};

/* -------------------------------------------------------------------------- */
/* Bentuk masukan dan hasil                                                   */
/* -------------------------------------------------------------------------- */

/** Input yang diterima route upload. Bytes PDF hanya hidup di memori. */
export type RunJobInput = {
  jobId: string;
  storyId: string;
  pdf: {
    bytes: Uint8Array;
    filename: string;
    sizeBytes: number;
  };
  /** Nada cerita dari form upload; diteruskan ke prompt dan `Story.meta`. */
  tone?: string;
};

/** Ketergantungan yang bisa di-inject di test. */
export type RunJobDeps = {
  /** Provider LLM. Bawaan: `createLlmProvider(loadAiConfig())`. */
  provider?: LlmProvider;
  /** Jam untuk `started_at`/`finished_at`. Bawaan `Date.now`. */
  now?: () => number;
  /** Database yang sudah dimigrasi. Bawaan `getReadyDb()`. */
  db?: Client;
  /** Ekstraksi PDF. Bawaan `extractPdfText`. */
  extract?: (bytes: Uint8Array) => Promise<PdfTextExtraction>;
};

export type RunJobResult =
  | { status: "succeeded"; usedFallback: boolean; version: number }
  | { status: "failed"; errorCode: JobErrorCode };

/* -------------------------------------------------------------------------- */
/* Baris database                                                             */
/* -------------------------------------------------------------------------- */

type StoryRow = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  language: string;
  source_file_name: string;
};

const readStory = async (db: Client, storyId: string): Promise<StoryRow> => {
  const result = await db.execute({
    sql: `select id, title, subject, grade_level, language, source_file_name
          from stories where id = ?`,
    args: [storyId],
  });

  const row = result.rows[0];
  if (row === undefined) {
    throw new Error("story tidak ditemukan");
  }

  return {
    id: String(row.id),
    title: String(row.title),
    subject: String(row.subject),
    grade_level: String(row.grade_level),
    language: String(row.language),
    source_file_name: String(row.source_file_name),
  };
};

const isoOf = (ms: number): string => new Date(ms).toISOString();

/* -------------------------------------------------------------------------- */
/* Penulisan status                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Tulis progres job dengan penjaga monoton.
 *
 * `progress` hanya boleh naik, dan status akhir (`done`/`failed`) tidak boleh
 * ditimpa. Penjaga ini ada di SQL, bukan di kode, karena tulisan progres
 * dikirim lewat jaringan (Turso HTTP) dan **tidak dijamin berurutan**: request
 * `validating` bisa sampai di database setelah `done`. Tanpa penjaga, baris job
 * berakhir di `validating` (75%) walaupun cerita sudah tersimpan, dan kartu
 * progres di `/guru/materi/[storyId]` berhenti selamanya di langkah
 * "Memeriksa hasil".
 *
 * `<=` (bukan `<`) karena `validating` dan `repairing` sama-sama 75.
 *
 * Diekspor untuk tes penjaga; bukan bagian dari API publik modul ini.
 */
export const updateStage = async (
  db: Client,
  jobId: string,
  stage: JobStage,
  message: string | null = null,
): Promise<void> => {
  const progress = STAGE_PROGRESS[stage];

  await db.execute({
    sql: `update jobs
             set stage = ?, progress = ?, message = ?
           where id = ?
             and stage not in ('done', 'failed')
             and progress <= ?`,
    args: [stage, progress, message, jobId, progress],
  });
};

const markFailed = async (
  db: Client,
  jobId: string,
  storyId: string,
  errorCode: JobErrorCode,
  finishedAt: number,
): Promise<void> => {
  await db.execute({
    sql: `update jobs
          set stage = 'failed', progress = ?, error_code = ?, message = ?,
              finished_at = ?
          where id = ?`,
    args: [
      STAGE_PROGRESS.failed,
      errorCode,
      JOB_ERROR_MESSAGES[errorCode],
      isoOf(finishedAt),
      jobId,
    ],
  });

  // Story yang gagal tidak boleh tetap `processing` (persistence.md: siklus
  // status `processing → failed`).
  await db.execute({
    sql: "update stories set status = 'failed', updated_at = ? where id = ?",
    args: [isoOf(finishedAt), storyId],
  });
};

/* -------------------------------------------------------------------------- */
/* Runner                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Jalankan satu job sampai selesai atau gagal. Tidak pernah melempar.
 *
 * Urutan: `extracting` → `outlining`/`generating`/`validating`/`repairing`
 * (dari callback pipeline) → `saving` → `done`, atau `failed` di titik mana pun.
 */
export async function runJob(
  input: RunJobInput,
  deps: RunJobDeps = {},
): Promise<RunJobResult> {
  const now = deps.now ?? Date.now;
  const startedAt = now();

  let db: Client | null = null;

  /**
   * Antrean penulisan progres. Semua update stage lewat sini supaya tidak ada
   * dua request yang berjalan bersamaan dan berakhir tidak berurutan.
   */
  let progressQueue: Promise<void> = Promise.resolve();

  const flushProgress = async (): Promise<void> => {
    try {
      await progressQueue;
    } catch {
      // Kegagalan menulis progres tidak menggagalkan job; status akhir tetap
      // ditulis setelah ini.
    }
  };

  try {
    db = deps.db ?? (await getReadyDb());

    // a. Tandai job berjalan dan baca metadata story.
    await updateStage(db, input.jobId, "extracting", "Membaca teks PDF");
    await db.execute({
      sql: "update jobs set started_at = ? where id = ?",
      args: [isoOf(startedAt), input.jobId],
    });
    const story = await readStory(db, input.storyId);

    // b. Ekstraksi. Bytes hanya dipakai di sini lalu referensinya dilepas.
    const extract = deps.extract ?? extractPdfText;
    const extraction = await extract(input.pdf.bytes);
    input.pdf.bytes = new Uint8Array(0);

    await db.execute({
      sql: "update stories set source_page_count = ?, updated_at = ? where id = ?",
      args: [extraction.pageCount, isoOf(now()), input.storyId],
    });

    // c. Pipeline. Provider dari factory berdasarkan config (mock bila kosong).
    const aiConfig = loadAiConfig();
    const provider = deps.provider ?? createLlmProvider(aiConfig);
    const meta: PipelineMeta = {
      id: story.id,
      fileName: story.source_file_name || input.pdf.filename,
      pageCount: extraction.pageCount,
      title: story.title,
      subject: story.subject,
      gradeLevel: story.grade_level,
      language: story.language,
      ...(input.tone === undefined ? {} : { tone: input.tone }),
    };

    // Progres ditulis berurutan, bukan fire-and-forget.
    //
    // Pipeline memanggil `onProgress` secara sinkron saat berpindah tahap.
    // Kalau tiap update dilepas tanpa `await`, request ke database bisa saling
    // menyusul (terutama lewat Turso HTTP), sehingga `validating` bisa mendarat
    // setelah `done`. Antrean di bawah menjamin urutan; penjaga monoton di
    // `updateStage()` menjadi jaring pengaman lapis kedua.
    const onProgress = (event: ProgressEvent) => {
      // `done` milik runner, bukan pipeline: pipeline memancarkannya sebelum
      // versi cerita benar-benar tersimpan. Kalau ditulis di sini, UI berhenti
      // polling dan me-refresh halaman saat cerita masih `processing`, lalu
      // kartu progres tidak pernah memeriksa status lagi.
      if (event.stage === "done") return;

      progressQueue = progressQueue.then(
        () => updateStage(db as Client, input.jobId, event.stage),
        () => updateStage(db as Client, input.jobId, event.stage),
      );
      return progressQueue.catch(() => {});
    };

    const result: GenerateStoryResult = await generateStory({
      provider,
      pages: extraction.pages.map((page) => page.text),
      manifest: toAssetManifest(),
      meta,
      branching: aiConfig.branching,
      onProgress,
    });

    // Tunggu antrean progres selesai sebelum status akhir ditulis, supaya
    // `done` tidak pernah didahului tulisan tahap yang masih di jalan.
    await flushProgress();

    // d. Simpan versi 1 + ubah status story dalam satu transaksi.
    const version = await saveVersion(db, input.storyId, result, now());

    // e. Job selesai. Saat fallback, simpan alasannya di `jobs.log` supaya
    // guru/operator bisa melihat kenapa cerita cadangan yang dipakai (kode
    // validasi saja, tanpa teks materi).
    await db.execute({
      sql: `update jobs
            set stage = 'done', progress = ?, message = ?, finished_at = ?, log = ?
            where id = ?`,
      args: [
        STAGE_PROGRESS.done,
        result.usedFallback ? "Selesai dengan cerita cadangan" : "Selesai",
        isoOf(now()),
        result.usedFallback ? JSON.stringify(fallbackLog(result)) : null,
        input.jobId,
      ],
    });

    return { status: "succeeded", usedFallback: result.usedFallback, version };
  } catch (error) {
    const errorCode: JobErrorCode =
      error instanceof PdfExtractError ? error.code : "INTERNAL";

    // Bila database sendiri yang gagal, percobaan menulis status juga gagal;
    // jangan sampai error itu menjadi unhandled rejection.
    if (db !== null) {
      try {
        // Tulisan progres yang masih di jalan diselesaikan dulu; kalau tidak,
        // tulisan itu bisa mendarat setelah `failed` dan menutupi kegagalan.
        await flushProgress();
        await markFailed(db, input.jobId, input.storyId, errorCode, now());
      } catch {
        // Tidak ada yang bisa dilakukan lagi; job tetap tidak "running" bila
        // database bisa dihubungi lagi (lihat catatan di laporan).
      }
    }

    return { status: "failed", errorCode };
  } finally {
    // Lepas referensi bytes apa pun yang tersisa.
    input.pdf.bytes = new Uint8Array(0);
  }
}

/**
 * Isi `jobs.log` saat fallback: alasan + statistik + kode validasi.
 *
 * Hanya kode/path dan angka — tidak ada teks materi, nama file, atau isi cerita.
 * `docs/06-backend/jobs-and-limits.md` memang menaruh log job JSON di kolom ini.
 */
const fallbackLog = (result: GenerateStoryResult) => ({
  promptVersion: PROMPT_VERSION,
  fallbackReason: result.reason,
  llmCalls: result.stats.llmCalls,
  repairs: result.stats.repairs,
  durationMs: result.stats.durationMs,
  diagnostics: result.diagnostics,
});

/**
 * Tulis `story_versions` versi 1 dan ubah status story dalam satu transaksi.
 *
 * Status story: `draft` bila cerita valid (persistence.md: `processing → draft`
 * saat generasi sukses), `failed` bila hasil pipeline tidak lolos validator.
 */
const saveVersion = async (
  db: Client,
  storyId: string,
  result: GenerateStoryResult,
  finishedAt: number,
): Promise<number> => {
  const check = validateStory(result.story, {
    manifest: toAssetManifest(),
    pageCount: result.story.source.pageCount,
  });

  const tx = await db.transaction("write");

  try {
    const existing = await tx.execute({
      sql: "select coalesce(max(version), 0) as latest from story_versions where story_id = ?",
      args: [storyId],
    });
    const version = Number(existing.rows[0]?.latest ?? 0) + 1;

    await tx.execute({
      sql: `insert into story_versions
              (story_id, version, story, created_by, created_at, prompt_version, used_fallback)
            values (?, ?, ?, 'system', ?, ?, ?)`,
      args: [
        storyId,
        version,
        JSON.stringify(result.story),
        isoOf(finishedAt),
        PROMPT_VERSION,
        result.usedFallback ? 1 : 0,
      ],
    });

    await tx.execute({
      sql: "update stories set status = ?, updated_at = ? where id = ?",
      args: [check.ok ? "draft" : "failed", isoOf(finishedAt), storyId],
    });

    await tx.commit();
    return version;
  } catch (error) {
    if (!tx.closed) {
      try {
        await tx.rollback();
      } catch {
        // Transaksi sudah tidak bisa di-rollback; error aslinya dilaporkan.
      }
    }
    throw error;
  }
};
