import { DEFAULT_UPLOAD_FILENAME, MAX_FILENAME_LENGTH } from "./config";

/**
 * Karakter kontrol C0/C1 ditambah penanda arah teks (bidi) yang bisa dipakai
 * untuk menyamarkan nama file di UI. Semuanya dibuang, bukan di-escape.
 */
const CONTROL_OR_FORMAT_CHARS =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;

const WHITESPACE = /\s+/g;

/** Ekstensi yang masih dipertahankan saat nama dipotong. */
const MAX_EXTENSION_LENGTH = 12;

/**
 * Sanitasi nama file **untuk tampilan saja**.
 *
 * Aturan yang dipegang:
 *
 * - Buang seluruh path (`/` dan `\`): yang diambil hanya segmen terakhir.
 * - Buang karakter kontrol dan penanda bidi.
 * - Rapikan whitespace menjadi satu spasi.
 * - Buang titik di awal supaya `.`/`..` tidak tampil sebagai nama.
 * - Batasi panjang, tetapi pertahankan ekstensi bila masuk akal.
 * - Selalu kembalikan nama yang tidak kosong.
 *
 * Hasil fungsi ini **tidak boleh** dipakai sebagai path, nama file di disk,
 * atau kunci storage. PDF tidak ditulis ke disk dan tidak disimpan di database.
 */
export function sanitizeFilename(
  name: unknown,
  maxLength: number = MAX_FILENAME_LENGTH,
): string {
  if (typeof name !== "string") return DEFAULT_UPLOAD_FILENAME;

  const withoutPath = name
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .split("/")
    .pop();

  const cleaned = (withoutPath ?? "")
    .replace(CONTROL_OR_FORMAT_CHARS, "")
    .replace(WHITESPACE, " ")
    .trim()
    .replace(/^\.+/, "")
    .trim();

  if (cleaned === "" || cleaned === "." || cleaned === "..") {
    return DEFAULT_UPLOAD_FILENAME;
  }

  const limited = truncateKeepingExtension(cleaned, maxLength);
  return limited === "" ? DEFAULT_UPLOAD_FILENAME : limited;
}

/**
 * Potong berdasarkan code point (bukan code unit) supaya emoji tidak terbelah,
 * dan pertahankan ekstensi pendek saat memotong.
 */
function truncateKeepingExtension(value: string, maxLength: number): string {
  const limit = Number.isFinite(maxLength)
    ? Math.max(1, Math.floor(maxLength))
    : MAX_FILENAME_LENGTH;
  const codepoints = [...value];
  if (codepoints.length <= limit) return value;

  const dot = value.lastIndexOf(".");
  const extensionCandidate =
    dot > 0 && value.length - dot <= MAX_EXTENSION_LENGTH
      ? value.slice(dot)
      : "";
  const extension =
    [...extensionCandidate].length < limit ? extensionCandidate : "";
  const extensionLength = [...extension].length;
  const room = Math.max(1, limit - extensionLength);
  const base = [...value.slice(0, value.length - extension.length)]
    .slice(0, room)
    .join("")
    .trimEnd();

  return `${base}${extension}`.trimEnd();
}
