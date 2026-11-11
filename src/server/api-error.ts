/**
 * Helper respons error API dengan bentuk `ApiError` dari
 * `docs/06-backend/api-contract.md`: `error: { code, message, details? }`.
 *
 * Aturan yang dipegang:
 *
 * - `message` selalu ditulis statis oleh pemanggil. Jangan pernah menyisipkan
 *   input request, pesan runtime, path, atau nama tabel ke sini.
 * - `details` hanya disertakan bila ada, dan hanya berisi nilai yang aman
 *   ditampilkan (mis. `maxBytes`).
 * - Setiap respons error membawa `Cache-Control: no-store` (checklist endpoint
 *   baru di kontrak).
 *
 * Catatan kontrak: `INVALID_INPUT` belum terdaftar di tabel kode
 * `api-contract.md` karena kontrak tidak mendefinisikan kode untuk field teks
 * form yang tidak valid. Dipakai dengan status 400 dan dilaporkan ke docs owner.
 */

/** Semua kode error yang dipakai route handler API. */
export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "FILE_MISSING",
  "FILE_TOO_LARGE",
  "FILE_TYPE",
  "PDF_UNREADABLE",
  "NO_TEXT_LAYER",
  "TOO_MANY_PAGES",
  "RATE_LIMITED",
  "INVALID_INPUT",
  "INTERNAL",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Pesan kesalahan internal yang statis; tidak pernah memuat detail runtime. */
export const INTERNAL_ERROR_MESSAGE =
  "Terjadi kesalahan internal. Coba lagi beberapa saat lagi.";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

/**
 * Buat `Response` JSON error sesuai kontrak.
 *
 * @param code kode dari tabel di `api-contract.md`.
 * @param status HTTP status yang menyertainya.
 * @param message pesan statis dalam bahasa Indonesia, aman ditampilkan.
 * @param details detail opsional yang tidak sensitif.
 * @param extraHeaders header tambahan (mis. `Retry-After` untuk 429). Tidak
 * boleh menimpa `Cache-Control`; nilainya selalu `no-store`.
 */
export function apiErrorResponse(
  code: ApiErrorCode,
  status: number,
  message: string,
  details?: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;

  return Response.json(body, {
    status,
    headers: { ...extraHeaders, "Cache-Control": "no-store" },
  });
}
