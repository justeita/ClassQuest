/**
 * Ukuran dan arah sprite karakter dunia.
 *
 * Angka-angka ini datang dari editor peta:
 *
 * - Setiap karakter punya **satu** frame per arah (tanpa animasi jalan).
 *   Urutan frame: depan, depan-kanan, kanan, belakang-kanan, belakang,
 *   belakang-kiri, kiri, depan-kiri.
 * - Seluruh gambar diperkecil ke 87,5% saat digambar (editor: `SB = 0.875`),
 *   jadi tinggi karakter desa yang framenya 64 px menjadi 56 px di peta.
 * - Kotak tabrakan hanya di kaki: `16 × 9` px, dengan titik kaki sebagai
 *   acuannya (lihat `collision.ts`).
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
 * Arah hadap → indeks frame spritesheet.
 *
 * Dipakai juga untuk NPC: `face` di `village.json` memakai indeks yang sama.
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

/** Perbandingan ukuran gambar karakter terhadap frame aslinya (editor: `SB`). */
export const SKALA_KARAKTER = 0.875;

/** Tinggi karakter desa di peta: frame 64 px × 0,875 (editor: `BH`). */
export const TINGGI_KARAKTER = 56;

/**
 * Ukuran gambar satu karakter dari ukuran framenya, untuk semua karakter desa
 * yang tingginya sama.
 */
export function ukuranKarakter(
  frameWidth: number,
  frameHeight: number,
): { width: number; height: number } {
  return {
    width: frameWidth * SKALA_KARAKTER,
    height: frameHeight * SKALA_KARAKTER,
  };
}

/** Jumlah frame satu spritesheet karakter. */
export const JUMLAH_FRAME_KARAKTER = 8;
