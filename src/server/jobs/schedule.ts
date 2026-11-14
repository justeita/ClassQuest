/**
 * Penjadwal job generasi cerita.
 *
 * Route upload (task 16) hanya bergantung pada tanda tangan fungsi ini: ia
 * menerima id job, id story, bytes PDF yang sudah divalidasi, `tone` opsional, dan
 * `mode` permainan pilihan guru, lalu menjadwalkan `runJob()` lewat `after()`
 * dari `next/server` pada invocation yang sama
 * (`docs/06-backend/jobs-and-limits.md`, ADR 0028).
 *
 * Kontrak yang dipegang:
 *
 * - Bytes PDF **hanya** dioper lewat memori. Tidak ada path, disk, bucket, atau
 *   penyimpanan database untuk PDF (`docs/01-architecture/data-flow.md`).
 * - `scheduleJob()` tidak melempar. Kegagalan `runJob()` di dalam `after()`
 *   ditangkap supaya tidak menjadi unhandled rejection; `runJob()` sendiri
 *   sudah menandai job `failed`.
 * - Modul ini hanya boleh diimpor dari server code.
 */

import { after } from "next/server";

import { runJob, type RunJobDeps, type RunJobInput } from "./run";

/** Input penjadwalan yang diterima route upload. */
export type ScheduledJobInput = RunJobInput;

/**
 * Jadwalkan pipeline generasi untuk job yang baru dibuat.
 *
 * `deps` hanya dipakai test; route upload memanggil tanpa argumen kedua.
 */
export function scheduleJob(
  input: ScheduledJobInput,
  deps: RunJobDeps = {},
): void {
  after(async () => {
    try {
      await runJob(input, deps);
    } catch {
      // `runJob()` tidak pernah melempar, tetapi `after()` tidak boleh
      // menerima rejection apa pun. Tidak ada isi PDF yang di-log.
    }
  });
}
