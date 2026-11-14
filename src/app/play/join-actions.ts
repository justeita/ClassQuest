"use server";

/**
 * `masukKelas` — gerbang kode kelas `/play` (Server Action).
 *
 * Kontrak: `docs/06-backend/api-contract.md` bagian "Server Actions" dan
 * `docs/09-decisions/0041-masuk-dengan-nis.md`.
 *
 * Action tipis: rate limit lebih dulu, lalu seluruh keputusan diserahkan ke
 * `src/server/play/join.ts` (kode → kelas → NIS terdaftar → game terbit guru
 * itu → identitas). Siswa masuk dengan kode kelas + **NIS**, bukan nama.
 * Tidak ada `revalidatePath`: halaman `/play` tidak menampilkan data ini, dan
 * cerita dikirim balik sebagai bagian hasil supaya siswa bisa langsung main
 * tanpa navigasi.
 *
 * Rate limit (30 percobaan / 10 menit per IP, di memori) dipanggil **sebelum**
 * kode disentuh, supaya kode `QST-XXXX` tidak bisa ditebak beruntun. Batas
 * terlampaui dijawab `{ ok: false, reason: "rate_limited" }` — Server Action
 * tidak bisa mengirim HTTP 429. Kalau penghitungnya gagal, permintaan tetap
 * diproses (fail open): siswa tidak boleh tertahan karena masalah limiter.
 */

import type { JoinOutcome } from "@/server/contracts";
import { getReadyDb } from "@/server/db";
import { startJoin } from "@/server/play/join";
import { guardJoinClassCode } from "@/server/rate-limit";

export async function masukKelas(input: unknown): Promise<JoinOutcome> {
  // Rate limit paling awal, sebelum input disentuh.
  const gate = await guardJoinClassCode();
  if (gate.result !== null && !gate.result.allowed) {
    return { ok: false, reason: "rate_limited" };
  }

  if (input === null || typeof input !== "object") {
    return { ok: false, reason: "invalid_code" };
  }

  const { kode, nis, storyId } = input as {
    kode?: unknown;
    nis?: unknown;
    storyId?: unknown;
  };

  return startJoin(await getReadyDb(), {
    code: kode,
    nis,
    storyId,
  });
}
