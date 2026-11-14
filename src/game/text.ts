/**
 * Teks Phaser yang tetap tajam saat canvas game diperbesar.
 *
 * Sejak ADR 0007, dialog dan prompt interaksi dirender di DOM. Label progres
 * "Memuat…" yang dulu tersisa di `PreloadScene` juga sudah pindah ke layar muat
 * DOM (`LoadingScreen.tsx`), jadi **tidak ada lagi teks yang digambar ke
 * canvas**. Utilitas ini disimpan untuk teks canvas yang mungkin muncul lagi
 * (mis. angka debug), bukan untuk UI game — UI baru tetap harus DOM.
 *
 * Kalau tetap dipakai, teks canvas perlu bantuan karena canvas 640×360
 * di-upscale ke layar:
 *
 * 1. `pixelArt: true` membuat **semua** tekstur memakai filter NEAREST —
 *    termasuk tekstur teks, sehingga huruf bergerigi saat diperbesar.
 * 2. Tekstur teks dibuat pada ukuran internal, jadi detailnya hilang sebelum
 *    diperbesar.
 *
 * Solusi: kerapatan tekstur dinaikkan (`setResolution`) dan filter LINEAR
 * dipasang ulang setiap kali isi teks berubah.
 */

import Phaser from "phaser";

/** Kerapatan tekstur teks; 4× cukup tajam sampai layar 1080p. */
export const RESOLUSI_TEKS = 4;

/** Pasang filter LINEAR pada tekstur teks (bukan NEAREST milik pixel art). */
function filterLinear(text: Phaser.GameObjects.Text): void {
  const texture = text.texture;
  if (texture && typeof texture.setFilter === "function") {
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/**
 * Jadikan satu objek Text tajam: kerapatan tinggi + filter LINEAR, dan pastikan
 * filter dipasang ulang setiap kali `setText()` dipanggil.
 */
export function teksTajam(
  text: Phaser.GameObjects.Text,
): Phaser.GameObjects.Text {
  text.setResolution(RESOLUSI_TEKS);
  filterLinear(text);

  const setTextAsli = text.setText.bind(text);
  text.setText = (value: string | string[]): Phaser.GameObjects.Text => {
    setTextAsli(value);
    filterLinear(text);
    return text;
  };

  return text;
}
