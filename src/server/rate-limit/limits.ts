/**
 * Batas rate limit ClassQuest.
 *
 * Semua angka ada di file ini supaya mudah diubah dan mudah dibaca bersama
 * `docs/06-backend/api-contract.md` (bagian Rate limit) serta
 * `docs/06-backend/jobs-and-limits.md`. Tidak ada environment variable baru:
 * batas ini keputusan produk, bukan konfigurasi per deploy.
 *
 * Setiap kebijakan punya `name` yang menjadi awalan key di database
 * (`<nama-limit>:<hash>`); jangan mengganti `name` tanpa migrasi data, karena
 * key lama akan menjadi baris yatim yang menunggu pembersihan.
 */

/** Satu kebijakan fixed window: `limit` permintaan per `windowSeconds` detik. */
export type RateLimitPolicy = {
  /** Awalan key; stabil dan tidak sensitif. */
  readonly name: string;
  /** Jumlah maksimum permintaan yang diterima dalam satu jendela. */
  readonly limit: number;
  /** Panjang jendela dalam detik. */
  readonly windowSeconds: number;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Login: 10 percobaan per 10 menit per IP.
 *
 * Semua percobaan dihitung (berhasil maupun salah), dan pengecekan dilakukan
 * **sebelum** kode diverifikasi. Tujuannya menutup percobaan menebak kode akses
 * guru, bukan membatasi guru yang sah.
 */
export const LOGIN_RATE_LIMIT: RateLimitPolicy = {
  name: "login",
  limit: 10,
  windowSeconds: 10 * MINUTE,
};

/**
 * Upload per IP: 20 per jam.
 *
 * Dipilih lebih longgar daripada batas per guru karena satu sekolah bisa
 * berbagi satu IP (NAT). Angka ini menjaga penyalahgunaan dari satu mesin,
 * sementara batas per guru menjaga kuota tiap akun.
 */
export const UPLOAD_IP_RATE_LIMIT: RateLimitPolicy = {
  name: "upload-ip",
  limit: 20,
  windowSeconds: HOUR,
};

/**
 * Upload per guru: 10 per jam.
 *
 * Satu guru demo hanya butuh beberapa unggahan saat menyiapkan materi; 10
 * memberi ruang untuk salah pilih file tanpa membuka jalan penyalahgunaan.
 * Dicek setelah `requireTeacher()`, jadi permintaan tanpa sesi tidak pernah
 * menambah hitungan ini.
 */
export const UPLOAD_TEACHER_RATE_LIMIT: RateLimitPolicy = {
  name: "upload-teacher",
  limit: 10,
  windowSeconds: HOUR,
};

/**
 * Upload global: 100 per hari untuk semua guru.
 *
 * Ini pelindung biaya AI terakhir: walau satu guru punya beberapa IP, total
 * generasi per hari tetap dibatasi. Permintaan tanpa sesi tidak dihitung.
 */
export const UPLOAD_GLOBAL_RATE_LIMIT: RateLimitPolicy = {
  name: "upload-global",
  limit: 100,
  windowSeconds: DAY,
};

/**
 * `savePlayResult`: 120 per 10 menit per IP.
 *
 * Satu kelas bisa berbagi satu IP lewat NAT, jadi batas ini sengaja longgar:
 * tujuannya menahan skrip, bukan siswa. Action adalah jalur publik tanpa sesi.
 */
export const PLAY_RESULT_RATE_LIMIT: RateLimitPolicy = {
  name: "play-result",
  limit: 120,
  windowSeconds: 10 * MINUTE,
};

/**
 * `GET /api/stories/[storyId]`: 120 per menit per IP.
 *
 * Endpoint publik yang dipakai setiap siswa. Dihitung **di memori per proses**
 * (tanpa tulis database) supaya permintaan baca tidak menambah biaya tulis.
 */
export const PUBLIC_STORY_RATE_LIMIT: RateLimitPolicy = {
  name: "story-read",
  limit: 120,
  windowSeconds: MINUTE,
};

/**
 * Gerbang kode kelas di `/play`: 30 percobaan per 10 menit per IP.
 *
 * Kode kelas hanya 4 karakter dari 32 huruf (`QST-XXXX`, ±1 juta kombinasi),
 * jadi tanpa batas ini kode bisa ditebak beruntun dan daftar siswa kelas orang
 * lain ikut terbaca. 30 percobaan per 10 menit jauh di atas kebutuhan satu
 * kelas (satu siswa biasanya sekali masuk) tetapi membuat penebakan tidak
 * berguna. Disimpan **di memori** karena ini hanya baca, tanpa tulis database;
 * kegagalan limiter diperlakukan sebagai izin (fail open).
 */
export const JOIN_RATE_LIMIT: RateLimitPolicy = {
  name: "join",
  limit: 30,
  windowSeconds: 10 * MINUTE,
};

/**
 * Aksi kelas/siswa (`createClassroom`, `addStudent`): 60 per jam per guru.
 *
 * Keduanya Server Action yang bisa dipanggil berulang oleh skrip selama sesi
 * guru masih hidup, dan setiap panggilan menulis satu baris. Batas ini jauh di
 * atas kebutuhan manusiawi (menambah 60 siswa per jam cukup untuk satu kelas
 * penuh) tetapi menutup pengisian database dengan sampah.
 */
export const CLASSROOM_RATE_LIMIT: RateLimitPolicy = {
  name: "classroom-write",
  limit: 60,
  windowSeconds: HOUR,
};

/**
 * Umur maksimum baris `rate_limits` sebelum dibersihkan, dalam detik.
 * Satu hari cukup untuk semua jendela yang dipakai (maksimum 1 hari).
 */
export const RATE_LIMIT_ROW_RETENTION_SECONDS = DAY;

/**
 * Peluang pembersihan oportunistik per panggilan `checkRateLimit`, sekitar 1%.
 *
 * Pembersihan tidak dijalankan setiap panggilan agar tidak menambah satu
 * statement tulis pada setiap permintaan. Kalau gagal, kegagalan diabaikan:
 * kebersihan tabel bukan alasan menolak permintaan.
 */
export const RATE_LIMIT_CLEANUP_PROBABILITY = 0.01;
