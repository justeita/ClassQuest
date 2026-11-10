/**
 * `GET /api/jobs/[jobId]` — status generasi untuk polling.
 *
 * Kontrak: `docs/06-backend/api-contract.md#get-apijobsjobid` (bentuk respons,
 * stage/progress, `Cache-Control: no-store`, hanya pemilik) dan
 * `docs/06-backend/jobs-and-limits.md` (kode error job).
 *
 * Route ini tipis: otorisasi, baca status lewat `getJobStatus()`, terjemahkan
 * ke `Response`. Logika (termasuk penanganan job basi) ada di
 * `src/server/jobs/status.ts` supaya bisa dites tanpa HTTP.
 *
 * Catatan Next 16: `params` adalah Promise, jadi harus di-await. Tidak ada
 * `export const runtime` (lihat `docs/08-workflow/ai-agent-rules.md`, MUST NOT
 * #7). Route handler tidak di-cache, tetapi `no-store` tetap diset eksplisit
 * seperti yang diminta kontrak.
 */

import { AuthError, requireTeacher } from "@/server/auth";
import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/server/api-error";
import { getReadyDb } from "@/server/db";
import { getJobStatus } from "@/server/jobs/status";

/** Pesan statis; tidak menyebut apakah job ada atau milik siapa. */
const NOT_FOUND_MESSAGE = "Job tidak ditemukan.";

const noStore = { "Cache-Control": "no-store" } as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  try {
    const { teacherId } = await requireTeacher();
    const { jobId } = await params;

    const db = await getReadyDb();
    const { result } = await getJobStatus(db, { jobId, teacherId });

    // Job yang tidak ada dan job milik guru lain dijawab identik supaya
    // keberadaan job tidak bocor.
    if (result === null) {
      return apiErrorResponse("NOT_FOUND", 404, NOT_FOUND_MESSAGE);
    }

    return Response.json(result, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiErrorResponse(error.code, error.status, error.message);
    }
    // Error tak terduga: 500 generik tanpa detail, tanpa log isi database.
    return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
  }
}
