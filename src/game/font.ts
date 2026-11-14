/**
 * Font UI game.
 *
 * Teks dialog tidak digambar di canvas lagi (lihat ADR 0007 dan
 * `docs/04-game/world-design.md`): canvas 640×360 di-upscale 1,6× dengan
 * `image-rendering: pixelated`, jadi huruf apa pun yang "dibakar" ke framebuffer
 * itu akan bergerigi. Teks dialog sekarang hidup di DOM, memakai font
 * handwriting yang dimuat `next/font/local` dari `public/fonts/`.
 *
 * `fontGame()` tetap disediakan untuk teks Phaser yang mungkin muncul lagi di
 * canvas (mis. angka debug), supaya keluarga fontnya sama dengan dialog. UI
 * game sendiri — termasuk layar muat — memakai `font-game` di DOM.
 */

/** Nama keluarga font handwriting; dipakai CSS variable `--font-game`. */
export const FONT_GAME_KELUARGA = "Patrick Hand";

/** Rantai fallback bila font lokal belum termuat. */
export const FONT_GAME_FALLBACK =
  '"Patrick Hand", "Segoe UI", system-ui, -apple-system, sans-serif';

/** Kelas utility Tailwind/`font-family` untuk teks game di DOM. */
export const KELAS_FONT_GAME = "font-game";

/**
 * Keluarga font untuk `Phaser.GameObjects.Text`.
 *
 * Phaser menggambar teks ke canvas lewat API `font` milik Canvas 2D, jadi ia
 * butuh nama keluarga, bukan CSS variable. Nilainya sama dengan yang dipakai
 * DOM agar tidak ada dua gaya huruf di satu layar.
 */
export function fontGame(): string {
  return FONT_GAME_FALLBACK;
}
