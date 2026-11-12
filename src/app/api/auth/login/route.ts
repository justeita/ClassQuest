/**
 * `POST /api/auth/login` — guru masuk dengan username + password.
 *
 * Kontrak: bagian "Login dan logout guru" di
 * `docs/06-backend/api-contract.md`. Endpoint ini tipis: validasi bentuk body,
 * lalu serahkan verifikasi kredensial + penerbitan cookie ke `loginTeacher()`
 * (`src/server/auth.ts`).
 *
 * Aturan yang dipegang:
 *
 * - Username tidak dikenal, password salah, akun tanpa hash, dan secret sesi
 *   yang belum diisi dijawab **sama** (`401 UNAUTHORIZED` dengan pesan
 *   identik). Klien tidak boleh bisa membedakan penyebabnya.
 * - Body yang bukan JSON atau tanpa `username`/`password` dijawab
 *   `400 INVALID_INPUT` (kode yang sama dengan route upload).
 * - Tidak ada username, password, hash, token, atau secret di respons maupun
 *   log.
 * - **Rate limit diperiksa paling awal**, sebelum body dibaca dan sebelum
 *   kredensial diverifikasi: 10 percobaan per 10 menit per IP, semua percobaan
 *   dihitung (`src/server/rate-limit`). Batas terlampaui dijawab `429
 *   RATE_LIMITED` dengan header `Retry-After`. Kalau penghitungnya sendiri
 *   gagal (database mati), login **fail closed** dengan `500 INTERNAL` generik:
 *   lebih baik guru menunggu daripada password bisa ditebak tanpa batas.
 */

import { z } from "zod";

import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/server/api-error";
import { AuthError, loginTeacher } from "@/server/auth";
import { MAX_PASSWORD_LENGTH } from "@/server/password";
import { guardLogin } from "@/server/rate-limit";

/**
 * `username` dan `password` harus string. String kosong diterima bentuknya dan
 * ditolak oleh `loginTeacher()` dengan 401; tipe lain (angka, objek, `null`)
 * adalah bentuk salah, jadi 400.
 *
 * Batas panjangnya sama dengan batas hashing: 64 karakter untuk username dan
 * 200 untuk password. Password yang lebih pendek dari minimum tidak mungkin
 * cocok, jadi tetap 401 (bukan 400) supaya klien tidak mendapat petunjuk
 * tambahan.
 */
const loginBodySchema = z.object({
  username: z.string().max(64),
  password: z.string().max(MAX_PASSWORD_LENGTH),
});

/** Pesan statis untuk body yang tidak bisa dibaca atau bentuknya salah. */
const INVALID_BODY_MESSAGE =
  'Permintaan masuk tidak valid. Kirim JSON { "username": "...", "password": "..." }.';

export async function POST(request: Request): Promise<Response> {
  try {
    // a. Rate limit paling awal: sebelum body dibaca dan sebelum kredensial
    // diverifikasi. `guardLogin()` menghitung semua percobaan dan sudah
    // mengembalikan 429 (batas) atau 500 (limiter gagal) bila perlu.
    const gate = await guardLogin();
    if (gate.response !== null) return gate.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErrorResponse("INVALID_INPUT", 400, INVALID_BODY_MESSAGE);
    }

    const parsed = loginBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse("INVALID_INPUT", 400, INVALID_BODY_MESSAGE);
    }

    // Username salah, password salah, dan secret sesi kosong semuanya
    // `AuthError` 401 dengan pesan yang sama.
    await loginTeacher({
      username: parsed.data.username,
      password: parsed.data.password,
    });

    return Response.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return apiErrorResponse(error.code, error.status, error.message);
    }
    return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
  }
}
