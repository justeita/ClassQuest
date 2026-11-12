/**
 * Logika inti manajemen cerita guru (task 20).
 *
 * Sumber aturan:
 *
 * - `docs/06-backend/api-contract.md` — bentuk `SaveStoryResult`, aturan
 *   kepemilikan, "Server yang memutuskan".
 * - `docs/06-backend/persistence.md` — siklus status (`processing | draft |
 *   published | failed | archived`), transisi (`draft → published` saat
 *   terbit, `published → published` saat edit + terbit versi baru, arsip,
 *   hapus permanen hanya untuk `draft`/`failed`/`archived`),
 *   `published_version` sebagai satu-satunya sumber kebenaran "boleh
 *   dimainkan", dan konkurensi versi (`baseVersion` ≠ terbaru → konflik).
 *
 * Semua fungsi menerima client libSQL yang bisa diinjeksi supaya mudah
 * dites dengan database in-memory. Route/action hanya menerjemahkan hasilnya.
 *
 * Aturan yang dipegang:
 *
 * - **Kepemilikan.** Semua query memfilter `stories.teacher_id`; cerita yang
 *   tidak ada dan milik guru lain sama-sama `null` → `StoryNotFoundError`,
 *   yang di action/route dijawab `404 NOT_FOUND` identik.
 * - **Satu transaksi** untuk seluruh baca-ceksimpan-tulis, supaya dua tab
 *   editor tidak menimpa satu sama lain.
 * - **Validasi ulang di server** dengan `validateStory` — status jangan
 *   dipercaya.
 * - Tidak ada kolom internal (`source_file_name`, `created_by`, dll.) yang
 *   keluar dari modul ini.
 */

import "server-only";

import type { Client } from "@libsql/client";

import { PROMPT_VERSION } from "@/ai/prompt";
import { toAssetManifest } from "@/assets/manifest";
import type { Story } from "@/story/schema";
import { validateStory, type ValidationIssue } from "@/story/validate";

import type {
  PublishStoryResult,
  SaveStoryResult,
  SimpleActionResult,
  StoryDetail,
  StoryListItem,
  StoryStatus,
} from "@/server/contracts";

/* -------------------------------------------------------------------------- */
/* Batas dan status                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Batas ukuran JSON cerita yang disimpan. persistence.md menulis cerita
 * "bisa besar (JSON 50–300 KB)"; 512 KB memberi ruang tanpa membuka celah
 * payload raksasa. Tidak ada angka di docs — asumsi, dilaporkan.
 */
export const MAX_STORY_JSON_BYTES = 512 * 1024;

/**
 * Batas jumlah issue validasi yang dikirim ke klien (tugas: dibatasi 50;
 * validator sendiri sudah memotong error pada 20).
 */
export const MAX_VALIDATION_ISSUES = 50;

/** Batas jumlah baris daftar cerita per halaman (docs tidak menetapkan). */
export const STORIES_PAGE_LIMIT = 20;
export const MAX_STORIES_PAGE_LIMIT = 100;

export type { StoryStatus };

const STORY_STATUSES: readonly StoryStatus[] = [
  "processing",
  "draft",
  "published",
  "failed",
  "archived",
];

const isStoryStatus = (value: string): value is StoryStatus =>
  (STORY_STATUSES as readonly string[]).includes(value);

/** Batas panjang `storyId` yang diterima; lebih panjang = tidak ada. */
export const MAX_STORY_ID_LENGTH = 200;

/**
 * Error domain: cerita tidak ada atau bukan milik guru ini. Pemanggil
 * (action/route) menerjemahkannya menjadi respons "tidak ditemukan" yang
 * identik, tanpa membocorkan keberadaan cerita.
 */
export class StoryNotFoundError extends Error {
  constructor() {
    super("Cerita tidak ditemukan.");
    this.name = "StoryNotFoundError";
  }
}

/** Issue sintetis untuk klien action bila cerita tidak ada/bukan miliknya. */
export const STORY_NOT_FOUND_ISSUE: ValidationIssue = {
  code: "E_MISSING_FIELD",
  severity: "error",
  path: "",
  message: "Cerita tidak ditemukan atau sudah dihapus.",
};

/**
 * Issue sintetis untuk klien action bila cerita melebihi batas ukuran
 * (`MAX_STORY_JSON_BYTES`). Action tidak punya status HTTP, jadi 413
 * dilaporkan sebagai issue.
 */
export const STORY_TOO_LARGE_ISSUE: ValidationIssue = {
  code: "E_TEXT_TOO_LONG",
  severity: "error",
  path: "",
  message: "Ukuran cerita melebihi batas yang diizinkan.",
};

const isoOf = (ms: number): string => new Date(ms).toISOString();

/** Waktu "sekarang"; bisa diinjeksi test. */
export type NowFn = () => number;

const manifest = toAssetManifest();

const validateForSave = (story: unknown) => validateStory(story, { manifest });

/* -------------------------------------------------------------------------- */
/* Baris database → bentuk keluaran                                            */
/* -------------------------------------------------------------------------- */

type StoryRow = {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  language: string;
  status: StoryStatus;
  published_version: number | null;
  updated_at: string;
};

const parseStoryRow = (row: Record<string, unknown>): StoryRow | null => {
  const id = row.id;
  if (typeof id !== "string" || id === "") return null;
  const status = row.status;
  if (typeof status !== "string" || !isStoryStatus(status)) return null;

  return {
    id,
    title: typeof row.title === "string" ? row.title : "",
    subject: typeof row.subject === "string" ? row.subject : "",
    grade_level: typeof row.grade_level === "string" ? row.grade_level : "",
    language: typeof row.language === "string" ? row.language : "",
    status,
    published_version:
      typeof row.published_version === "number" ? row.published_version : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
};

/**
 * Ambil satu baris `stories` milik guru. `null` untuk "tidak ada" dan "bukan
 * milik guru" — keduanya dijawab identik.
 */
const fetchOwnedStory = async (
  executor: Pick<Client, "execute">,
  storyId: string,
  teacherId: string,
): Promise<StoryRow | null> => {
  const result = await executor.execute({
    sql: `select id, title, subject, grade_level, language, status,
                 published_version, updated_at
          from stories
          where id = ? and teacher_id = ?`,
    args: [storyId, teacherId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return parseStoryRow(row as unknown as Record<string, unknown>);
};

/* -------------------------------------------------------------------------- */
/* Daftar dan detail                                                          */
/* -------------------------------------------------------------------------- */

export type ListStoriesInput = {
  teacherId: string;
  /** Jumlah baris yang diminta; dibatasi `[1, MAX_STORIES_PAGE_LIMIT]`. */
  limit?: number;
  /** Offset pagination sederhana. */
  offset?: number;
};

/**
 * Daftar cerita milik guru, urut `updated_at` terbaru. `usedFallback` dan
 * `versionCount` diambil dari tabel versi lewat subquery.
 */
export async function listStories(
  db: Pick<Client, "execute">,
  input: ListStoriesInput,
): Promise<StoryListItem[]> {
  const limit = Math.min(
    MAX_STORIES_PAGE_LIMIT,
    Math.max(1, Math.floor(input.limit ?? STORIES_PAGE_LIMIT)),
  );
  const offset = Math.max(0, Math.floor(input.offset ?? 0));

  const result = await db.execute({
    sql: `select s.id, s.title, s.subject, s.grade_level, s.language,
                 s.status, s.updated_at,
                 (select count(*) from story_versions v
                   where v.story_id = s.id) as version_count,
                 (select v2.used_fallback from story_versions v2
                   where v2.story_id = s.id
                   order by v2.version desc limit 1) as latest_used_fallback
          from stories s
          where s.teacher_id = ?
          order by s.updated_at desc
          limit ? offset ?`,
    args: [input.teacherId, limit, offset],
  });

  const items: StoryListItem[] = [];
  for (const row of result.rows) {
    const story = parseStoryRow(row as unknown as Record<string, unknown>);
    if (story === null) continue;

    const record = row as unknown as Record<string, unknown>;
    items.push({
      id: story.id,
      title: story.title,
      subject: story.subject,
      gradeLevel: story.grade_level,
      language: story.language,
      status: story.status,
      updatedAt: story.updated_at,
      usedFallback: Number(record.latest_used_fallback ?? 0) === 1,
      versionCount: Number(record.version_count ?? 0),
    });
  }
  return items;
}

/** Input detail cerita. */
export type GetStoryDetailInput = {
  teacherId: string;
  storyId: string;
};

/**
 * Detail cerita untuk halaman guru: metadata + versi terbaru + `usedFallback`.
 * `null` bila tidak ada atau bukan milik guru.
 */
export async function getStoryDetail(
  db: Pick<Client, "execute">,
  input: GetStoryDetailInput,
): Promise<StoryDetail | null> {
  const row = await fetchOwnedStory(db, input.storyId, input.teacherId);
  if (row === null) return null;

  const versions = await db.execute({
    sql: `select version, story, used_fallback
          from story_versions
          where story_id = ?
          order by version desc
          limit 1`,
    args: [input.storyId],
  });

  const versionRow = versions.rows[0];
  if (!versionRow) {
    return {
      id: row.id,
      title: row.title,
      subject: row.subject,
      gradeLevel: row.grade_level,
      language: row.language,
      status: row.status,
      updatedAt: row.updated_at,
      version: 0,
      usedFallback: false,
      story: null,
    };
  }

  let story: Story | null = null;
  try {
    story = JSON.parse(String(versionRow.story)) as Story;
  } catch {
    // JSON rusak di database adalah bug pipeline; jangan lempar ke UI.
    story = null;
  }

  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    gradeLevel: row.grade_level,
    language: row.language,
    status: row.status,
    updatedAt: row.updated_at,
    version: Number(versionRow.version),
    usedFallback: Number(versionRow.used_fallback ?? 0) === 1,
    story,
  };
}

/* -------------------------------------------------------------------------- */
/* Simpan versi baru                                                          */
/* -------------------------------------------------------------------------- */

export type SaveStoryVersionInput = {
  teacherId: string;
  storyId: string;
  /** Cerita mentah dari editor; divalidasi ulang di sini. */
  story: unknown;
  /** `baseVersion` dari editor (optimistic locking). */
  expectedVersion: number;
};

/**
 * Simpan hasil edit guru sebagai **baris baru** `story_versions` (versi tidak
 * pernah ditimpa — persistence.md).
 *
 * Urutan dalam satu transaksi: baca story (kepemilikan) → baca versi terbaru
 * → bandingkan `expectedVersion` → validasi ulang → insert versi + update
 * `updated_at`. Konflik dan validasi gagal tidak menulis apa pun (rollback).
 */
export async function saveStoryVersion(
  db: Client,
  input: SaveStoryVersionInput,
  now: NowFn = Date.now,
): Promise<SaveStoryResult> {
  // Ukuran body dicek sebelum menyentuh database.
  const serialized = JSON.stringify(input.story ?? null);
  if (Buffer.byteLength(serialized, "utf8") > MAX_STORY_JSON_BYTES) {
    throw new StoryTooLargeError();
  }

  const tx = await db.transaction("write");

  try {
    const story = await fetchOwnedStory(tx, input.storyId, input.teacherId);
    if (story === null) throw new StoryNotFoundError();

    const latest = await tx.execute({
      sql: "select coalesce(max(version), 0) as latest from story_versions where story_id = ?",
      args: [input.storyId],
    });
    const latestVersion = Number(latest.rows[0]?.latest ?? 0);

    // Optimistic locking: versi basi → konflik, tanpa tulisan apa pun.
    if (latestVersion !== input.expectedVersion) {
      await tx.rollback();
      return { ok: false, conflict: true, latestVersion };
    }

    // Validasi ulang di server; cerita tidak valid tidak pernah tersimpan.
    const check = validateForSave(input.story);
    if (!check.ok || check.story === null) {
      await tx.rollback();
      return {
        ok: false,
        errors: check.errors.slice(0, MAX_VALIDATION_ISSUES),
      };
    }

    const version = latestVersion + 1;
    await tx.execute({
      sql: `insert into story_versions
              (story_id, version, story, created_by, created_at, prompt_version, used_fallback)
            values (?, ?, ?, ?, ?, ?, 0)`,
      args: [
        input.storyId,
        version,
        JSON.stringify(check.story),
        input.teacherId,
        isoOf(now()),
        PROMPT_VERSION,
      ],
    });
    await tx.execute({
      sql: "update stories set updated_at = ? where id = ?",
      args: [isoOf(now()), input.storyId],
    });

    await tx.commit();
    return {
      ok: true,
      version,
      warnings: check.warnings.slice(0, MAX_VALIDATION_ISSUES),
    };
  } catch (error) {
    if (!tx.closed) {
      try {
        await tx.rollback();
      } catch {
        // Transaksi sudah tidak bisa di-rollback; error aslinya yang dilempar.
      }
    }
    throw error;
  }
}

/** Error domain: cerita melebihi batas ukuran. */
export class StoryTooLargeError extends Error {
  constructor() {
    super("Ukuran cerita melebihi batas.");
    this.name = "StoryTooLargeError";
  }
}

/* -------------------------------------------------------------------------- */
/* Terbitkan                                                                  */
/* -------------------------------------------------------------------------- */

export type PublishStoryCoreInput = {
  teacherId: string;
  storyId: string;
  /** Versi yang ingin diterbitkan; harus versi terbaru. */
  expectedVersion: number;
};

/**
 * Terbitkan cerita.
 *
 * Aturan (persistence.md + tugas):
 *
 * - hanya pemilik; tidak ada → `StoryNotFoundError`;
 * - `processing` dan `failed` ditolak (konflik);
 * - dari `draft` → `published`; dari `published` → terbit versi baru
 *   (`published → published` di diagram status, karena siswa tetap memakai
 *   `published_version` lama sampai versi baru diterbitkan);
 * - versi terbaru **divalidasi ulang** di server — versi tidak valid tidak
 *   pernah diterbitkan;
 * - `published_version` dan `updated_at` di-set dalam transaksi yang sama.
 */
export async function publishStory(
  db: Client,
  input: PublishStoryCoreInput,
  now: NowFn = Date.now,
): Promise<PublishStoryResult> {
  const tx = await db.transaction("write");

  try {
    const story = await fetchOwnedStory(tx, input.storyId, input.teacherId);
    if (story === null) throw new StoryNotFoundError();

    if (story.status === "processing" || story.status === "failed") {
      await tx.rollback();
      return {
        ok: false,
        conflict: true,
        latestVersion: story.published_version ?? 0,
      };
    }

    const latest = await tx.execute({
      sql: "select coalesce(max(version), 0) as latest from story_versions where story_id = ?",
      args: [input.storyId],
    });
    const latestVersion = Number(latest.rows[0]?.latest ?? 0);

    if (latestVersion !== input.expectedVersion) {
      await tx.rollback();
      return { ok: false, conflict: true, latestVersion };
    }

    if (latestVersion === 0) {
      // Belum ada versi sama sekali (mis. story processing gagal total).
      await tx.rollback();
      return { ok: false, conflict: true, latestVersion: 0 };
    }

    const versionRow = await tx.execute({
      sql: "select story, used_fallback from story_versions where story_id = ? and version = ?",
      args: [input.storyId, latestVersion],
    });
    const rawStory = versionRow.rows[0]?.story;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(String(rawStory));
    } catch {
      parsed = null;
    }

    // Validasi ulang di server; status di database tidak dipercaya.
    const check = validateForSave(parsed);
    if (!check.ok) {
      await tx.rollback();
      return {
        ok: false,
        errors: check.errors.slice(0, MAX_VALIDATION_ISSUES),
      };
    }

    await tx.execute({
      sql: "update stories set status = 'published', published_version = ?, updated_at = ? where id = ?",
      args: [latestVersion, isoOf(now()), input.storyId],
    });

    await tx.commit();
    return { ok: true };
  } catch (error) {
    if (!tx.closed) {
      try {
        await tx.rollback();
      } catch {
        // Abaikan; error aslinya yang dilempar.
      }
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Batalkan terbit / arsip                                                    */
/* -------------------------------------------------------------------------- */

export type ArchiveStoryInput = {
  teacherId: string;
  storyId: string;
};

/**
 * `archiveStory` (satu-satunya aksi "buka terbit/arsip" di kontrak):
 *
 * - `published` → `draft` (batalkan terbit): `published_version` di-nol-kan
 *   supaya cerita langsung berhenti dilayani ke siswa;
 * - `draft`/`failed`/`archived` → `archived` (diagram status persistence.md);
 *   `archived` → tetap `archived` (idempoten);
 * - `processing` → konflik (masih ada job yang bisa berubah).
 */
export async function archiveStory(
  db: Client,
  input: ArchiveStoryInput,
  now: NowFn = Date.now,
): Promise<SimpleActionResult> {
  const tx = await db.transaction("write");

  try {
    const story = await fetchOwnedStory(tx, input.storyId, input.teacherId);
    if (story === null) throw new StoryNotFoundError();

    if (story.status === "processing") {
      await tx.rollback();
      return { ok: false };
    }

    if (story.status === "published") {
      // Batalkan terbit: kembali ke draft dan berhenti dilayani publik.
      await tx.execute({
        sql: "update stories set status = 'draft', published_version = null, updated_at = ? where id = ?",
        args: [isoOf(now()), input.storyId],
      });
    } else if (story.status !== "archived") {
      await tx.execute({
        sql: "update stories set status = 'archived', updated_at = ? where id = ?",
        args: [isoOf(now()), input.storyId],
      });
    }

    await tx.commit();
    return { ok: true };
  } catch (error) {
    if (!tx.closed) {
      try {
        await tx.rollback();
      } catch {
        // Abaikan; error aslinya yang dilempar.
      }
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Hapus permanen                                                             */
/* -------------------------------------------------------------------------- */

export type DeleteStoryInput = {
  teacherId: string;
  storyId: string;
};

/**
 * Hapus permanen cerita beserta versi, job, dan hasil bermainnya dalam satu
 * transaksi. persistence.md: hapus permanen hanya untuk `draft`/`failed`/
 * `archived` — `published` harus dibatalkan terbit dulu, `processing` masih
 * punya job yang bisa berjalan.
 */
export async function deleteStory(
  db: Client,
  input: DeleteStoryInput,
): Promise<SimpleActionResult> {
  const tx = await db.transaction("write");

  try {
    const story = await fetchOwnedStory(tx, input.storyId, input.teacherId);
    if (story === null) throw new StoryNotFoundError();

    if (story.status === "published" || story.status === "processing") {
      await tx.rollback();
      return { ok: false };
    }

    // Urutan anak → induk; FK di libSQL tidak selalu aktif per koneksi, jadi
    // jangan mengandalkan ON DELETE CASCADE.
    await tx.execute({
      sql: "delete from play_results where story_id = ?",
      args: [input.storyId],
    });
    await tx.execute({
      sql: "delete from jobs where story_id = ?",
      args: [input.storyId],
    });
    await tx.execute({
      sql: "delete from story_versions where story_id = ?",
      args: [input.storyId],
    });
    await tx.execute({
      sql: "delete from stories where id = ?",
      args: [input.storyId],
    });

    await tx.commit();
    return { ok: true };
  } catch (error) {
    if (!tx.closed) {
      try {
        await tx.rollback();
      } catch {
        // Abaikan; error aslinya yang dilempar.
      }
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Cerita terbit (dipakai task 21/22)                                         */
/* -------------------------------------------------------------------------- */

/** Baris cerita yang berlaku untuk publik: versi terbit, bukan terbaru. */
export type PublishedStoryRow = {
  storyId: string;
  version: number;
  publishedAt: string;
  story: Story | null;
};

export type GetPublishedStoryInput = {
  storyId: string;
};

/**
 * Cerita versi terbit untuk game siswa: `status = 'published'` dan baris
 * `story_versions` yang **menjadi versi terbit** (`published_version`), bukan
 * versi terbaru — guru bisa mengedit draft berikutnya tanpa mengubah yang
 * sedang dimainkan siswa.
 *
 * `null` untuk semua kondisi "tidak boleh dimainkan": tidak ada, `draft`,
 * `processing`, `failed`, `archived`, atau `published_version` kosong.
 */
export async function getPublishedStory(
  db: Pick<Client, "execute">,
  input: GetPublishedStoryInput,
): Promise<PublishedStoryRow | null> {
  const result = await db.execute({
    sql: `select s.id, s.published_version, v.story, v.created_at
          from stories s
          join story_versions v
            on v.story_id = s.id and v.version = s.published_version
          where s.id = ? and s.status = 'published'`,
    args: [input.storyId],
  });

  const row = result.rows[0];
  if (!row) return null;

  const id = row.id;
  const version = Number(row.published_version);
  if (
    typeof id !== "string" ||
    id === "" ||
    !Number.isInteger(version) ||
    version <= 0
  ) {
    return null;
  }

  let story: Story | null = null;
  try {
    story = JSON.parse(String(row.story)) as Story;
  } catch {
    story = null;
  }
  if (story === null) return null;

  return {
    storyId: id,
    version,
    publishedAt: typeof row.created_at === "string" ? row.created_at : "",
    story,
  };
}
