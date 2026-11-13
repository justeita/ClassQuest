/**
 * Gambar latar default 640×360 (asset-guide.md → Background, ADR 0009).
 *
 * Latar ini dipakai layar judul dan layar hasil sebagai cadangan netral.
 * Peta desa yang sebenarnya berasal dari `public/assets/world/` (paket aset
 * pemilik proyek), bukan dari generator ini.
 */

import { createCanvas, mix, random } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

const W = 640;
const H = 360;

/** Bintang: titik tunggal, sebagian kecil dibuat silang agar berkesan terang. */
function drawStars(canvas, seed, count, maxY) {
  const rng = random(seed);
  for (let i = 0; i < count; i += 1) {
    const x = Math.round(rng() * W);
    const y = Math.round(rng() * maxY);
    const bright = rng();
    const color = bright > 0.88 ? PALETTE.bone : RAMP.neutral300;
    const alpha = 0.35 + rng() * 0.5;
    if (bright > 0.94) {
      canvas.blend(x, y, color, Math.min(1, alpha + 0.15));
      canvas.blend(x - 1, y, color, alpha * 0.5);
      canvas.blend(x + 1, y, color, alpha * 0.5);
      canvas.blend(x, y - 1, color, alpha * 0.5);
      canvas.blend(x, y + 1, color, alpha * 0.5);
    } else {
      canvas.blend(x, y, color, alpha);
    }
  }
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Latar default                                                              */
/* -------------------------------------------------------------------------- */

export function backgroundDefault() {
  const canvas = createCanvas(W, H);
  canvas.vgradient(0, 0, W, H, [
    { at: 0, color: RAMP.deep },
    { at: 0.45, color: RAMP.nightMid },
    { at: 0.78, color: RAMP.skyNight },
    { at: 1, color: mix(PALETTE.night, PALETTE.cool, 0.3) },
  ]);
  drawStars(canvas, 5, 60, 200);
  canvas.disc(522, 84, 18, PALETTE.bone);
  canvas.ring(522, 84, 30, PALETTE.bone, 0.08);
  canvas.polygon(
    [
      [0, 278],
      [160, 254],
      [320, 274],
      [480, 250],
      [640, 272],
      [640, 302],
      [0, 302],
    ],
    RAMP.near,
  );
  canvas.rect(0, 302, W, H - 302, RAMP.deep);
  return canvas;
}
