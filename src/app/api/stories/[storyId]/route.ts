/**
 * `GET /api/stories/[storyId]` — cerita versi terbit untuk game siswa.
 *
 * Kontrak: `docs/06-backend/api-contract.md#get-apistorystoryid`:
 *
 * - **Publik**, tanpa login; hanya `status = 'published'` yang dilayani.
 *   Status lain (`processing`, `draft`, `failed`, `archived`), cerita yang
 *   tidak ada, dan id tidak valid semuanya dijawab `404 NOT_FOUND` dengan
 *   body **identik**, supaya keberadaan cerita belum terbit tidak bocor.
 * - Respons `{ storyId, version, publishedAt, story }` — versi yang dilayani
 *   adalah `published_version` (bukan versi terbaru), jadi guru bisa mengedit
 *   draft berikutnya tanpa mengubah yang sedang dimainkan siswa.
 * - `Cache-Control: no-store`.
 * - Tidak ada `teacher_id`, nama file sumber, data job, `created_by`, atau
 *   metadata internal lain di respons.
 *
 * Catatan Next 16: `params` adalah Promise; tanpa `export const runtime`
 * (Cache Components, lihat `docs/08-workflow/ai-agent-rules.md`).
 *
 * Rate limit (task 24): 120 permintaan per menit per IP, dihitung **di memori
 * proses ini** tanpa tulis database (`src/server/rate-limit/memory.ts`). Batas
 * ini berlaku per instance, bukan per deploy. Kalau pemeriksaannya sendiri
 * gagal, permintaan tetap dilayani (fail open): siswa tidak boleh terhalang
 * karena limiter. Batas terlampaui dijawab `429 RATE_LIMITED` + `Retry-After`.
 */

import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/server/api-error";
import { getReadyDb } from "@/server/db";
import { guardPublicStoryRead } from "@/server/rate-limit";
import { getPublishedStory, MAX_STORY_ID_LENGTH } from "@/server/stories";

/** Pesan statis yang sama untuk semua kegagalan 404 di endpoint ini. */
const NOT_FOUND_MESSAGE = "Cerita tidak ditemukan.";

const noStore = { "Cache-Control": "no-store" } as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
): Promise<Response> {
  try {
    // Rate limit paling awal; tidak menyentuh database dan gagal = dilayani.
    const gate = await guardPublicStoryRead();
    if (gate.response !== null) return gate.response;

    const { storyId } = await params;

    // Validasi format/panjang: id yang tidak masuk akal dijawab sama dengan
    // "tidak ada" (404), tanpa membocorkan apa pun.
    if (
      typeof storyId !== "string" ||
      storyId === "" ||
      storyId.length > MAX_STORY_ID_LENGTH
    ) {
      return apiErrorResponse("NOT_FOUND", 404, NOT_FOUND_MESSAGE);
    }

    const db = await getReadyDb();
    const published = await getPublishedStory(db, { storyId });

    if (published === null) {
      return apiErrorResponse("NOT_FOUND", 404, NOT_FOUND_MESSAGE);
    }

    return Response.json(
      {
        storyId: published.storyId,
        version: published.version,
        publishedAt: published.publishedAt,
        story: published.story,
      },
      { status: 200, headers: noStore },
    );
  } catch {
    // Error tak terduga: 500 generik tanpa detail, tanpa log isi database.
    return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
  }
}
