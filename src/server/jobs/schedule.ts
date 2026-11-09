/**
 * Penjadwal job generasi cerita.
 *
 * **Placeholder — diimplementasikan di task 18.** Route upload (task 16) hanya
 * bergantung pada tanda tangan fungsi ini: ia menerima id job, id story, dan
 * bytes PDF yang sudah divalidasi, lalu menjadwalkan pipeline generasi lewat
 * `after()` dari `next/server` pada invocation yang sama.
 *
 * Kontrak yang dipegang sejak task 16:
 *
 * - Bytes PDF **hanya** dioper lewat memori. Tidak ada path, disk, bucket, atau
 *   penyimpanan database untuk PDF (`docs/01-architecture/data-flow.md`).
 * - Fungsi ini tidak melempar dan tidak menulis database; kegagalan penjadwalan
 *   nyata nanti adalah tanggung jawab task 18.
 * - Modul ini hanya boleh diimpor dari server code.
 */

/** Input penjadwalan yang diterima route upload. */
export type ScheduledJobInput = {
  /** Id baris `jobs` yang baru dibuat bersama story-nya. */
  jobId: string;
  /** Id baris `stories` yang baru dibuat. */
  storyId: string;
  /** PDF mentah yang sudah lolos validasi upload. Hanya hidup di memori. */
  pdf: {
    bytes: Uint8Array;
    /** Nama file yang sudah disanitasi, hanya untuk tampilan. */
    filename: string;
    /** Ukuran isi yang benar-benar dibaca, bukan metadata klien. */
    sizeBytes: number;
  };
};

/**
 * Jadwalkan pipeline generasi untuk job yang baru dibuat.
 *
 * **Diimplementasikan di task 18** lewat `after()`. Untuk sekarang fungsi ini
 * sengaja tidak melakukan apa pun supaya route upload bisa selesai dan dites
 * tanpa pipeline; bytes yang diterima tidak dipakai dan tidak disimpan di mana
 * pun.
 */
export function scheduleJob(input: ScheduledJobInput): void {
  // Placeholder task 16: tanda tangan mengikat, perilaku menyusul di task 18.
  void input;
}
