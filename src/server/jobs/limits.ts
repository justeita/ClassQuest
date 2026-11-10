/**
 * Batas waktu job generasi.
 *
 * `docs/06-backend/jobs-and-limits.md` menetapkan deadline pipeline (120 detik)
 * dan pagar satu panggilan LLM (60 detik), tetapi tidak menetapkan kapan sebuah
 * job yang tidak pernah selesai boleh dianggap gagal. Nilai di sini mengisi
 * celah itu; lihat laporan task 19 untuk usulan baris di dokumen.
 *
 * Kenapa ada batas ini: `after()` berjalan di instance yang sama dengan
 * request upload. Kalau platform mematikan instance, database mati, atau
 * penjadwalan gagal, baris `jobs` bisa tertinggal di `queued`/`running`
 * selamanya dan UI akan polling tanpa akhir.
 */

/**
 * Umur maksimal job `queued`/`running` sebelum dianggap basi, dalam detik.
 *
 * `maxDuration` route upload = 300 detik (waktu terburuk pipeline ≈ 120 + 60 =
 * 180 detik, ditambah ekstraksi dan penyimpanan). Margin 30 detik memberi ruang
 * untuk pembulatan dan penutupan invocation. Nilai ini **sengaja tidak diimpor**
 * route upload: `maxDuration` harus literal agar bisa dianalisis Next, dan
 * `src/app/api/upload/route.test.ts` menjaga hubungannya.
 */
export const JOB_STALE_AFTER_SECONDS = 330;
