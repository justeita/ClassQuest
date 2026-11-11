/**
 * Respons `429` untuk permintaan yang melewati rate limit.
 *
 * Bentuk body tetap `ApiError` dari `docs/06-backend/api-contract.md`
 * (`error: { code: "RATE_LIMITED", message }`) ditambah header `Retry-After`
 * dalam **detik**. `Retry-After` adalah header HTTP standar; tidak ada field
 * `retryAfterSec` di body karena bentuk `ApiError` tidak punya tempat untuk itu
 * (lihat bagian Rate limit di kontrak).
 *
 * Pesan selalu statis: tidak memuat IP, key, hash, atau nama limit. `details`
 * hanya berisi `retryAfterSeconds`, angka yang aman ditampilkan.
 */

import { apiErrorResponse } from "../api-error";

import type { RateLimitResult } from "./check";

/** Pesan umum; jangan menyisipkan nilai input ke sini. */
export const RATE_LIMITED_MESSAGE =
  "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.";

/** `Retry-After` minimum bila hasil limiter tidak memberi angka positif. */
const MIN_RETRY_AFTER_SECONDS = 1;

/**
 * `Retry-After` dari hasil limiter, dibulatkan ke atas dan minimal satu detik.
 * Dibulatkan ke atas supaya klien tidak mencoba lagi sedikit terlalu cepat.
 */
export function retryAfterOf(result: RateLimitResult): number {
  return Math.max(MIN_RETRY_AFTER_SECONDS, Math.ceil(result.retryAfterSeconds));
}

/** Respons 429 standar untuk route handler. */
export function rateLimitedResponse(retryAfterSeconds: number): Response {
  const seconds = Math.max(
    MIN_RETRY_AFTER_SECONDS,
    Math.ceil(retryAfterSeconds),
  );

  return apiErrorResponse(
    "RATE_LIMITED",
    429,
    RATE_LIMITED_MESSAGE,
    { retryAfterSeconds: seconds },
    { "Retry-After": String(seconds) },
  );
}

/** Ubah hasil limiter menjadi 429, atau `null` bila diizinkan. */
export function rateLimitResponseIfBlocked(
  result: RateLimitResult,
): Response | null {
  if (result.allowed) return null;

  return rateLimitedResponse(retryAfterOf(result));
}
