/**
 * Entry point modul upload PDF.
 *
 * Impor dari sini:
 *
 * ```ts
 * import { readPdfUpload, UploadError } from "@/server/upload";
 * ```
 *
 * Modul ini hanya membaca file ke memori. Tidak ada penulisan disk, bucket,
 * atau penyimpanan PDF di database.
 */

export {
  DEFAULT_UPLOAD_FILENAME,
  MAX_FILENAME_LENGTH,
  MAX_PDF_BYTES,
  PDF_MAGIC,
  PDF_MIME_TYPES,
} from "./config";
export {
  createUploadError,
  UPLOAD_ERROR_CODES,
  UPLOAD_ERROR_STATUS,
  UploadError,
  type UploadErrorCode,
  type UploadErrorDetails,
} from "./errors";
export { sanitizeFilename } from "./filename";
export {
  readPdfUpload,
  type PdfUpload,
  type PdfUploadInput,
} from "./read-pdf-upload";
