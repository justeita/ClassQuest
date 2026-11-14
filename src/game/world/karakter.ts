/**
 * Ukuran, arah, dan animasi sprite karakter dunia.
 *
 * Sejak `scripts/import-characters.mjs`, tiap karakter punya **satu spritesheet
 * berpetak**: satu baris per arah hadap dan kolomnya animasi idle lebih dulu,
 * baru walk. Semua karakter desa digambar dengan tinggi yang sama di peta
 * (`TINGGI_KARAKTER`), jadi lebar layarnya mengikuti tinggi frame aslinya.
 *
 * Kotak tabrakan tetap hanya di kaki: `16 × 9` px, dengan titik kaki sebagai
 * acuannya (lihat `collision.ts`).
 */

/** Delapan arah hadap: empat arah utama + empat diagonal. */
export type ArahGerak =
  | "down"
  | "up"
  | "left"
  | "right"
  | "down-left"
  | "down-right"
  | "up-left"
  | "up-right";

/**
 * Arah hadap → **indeks baris** spritesheet.
 *
 * Urutannya selatan dulu lalu searah jarum jam, sama dengan urutan baris yang
 * ditulis `scripts/import-characters.mjs`. Dipakai juga untuk NPC: `face` di
 * `village.json` memakai indeks yang sama.
 */
export const FRAME_ARAH: Record<ArahGerak, number> = {
  down: 0,
  "down-right": 1,
  right: 2,
  "up-right": 3,
  up: 4,
  "up-left": 5,
  left: 6,
  "down-left": 7,
};

/** Kebalikan `FRAME_ARAH`: indeks baris → arah hadap. */
export const ARAH_DARI_BARIS: readonly ArahGerak[] = [
  "down",
  "down-right",
  "right",
  "up-right",
  "up",
  "up-left",
  "left",
  "down-left",
];

/** Tinggi karakter desa di peta, dalam piksel. */
export const TINGGI_KARAKTER = 56;

/** Kecepatan animasi idle (napas) dan walk (langkah), dalam frame per detik. */
export const FPS_IDLE = 6;
export const FPS_WALK = 10;

/**
 * Ukuran gambar satu karakter di peta dari ukuran framenya.
 *
 * Tingginya selalu `TINGGI_KARAKTER` supaya semua warga desa sejajar; lebarnya
 * mengikuti rasio frame aslinya agar tidak gepeng.
 */
export function ukuranKarakter(
  frameWidth: number,
  frameHeight: number,
): { width: number; height: number } {
  const skala = TINGGI_KARAKTER / frameHeight;
  return { width: frameWidth * skala, height: TINGGI_KARAKTER };
}

/** Arah mana yang menghadap ke titik `(dx, dy)` dari si karakter. */
export function arahKe(dx: number, dy: number): ArahGerak {
  if (dx === 0 && dy === 0) return "down";
  // `atan2(dx, dy)` mengukur sudut dari arah selatan lalu berputar searah jarum
  // jam di layar, jadi hasilnya langsung sejajar dengan urutan `FRAME_ARAH`.
  const oktan = Math.round(Math.atan2(dx, dy) / (Math.PI / 4));
  return ARAH_DARI_BARIS[((oktan % 8) + 8) % 8];
}

/** Jenis animasi karakter: diam (idle) atau berjalan (walk). */
export type JenisAnimasi = "idle" | "walk";

/** Kunci animasi Phaser satu karakter; unik per karakter, jenis, dan arah. */
export function kunciAnimasi(
  karakterId: string,
  jenis: JenisAnimasi,
  arah: ArahGerak,
): string {
  return `${karakterId}:${jenis}:${arah}`;
}

/**
 * Indeks frame pertama satu animasi di spritesheet karakternya.
 *
 * Tata letak: `baris = FRAME_ARAH[arah]`, `kolom = idleFrames + walkFrames`,
 * dan animasi walk dimulai `idleFrames` kolom setelah idle.
 */
export function indeksFrameAnimasi(
  frames: { idleFrames: number; walkFrames: number },
  jenis: JenisAnimasi,
  arah: ArahGerak,
): number {
  const kolom = frames.idleFrames + frames.walkFrames;
  const mulai = jenis === "walk" ? frames.idleFrames : 0;
  return FRAME_ARAH[arah] * kolom + mulai;
}
