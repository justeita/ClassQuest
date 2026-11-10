import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/**
 * Geometri UI dalam ruang internal 640×360 (ADR 0009).
 *
 * Satu sumber angka untuk dua lapisan: Phaser memakai nilai ini untuk menggambar
 * panel dan portrait, React memakainya untuk menaruh teks di posisi yang sama.
 * Jangan menyalin angka ke komponen — impor dari sini supaya tidak melenceng.
 */

/** Panel dialog: x=16, y=240, 608×104 (docs/04-game/scene-format.md). */
export const TEXTBOX = {
  x: 16,
  y: 240,
  width: 608,
  height: 104,
  /** Jarak teks dari tepi panel (ruang internal). */
  padding: 16,
  /** Jarak baris pertama dari tepi atas panel. */
  paddingTop: 8,
} as const;

/** Portrait di atas panel: bingkai 72×72, gambar 64×64 di dalamnya. */
export const PORTRAIT = {
  x: 26,
  y: 164,
  frameSize: 72,
  imageInset: 4,
  imageSize: 64,
} as const;

/** Posisi/ukuran dalam persen ruang game, untuk `style` CSS overlay DOM. */
export function persen(nilai: number, total: number): string {
  return `${Number(((nilai / total) * 100).toFixed(4))}%`;
}

/** Koordinat x internal → persen lebar ruang game. */
export function persenLebar(x: number): string {
  return persen(x, GAME_WIDTH);
}

/** Koordinat y internal → persen tinggi ruang game. */
export function persenTinggi(y: number): string {
  return persen(y, GAME_HEIGHT);
}

/** Kotak internal → `left/top/width/height` persen ruang game. */
export function kotakPersen(kotak: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { left: string; top: string; width: string; height: string } {
  return {
    left: persen(kotak.x, GAME_WIDTH),
    top: persen(kotak.y, GAME_HEIGHT),
    width: persen(kotak.width, GAME_WIDTH),
    height: persen(kotak.height, GAME_HEIGHT),
  };
}

/**
 * Panjang internal (px pada 640×360) → `cqw`, yaitu 1% lebar kontainer game.
 *
 * Kontainer game selalu `aspect-video` dan dijadikan `container-type: size`
 * (lihat `GameCanvas`), jadi `cqw` dan `cqh` sebanding dan keduanya ikut skala
 * canvas. Ini cara termudah memakai satu set angka internal untuk dua sumbu.
 */
export function cqw(px: number): string {
  return `${Number(((px / GAME_WIDTH) * 100).toFixed(4))}cqw`;
}

/** Ukuran huruf setara `pxInternal`, dibatasi `minPx`–`maxPx` agar tetap terbaca. */
export function ukuranHuruf(
  pxInternal: number,
  minPx: number,
  maxPx: number,
): string {
  return `clamp(${minPx}px, ${cqw(pxInternal)}, ${maxPx}px)`;
}
