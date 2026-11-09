import { MAX_PDF_BYTES, PDF_MAGIC, PDF_MIME_TYPES } from "./config";
import { createUploadError } from "./errors";
import { sanitizeFilename } from "./filename";

/** Hasil baca upload PDF. `bytes` hanya hidup selama request/job. */
export type PdfUpload = {
  /** Isi file di memori. Jangan disimpan ke disk atau database. */
  bytes: Uint8Array;
  /** Nama file yang sudah disanitasi, hanya untuk tampilan. */
  filename: string;
  /** Ukuran isi yang benar-benar dibaca, bukan metadata klien. */
  sizeBytes: number;
};

/** Null/undefined diterima supaya route bisa meneruskan `formData.get("file")`. */
export type PdfUploadInput = File | Blob | null | undefined;

const pdfMimeTypes = new Set<string>(PDF_MIME_TYPES);

const isBlobLike = (value: unknown): value is Blob => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { arrayBuffer?: unknown; size?: unknown };
  return (
    typeof candidate.arrayBuffer === "function" &&
    typeof candidate.size === "number"
  );
};

/** `Blob` tidak punya `name`; hanya `File` yang punya. */
function declaredName(file: File | Blob): string | null {
  const name = (file as File).name;
  return typeof name === "string" ? name : null;
}

function normalizeMime(type: string | undefined): string {
  return (type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Penyaring awal tipe/ekstensi. MIME saja tidak dipercaya; ini hanya menolak
 * file yang jelas bukan PDF. Keputusan akhir ada di magic bytes.
 */
function declaresPdf(file: File | Blob, name: string | null): boolean {
  if (pdfMimeTypes.has(normalizeMime(file.type))) return true;
  return name !== null && name.toLowerCase().endsWith(".pdf");
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let index = 0; index < PDF_MAGIC.length; index += 1) {
    if (bytes[index] !== PDF_MAGIC.charCodeAt(index)) return false;
  }
  return true;
}

/**
 * Baca upload PDF ke memori dan validasi bentuk dasarnya.
 *
 * Yang diperiksa, berurutan:
 *
 * 1. File ada, berupa `Blob`/`File`, dan tidak kosong.
 * 2. Ukuran tidak melebihi `MAX_PDF_BYTES` (20 MB, dari docs).
 * 3. Tipe atau ekstensi menyatakan PDF (penyaring awal).
 * 4. Isi bisa dibaca sebagai bytes dan benar-benar diawali `%PDF-`.
 *
 * Yang **tidak** dilakukan di sini: parser PDF, ekstraksi teks, dan penulisan
 * file. Itu tugas route upload (16) dan ekstraksi teks (17). Fungsi ini tidak
 * pernah menulis ke disk dan tidak menyimpan apa pun di database.
 *
 * @throws {UploadError} dengan `code` `FILE_MISSING`, `FILE_TOO_LARGE`,
 * `FILE_TYPE`, atau `PDF_UNREADABLE`.
 */
export async function readPdfUpload(file: PdfUploadInput): Promise<PdfUpload> {
  if (!isBlobLike(file) || file.size === 0) {
    throw createUploadError("FILE_MISSING");
  }

  // Tolak sebelum membaca isi: file 20 MB+ tidak perlu dialokasikan.
  if (file.size > MAX_PDF_BYTES) {
    throw createUploadError("FILE_TOO_LARGE");
  }

  const name = declaredName(file);
  if (!declaresPdf(file, name)) {
    throw createUploadError("FILE_TYPE");
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    // Jangan sertakan error asli: bisa memuat path internal runtime.
    throw createUploadError("PDF_UNREADABLE");
  }

  const bytes = new Uint8Array(buffer);

  // Ukuran metadata bisa saja berbeda dari isi; periksa lagi yang sebenarnya.
  if (bytes.byteLength === 0) {
    throw createUploadError("FILE_MISSING");
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw createUploadError("FILE_TOO_LARGE");
  }

  // MIME benar tapi isi bukan PDF harus ditolak di sini.
  if (!hasPdfMagic(bytes)) {
    throw createUploadError("FILE_TYPE");
  }

  return {
    bytes,
    filename: sanitizeFilename(name),
    sizeBytes: bytes.byteLength,
  };
}
