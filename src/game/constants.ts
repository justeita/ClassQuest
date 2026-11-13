/**
 * Konstanta game tanpa dependensi — boleh diimpor modul murni (tes, camera)
 * tanpa menarik Phaser ikut ke jsdom.
 *
 * Sumber angka: ADR 0009 (resolusi internal 640×360).
 */

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/**
 * Lebar internal agar kanvas pas kanan-kiri tanpa letterbox dan tanpa crop.
 *
 * Tinggi internal selalu `GAME_HEIGHT` (360); lebarnya mengikuti rasio layar,
 * sehingga layar yang lebih lebar menampilkan **lebih banyak dunia** ke samping
 * — bukan bar hitam (FIT) atau potongan atas-bawah (ENVELOP).
 * Dibatasi 640–960 agar permainan tetap wajar di layar sangat lebar.
 */
export function lebarInternal(aspek: number): number {
  const lebar = Math.round(GAME_HEIGHT * aspek);
  return Math.min(960, Math.max(GAME_WIDTH, lebar));
}
