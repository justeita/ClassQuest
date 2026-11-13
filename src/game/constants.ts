/**
 * Konstanta game tanpa dependensi — boleh diimpor modul murni (tes, camera)
 * tanpa menarik Phaser ikut ke jsdom.
 *
 * Sumber angka: ADR 0009 (resolusi internal 640×360).
 */

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Batas atas lebar internal agar layar sangat lebar tidak menampilkan dunia
 *  terlalu luas ke samping. */
export const GAME_WIDTH_MAKS = 960;

/**
 * Skala bulat terbesar yang masih muat di kontainer.
 *
 * Kanvas selalu di-upscale dengan faktor **bulat** supaya satu piksel internal
 * jatuh tepat di 1, 2, 3, … piksel layar. Skala pecahan (mis. 2,41×) membuat
 * lebar piksel bergantian 2 dan 3 piksel, lalu pola itu bergeser setiap kali
 * kamera bergerak — terlihat seperti pixel art yang berkedip saat berjalan.
 *
 * Minimal 1: kontainer yang lebih pendek dari 360 px tetap menampilkan seluruh
 * tinggi internal tanpa memperkecil pecahan.
 */
export function skalaBulat(
  lebarKontainer: number,
  tinggiKontainer: number,
): number {
  const skala = Math.min(
    Math.floor(lebarKontainer / GAME_WIDTH),
    Math.floor(tinggiKontainer / GAME_HEIGHT),
  );
  return Math.max(1, skala);
}

/**
 * Lebar internal untuk satu skala bulat.
 *
 * `Math.floor` memastikan `lebar × skala` tidak melebihi kontainer, sehingga
 * sisa ruang menjadi bar gelap di tepi alih-alih piksel yang tidak rata. Nilai
 * dijepit 640–960 supaya dunia tidak pernah sempit atau terlalu lebar. Tinggi
 * internal selalu `GAME_HEIGHT`.
 */
export function lebarKanvas(lebarKontainer: number, skala: number): number {
  const lebar = Math.floor(lebarKontainer / skala);
  return Math.min(GAME_WIDTH_MAKS, Math.max(GAME_WIDTH, lebar));
}
