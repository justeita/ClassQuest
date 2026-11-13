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
 * Sisa tinggi (dalam kelipatan tinggi kanvas) yang masih boleh dibiarkan jadi
 * bar gelap demi mendapat skala bulat.
 *
 * `0,06` berarti bar atas-bawah paling banyak ~6% tinggi kontainer. Di atas itu
 * kanvas lebih baik dibesarkan dengan skala pecahan: bar besar membuat game
 * terlihat seperti strip kecil di tengah layar.
 */
export const SISA_SKALA_MAKS = 0.06;

/**
 * Skala kanvas terhadap kontainer.
 *
 * Dua mode, dipilih otomatis:
 *
 * 1. **Bulat** — kalau kontainer hampir pas kelipatan tinggi internal (sisa
 *    ≤ `SISA_SKALA_MAKS`), pakai 1×, 2×, 3×, …. Satu piksel internal jatuh
 *    tepat di sekian piksel layar, jadi pixel art paling tajam.
 * 2. **Penuh** — kalau tidak, pakai skala pecahan `tinggi ÷ 360` supaya kanvas
 *    memenuhi bingkai. Skala pecahan membuat lebar piksel bergantian 1–2 px,
 *    tetapi posisi objek, kamera, dan pembulatan vertex sudah dikunci ke piksel
 *    utuh (`roundPixels`, `fullAuto`, `CAMERA_LERP` 1), jadi polanya diam —
 *    tidak ada lagi getaran yang terlihat saat berjalan.
 *
 * Batasnya juga `lebarKontainer ÷ 640`: kontainer sempit (mis. ponsel portrait)
 * tidak boleh membuat kanvas lebih lebar dari bingkainya.
 */
export function skalaKanvas(
  lebarKontainer: number,
  tinggiKontainer: number,
): number {
  if (!(lebarKontainer > 0) || !(tinggiKontainer > 0)) return 1;

  const pas = Math.min(
    tinggiKontainer / GAME_HEIGHT,
    lebarKontainer / GAME_WIDTH,
  );
  const bulat = Math.floor(pas);
  const sisa = pas - bulat;

  if (bulat >= 1 && sisa <= SISA_SKALA_MAKS) return bulat;
  return pas;
}

/**
 * Lebar internal untuk satu skala kanvas.
 *
 * `Math.floor` memastikan `lebar × skala` tidak melebihi kontainer, sehingga
 * sisa ruang (kalau ada) menjadi bar tipis di tepi alih-alih piksel yang tidak
 * rata. Nilai dijepit 640–960 supaya dunia tidak pernah sempit atau terlalu
 * lebar. Tinggi internal selalu `GAME_HEIGHT`.
 */
export function lebarKanvas(lebarKontainer: number, skala: number): number {
  const lebar = Math.floor(lebarKontainer / skala);
  return Math.min(GAME_WIDTH_MAKS, Math.max(GAME_WIDTH, lebar));
}

/** Ukuran yang dipakai Phaser dan pengatur `resize` — satu sumber hitungan. */
export function ukuranKanvas(
  lebarKontainer: number,
  tinggiKontainer: number,
): { skala: number; lebar: number } {
  const skala = skalaKanvas(lebarKontainer, tinggiKontainer);
  return { skala, lebar: lebarKanvas(lebarKontainer, skala) };
}
