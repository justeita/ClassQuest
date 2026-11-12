/**
 * Tahun ajaran (`2026/2027`) — dipakai client dan server.
 *
 * Field "Tahun Akademik" di form kelas dulu teks bebas: apa pun sampai 20
 * karakter bisa tersimpan (`"2026/2027 "`, `"abc"`, emoji, bahkan `<script>`
 * yang memang di-escape React tetapi tetap sampah di database). Sekarang
 * nilainya hanya boleh satu bentuk baku:
 *
 * - `YYYY/YYYY` — tahun pertama 2000–2099, tahun kedua tepat tahun pertama + 1.
 * - Tidak ada spasi, karakter kontrol, digit non-ASCII, atau pemisah lain
 *   (`2026-2027`, `2026 / 2027`, `26/27` semuanya ditolak).
 *
 * Modul ini sengaja murni dan tanpa `server-only` supaya:
 *
 * - **Client** (`YearPicker`) hanya menawarkan pilihan yang sah — tidak ada
 *   input teks, jadi karakter aneh tidak punya jalan masuk.
 * - **Server** (`src/server/classrooms/core.ts`) memvalidasi ulang nilai yang
 *   datang dari browser, karena client selalu bisa dilewati.
 */

/** Batas tahun ajaran yang diterima. */
export const MIN_ACADEMIC_YEAR = 2000;
export const MAX_ACADEMIC_YEAR = 2099;

/** Berapa tahun ajaran ke depan yang ditawarkan picker. */
export const YEAR_PICKER_SPAN = 8;

/** Berapa tahun ajaran ke belakang (untuk data lama). */
const YEAR_PICKER_BACK = 3;

/**
 * Normalisasi tahun ajaran menjadi `YYYY/YYYY`, atau `null` bila tidak sah.
 *
 * Tidak ada pemotongan atau "perbaikan" diam-diam: nilai yang tidak persis
 * sesuai bentuk baku dikembalikan sebagai `null` supaya pemanggil bisa
 * menolaknya, bukan menyimpannya setengah bersih.
 */
export function normalizeAcademicYear(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})\/(\d{4})$/.exec(value);
  if (match === null) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < MIN_ACADEMIC_YEAR || start > MAX_ACADEMIC_YEAR) return null;
  if (end !== start + 1) return null;

  return `${match[1]}/${match[2]}`;
}

/**
 * Tahun ajaran yang sedang berjalan. Tahun ajaran di Indonesia mulai Juli, jadi
 * Januari–Juni masih masuk tahun ajaran sebelumnya. Memakai UTC supaya hasil
 * server dan browser sama.
 */
export function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/** Tahun pertama dari sebuah tahun ajaran, mis. `2026/2027` → `2026`. */
export function academicYearStart(value: string): number | null {
  const normalized = normalizeAcademicYear(value);
  return normalized === null ? null : Number(normalized.slice(0, 4));
}

/** Rentang bulan untuk keterangan picker, mis. `Jul 2026 – Jun 2027`. */
export function academicYearHint(value: string): string | null {
  const start = academicYearStart(value);
  if (start === null) return null;
  return `Jul ${start} – Jun ${start + 1}`;
}

/**
 * Pilihan tahun ajaran untuk picker: beberapa tahun ke belakang sampai
 * `YEAR_PICKER_SPAN` tahun ke depan, terbaru lebih dulu.
 */
export function academicYearOptions(now: Date = new Date()): string[] {
  const current = Number(currentAcademicYear(now).slice(0, 4));
  const first = Math.max(MIN_ACADEMIC_YEAR, current - YEAR_PICKER_BACK);
  const last = Math.min(MAX_ACADEMIC_YEAR, current + YEAR_PICKER_SPAN);

  const options: string[] = [];
  for (let start = first; start <= last; start += 1) {
    options.push(`${start}/${start + 1}`);
  }
  return options;
}
