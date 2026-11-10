/**
 * `POST /api/auth/logout` — hapus cookie sesi guru.
 *
 * Kontrak: bagian "Login dan logout guru" di
 * `docs/06-backend/api-contract.md`. Aman dipanggil tanpa sesi: hasilnya tetap
 * `200 { ok: true }`, jadi tombol keluar tidak pernah gagal hanya karena
 * cookie sudah tidak ada.
 */

import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/server/api-error";
import { logoutTeacher } from "@/server/auth";

export async function POST(): Promise<Response> {
  try {
    await logoutTeacher();
    return Response.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
  }
}
