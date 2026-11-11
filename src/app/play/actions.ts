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
 *
 * Rate limit (task 24): 120 permintaan per 10 menit per IP, dihitung di
 * database (`src/server/rate-limit`) dan diperiksa **paling awal**, sebelum
 * input disentuh. Batas ini longgar karena satu kelas bisa berbagi satu IP.
 * Batas terlampaui dijawab `{ ok: false, reason: "rate_limited" }` (Server
 * Action tidak bisa mengirim HTTP 429). Kalau penghitungnya gagal, hasil
 * bermain **tetap diproses** (fail open): siswa tidak boleh kehilangan hasil
 * main karena masalah limiter.
 */

import type { SavePlayResultOutcome } from "@/server/contracts";
import { getReadyDb } from "@/server/db";
import { savePlayResult as savePlayResultCore } from "@/server/play-results";
import { guardPlayResult } from "@/server/rate-limit";

const MAX_STORY_ID_LENGTH = 200;

export async function savePlayResult(
  input: unknown,
): Promise<SavePlayResultOutcome> {
  // Rate limit paling awal, sebelum input disentuh. Fail open: `gate.response`
  // tidak pernah dipakai di sini karena action bukan route handler.
  const gate = await guardPlayResult();
  if (gate.result !== null && !gate.result.allowed) {
    return { ok: false, reason: "rate_limited" };
  }

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
