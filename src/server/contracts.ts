/**
 * Kontrak tipe bersama server ↔ client.
 *
 * Sumber: `docs/06-backend/api-contract.md` bagian "Server Actions" dan
 * "Kontrak tipe bersama": bentuk request/response yang dipakai editor,
 * dashboard, dan game **tidak** boleh didefinisikan ulang di komponen.
 *
 * File ini hanya berisi tipe; tanpa `server-only`, tanpa import nilai, supaya
 * aman diimpor dari client maupun server.
 */

import type { Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

/* -------------------------------------------------------------------------- */
/* Manajemen cerita guru (task 20)                                            */
/* -------------------------------------------------------------------------- */

/** Input `saveStoryDraft`, sesuai tabel Server Actions di api-contract.md. */
export type SaveStoryInput = {
  storyId: string;
  /** Cerita mentah dari editor; divalidasi ulang di server. */
  story: unknown;
  /** Versi terbaru yang dilihat editor (optimistic locking). */
  baseVersion: number;
};

/**
 * Bentuk `SaveStoryResult` — **satu-satunya** bentuk yang dipakai editor,
 * dashboard, dan dokumen lain (api-contract.md). Tiga cabang: tersimpan,
 * ditolak validator, atau ada versi yang lebih baru.
 */
export type SaveStoryResult =
  | { ok: true; version: number; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[] }
  | { ok: false; conflict: true; latestVersion: number };

/** Input `publishStory`. */
export type PublishStoryInput = {
  storyId: string;
  /** Versi yang ingin diterbitkan (harus versi terbaru). */
  version: number;
};

/**
 * Hasil `publishStory` sesuai kontrak (`{ ok: true }` atau `{ ok: false,
 * errors }`). Dua kondisi tidak tercakup kontrak dan dilaporkan di laporan
 * task 20–22:
 *
 * - versi basi / status tidak boleh terbit → cabang `conflict` seperti
 *   `saveStoryDraft`, supaya UI cukup mengenal satu bentuk konflik;
 * - cerita tidak ada / bukan milik guru → `errors` berisi satu issue
 *   `NOT_FOUND` sintetis (action tidak bisa mengirim HTTP 404).
 */
export type PublishStoryResult =
  | { ok: true }
  | { ok: false; errors: ValidationIssue[] }
  | { ok: false; conflict: true; latestVersion: number };

/** Hasil `archiveStory` / `deleteStory`. */
export type SimpleActionResult = { ok: true } | { ok: false };

/** Satu baris daftar cerita di dashboard guru. */
export type StoryListItem = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  language: string;
  status: "processing" | "draft" | "published" | "failed" | "archived";
  updatedAt: string;
  /** `used_fallback` dari versi terbaru. */
  usedFallback: boolean;
  /** Jumlah baris `story_versions` milik cerita ini. */
  versionCount: number;
};

/** Detail cerita untuk halaman detail/editor (server component). */
export type StoryDetail = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  language: string;
  status: "processing" | "draft" | "published" | "failed" | "archived";
  updatedAt: string;
  /** Versi terbaru. */
  version: number;
  /** `used_fallback` dari versi terbaru; `true` = banner cerita cadangan. */
  usedFallback: boolean;
  /** Isi cerita versi terbaru. */
  story: Story | null;
};

/* -------------------------------------------------------------------------- */
/* Hasil bermain (task 22)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Bentuk `result` di dalam `savePlayResult({ storyId, result })`.
 *
 * Kontrak hanya menulis `{ storyId, result }` tanpa mendefinisikan isi
 * `result`; bentuk ini mengikuti `Answer` dari `src/story/scoring.ts`
 * (`challenge-types.md`). Skor **tidak** ikut dikirim: server menghitung
 * ulang dari `answers`. Laporkan di laporan task 22 sebagai definisi baru.
 */
export type PlayResultInput = {
  /** Nama panggilan opsional; tanpa identitas asli. */
  nickname?: string;
  /** Jawaban mentah siswa, satu entri per tantangan yang dijawab. */
  answers: unknown[];
};

/** Hasil `savePlayResult` sesuai kontrak (`{ ok: true }`). */
export type SavePlayResultOutcome =
  { ok: true } | { ok: false; reason: "not_found" | "invalid" | "too_large" };
