/**
 * Sprite karakter, portrait, dan panel UI.
 *
 * Spesifikasi docs/07-assets/asset-guide.md: sprite 48×72 per frame (2 frame
 * idle, spritesheet horizontal), portrait 96×96 dengan transparansi, textbox
 * 456×78 dengan border 3 px.
 *
 * Karakter digambar pada grid 24×36 yang setiap pikselnya menjadi 2×2 piksel
 * akhir. Grid ditulis dengan koordinat eksplisit (bukan peta ASCII) supaya
 * tidak ada baris yang salah hitung, dan bentuknya mudah disesuaikan. Portrait
 * memakai resep warna yang sama agar wajah konsisten dengan sprite.
 */

import { createCanvas, mix } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

export const FRAME_WIDTH = 48;
export const FRAME_HEIGHT = 72;
export const FRAME_COUNT = 2;

const OUTLINE = PALETTE.ink;
const GRID_WIDTH = 24;
const GRID_HEIGHT = 36;
const PIXEL = 2;

/* -------------------------------------------------------------------------- */
/* Grid karakter                                                              */
/* -------------------------------------------------------------------------- */

/** Grid simbol 24×36; setiap sel menampung satu nama warna dari resep. */
function createGrid(width = GRID_WIDTH, height = GRID_HEIGHT) {
  const cells = Array.from({ length: height }, () =>
    new Array(width).fill("."),
  );

  const grid = {
    width,
    height,
    cells,

    set(x, y, color) {
      if (x < 0 || y < 0 || x >= width || y >= height) return grid;
      cells[y][x] = color;
      return grid;
    },

    get(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return ".";
      return cells[y][x];
    },

    rect(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) grid.set(x + dx, y + dy, color);
      }
      return grid;
    },

    /** Kotak berongga di dalam area. */
    hollow(x, y, w, h, color) {
      grid.rect(x, y, w, 1, color);
      grid.rect(x, y + h - 1, w, 1, color);
      grid.rect(x, y, 1, h, color);
      grid.rect(x + w - 1, y, 1, h, color);
      return grid;
    },

    ellipse(cx, cy, rx, ry, color) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          if (nx * nx + ny * ny <= 1) grid.set(x, y, color);
        }
      }
      return grid;
    },

    /** Hanya isi sel yang masih kosong — dipakai untuk lapisan di belakang. */
    behind(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          if (grid.get(x + dx, y + dy) === ".") grid.set(x + dx, y + dy, color);
        }
      }
      return grid;
    },
  };

  return grid;
}

/** Resep warna + bentuk per karakter. */
const RECIPES = {
  nara: {
    hair: RAMP.nightMid,
    hairLight: mix(PALETTE.cool, PALETTE.night, 0.6),
    skin: RAMP.skin,
    skinShade: RAMP.skinShade,
    eye: PALETTE.ink,
    mouth: mix(PALETTE.warm, PALETTE.night, 0.5),
    shirt: PALETTE.bone,
    shirtShade: mix(PALETTE.bone, PALETTE.cool, 0.45),
    accent: PALETTE.warm,
    trouser: PALETTE.cool,
    shoe: RAMP.neutral700,
    hairStyle: "long",
  },
  bima: {
    hair: RAMP.nightMid,
    hairLight: mix(PALETTE.cool, PALETTE.night, 0.45),
    skin: RAMP.skin,
    skinShade: RAMP.skinShade,
    eye: PALETTE.ink,
    mouth: mix(PALETTE.warm, PALETTE.night, 0.5),
    shirt: mix(PALETTE.moss, PALETTE.paper, 0.2),
    shirtShade: mix(PALETTE.moss, PALETTE.night, 0.34),
    accent: PALETTE.warm,
    trouser: RAMP.neutral700,
    shoe: PALETTE.ink,
    hairStyle: "short",
    beard: true,
  },
  rani: {
    hair: mix(PALETTE.gold, PALETTE.warm, 0.4),
    hairLight: mix(PALETTE.gold, PALETTE.bone, 0.65),
    skin: RAMP.skin,
    skinShade: RAMP.skinShade,
    eye: PALETTE.ink,
    mouth: mix(PALETTE.warm, PALETTE.night, 0.5),
    shirt: mix(PALETTE.cool, PALETTE.paper, 0.38),
    shirtShade: mix(PALETTE.cool, PALETTE.night, 0.3),
    accent: PALETTE.moss,
    trouser: RAMP.neutral700,
    shoe: PALETTE.ink,
    hairStyle: "ponytail",
  },
  tirta: {
    hair: RAMP.water,
    hairLight: mix(PALETTE.cool, PALETTE.paper, 0.5),
    skin: RAMP.water,
    skinShade: RAMP.waterDeep,
    eye: PALETTE.bone,
    mouth: RAMP.waterDeep,
    shirt: RAMP.water,
    shirtShade: RAMP.waterDeep,
    accent: PALETTE.bone,
    trouser: RAMP.waterDeep,
    shoe: RAMP.waterDeep,
    hairStyle: "spirit",
  },
};

/**
 * Badan manusia pada grid 24×36.
 *
 * Vertikal: kepala baris 2–13, leher 14, badan 15–22, kaki 23–30, sepatu 31–32.
 * Horizontal: kepala x=6..17, badan x=8..15, lengan x=5..7 dan 16..18.
 *
 * Wajah: alis baris 8, mata baris 9–10, hidung 11, mulut 12. Poni berhenti di
 * baris 7 supaya mata tidak pernah tertutup rambut.
 */
function buildHumanGrid(recipe) {
  const grid = createGrid();

  /* Kaki: dua batang terpisah dengan celah 1 sel di tengah. */
  grid.rect(9, 23, 3, 8, recipe.trouser);
  grid.rect(13, 23, 3, 8, recipe.trouser);
  grid.rect(9, 23, 1, 8, mix(recipe.trouser, PALETTE.ink, 0.22));
  grid.rect(15, 23, 1, 8, mix(recipe.trouser, PALETTE.ink, 0.3));
  // Sepatu melebar satu sel ke luar.
  grid.rect(8, 31, 4, 2, recipe.shoe);
  grid.rect(13, 31, 4, 2, recipe.shoe);

  /* Badan: menyempit di bahu, lalu melebar. */
  grid.rect(9, 15, 6, 1, recipe.shirt);
  grid.rect(8, 16, 8, 7, recipe.shirt);
  // Sisi kanan dalam bayangan.
  grid.rect(14, 16, 2, 7, recipe.shirtShade);
  grid.set(16, 16, recipe.shirtShade);
  // Kerah V.
  grid.rect(11, 15, 2, 1, recipe.skin);
  grid.set(11, 15, recipe.skin);
  grid.set(12, 16, recipe.skinShade);
  // Kancing.
  grid.set(12, 18, recipe.accent);
  grid.set(12, 21, recipe.accent);

  /* Lengan + tangan */
  grid.rect(6, 16, 2, 6, recipe.shirt);
  grid.rect(16, 16, 2, 6, recipe.shirtShade);
  grid.rect(6, 22, 2, 2, recipe.skin);
  grid.rect(16, 22, 2, 2, recipe.skin);

  /* Leher */
  grid.rect(11, 14, 2, 1, recipe.skinShade);

  /* Kepala */
  grid.ellipse(12, 8, 5.5, 5.5, recipe.skin);
  // Rahang: baris terbawah menyempit.
  grid.set(6, 12, ".");
  grid.set(17, 12, ".");
  grid.set(7, 13, ".");
  grid.set(16, 13, ".");
  // Sisi kanan teduh.
  grid.ellipse(15, 9, 2.2, 3, recipe.skinShade);
  grid.ellipse(12, 8, 4.6, 4.8, recipe.skin);

  /* Rambut */
  grid.ellipse(12, 4, 6.5, 5, recipe.hair);
  grid.rect(6, 2, 12, 4, recipe.hair);
  // Sisi rambut menutupi pelipis sampai garis rahang.
  grid.rect(6, 6, 2, 5, recipe.hair);
  grid.rect(16, 6, 2, 5, recipe.hair);
  // Poni berhenti di baris 7, di atas alis.
  grid.rect(7, 6, 10, 1, recipe.hair);
  for (const [x, height] of [
    [7, 1],
    [9, 2],
    [11, 1],
    [14, 2],
  ]) {
    grid.rect(x, 6, 2, height, recipe.hair);
  }
  // Kilau rambut.
  grid.rect(8, 2, 2, 1, recipe.hairLight);
  grid.rect(12, 1, 3, 1, recipe.hairLight);

  /* Wajah */
  // Alis.
  grid.rect(9, 8, 2, 1, mix(recipe.hair, recipe.skin, 0.3));
  grid.rect(13, 8, 2, 1, mix(recipe.hair, recipe.skin, 0.3));
  // Mata dengan sorot.
  grid.rect(9, 9, 2, 2, recipe.eye);
  grid.rect(13, 9, 2, 2, recipe.eye);
  grid.set(9, 9, PALETTE.bone);
  grid.set(13, 9, PALETTE.bone);
  // Hidung dan mulut.
  grid.set(12, 11, recipe.skinShade);
  grid.rect(11, 12, 2, 1, recipe.mouth);

  applyHairStyle(grid, recipe);
  return grid;
}

/** Tambahan bentuk rambut per gaya. */
function applyHairStyle(grid, recipe) {
  if (recipe.hairStyle === "long") {
    // Rambut jatuh melewati bahu di kedua sisi.
    grid.behind(5, 6, 2, 14, recipe.hair);
    grid.behind(17, 6, 2, 14, recipe.hair);
    grid.behind(6, 19, 2, 3, recipe.hair);
    grid.behind(16, 19, 2, 3, recipe.hair);
  }

  if (recipe.hairStyle === "ponytail") {
    grid.behind(18, 4, 2, 5, recipe.hair);
    grid.set(19, 3, recipe.hair);
    grid.set(20, 5, recipe.hair);
    grid.set(20, 6, recipe.hair);
    grid.set(19, 7, recipe.hair);
    // Ikat rambut.
    grid.set(18, 5, recipe.accent);
    grid.set(18, 6, recipe.accent);
  }

  if (recipe.hairStyle === "short") {
    grid.rect(6, 6, 2, 4, recipe.hair);
    grid.rect(16, 6, 2, 4, recipe.hair);
  }

  if (recipe.beard) {
    if (grid.height >= 36) {
      // Sprite: kumis tipis di samping hidung + janggut dagu. Mulut (baris 12)
      // tetap terlihat supaya tidak terbaca seperti garis senyum.
      grid.set(10, 11, recipe.hair);
      grid.set(13, 11, recipe.hair);
      grid.rect(10, 13, 4, 1, recipe.hair);
      grid.set(9, 13, mix(recipe.hair, recipe.skin, 0.35));
      grid.set(14, 13, mix(recipe.hair, recipe.skin, 0.35));
    } else {
      // Portrait: janggut mengikuti rahang, di bawah mulut (baris 15).
      grid.rect(9, 16, 6, 1, recipe.hair);
      grid.set(8, 15, recipe.hair);
      grid.set(15, 15, recipe.hair);
    }
  }

  return grid;
}

/** Roh air: badan setetes dengan wajah, tanpa lengan dan kaki. */
function buildSpiritGrid(recipe) {
  const grid = createGrid();

  // Ekor bergelombang: tiga ujung di baris paling bawah.
  grid.rect(8, 21, 8, 8, recipe.skin);
  grid.rect(6, 25, 3, 4, recipe.skin);
  grid.rect(15, 25, 3, 4, recipe.skin);
  grid.set(9, 29, recipe.skin);
  grid.set(14, 29, recipe.skin);
  grid.rect(7, 29, 2, 2, recipe.skin);
  grid.rect(15, 29, 2, 2, recipe.skin);

  // Badan bulat menutupi bagian atas ekor.
  grid.ellipse(12, 15, 6, 7, recipe.skin);
  // Bayangan dalam di kanan bawah.
  grid.ellipse(14, 18, 4, 4.4, recipe.skinShade);
  grid.ellipse(12, 15, 5.2, 6.2, recipe.skin);

  // Sorot cahaya di kiri atas.
  grid.ellipse(9, 11, 2, 1.6, recipe.hairLight);
  grid.rect(7, 17, 1, 3, recipe.hairLight);

  // Mata besar.
  grid.rect(9, 14, 2, 3, recipe.eye);
  grid.rect(13, 14, 2, 3, recipe.eye);
  grid.set(9, 14, recipe.skinShade);
  grid.set(13, 14, recipe.skinShade);
  // Mulut kecil.
  grid.rect(11, 19, 2, 1, recipe.skinShade);

  return grid;
}

/**
 * Grid → kanvas. Sel grid menyimpan warna siap pakai (bukan nama), jadi
 * pemetaan warna terjadi sekali di `createGrid` pemanggil.
 */
function paintGrid(
  canvas,
  grid,
  { scale = PIXEL, offsetX = 0, offsetY = 0 } = {},
) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.cells[y][x];
      if (!color || color === ".") continue;
      canvas.rect(
        offsetX + x * scale,
        offsetY + y * scale,
        scale,
        scale,
        color,
      );
    }
  }
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Sprite                                                                     */
/* -------------------------------------------------------------------------- */

/** Satu frame 48×72. Frame kedua bernapas: seluruh isi turun 1 px. */
function characterFrame(recipe, breathe) {
  const isSpirit = recipe.hairStyle === "spirit";
  const grid = isSpirit ? buildSpiritGrid(recipe) : buildHumanGrid(recipe);
  const canvas = createCanvas(FRAME_WIDTH, FRAME_HEIGHT);
  paintGrid(canvas, grid, { scale: PIXEL, offsetY: breathe ? -1 : 0 });
  canvas.outline(OUTLINE);
  return canvas;
}

/** Spritesheet horizontal dua frame idle. */
export function characterSheet(name) {
  const recipe = RECIPES[name];
  const sheet = createCanvas(FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const canvas = characterFrame(recipe, frame === 1);
    sheet.blit(canvas, frame * FRAME_WIDTH, 0);
  }
  return sheet;
}

/** Karakter cadangan: siluet netral, dipakai bila sprite gagal dimuat. */
export function characterDefaultSheet() {
  const recipe = {
    hair: RAMP.neutral700,
    hairLight: RAMP.neutral500,
    skin: RAMP.neutral300,
    skinShade: RAMP.neutral500,
    eye: PALETTE.night,
    mouth: RAMP.neutral700,
    shirt: RAMP.neutral500,
    shirtShade: RAMP.neutral700,
    accent: RAMP.neutral300,
    trouser: RAMP.neutral700,
    shoe: PALETTE.ink,
    hairStyle: "short",
  };
  const sheet = createCanvas(FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const canvas = createCanvas(FRAME_WIDTH, FRAME_HEIGHT);
    paintGrid(canvas, buildHumanGrid(recipe), {
      offsetY: frame === 1 ? -1 : 0,
    });
    canvas.outline(OUTLINE);
    sheet.blit(canvas, frame * FRAME_WIDTH, 0);
  }
  return sheet;
}

/* -------------------------------------------------------------------------- */
/* Portrait 96×96                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Portrait close-up 96×96: kepala dari grid 24×24 diperbesar ×4 (96×96), badan
 * hanya sebagai bahu di bawah. Latar panel malam + sorot lembut.
 */
const PORTRAIT_GRID = 24;

function buildPortraitHead(recipe) {
  const grid = createGrid(PORTRAIT_GRID, PORTRAIT_GRID);

  /* Bahu (digambar dulu, kepala menimpa) */
  grid.rect(1, 19, 22, 5, recipe.shirt);
  grid.rect(14, 19, 9, 5, recipe.shirtShade);
  // Kerah V.
  grid.rect(10, 19, 4, 1, recipe.skin);
  grid.rect(11, 20, 2, 1, recipe.skinShade);

  /* Leher */
  grid.rect(10, 16, 4, 4, recipe.skinShade);

  /* Kepala */
  grid.ellipse(12, 10, 7, 8, recipe.skin);
  grid.ellipse(16, 12, 3, 3, recipe.skinShade);
  grid.ellipse(12, 10, 6.4, 7.4, recipe.skin);

  /* Rambut */
  grid.ellipse(12, 5, 8, 6, recipe.hair);
  grid.rect(4, 4, 16, 5, recipe.hair);
  grid.rect(3, 6, 2, 9, recipe.hair);
  grid.rect(19, 6, 2, 9, recipe.hair);
  // Poni bergerigi.
  grid.rect(4, 8, 16, 1, recipe.hair);
  for (const [x, height] of [
    [4, 2],
    [7, 3],
    [10, 2],
    [13, 3],
    [16, 2],
  ]) {
    grid.rect(x, 8, 3, height, recipe.hair);
  }
  grid.rect(7, 3, 4, 1, recipe.hairLight);
  grid.rect(14, 2, 4, 1, recipe.hairLight);

  /* Wajah */
  grid.rect(7, 12, 2, 3, recipe.eye);
  grid.rect(15, 12, 2, 3, recipe.eye);
  grid.set(7, 12, PALETTE.bone);
  grid.set(15, 12, PALETTE.bone);
  grid.rect(7, 10, 3, 1, mix(recipe.hair, recipe.skin, 0.4));
  grid.rect(14, 10, 3, 1, mix(recipe.hair, recipe.skin, 0.4));
  grid.set(11, 14, recipe.skinShade);
  grid.rect(9, 15, 6, 1, mix(recipe.mouth, recipe.skin, 0.2));

  applyHairStyle(grid, recipe);
  return grid;
}

/** Portrait karakter. */
export function portrait(name) {
  const recipe = RECIPES[name];
  const canvas = createCanvas(96, 96);

  canvas.vgradient(0, 0, 96, 96, [
    { at: 0, color: RAMP.nightMid },
    { at: 1, color: RAMP.deep },
  ]);
  canvas.disc(48, 60, 34, mix(RAMP.nightMid, PALETTE.cool, 0.16));
  // Garis diagonal halus di latar supaya tidak terasa kosong.
  for (let i = 0; i < 96; i += 6) {
    canvas.blend(i, 92, mix(RAMP.nightMid, PALETTE.cool, 0.3), 0.35);
    canvas.blend(i + 3, 93, mix(RAMP.nightMid, PALETTE.cool, 0.3), 0.2);
  }

  const grid = buildPortraitHead(recipe);
  // -1 sel grid, bukan -2: bagian atas rambut tidak boleh terpotong bingkai.
  paintGrid(canvas, grid, { scale: 4, offsetY: -4 });
  canvas.outline(OUTLINE);

  canvas.frame(1, 1, 94, 94, 2, RAMP.neutral700);
  canvas.frame(4, 4, 88, 88, 1, mix(PALETTE.bone, RAMP.nightMid, 0.72));

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Panel UI                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Textbox 456×78: panel malam 92% opaque, border 3 px warna tulang, sudut
 * dipotong (bukan anti-aliased) supaya tetap tajam saat diperbesar.
 */
export function textboxPanel() {
  const w = 456;
  const h = 78;
  const canvas = createCanvas(w, h);

  canvas.rect(0, 0, w, h, PALETTE.night);
  canvas.frame(6, 6, w - 12, h - 12, 1, RAMP.neutral700);
  canvas.frame(0, 0, w, h, 3, PALETTE.bone);
  // Satu aksen jingga per panel.
  canvas.rect(6, 0, 22, 3, PALETTE.warm);

  // Panel 92% opaque: latar masih terasa di belakangnya.
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

/** Bingkai portrait: bingkai 4 px di luar area potret 96×96. */
export function portraitFrame() {
  const size = 104;
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
