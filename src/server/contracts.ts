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

/**
 * Status cerita, sesuai enum di `docs/06-backend/persistence.md`.
 *
 * Diekspor supaya dashboard, daftar materi, dan game memakai satu definisi
 * yang sama (bukan menyalin union di tiap komponen).
 */
export type StoryStatus =
  "processing" | "draft" | "published" | "failed" | "archived";

/** Satu baris daftar cerita di dashboard guru. */
export type StoryListItem = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  language: string;
  status: StoryStatus;
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
  status: StoryStatus;
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
  /**
   * Siswa yang dipilih di layar masuk (dari daftar kelas pada tautan
   * `?kelas=`). Server menurunkan nama dan kelas dari baris `students`, jadi
   * `nickname` tidak dikirim bersamaan.
   */
  studentId?: string;
  /**
   * Nama bebas bila tautan tidak membawa kelas atau nama siswa tidak ada di
   * daftar. Maksimal 40 karakter, tanpa identitas asli.
   */
  nickname?: string;
  /** Jawaban mentah siswa, satu entri per tantangan yang dijawab. */
  answers: unknown[];
};

/**
 * Hasil `savePlayResult`.
 *
 * Kontrak (`api-contract.md`, bagian "Server Actions") menulis `{ ok: true }`
 * tanpa cabang gagal. Cabang `{ ok: false, reason }` ditambahkan selama task 22
 * dan diperluas pada task 24 dengan `"rate_limited"`: Server Action tidak bisa
 * mengirim HTTP 429, jadi batas yang terlampaui dilaporkan lewat `reason`.
 * UI siswa hanya perlu memperlakukan `rate_limited` sebagai pesan "coba lagi
 * sebentar lagi" — tidak ada IP, key, atau `Retry-After` di payload ini.
 */
export type SavePlayResultOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "invalid" | "too_large" | "rate_limited";
    };

/* -------------------------------------------------------------------------- */
/* Kelas dan siswa                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Satu siswa di halaman `/guru/kelas`.
 *
 * `classroomId` boleh `null` (siswa belum masuk kelas). `username` boleh
 * `null`: akun login siswa belum dipakai, jadi siswa baru cukup punya nama
 * (dan NIS opsional). Tidak ada hasil bermain di sini — statistik per siswa
 * belum ada di MVP (`docs/05-frontend/teacher-dashboard.md`).
 *
 * `nisn` adalah nomor induk siswa **nasional** (dipakai sistem sekolah),
 * berbeda dari `nis` yang nomor urut kelas dan dipakai siswa untuk masuk
 * `/play` (ADR 0041). Keduanya boleh kosong.
 */
export type StudentListItem = {
  id: string;
  classroomId: string | null;
  name: string;
  nisn: string | null;
  nis: string | null;
  /** Username akun siswa; `null` = siswa tanpa akun login. */
  username: string | null;
  /** ISO-8601; ditampilkan apa adanya oleh formatter UI. */
  createdAt: string;
};

/** Satu kelas milik guru. */
export type ClassroomDetail = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  code: string;
  year: string;
  students: StudentListItem[];
  createdAt: string;
};

/** Hasil aksi tambah siswa. */
export type AddStudentResult =
  { ok: true; student: StudentListItem } | { ok: false; message: string };

/** Hasil aksi tambah kelas. */
export type CreateClassroomResult =
  { ok: true; classroom: ClassroomDetail } | { ok: false; message: string };

/* -------------------------------------------------------------------------- */
/* Layar masuk siswa + analytics kelas                                        */
/* -------------------------------------------------------------------------- */

/** Kelas yang dikirim ke halaman siswa lewat tautan `?kelas=`. */
export type PlayClassroom = {
  id: string;
  name: string;
  code: string;
};

/** Satu siswa di layar masuk `/play/[storyId]?kelas=...`.
 *
 * Hanya `id` dan `name` yang dibutuhkan siswa; NIS ikut supaya dua nama yang
 * sama bisa dibedakan tanpa menampilkan data lain.
 */
export type PlayStudent = {
  id: string;
  name: string;
  nis: string | null;
};

/**
 * Identitas pemain yang sudah dikonfirmasi sebelum cerita dimulai.
 *
 * Satu definisi untuk semua layar masuk: `EntryScreen` (`/play/[storyId]`) dan
 * gerbang kode kelas (`/play`). `studentId` hanya terisi bila server berhasil
 * mencocokkan identitas dengan baris `students` kelas itu; selain itu pemain
 * tercatat sebagai nama bebas (`nickname`) dan tidak masuk analytics kelas.
 * Di gerbang `/play` identitas itu **wajib** NIS yang terdaftar (ADR 0041),
 * jadi cabang nama bebas hanya dipakai jalur tautan `/play/[storyId]`.
 */
export type PlayPlayer = {
  studentId: string | null;
  name: string;
};

/** Satu game terbit milik guru kelas, untuk pemilih di gerbang `/play`. */
export type JoinGame = {
  storyId: string;
  title: string;
  subject: string;
  gradeLevel: string;
};

/** Satu teman sekelas yang NIS-nya berbeda hanya pada titik/strip. */
export type JoinNisCandidate = {
  studentId: string;
  name: string;
  nis: string;
};

/**
 * Alasan gerbang `/play` menolak masuk. Statis dan tanpa data dari input:
 *
 * - `invalid_code` — bentuk kode bukan `QST-XXXX`;
 * - `not_found` — bentuk sah tetapi tidak ada kelas dengan kode itu;
 * - `no_games` — kelas ada, tetapi gurunya belum menerbitkan game;
 * - `invalid_nis` — NIS kosong / berisi karakter yang tidak sah;
 * - `nis_not_found` — NIS itu tidak ada di daftar murid mana pun milik guru
 *   kelas tersebut (ADR 0041);
 * - `nis_ambiguous` — NIS cocok ke lebih dari satu murid setelah titik/strip
 *   diabaikan; siswa harus memakai bentuk lengkapnya;
 * - `story_not_found` — game yang dipilih bukan milik guru kelas itu;
 * - `rate_limited` — terlalu banyak percobaan kode dari IP ini.
 */
export type JoinFailureReason =
  | "invalid_code"
  | "not_found"
  | "no_games"
  | "invalid_nis"
  | "nis_not_found"
  | "nis_ambiguous"
  | "story_not_found"
  | "rate_limited";

/**
 * Hasil `masukKelas` (Server Action gerbang `/play`).
 *
 * Tiga cabang: langsung main (satu game atau game sudah dipilih), siswa harus
 * memilih game dulu (guru punya beberapa game terbit), atau ditolak. Penolakan
 * `nis_ambiguous` membawa `candidates` supaya siswa bisa memilih NIS lengkapnya
 * tanpa mengetik ulang semuanya.
 */
export type JoinOutcome =
  | {
      ok: true;
      jenis: "main";
      story: Story;
      classroom: PlayClassroom;
      students: PlayStudent[];
      pemain: PlayPlayer;
    }
  | { ok: true; jenis: "pilih"; classroom: PlayClassroom; games: JoinGame[] }
  | {
      ok: false;
      reason: "nis_ambiguous";
      candidates: JoinNisCandidate[];
    }
  | { ok: false; reason: Exclude<JoinFailureReason, "nis_ambiguous"> };

/** Satu baris tabel analytics: agregat semua percobaan seorang siswa di satu
 * kelas untuk satu game. */
export type AnalyticsStudentRow = {
  /** `classroom|story|student_id` (atau `nickname:<huruf kecil>` untuk nama bebas). */
  key: string;
  studentId: string | null;
  name: string;
  nis: string | null;
  /** Jumlah percobaan yang tersimpan. */
  attempts: number;
  /** Poin tertinggi dari semua percobaan. */
  bestPoints: number;
  /** Poin percobaan terakhir. */
  latestPoints: number;
  /** Jawaban tepat pada percobaan terakhir. */
  latestCorrectCount: number;
  /** Jumlah tantangan di cerita. */
  totalCount: number;
  /** Poin maksimum yang mungkin di cerita. */
  totalPoints: number;
  /** Konsep yang pernah dijawab salah, unik, urut dari yang paling sering. */
  weakConcepts: string[];
  /** ISO-8601 percobaan terakhir. */
  lastPlayedAt: string;
  /** Kelas asal baris; `null` bila hasil main tidak terkait kelas. */
  classroomId: string | null;
  classroomName: string | null;
  /** Game asal baris. */
  storyId: string;
  storyTitle: string;
};

/** Satu kelas yang ikut dalam agregat. */
export type AnalyticsClassroom = { id: string; name: string; code: string };

/** Satu game yang ikut dalam agregat. */
export type AnalyticsStory = { id: string; title: string };

/**
 * Ringkasan analytics hasil main siswa.
 *
 * Filter kelas dan game keduanya opsional: `null` berarti "semua". Jadi objek
 * ini bisa mewakili satu kelas × satu game, semua kelas untuk satu game, satu
 * kelas untuk semua game terbit, atau semuanya sekaligus.
 */
export type ClassroomAnalytics = {
  /** Kelas yang ikut dalam agregat. */
  classrooms: AnalyticsClassroom[];
  /** Game yang ikut dalam agregat (hanya yang berstatus `published`). */
  stories: AnalyticsStory[];
  selectedClassroomId: string | null;
  selectedStoryId: string | null;
  /** Jumlah siswa terdaftar di kelas yang ikut dalam agregat. */
  studentsTotal: number;
  /** Jumlah baris siswa (siswa × kelas × game) yang punya percobaan. */
  studentsPlayed: number;
  totalAttempts: number;
  /** Rata-rata poin terbaik per baris siswa yang bermain; 0 bila belum ada. */
  averageBestPoints: number;
  rows: AnalyticsStudentRow[];
};
