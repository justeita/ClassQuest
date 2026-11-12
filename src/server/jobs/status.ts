/**
 * Status job untuk polling — `GET /api/jobs/[jobId]`.
 *
 * Kontrak: `docs/06-backend/api-contract.md#get-apijobsjobid` (bentuk respons,
 * stage/progress, aturan kepemilikan) dan `docs/06-backend/jobs-and-limits.md`
 * (siklus job, `error_code`, pesan ramah). Route handler hanya menerjemahkan
 * hasil modul ini menjadi `Response`; semua keputusan ada di sini supaya bisa
 * dites tanpa HTTP.
 *
 * Aturan yang dipegang:
 *
 * - **Hanya pemilik.** Job dibaca lewat `join` ke `stories`; job yang tidak ada
 *   dan job milik guru lain sama-sama `null`, sehingga keberadaan job tidak
 *   bocor (kontrak: `404 NOT_FOUND`).
 * - **Tidak ada status yang menggantung.** Job `queued`/`running` yang melewati
 *   `JOB_STALE_AFTER_SECONDS` diperlakukan sebagai gagal dan kegagalannya
 *   **disimpan** (job → `failed`, story `processing` → `failed`) dalam satu
 *   transaksi dengan guard `where stage in ('queued', 'running')`, supaya job
 *   yang kebetulan selesai di antara baca dan tulis tidak tertimpa.
 * - **Idempoten.** Setelah job gagal, polling berikutnya hanya membaca; tidak
 *   ada penulisan ulang.
 * - Tidak ada isi cerita (JSON) yang dikembalikan; hanya `version` dan
 *   `used_fallback` dari versi terbaru, untuk banner "cerita cadangan".
 */

import type { Client } from "@libsql/client";

import { JOB_STAGES, STAGE_PROGRESS, type JobStage } from "@/ai/pipeline";

import { JOB_ERROR_MESSAGES, type JobErrorCode } from "./run";
import { JOB_STALE_AFTER_SECONDS } from "./limits";

/** Id job yang lebih panjang dari ini pasti tidak berasal dari aplikasi. */
export const MAX_JOB_ID_LENGTH = 200;

/**
 * Batas panjang `message` yang dikirim ke klien. `jobs.message` diisi runner
 * sendiri, tetapi nilai dari database tetap diperlakukan sebagai data tak
 * tepercaya supaya tidak ada teks liar yang lolos ke UI.
 */
const MAX_MESSAGE_LENGTH = 200;

/**
 * Stage yang berarti job masih berjalan.
 *
 * Task menyebut status `queued`/`running`, tetapi `running` bukan nilai yang
 * pernah ditulis: `jobs.stage` memakai kosakata `jobs-and-limits.md`
 * (`queued | extracting | … | done | failed`), dan begitu runner mulai,
 * stage-nya sudah `extracting` (lihat `runJob()`). Karena itu "berjalan" =
 * `queued` + semua stage antara, tepat seperti guard yang dipakai `markJobStale`.
 * `running` tetap diterima supaya baris lama atau data manual tidak lolos dari
 * pemeriksaan basi.
 *
 * Turunan (bukan salinan aturan): stage aktif = semua kecuali `done`/`failed`.
 */
const ACTIVE_STAGES = new Set<string>(
  JOB_STAGES.filter((stage) => stage !== "done" && stage !== "failed"),
);
ACTIVE_STAGES.add("running");

/** Guard SQL untuk job aktif; diturunkan dari `ACTIVE_STAGES`. */
const ACTIVE_STAGE_SQL = [...ACTIVE_STAGES]
  .map((stage) => `'${stage}'`)
  .join(", ");

const isJobStage = (value: string): value is JobStage =>
  JOB_STAGES.includes(value as JobStage);

const isJobErrorCode = (value: string): value is JobErrorCode =>
  Object.prototype.hasOwnProperty.call(JOB_ERROR_MESSAGES, value);

/** Pesan statis untuk job basi; memakai pesan `INTERNAL` dari runner. */
const STALE_ERROR_CODE: JobErrorCode = "INTERNAL";

const staleMessage = (): string =>
  `Pemrosesan berhenti sebelum selesai, jadi cerita ini ditandai gagal. ${JOB_ERROR_MESSAGES.INTERNAL}`;

const isoOf = (ms: number): string => new Date(ms).toISOString();

const parseIso = (value: unknown): number | null => {
  if (typeof value !== "string" || value === "") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const readMessage = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH);
};

/* -------------------------------------------------------------------------- */
/* Bentuk hasil                                                               */
/* -------------------------------------------------------------------------- */

/** Bentuk wire persis dari `api-contract.md`. Jangan menambah field lain. */
export type JobStatusResponse = {
  id: string;
  storyId: string;
  stage: JobStage;
  progress: number;
  message?: string;
  error?: { code: JobErrorCode; message: string };
  startedAt: string | null;
  finishedAt: string | null;
  /** Hanya saat `stage: "done"`: versi terbaru `story_versions`. */
  version?: number;
  /** Hanya saat `stage: "done"`: `true` bila versi terbaru memakai fallback. */
  usedFallback?: boolean;
};

/** `null` berarti tidak ada atau bukan milik guru ini — keduanya 404. */
export type JobStatusLookup = {
  result: JobStatusResponse | null;
  /** `true` bila job basi baru saja ditandai gagal oleh pemanggilan ini. */
  markedStale: boolean;
};

export type JobStatusDeps = {
  /** Jam dalam epoch milidetik. Bawaan `Date.now`. */
  now?: () => number;
};

/* -------------------------------------------------------------------------- */
/* Baris database                                                             */
/* -------------------------------------------------------------------------- */

type JobRow = {
  id: string;
  story_id: string;
  stage: string;
  progress: number;
  message: string | null;
  error_code: string | null;
  started_at: string | null;
  finished_at: string | null;
  /** Kolom setara `created_at`: skema `jobs` memakai default `started_at`. */
  created_at: string | null;
  version: number | null;
  used_fallback: number | null;
};

const JOB_SELECT = `
  select j.id                as id,
         j.story_id          as story_id,
         j.stage             as stage,
         j.progress          as progress,
         j.message           as message,
         j.error_code        as error_code,
         j.started_at        as started_at,
         j.finished_at       as finished_at,
         j.started_at        as created_at,
         v.version           as version,
         v.used_fallback     as used_fallback
    from jobs j
    join stories s on s.id = j.story_id
    left join story_versions v
           on v.story_id = j.story_id
          and v.version = (select max(version) from story_versions where story_id = j.story_id)
   where j.id = ? and s.teacher_id = ?
`;

const toJobRow = (row: Record<string, unknown>): JobRow => ({
  id: String(row.id),
  story_id: String(row.story_id),
  stage: String(row.stage),
  progress: Number(row.progress),
  message: typeof row.message === "string" ? row.message : null,
  error_code: typeof row.error_code === "string" ? row.error_code : null,
  started_at: typeof row.started_at === "string" ? row.started_at : null,
  finished_at: typeof row.finished_at === "string" ? row.finished_at : null,
  created_at: typeof row.created_at === "string" ? row.created_at : null,
  version: row.version === null ? null : Number(row.version),
  used_fallback: row.used_fallback === null ? null : Number(row.used_fallback),
});

const readJob = async (
  db: Client,
  jobId: string,
  teacherId: string,
): Promise<JobRow | null> => {
  const result = await db.execute({
    sql: JOB_SELECT,
    args: [jobId, teacherId],
  });

  const row = result.rows[0];
  return row === undefined ? null : toJobRow(row as Record<string, unknown>);
};

/* -------------------------------------------------------------------------- */
/* Job basi                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Waktu acuan untuk menghitung umur job: `started_at` untuk job yang sudah
 * berjalan, `started_at`/`created_at` untuk job yang belum mulai.
 */
const referenceTime = (job: JobRow): number | null =>
  parseIso(job.started_at) ?? parseIso(job.created_at);

const isStale = (job: JobRow, now: number): boolean => {
  if (!ACTIVE_STAGES.has(job.stage)) return false;

  const reference = referenceTime(job);
  // Tanpa waktu acuan yang bisa dibaca, umur tidak bisa dihitung. Job seperti
  // itu tidak ditandai gagal; melaporkannya apa adanya lebih jujur daripada
  // menyimpulkan sesuatu dari data yang rusak.
  if (reference === null) return false;

  return now - reference > JOB_STALE_AFTER_SECONDS * 1000;
};

/**
 * Tandai job basi gagal dan simpan: job → `failed` dan story `processing` →
 * `failed`, dalam satu transaksi.
 *
 * Guard ada di SQL (`stage in (<stage aktif>)`, `status = 'processing'`), bukan
 * di kode, sehingga job yang kebetulan selesai di antara baca dan tulis tidak
 * pernah tertimpa.
 *
 * Kedua update dijalankan sebagai dua statement. Ini disengaja: libSQL/SQLite
 * melaporkan `rowsAffected` dari statement terakhir saja, dan update story bisa
 * sah menyentuh nol baris (story sudah tidak `processing`) padahal job-nya tetap
 * harus ditandai gagal.
 *
 * @returns `true` bila baris job benar-benar berubah. `false` berarti job sudah
 * berpindah ke status akhir (mis. `done`) di antara baca dan tulis; pemanggil
 * cukup membaca ulang tanpa menimpa apa pun.
 */
export const markJobStale = async (
  db: Client,
  jobId: string,
  now: number,
): Promise<boolean> => {
  const finishedAt = isoOf(now);
  const tx = await db.transaction("write");

  try {
    const updated = await tx.execute({
      sql: `update jobs
               set stage = 'failed', progress = ?, error_code = ?, message = ?,
                   finished_at = ?
             where id = ? and stage in (${ACTIVE_STAGE_SQL})`,
      args: [
        STAGE_PROGRESS.failed,
        STALE_ERROR_CODE,
        staleMessage(),
        finishedAt,
        jobId,
      ],
    });

    // `rowsAffected` belum tentu ada di driver non-libSQL, jadi hasilnya juga
    // dibaca lewat `changes()` (fungsi SQLite) sebagai cadangan.
    const changed =
      typeof updated.rowsAffected === "number"
        ? updated.rowsAffected
        : Number(
            (await tx.execute("select changes() as total")).rows[0]?.total ?? 0,
          );

    if (changed === 0) {
      await tx.rollback();
      return false;
    }

    // Story hanya diubah bila masih `processing`; story yang sudah dipublish
    // atau diarsipkan di antara baca dan tulis tidak boleh disentuh. Statement
    // ini berjalan setelah job terbukti masih aktif (guard di atas).
    await tx.execute({
      sql: `update stories
               set status = 'failed', updated_at = ?
             where id = (select story_id from jobs where id = ?)
               and status = 'processing'`,
      args: [finishedAt, jobId],
    });

    await tx.commit();
    return true;
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

/* -------------------------------------------------------------------------- */
/* Bentuk respons                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Bentuk `error` untuk job gagal.
 *
 * Pesan **selalu** dari peta statis, tidak pernah dari kolom mentah
 * (`jobs.message`) — itulah sebabnya `error.message` di sini aman walau kolom
 * itu berisi teks dari luar. Kontrak tidak punya kode khusus timeout, jadi job
 * basi memakai `INTERNAL` dengan pesan yang menyebut penyebabnya; pesan itu
 * dikenali kembali dari `message` yang ditulis `markJobStale()`.
 * `error_code` asing diperlakukan sama seperti `INTERNAL`.
 */
const errorOf = (job: JobRow): { code: JobErrorCode; message: string } => {
  const known =
    job.error_code !== null && isJobErrorCode(job.error_code)
      ? job.error_code
      : null;

  if (known === null || known === STALE_ERROR_CODE) {
    const stale = readMessage(job.message) === staleMessage();
    return {
      code: STALE_ERROR_CODE,
      message: stale ? staleMessage() : JOB_ERROR_MESSAGES.INTERNAL,
    };
  }

  return { code: known, message: JOB_ERROR_MESSAGES[known] };
};

const toResponse = (job: JobRow): JobStatusResponse => {
  // Baris tak dikenal jangan diteruskan sebagai `stage` bebas: kontrak hanya
  // mengizinkan daftar tetap, jadi nilai asing dilaporkan sebagai gagal.
  const stage: JobStage = isJobStage(job.stage) ? job.stage : "failed";
  const failed = stage === "failed";

  const response: JobStatusResponse = {
    id: job.id,
    storyId: job.story_id,
    stage,
    progress: STAGE_PROGRESS[stage],
    startedAt: job.started_at,
    finishedAt: job.finished_at,
  };

  if (failed) {
    response.error = errorOf(job);
    const message = readMessage(job.message);
    if (message !== null) response.message = message;
    return response;
  }

  if (stage === "done" && job.version !== null) {
    response.version = job.version;
    response.usedFallback = Number(job.used_fallback ?? 0) === 1;
    return response;
  }

  // Job yang belum selesai tidak punya pesan per stage di kontrak; `message`
  // hanya disertakan bila runner benar-benar menulisnya.
  const message = readMessage(job.message);
  if (message !== null) response.message = message;
  return response;
};

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/** Id sah bila berupa string pendek dan tidak kosong. */
export function isValidJobId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value !== "" &&
    value.length <= MAX_JOB_ID_LENGTH
  );
}

/**
 * Baca status job milik satu guru, termasuk penanganan job basi.
 *
 * @returns `result: null` bila job tidak ada, bukan milik guru ini, atau
 * `jobId` tidak valid. Semua kasus itu harus dijawab sama oleh route.
 */
export async function getJobStatus(
  db: Client,
  options: {
    jobId: string;
    teacherId: string;
    now?: () => number;
  },
): Promise<JobStatusLookup> {
  const now = options.now ?? Date.now;

  if (!isValidJobId(options.jobId)) return { result: null, markedStale: false };

  const job = await readJob(db, options.jobId, options.teacherId);
  if (job === null) return { result: null, markedStale: false };

  if (!isStale(job, now()))
    return { result: toResponse(job), markedStale: false };

  const marked = await markJobStale(db, job.id, now());
  if (!marked) {
    // Job berubah status di antara baca dan tulis (mis. baru saja `done`).
    // Baca ulang; jangan menimpa hasil yang sah.
    const current = await readJob(db, job.id, options.teacherId);
    return {
      result: current === null ? null : toResponse(current),
      markedStale: false,
    };
  }

  const current = await readJob(db, job.id, options.teacherId);
  return {
    result: current === null ? null : toResponse(current),
    markedStale: true,
  };
}

/** Apa yang dipakai saat job basi ditandai gagal; diekspor untuk test. */
export const STALE_JOB_ERROR = {
  code: STALE_ERROR_CODE,
  message: staleMessage(),
} as const;

/* -------------------------------------------------------------------------- */
/* Job terbaru milik satu cerita                                              */
/* -------------------------------------------------------------------------- */

/**
 * Id job terbaru untuk satu cerita milik guru, atau `null`.
 *
 * Dipakai halaman `/guru/materi/[storyId]`: `storyId` bukan `jobId`, jadi
 * halaman butuh cara menemukan job yang harus dipolling lewat
 * `GET /api/jobs/[jobId]`. `storyId` yang tidak valid, cerita milik guru lain,
 * dan cerita tanpa job sama-sama `null` — halaman lalu menampilkan ringkasan
 * tanpa progres, bukan membocorkan keberadaan cerita.
 */
export async function getLatestJobId(
  db: Pick<Client, "execute">,
  input: { storyId: string; teacherId: string },
): Promise<string | null> {
  if (
    typeof input.storyId !== "string" ||
    input.storyId === "" ||
    input.storyId.length > MAX_JOB_ID_LENGTH
  ) {
    return null;
  }

  const result = await db.execute({
    sql: `select j.id as id
            from jobs j
            join stories s on s.id = j.story_id
           where j.story_id = ? and s.teacher_id = ?
           order by j.started_at desc, j.rowid desc
           limit 1`,
    args: [input.storyId, input.teacherId],
  });

  const id = result.rows[0]?.id;
  return typeof id === "string" && id !== "" ? id : null;
}
