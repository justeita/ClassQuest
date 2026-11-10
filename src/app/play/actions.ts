"use server";

/**
 * `savePlayResult` — simpan hasil bermain siswa (task 22).
 *
 * Kontrak: `docs/06-backend/api-contract.md` bagian "Server Actions"
 * (`savePlayResult({ storyId, result })` → `{ ok: true }`, tanpa sesi).
 * Nama action wajib sama dengan kontrak (lihat `docs/05-frontend/routes.md`).
 *
 * Action tipis: input dinormalisasi, logika ada di `src/server/play-results`
 * (skor dihitung ulang server, hanya cerita terbit yang diterima). Tidak ada
 * `revalidatePath` — halaman siswa tidak menampilkan data ini.
 */

import type { SavePlayResultOutcome } from "@/server/contracts";
import { getReadyDb } from "@/server/db";
import { savePlayResult as savePlayResultCore } from "@/server/play-results";

const MAX_STORY_ID_LENGTH = 200;

export async function savePlayResult(
  input: unknown,
): Promise<SavePlayResultOutcome> {
  if (input === null || typeof input !== "object") {
    return { ok: false, reason: "invalid" };
  }

  const { storyId, result } = input as {
    storyId?: unknown;
    result?: unknown;
  };

  if (
    typeof storyId !== "string" ||
    storyId === "" ||
    storyId.length > MAX_STORY_ID_LENGTH
  ) {
    return { ok: false, reason: "not_found" };
  }

  return savePlayResultCore(await getReadyDb(), { storyId, result });
}
