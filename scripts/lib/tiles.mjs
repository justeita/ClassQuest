/**
 * Tile 16×16 dan prop kelipatan 16 (ADR 0009/0010, asset-guide.md → Tile/Prop).
 *
 * Tile harus aman diulang tanpa tepi terlihat: variasi ditandai dengan dither
 * halus, bukan gradien. Prop digambar dengan alas di tengah bawah dan bayangan
 * di bawahnya supaya terbaca "berdiri" dari atas (world-design.md § Perspektif).
 */

import { createCanvas, mix, random, shade } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

const T = 16;

/** Perkaya tile dengan piksel acak deterministik (tekstur, bukan noise kasar). */
function speckle(canvas, seed, color, count, alpha = 0.5) {
  const rng = random(seed);
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(rng() * T);
    const y = Math.floor(rng() * T);
    canvas.blend(x, y, color, alpha * (0.5 + rng() * 0.5));
  }
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Lantai                                                                     */
/* -------------------------------------------------------------------------- */

/** Papan kayu horizontal dengan garis sambungan halus. */
export function tileFloorWood() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.warm, PALETTE.paper, 0.55);
  const seam = mix(base, PALETTE.warm, 0.45);
  canvas.rect(0, 0, T, T, base);
  canvas.hline(0, 0, T, seam);
  canvas.hline(0, 8, T, seam);
  // Sambungan papan vertikal bergeser per baris papan.
  canvas.rect(11, 0, 1, 8, seam);
  canvas.rect(4, 8, 1, 8, seam);
  speckle(canvas, 11, mix(base, PALETTE.paper, 0.4), 10, 0.35);
  speckle(canvas, 12, shade(seam, 0.9), 6, 0.4);
  return canvas;
}

/** Rumput: hijau dasar dengan dither dua tingkat dan helai acak. */
export function tileFloorGrass() {
  const canvas = createCanvas(T, T);
  const base = RAMP.leaf;
  const dark = mix(base, PALETTE.night, 0.28);
  const light = mix(base, RAMP.leafLight, 0.55);
  canvas.rect(0, 0, T, T, base);
  speckle(canvas, 21, dark, 26, 0.6);
  speckle(canvas, 22, light, 18, 0.5);
  const rng = random(23);
  for (let i = 0; i < 5; i += 1) {
    const x = Math.floor(rng() * T);
    const y = Math.floor(rng() * T);
    canvas.px(x, y, light);
    canvas.px(x, y - 1, dark);
  }
  return canvas;
}

/** Awan: dasar terang dengan gumpalan lembut agar terasa di atas langit. */
export function tileFloorCloud() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.bone, PALETTE.cool, 0.12);
  const soft = mix(base, PALETTE.cool, 0.28);
  canvas.rect(0, 0, T, T, base);
  canvas.disc(4, 5, 3, soft);
  canvas.disc(12, 11, 4, soft);
  canvas.disc(9, 2, 2, soft);
  speckle(canvas, 31, PALETTE.bone, 12, 0.5);
  return canvas;
}

/** Batu gunung: abu gelap dengan retakan dither. */
export function tileFloorRock() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.night, PALETTE.cool, 0.22);
  const dark = mix(base, PALETTE.night, 0.5);
  const light = mix(base, PALETTE.cool, 0.4);
  canvas.rect(0, 0, T, T, base);
  // Blok batu 8×8 dengan jarak retak.
  canvas.rect(0, 0, 7, 7, dark);
  canvas.rect(8, 8, 7, 7, dark);
  canvas.px(0, 0, light);
  canvas.px(8, 8, light);
  speckle(canvas, 41, light, 10, 0.35);
  speckle(canvas, 42, dark, 10, 0.4);
  return canvas;
}

/** Air: biru dasar dengan gelombang horizontal tipis. */
export function tileFloorWater() {
  const canvas = createCanvas(T, T);
  const base = RAMP.water;
  const deep = RAMP.waterDeep;
  const light = mix(PALETTE.cool, PALETTE.paper, 0.45);
  canvas.rect(0, 0, T, T, base);
  canvas.hline(0, 4, T, deep);
  canvas.hline(0, 11, T, deep);
  canvas.rect(3, 4, 5, 1, light);
  canvas.rect(10, 11, 4, 1, light);
  speckle(canvas, 51, deep, 8, 0.5);
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Dinding                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Dinding plester (kelas): pita pucat dengan tepi atas lebih terang, sesuai
 * world-design.md § Perspektif "ujung atas 3–4 px lebih terang".
 */
export function tileWallPlaster() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.paper, PALETTE.warm, 0.18);
  const top = mix(base, PALETTE.bone, 0.5);
  const seam = mix(base, PALETTE.warm, 0.35);
  canvas.rect(0, 0, T, T, base);
  canvas.rect(0, 0, T, 4, top);
  canvas.hline(0, 4, T, seam);
  canvas.hline(0, 15, T, shade(seam, 0.8));
  speckle(canvas, 61, shade(base, 0.92), 10, 0.4);
  return canvas;
}

/** Pagar tanaman: daun rapat dengan tepi atas menonjol. */
export function tileWallHedge() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.moss, PALETTE.night, 0.18);
  const dark = mix(PALETTE.moss, PALETTE.night, 0.45);
  const light = RAMP.leafLight;
  canvas.rect(0, 0, T, T, base);
  const rng = random(71);
  for (let i = 0; i < 14; i += 1) {
    const x = Math.floor(rng() * T);
    const y = Math.floor(rng() * T);
    const radius = 2 + Math.floor(rng() * 2);
    canvas.disc(x, y, radius, rng() > 0.4 ? base : dark);
  }
  // Tepi atas: daun muda menonjol 2 px.
  for (let x = 0; x < T; x += 2) {
    canvas.px(x, 0, light);
    canvas.px(x + 1, 1, mix(light, base, 0.5));
  }
  return canvas;
}

/** Dinding batu gunung: blok besar dengan retak vertikal. */
export function tileWallRock() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.night, PALETTE.cool, 0.3);
  const dark = mix(PALETTE.night, PALETTE.ink, 0.55);
  const light = mix(base, PALETTE.cool, 0.45);
  canvas.rect(0, 0, T, T, base);
  canvas.rect(0, 0, T, 3, light);
  canvas.rect(3, 3, 1, 6, dark);
  canvas.rect(9, 9, 1, 6, dark);
  canvas.hline(0, 9, T, dark);
  speckle(canvas, 81, dark, 10, 0.4);
  speckle(canvas, 82, light, 6, 0.4);
  return canvas;
}

/**
 * Kanopi penutup: gelap dengan langit-langit bergerigi — dipasang di atas
 * pemain (depth tertinggi) saat ia berjalan di bawah pohon/kanopi.
 */
export function tileCanopy() {
  const canvas = createCanvas(T, T);
  const base = mix(PALETTE.moss, PALETTE.night, 0.5);
  const dark = mix(PALETTE.night, PALETTE.ink, 0.6);
  const light = mix(PALETTE.moss, PALETTE.paper, 0.2);
  canvas.rect(0, 0, T, T, dark);
  const rng = random(91);
  for (let i = 0; i < 10; i += 1) {
    const x = Math.floor(rng() * T);
    const y = Math.floor(rng() * T);
    canvas.disc(x, y, 2 + Math.floor(rng() * 2), base);
  }
  for (let x = 0; x < T; x += 3) canvas.px(x, 0, light);
  return canvas;
}

/** Tile default: netral malam dengan sorot halus. */
export function tileDefault() {
  const canvas = createCanvas(T, T);
  canvas.rect(0, 0, T, T, RAMP.nightMid);
  speckle(canvas, 101, RAMP.skyNight, 14, 0.5);
  canvas.hline(0, 0, T, mix(RAMP.nightMid, PALETTE.cool, 0.25));
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Prop                                                                       */
/* -------------------------------------------------------------------------- */

/** Bayangan elips 12×4 di bawah alas objek (world-design.md § Sprite). */
function drawShadow(canvas, cx, bottom, width) {
  const height = 4;
  for (let y = 0; y < height; y += 1) {
    const span = Math.round((width * (1 - y / height)) / 2);
    for (let x = -span; x <= span; x += 1) {
      canvas.blend(cx + x, bottom - (height - 1 - y), PALETTE.night, 0.28);
    }
  }
  return canvas;
}

/** Meja kelas 48×32: bidang atas terang, sisi depan pendek, bayangan. */
export function propDesk() {
  const w = 48;
  const h = 32;
  const canvas = createCanvas(w, h);
  const topColor = mix(PALETTE.warm, PALETTE.paper, 0.3);
  const side = mix(PALETTE.warm, PALETTE.night, 0.5);
  const edge = mix(PALETTE.warm, PALETTE.night, 0.25);

  // Bidang atas (dilihat dari atas).
  canvas.rect(4, 2, 40, 20, topColor);
  canvas.rect(4, 2, 40, 2, mix(topColor, PALETTE.bone, 0.5));
  canvas.rect(4, 20, 40, 2, edge);
  // Sisi depan pendek.
  canvas.rect(6, 22, 36, 6, side);
  // Kaki.
  canvas.rect(6, 28, 4, 3, mix(side, PALETTE.night, 0.3));
  canvas.rect(38, 28, 4, 3, mix(side, PALETTE.night, 0.3));
  // Buku di atas meja.
  canvas.rect(16, 8, 10, 7, PALETTE.paper);
  canvas.rect(16, 8, 10, 2, mix(PALETTE.paper, PALETTE.cool, 0.35));
  canvas.vline(21, 8, 7, mix(PALETTE.paper, PALETTE.warm, 0.45));

  drawShadow(canvas, w / 2, h, 40);
  canvas.outline(mix(PALETTE.night, PALETTE.ink, 0.7));
  return canvas;
}

/** Papan tulis 112×48: bingkai kayu, bidang hijau gelap, kapur. */
export function propBlackboard() {
  const w = 112;
  const h = 48;
  const canvas = createCanvas(w, h);
  const frame = mix(PALETTE.warm, PALETTE.night, 0.4);
  const board = mix(PALETTE.moss, PALETTE.night, 0.55);

  canvas.rect(0, 0, w, h, frame);
  canvas.rect(4, 6, w - 8, h - 16, board);
  canvas.rect(4, 6, w - 8, 3, mix(board, PALETTE.cool, 0.3));
  // Tulisan kapur: garis-garis pendek.
  const chalk = mix(PALETTE.bone, PALETTE.paper, 0.5);
  const rng = random(111);
  let x = 10;
  while (x < w - 16) {
    const len = 8 + Math.floor(rng() * 14);
    const y = 14 + Math.floor(rng() * 3) * 8;
    canvas.rect(x, y, Math.min(len, w - 16 - x), 2, chalk);
    x += len + 6;
  }
  // Kapur di nampan bawah.
  canvas.rect(w / 2 - 6, h - 8, 4, 3, chalk);
  canvas.rect(w / 2 + 2, h - 8, 3, 3, chalk);

  drawShadow(canvas, w / 2, h, w - 8);
  canvas.outline(mix(PALETTE.night, PALETTE.ink, 0.7));
  return canvas;
}

/** Pohon 32×48: batang pendek + kanopi dua lapis + bayangan. */
export function propTree() {
  const w = 32;
  const h = 48;
  const canvas = createCanvas(w, h);
  const canopy = RAMP.leaf;
  const canopyDark = mix(canopy, PALETTE.night, 0.3);
  const canopyLight = RAMP.leafLight;
  const trunk = mix(PALETTE.warm, PALETTE.night, 0.55);

  // Kanopi dilihat dari atas: lingkaran besar dengan tepi gelap.
  canvas.disc(16, 16, 13, canopyDark);
  canvas.disc(16, 15, 11, canopy);
  canvas.disc(12, 11, 4, canopyLight);
  canvas.disc(20, 14, 3, canopyLight);
  // Batang terlihat sedikit di bawah kanopi.
  canvas.rect(13, 28, 6, 12, trunk);
  canvas.rect(17, 28, 2, 12, mix(trunk, PALETTE.night, 0.3));
  // Akar/alas.
  canvas.rect(10, 39, 12, 3, mix(trunk, PALETTE.night, 0.15));

  drawShadow(canvas, 16, h, 26);
  canvas.outline(mix(PALETTE.night, PALETTE.ink, 0.7));
  return canvas;
}

/** Pagar kayu 48×16: dua papan horizontal + tiang. */
export function propFence() {
  const w = 48;
  const h = 16;
  const canvas = createCanvas(w, h);
  const wood = mix(PALETTE.warm, PALETTE.paper, 0.2);
  const woodDark = mix(PALETTE.warm, PALETTE.night, 0.45);

  canvas.rect(0, 3, w, 4, wood);
  canvas.rect(0, 8, w, 4, wood);
  canvas.hline(0, 6, w, woodDark);
  canvas.hline(0, 11, w, woodDark);
  for (const x of [4, 22, 40]) {
    canvas.rect(x, 0, 4, h, mix(wood, PALETTE.bone, 0.2));
    canvas.vline(x + 3, 0, h, woodDark);
    canvas.px(x, 0, woodDark);
    canvas.px(x + 3, 0, woodDark);
  }
  drawShadow(canvas, w / 2, h, w - 4);
  canvas.outline(mix(PALETTE.night, PALETTE.ink, 0.7));
  return canvas;
}

/** Prop default: balok kayu netral, dipakai bila prop gagal dimuat. */
export function propDefault() {
  const canvas = createCanvas(16, 16);
  canvas.rect(2, 2, 12, 10, mix(PALETTE.warm, PALETTE.night, 0.35));
  canvas.rect(2, 2, 12, 2, mix(PALETTE.warm, PALETTE.paper, 0.3));
  canvas.rect(2, 12, 12, 2, mix(PALETTE.warm, PALETTE.night, 0.55));
  drawShadow(canvas, 8, 15, 12);
  canvas.outline(mix(PALETTE.night, PALETTE.ink, 0.7));
  return canvas;
}
