/**
 * Konstanta upload PDF.
 *
 * Batas ukuran 4 MB berasal dari batas body request Vercel (4,5 MB), dikurangi
 * margin overhead multipart yang dipakai route upload. Angka ini juga dicatat
 * di `docs/06-backend/jobs-and-limits.md` (tabel Upload) dan ADR 0013. Tidak ada
 * variabel bucket atau path disk di sini: PDF hanya hidup di memori selama satu
 * request/job, dan yang disimpan ke database hanya story JSON.
 */

/** 4 MB dalam byte (4 × 1024 × 1024). Sumber: batas body Vercel 4,5 MB. */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

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
