/**
 * `POST /api/auth/login` — guru memasukkan kode akses.
 *
 * Kontrak: bagian "Login dan logout guru" di
 * `docs/06-backend/api-contract.md`. Endpoint ini tipis: validasi bentuk body,
 * lalu serahkan verifikasi kode + penerbitan cookie ke `loginTeacher()`
 * (`src/server/auth.ts`).
 *
 * Aturan yang dipegang:
 *
 * - Kode salah, kosong, dan konfigurasi env belum diisi dijawab **sama**
 *   (`401 UNAUTHORIZED` dengan pesan identik). Klien tidak boleh bisa
 *   membedakan "salah" dari "belum dikonfigurasi".
 * - Body yang bukan JSON atau tanpa `code` dijawab `400 INVALID_INPUT` (kode
 *   yang sama dengan route upload).
 * - Tidak ada kode akses, token, atau secret di respons maupun log.
 * - Rate limit belum ada; menyusul di task 24.
 */

import { z } from "zod";

import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/server/api-error";
import { AuthError, loginTeacher } from "@/server/auth";

/**
 * `code` harus string. String kosong diterima bentuknya dan ditolak oleh
 * `loginTeacher()` dengan 401; tipe lain (angka, objek, `null`) adalah bentuk
 * salah, jadi 400.
 *
 * Batas panjang tidak ada di docs; 200 karakter cukup untuk kode demo dan
 * mencegah payload raksasa diproses. Kode yang lebih panjang tidak mungkin
 * benar, jadi hasilnya tetap 401.
 */
const loginBodySchema = z.object({
  code: z.string().max(200),
});

/** Pesan statis untuk body yang tidak bisa dibaca atau tidak berbentuk `{ code }`. */
const INVALID_BODY_MESSAGE =
  'Permintaan masuk tidak valid. Kirim JSON { "code": "..." }.';

export async function POST(request: Request): Promise<Response> {
  try {
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

    // Kode salah, kosong, atau konfigurasi kosong semuanya `AuthError` 401
    // dengan pesan yang sama.
    await loginTeacher(parsed.data.code);

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
