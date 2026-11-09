/**
 * Konstanta upload PDF.
 *
 * Batas ukuran mengikuti `docs/06-backend/jobs-and-limits.md` (tabel Upload:
 * "Ukuran file 20 MB"), jadi **bukan asumsi**. Dokumen memang tidak diam soal
 * angka ini. Tidak ada variabel bucket atau path disk di sini: keputusan task
 * ini adalah PDF hanya hidup di memori selama satu request/job, dan yang
 * disimpan ke database hanya story JSON.
 */

/** 20 MB dalam byte (20 × 1024 × 1024). Sumber: jobs-and-limits.md. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Nama file hanya untuk tampilan. Angka ini tidak ada di docs, jadi 120 adalah
 * asumsi konservatif: cukup untuk nama materi sekolah, cukup pendek untuk UI.
 */
export const MAX_FILENAME_LENGTH = 120;

/** Nama pengganti bila unggahan tidak punya nama atau namanya tidak tersisa. */
export const DEFAULT_UPLOAD_FILENAME = "materi.pdf";

/** Magic bytes minimal yang harus ada di awal file PDF. */
export const PDF_MAGIC = "%PDF-";

/**
 * MIME yang lazim dikirim browser untuk PDF. Pemeriksaan ini hanya penyaring
 * awal; keputusan akhir tetap magic bytes, karena MIME dari klien tidak boleh
 * dipercaya (`docs/01-architecture/security-and-privacy.md`).
 */
export const PDF_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
] as const;
