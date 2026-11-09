/**
 * Error ekstraksi PDF yang aman ditampilkan.
 *
 * Polanya mengikuti `UploadError` (`src/server/upload/errors.ts`): `code`
 * mengikuti tabel kode di `docs/06-backend/api-contract.md`, `status` adalah
 * HTTP yang menyertainya (semua kode ekstraksi berada di 422), dan `message`
 * sengaja statis — tidak pernah memuat isi teks PDF, nama file, path internal,
 * atau pesan mentah dari pdf.js. Task 18 nanti memetakan `code` ini ke kolom
 * `error_code` job; UI membacanya lewat polling `GET /api/jobs/[jobId]`.
 */

/** Semua kode error yang bisa dilempar ekstraksi PDF. */
export const PDF_EXTRACT_ERROR_CODES = [
  "PDF_UNREADABLE",
  "TOO_MANY_PAGES",
  "NO_TEXT_LAYER",
] as const;

export type PdfExtractErrorCode = (typeof PDF_EXTRACT_ERROR_CODES)[number];

/** HTTP status untuk tiap kode, sesuai `api-contract.md`. */
export const PDF_EXTRACT_ERROR_STATUS = {
  PDF_UNREADABLE: 422,
  TOO_MANY_PAGES: 422,
  NO_TEXT_LAYER: 422,
} as const satisfies Record<PdfExtractErrorCode, number>;

/** Pesan statis; jangan menyisipkan nilai dari file atau error runtime. */
const PDF_EXTRACT_ERROR_MESSAGES: Record<PdfExtractErrorCode, string> = {
  PDF_UNREADABLE:
    "File PDF tidak bisa dibaca. Coba simpan ulang file lalu unggah lagi.",
  TOO_MANY_PAGES:
    "PDF melebihi batas 40 halaman. Pilih bagian materi yang lebih pendek.",
  NO_TEXT_LAYER:
    "PDF ini sepertinya hasil scan, jadi teksnya tidak bisa dibaca.",
};

export class PdfExtractError extends Error {
  readonly code: PdfExtractErrorCode;
  readonly status: number;

  constructor(code: PdfExtractErrorCode) {
    super(PDF_EXTRACT_ERROR_MESSAGES[code]);
    this.name = "PdfExtractError";
    this.code = code;
    this.status = PDF_EXTRACT_ERROR_STATUS[code];
  }
}

/** Buat error ekstraksi tanpa membocorkan input. */
export function createPdfExtractError(
  code: PdfExtractErrorCode,
): PdfExtractError {
  return new PdfExtractError(code);
}
