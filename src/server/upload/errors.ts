import { MAX_PDF_BYTES } from "./config";

/**
 * Error upload PDF yang aman ditampilkan.
 *
 * `code` mengikuti tabel kode di `docs/06-backend/api-contract.md`; `status`
 * adalah HTTP yang menyertainya supaya route handler tidak perlu memetakan
 * ulang. `message` sengaja statis: tidak pernah memuat nama file, isi file,
 * path internal, atau pesan mentah dari runtime. Dengan begitu error bisa
 * langsung dikirim ke guru tanpa risiko membocorkan apa pun.
 */

/** Semua kode error upload yang dikenal kontrak API. */
export const UPLOAD_ERROR_CODES = [
  "FILE_MISSING",
  "FILE_TOO_LARGE",
  "FILE_TYPE",
  "PDF_UNREADABLE",
] as const;

export type UploadErrorCode = (typeof UPLOAD_ERROR_CODES)[number];

/** HTTP status untuk tiap kode, sesuai `api-contract.md`. */
export const UPLOAD_ERROR_STATUS = {
  FILE_MISSING: 400,
  FILE_TOO_LARGE: 413,
  FILE_TYPE: 415,
  PDF_UNREADABLE: 422,
} as const satisfies Record<UploadErrorCode, number>;

const MEGABYTE = 1024 * 1024;

/** Pesan statis; jangan menyisipkan nilai dari file atau error runtime. */
const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  FILE_MISSING:
    "File PDF tidak ditemukan atau kosong. Pilih satu file PDF lalu coba lagi.",
  FILE_TOO_LARGE: `Ukuran file melebihi batas ${MAX_PDF_BYTES / MEGABYTE} MB.`,
  FILE_TYPE: "File harus berupa PDF yang sah. Pilih file .pdf lalu coba lagi.",
  PDF_UNREADABLE:
    "File PDF tidak bisa dibaca. Coba simpan ulang file lalu unggah lagi.",
};

/** Detail yang aman untuk ditampilkan, mis. `maxBytes` untuk `FILE_TOO_LARGE`. */
export type UploadErrorDetails = Record<string, unknown>;

export class UploadError extends Error {
  readonly code: UploadErrorCode;
  readonly status: number;
  readonly details?: UploadErrorDetails;

  constructor(
    code: UploadErrorCode,
    message: string = UPLOAD_ERROR_MESSAGES[code],
    details?: UploadErrorDetails,
  ) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.status = UPLOAD_ERROR_STATUS[code];
    this.details = details;
  }
}

/**
 * Buat error upload tanpa membocorkan input. `FILE_TOO_LARGE` otomatis membawa
 * `details.maxBytes` seperti yang diminta `api-contract.md`.
 */
export function createUploadError(code: UploadErrorCode): UploadError {
  return new UploadError(
    code,
    UPLOAD_ERROR_MESSAGES[code],
    code === "FILE_TOO_LARGE" ? { maxBytes: MAX_PDF_BYTES } : undefined,
  );
}
