/**
 * Panel UI generik: textbox dialog, bingkai potret, dan panel default.
 *
 * Semua panel digambar di kanvas piksel dan deterministik, jadi
 * `bun run assets:generate` boleh dijalankan ulang kapan saja.
 *
 * Sprite dan potret karakter **tidak** dibuat di sini: berkasnya berasal dari
 * aset dunia desa yang disalin `scripts/import-world.mjs`. Generator hanya
 * memiliki panel UI dan latar default (`scenes.mjs`).
 */

import { createCanvas } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

/* -------------------------------------------------------------------------- */
/* Panel UI                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Textbox 608×104 (skala 4:3 dari 456×78): panel malam 92% opaque, border 3 px
 * tulang, sudut dipotong. Dipakai GameScene untuk dialog.
 */
export function textboxPanel() {
  const w = 608;
  const h = 104;
  const canvas = createCanvas(w, h);

  canvas.rect(0, 0, w, h, PALETTE.night);
  canvas.frame(8, 8, w - 16, h - 16, 1, RAMP.neutral700);
  canvas.frame(0, 0, w, h, 3, PALETTE.bone);
  canvas.rect(8, 0, 30, 3, PALETTE.warm);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const at = (y * w + x) * 4;
      canvas.data[at + 3] = Math.round(canvas.data[at + 3] * 0.92);
    }
  }

  for (const [x, y] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ]) {
    canvas.clear(x, y);
    canvas.clear(x === 0 ? x + 1 : x - 1, y === 0 ? y + 1 : y - 1);
  }
  return canvas;
}

/** Bingkai portrait 72×72: bingkai 4 px di luar potret 64×64. */
export function portraitFrame() {
  const size = 72;
  const canvas = createCanvas(size, size);
  canvas.frame(0, 0, size, size, 4, PALETTE.bone);
  canvas.frame(4, 4, size - 8, size - 8, 1, PALETTE.warm);
  return canvas;
}

/** Panel default 64×64: fallback untuk panel generik. */
export function defaultPanel() {
  const size = 64;
  const canvas = createCanvas(size, size);
  canvas.rect(0, 0, size, size, RAMP.nightMid);
  canvas.frame(4, 4, size - 8, size - 8, 1, RAMP.neutral700);
  canvas.frame(0, 0, size, size, 2, PALETTE.bone);
  canvas.rect(4, 0, 14, 2, PALETTE.warm);
  for (const [x, y] of [
    [0, 0],
    [size - 1, 0],
    [0, size - 1],
    [size - 1, size - 1],
  ]) {
    canvas.clear(x, y);
  }
  return canvas;
}
