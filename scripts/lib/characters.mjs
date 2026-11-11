/**
 * Sprite karakter 24×32 (ADR 0009), portrait 64×64, dan panel UI.
 *
 * Sheet per karakter: **18 frame horizontal** (432×32) — delapan arah hadap:
 *
 *   0–1    idle (menghadap kamera, bernapas)
 *   2–3    jalan bawah            4–5    jalan atas
 *   6–7    jalan kiri             8–9    jalan kanan
 *  10–11   jalan bawah-kiri      12–13   jalan bawah-kanan
 *  14–15   jalan atas-kiri       16–17   jalan atas-kanan
 *
 * Diagonal digambar sebagai tampak tiga-perempat: badan menyamping, tetapi
 * wajah menghadap sebagian ke kamera (dua mata) untuk arah bawah, dan hanya
 * rambut untuk arah atas. Sisi kanan adalah cermin sisi kiri.
 */

import { createCanvas, mix } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

export const FRAME_WIDTH = 24;
export const FRAME_HEIGHT = 32;
/** 2 idle + 2 jalan × 8 arah. */
export const FRAME_COUNT = 18;

const OUTLINE = PALETTE.ink;

/* -------------------------------------------------------------------------- */
/* Grid karakter                                                              */
/* -------------------------------------------------------------------------- */

/** Grid 24×32; sel berisi warna siap pakai, `.` = kosong. */
function createGrid(width = FRAME_WIDTH, height = FRAME_HEIGHT) {
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

    /** Isi hanya sel kosong — untuk lapisan rambut di belakang badan. */
    behind(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          if (grid.get(x + dx, y + dy) === ".") grid.set(x + dx, y + dy, color);
        }
      }
      return grid;
    },

    /** Cermin horizontal penuh — dipakai untuk arah kanan dari kiri. */
    mirrored() {
      const out = createGrid(width, height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          out.set(width - 1 - x, y, cells[y][x]);
        }
      }
      return out;
    },
  };
  return grid;
}

/** Resep warna per karakter. */
const RECIPES = {
  nara: {
    hair: mix(PALETTE.cool, PALETTE.night, 0.42),
    hairLight: mix(PALETTE.cool, PALETTE.night, 0.15),
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
    hair: mix(PALETTE.cool, PALETTE.night, 0.42),
    hairLight: mix(PALETTE.cool, PALETTE.night, 0.15),
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
  /**
   * Nino: siswa baru dengan ekor kembar, pita kupu-kupu, rok sekolah, dan kaus
   * kaki. Rambut memakai aksen karakter `blush` dari palet; bayangan dan
   * kilaunya tetap turunan `RAMP`, bukan warna baru di luar palet.
   */
  nino: {
    hair: PALETTE.blush,
    hairLight: RAMP.blushLight,
    hairShade: RAMP.blushShade,
    skin: RAMP.skin,
    skinShade: RAMP.skinShade,
    eye: PALETTE.ink,
    mouth: mix(PALETTE.warm, PALETTE.night, 0.5),
    shirt: PALETTE.bone,
    shirtShade: mix(PALETTE.bone, PALETTE.cool, 0.45),
    accent: mix(PALETTE.cool, PALETTE.ink, 0.1),
    skirt: mix(PALETTE.cool, PALETTE.night, 0.35),
    sock: PALETTE.bone,
    shoe: RAMP.neutral700,
    hairStyle: "twintails",
  },
};

/**
 * Satu frame karakter manusia.
 *
 * `dir`: "down" | "up" | "left". `step`: null (idle) | 0 | 1.
 * Vertikal: kepala baris 1–11, badan 12–20, kaki 21–29, sepatu 28–30.
 */
function buildHumanFrame(recipe, dir, step) {
  const grid = createGrid();
  const moving = step !== null;
  const bob = moving && step === 1 ? 1 : 0;
  // Delapan arah: "left"/"right" murni menyamping, "down-left" dst. diagonal.
  const parts = dir.split("-");
  const vertical = parts.length === 2 ? parts[0] : null; // "up" | "down" | null
  const horizontal = parts[parts.length - 1]; // "left" | "right"
  const side = horizontal === "left" || horizontal === "right";
  const diagonal = vertical !== null;
  const facingDown = dir === "down" || vertical === "down";

  /* Rambut belakang — sebelum badan */
  if (recipe.hairStyle === "long") {
    grid.behind(5, 4, 2, 14, recipe.hair);
    grid.behind(17, 4, 2, 14, recipe.hair);
  }
  if (recipe.hairStyle === "ponytail") {
    grid.behind(18, 2, 3, 7, recipe.hair);
    grid.set(19, 9, recipe.hair);
    grid.set(20, 10, recipe.hair);
  }
  if (recipe.hairStyle === "twintails") {
    // Dua ekor di luar siluet kepala, dengan ujung meruncing ke bawah.
    grid.behind(2, 4, 2, 8, recipe.hair);
    grid.behind(2, 12, 1, 2, recipe.hair);
    grid.behind(20, 4, 2, 8, recipe.hair);
    grid.behind(21, 12, 1, 2, recipe.hair);
  }

  /* Kaki: bergantian maju saat jalan */
  const legTop = 21 - bob;
  const legA = { x: 7, yTop: legTop, yBottom: 30 - bob };
  const legB = { x: 13, yTop: legTop, yBottom: 30 - bob };
  if (moving) {
    const first = step === 0 ? legA : legB;
    const second = step === 0 ? legB : legA;
    if (side) {
      first.yBottom -= 3; // kaki depan terangkat
      second.x -= 1; // kaki belakang ke belakang
    } else {
      first.yBottom -= 2;
      first.x += facingDown ? 1 : -1;
    }
  }

  const drawLeg = (leg, dim) => {
    const legHeight = leg.yBottom - leg.yTop - 1;
    if (recipe.skirt) {
      // Karakter berok: kaki telanjang, lalu kaus kaki di atas sepatu.
      const bare = dim ? recipe.skinShade : recipe.skin;
      const sockTop = leg.yBottom - 4;
      const sock = dim ? mix(recipe.sock, PALETTE.ink, 0.25) : recipe.sock;
      grid.rect(leg.x, leg.yTop, 4, legHeight, bare);
      grid.rect(leg.x, sockTop, 4, leg.yBottom - 2 - sockTop, sock);
    } else {
      const trouser = dim
        ? mix(recipe.trouser, PALETTE.ink, 0.3)
        : recipe.trouser;
      grid.rect(leg.x, leg.yTop, 4, legHeight, trouser);
    }
    grid.rect(leg.x, leg.yBottom - 2, 5, 2, recipe.shoe);
  };
  drawLeg(legA, moving && step === 1);
  drawLeg(legB, moving && step === 0);

  /* Badan */
  const bodyTop = 12 - bob;
  grid.rect(7, bodyTop, 10, 10 - bob, recipe.shirt);
  grid.rect(14, bodyTop, 3, 10 - bob, recipe.shirtShade);
  grid.set(11, bodyTop, recipe.skin);
  grid.set(12, bodyTop, recipe.skin);
  grid.set(12, bodyTop + 3, recipe.accent);
  grid.set(12, bodyTop + 6, recipe.accent);

  /* Rok sekolah: menutup pinggul dan melebar ke bawah. Digambar sebelum
     lengan supaya tangan tetap terlihat di depan rok. */
  if (recipe.skirt) {
    const hipY = bodyTop + 7;
    grid.rect(6, hipY, 12, 2, recipe.skirt);
    grid.rect(5, hipY + 2, 14, 2, recipe.skirt);
    const pleat = mix(recipe.skirt, PALETTE.ink, 0.35);
    for (const x of [8, 12, 16]) {
      grid.set(x, hipY + 1, pleat);
      grid.set(x, hipY + 3, pleat);
    }
  }

  /* Lengan */
  if (side) {
    const armX = 8 + (moving && step === 1 ? 1 : 0);
    grid.rect(armX, bodyTop, 3, 7, recipe.shirt);
    grid.rect(armX, bodyTop + 7, 3, 2, recipe.skin);
    grid.rect(17, bodyTop, 3, 7, recipe.shirtShade);
  } else {
    const swing = moving && step === 1 ? 1 : 0;
    grid.rect(5, bodyTop + swing, 2, 7, recipe.shirt);
    grid.rect(17, bodyTop + 1 - swing, 2, 7, recipe.shirtShade);
    grid.rect(5, bodyTop + 7 + swing, 2, 2, recipe.skin);
    grid.rect(17, bodyTop + 8 - swing, 2, 2, recipe.skin);
  }

  /* Leher */
  grid.rect(11, 11 - bob, 2, 1, recipe.skinShade);

  /* Kepala */
  grid.ellipse(12, 6 - bob, 7, 5.5, recipe.skin);
  grid.set(5, 11 - bob, ".");
  grid.set(18, 11 - bob, ".");
  grid.set(6, 12 - bob, ".");
  grid.set(17, 12 - bob, ".");

  /* Rambut depan */
  grid.ellipse(12, 3.5 - bob, 7.5, 4, recipe.hair);
  grid.rect(5, 0 - bob, 14, 3, recipe.hair);
  grid.rect(4, 3 - bob, 2, 5, recipe.hair);
  grid.rect(18, 3 - bob, 2, 5, recipe.hair);

  if (side && !diagonal) {
    // Menyamping murni: satu mata, hidung, mulut di sisi hadap.
    grid.rect(13, 1 - bob, 7, 8, recipe.hair);
    grid.rect(12, 2 - bob, 2, 6, recipe.hair);
    grid.rect(5, 2 - bob, 2, 4, recipe.hair);
    grid.rect(7, 6 - bob, 2, 3, recipe.eye);
    grid.set(7, 6 - bob, PALETTE.bone);
    grid.set(7, 10 - bob, recipe.mouth);
    grid.set(8, 10 - bob, recipe.mouth);
    if (recipe.beard) grid.rect(6, 11 - bob, 4, 2, recipe.hair);
  } else if (side && diagonal && facingDown) {
    // Diagonal bawah: tiga-perempat — badan menyamping, wajah ke kamera.
    grid.rect(14, 1 - bob, 6, 8, recipe.hair);
    grid.rect(13, 2 - bob, 2, 6, recipe.hair);
    grid.rect(5, 2 - bob, 2, 4, recipe.hair);
    // Poni hanya di sisi belakang supaya dua mata terlihat.
    grid.rect(5, 4 - bob, 8, 1, recipe.hair);
    grid.rect(7, 4 - bob, 2, 2, recipe.hair);
    grid.rect(11, 4 - bob, 2, 2, recipe.hair);
    grid.rect(8, 6 - bob, 2, 3, recipe.eye);
    grid.rect(12, 6 - bob, 2, 3, recipe.eye);
    grid.set(8, 6 - bob, PALETTE.bone);
    grid.set(12, 6 - bob, PALETTE.bone);
    grid.rect(10, 10 - bob, 2, 1, recipe.mouth);
    if (recipe.beard) {
      grid.set(7, 10 - bob, recipe.hair);
      grid.set(13, 10 - bob, recipe.hair);
      grid.rect(9, 11 - bob, 3, 1, recipe.hair);
    }
  } else if (side && diagonal) {
    // Diagonal atas: badan menyamping, kepala dari belakang (tanpa wajah).
    grid.ellipse(12, 6 - bob, 7, 5.5, recipe.hair);
    grid.rect(7, 2 - bob, 4, 1, recipe.hairLight);
    grid.rect(12, 1 - bob, 3, 1, recipe.hairLight);
    grid.rect(5, 6 - bob, 2, 5, recipe.hair);
    grid.rect(17, 6 - bob, 2, 5, recipe.hair);
    if (recipe.hairStyle === "ponytail") {
      grid.rect(11, 10 - bob, 3, 4, recipe.hair);
    }
  } else if (dir === "up") {
    grid.ellipse(12, 6 - bob, 7, 5.5, recipe.hair);
    grid.rect(7, 2 - bob, 4, 1, recipe.hairLight);
    grid.rect(12, 1 - bob, 3, 1, recipe.hairLight);
    grid.rect(5, 6 - bob, 2, 5, recipe.hair);
    grid.rect(17, 6 - bob, 2, 5, recipe.hair);
    if (recipe.hairStyle === "ponytail") {
      grid.rect(11, 10 - bob, 3, 4, recipe.hair);
    }
  } else {
    grid.rect(5, 4 - bob, 14, 1, recipe.hair);
    grid.rect(7, 4 - bob, 2, 2, recipe.hair);
    grid.rect(10, 4 - bob, 2, 2, recipe.hair);
    grid.rect(14, 4 - bob, 2, 2, recipe.hair);
    grid.rect(9, 2 - bob, 3, 1, recipe.hairLight);
    grid.rect(8, 6 - bob, 2, 3, recipe.eye);
    grid.rect(14, 6 - bob, 2, 3, recipe.eye);
    grid.set(8, 6 - bob, PALETTE.bone);
    grid.set(14, 6 - bob, PALETTE.bone);
    grid.rect(11, 10 - bob, 2, 1, recipe.mouth);
    if (recipe.beard) {
      grid.set(9, 10 - bob, recipe.hair);
      grid.set(15, 10 - bob, recipe.hair);
      grid.rect(10, 11 - bob, 4, 1, recipe.hair);
    }
  }

  applyHairExtras(grid, recipe, dir, bob);
  return grid;
}

/** Tambahan rambut per gaya setelah wajah digambar. */
function applyHairExtras(grid, recipe, dir, bob) {
  if (recipe.hairStyle === "long" && dir !== "up") {
    grid.behind(4, 4, 2, 14, recipe.hair);
    grid.behind(18, 4, 2, 14, recipe.hair);
  }
  if (recipe.hairStyle === "ponytail" && dir !== "up") {
    grid.behind(18, 2, 3, 6, recipe.hair);
    grid.set(19, 8 - bob, recipe.hair);
    grid.set(20, 9 - bob, recipe.hair);
    grid.set(18, 3 - bob, recipe.accent);
    grid.set(18, 4 - bob, recipe.accent);
  }
  if (recipe.hairStyle === "twintails") {
    // Pita kupu-kupu di pangkal tiap ekor: satu berlian 3×3.
    for (const baseX of [2, 19]) {
      grid.set(baseX + 1, 2, recipe.accent);
      grid.set(baseX, 3, recipe.accent);
      grid.set(baseX + 2, 3, recipe.accent);
      grid.set(baseX + 1, 4, recipe.accent);
    }
    // Garis bayangan di sisi dalam ekor supaya terpisah dari kepala,
    // lalu satu kilau di sisi luar.
    const tailShade = recipe.hairShade;
    for (let y = 5; y <= 11; y += 1) {
      grid.set(3, y - bob, tailShade);
      grid.set(20, y - bob, tailShade);
    }
    grid.set(2, 7 - bob, recipe.hairLight);
    grid.set(2, 10 - bob, recipe.hairLight);
    grid.set(21, 7 - bob, recipe.hairLight);
    grid.set(21, 10 - bob, recipe.hairLight);
  }
}

/** Roh air: gumpalan setetes air, satu bentuk untuk semua arah. */
function buildSpiritFrame(recipe, dir, step) {
  const grid = createGrid();
  const bob = step !== null && step === 1 ? 1 : 0;
  const cx = 12;
  const cy = 14 - bob;

  grid.rect(7, 22, 10, 6, recipe.skin);
  grid.rect(5, 25, 4, 3, recipe.skin);
  grid.rect(15, 25, 4, 3, recipe.skin);
  grid.rect(6, 28, 2, 2, recipe.skin);
  grid.rect(16, 28, 2, 2, recipe.skin);

  grid.ellipse(cx, cy, 8, 9, recipe.skin);
  grid.ellipse(cx + 2, cy + 3, 5, 5, recipe.skinShade);
  grid.ellipse(cx, cy - 1, 6.5, 7, recipe.skin);
  grid.ellipse(cx - 4, cy - 5, 2.5, 2, recipe.hairLight);
  grid.rect(5, cy + 1, 1, 3, recipe.hairLight);

  if (dir === "up") {
    grid.rect(9, cy - 4, 4, 1, recipe.hairLight);
    return grid;
  }

  const eyeY = cy - 2;
  if (dir === "left") {
    grid.rect(6, eyeY, 2, 3, recipe.eye);
    grid.set(6, eyeY, recipe.skinShade);
  } else {
    grid.rect(7, eyeY, 2, 3, recipe.eye);
    grid.rect(15, eyeY, 2, 3, recipe.eye);
    grid.set(7, eyeY, recipe.skinShade);
    grid.set(15, eyeY, recipe.skinShade);
  }
  grid.rect(11, cy + 3, 2, 1, recipe.mouth);
  return grid;
}

/* -------------------------------------------------------------------------- */
/* Sheet                                                                      */
/* -------------------------------------------------------------------------- */

/** Susunan frame: idle 2, jalan bawah, atas, kiri, kanan — masing-masing 2. */
const FRAME_PLAN = [
  { dir: "down", step: null, alt: false },
  { dir: "down", step: null, alt: true },
  { dir: "down", step: 0 },
  { dir: "down", step: 1 },
  { dir: "up", step: 0 },
  { dir: "up", step: 1 },
  { dir: "left", step: 0 },
  { dir: "left", step: 1 },
  { dir: "right", step: 0 },
  { dir: "right", step: 1 },
  { dir: "down-left", step: 0 },
  { dir: "down-left", step: 1 },
  { dir: "down-right", step: 0 },
  { dir: "down-right", step: 1 },
  { dir: "up-left", step: 0 },
  { dir: "up-left", step: 1 },
  { dir: "up-right", step: 0 },
  { dir: "up-right", step: 1 },
];

/** Sisi kanan digambar sebagai cermin kiri (termasuk diagonal). */
const CERMIN = new Set(["right", "down-right", "up-right"]);

/**
 * Satu frame → kanvas sheet, lalu outline 1 px di sekeliling siluet.
 *
 * Frame digambar dulu ke kanvas kecil, outline dihitung dari **salinan** buffer
 * (bukan buffer yang sama). Kalau membaca dan menulis buffer yang sama, tiap
 * piksel outline baru dianggap tetangga opaque sehingga outline menyebar sampai
 * tepi frame — itulah yang dulu tampak sebagai kotak hitam di sekitar karakter.
 */
function paintFrame(sheet, grid, offsetX, alt) {
  const frame = createCanvas(FRAME_WIDTH, FRAME_HEIGHT);
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.cells[y][x];
      if (!color || color === ".") continue;
      frame.px(x, y + (alt ? 1 : 0), color);
    }
  }
  frame.outline(OUTLINE);
  sheet.blit(frame, offsetX, 0);
  return sheet;
}

/** Spritesheet 10 frame (240×32) untuk satu karakter. */
export function characterSheet(name) {
  const recipe = RECIPES[name];
  const sheet = createCanvas(FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT);
  FRAME_PLAN.forEach((plan, index) => {
    const grid =
      recipe.hairStyle === "spirit"
        ? buildSpiritFrame(recipe, plan.dir, plan.step)
        : buildHumanFrame(recipe, plan.dir, plan.step);
    const frame =
      CERMIN.has(plan.dir) && recipe.hairStyle !== "spirit"
        ? grid.mirrored()
        : grid;
    paintFrame(sheet, frame, index * FRAME_WIDTH, plan.alt === true);
  });
  return sheet;
}

/** Karakter cadangan: siluet netral 10 frame. */
export function characterDefaultSheet() {
  const recipe = {
    hair: RAMP.neutral700,
    hairLight: RAMP.neutral300,
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
  FRAME_PLAN.forEach((plan, index) => {
    const grid = buildHumanFrame(recipe, plan.dir, plan.step);
    const frame = CERMIN.has(plan.dir) ? grid.mirrored() : grid;
    paintFrame(sheet, frame, index * FRAME_WIDTH, plan.alt === true);
  });
  return sheet;
}

/* -------------------------------------------------------------------------- */
/* Portrait 64×64                                                             */
/* -------------------------------------------------------------------------- */

/** Portrait close-up: grid kepala 16×16 diperbesar ×4 = 64×64. */
function buildPortraitGrid(recipe) {
  const grid = createGrid(16, 16);

  /* Bahu */
  grid.rect(1, 12, 14, 4, recipe.shirt);
  grid.rect(9, 12, 6, 4, recipe.shirtShade);

  /* Dagu dan leher: menutup lekuk rahang supaya latar tidak menembus. */
  grid.rect(4, 10, 8, 2, recipe.skin);
  grid.rect(6, 12, 4, 2, recipe.skin);
  grid.rect(6, 13, 4, 1, recipe.skinShade);

  /* Kepala */
  grid.ellipse(8, 6, 5.5, 6, recipe.skin);
  grid.ellipse(10, 8, 2, 2, recipe.skinShade);
  grid.ellipse(8, 6, 4.8, 5.4, recipe.skin);

  /* Rambut */
  grid.ellipse(8, 3, 6.5, 4.5, recipe.hair);
  grid.rect(2, 1, 12, 4, recipe.hair);
  grid.rect(1, 4, 2, 6, recipe.hair);
  grid.rect(13, 4, 2, 6, recipe.hair);
  grid.rect(2, 6, 12, 1, recipe.hair);
  for (const [x, height] of [
    [2, 1],
    [5, 2],
    [8, 1],
    [11, 2],
  ]) {
    grid.rect(x, 6, 2, height, recipe.hair);
  }
  grid.rect(4, 1, 3, 1, recipe.hairLight);
  grid.rect(9, 2, 2, 1, recipe.hairLight);

  /* Wajah */
  grid.rect(4, 6, 2, 3, recipe.eye);
  grid.rect(10, 6, 2, 3, recipe.eye);
  grid.set(4, 6, PALETTE.bone);
  grid.set(10, 6, PALETTE.bone);
  grid.rect(7, 10, 3, 1, recipe.mouth);

  if (recipe.hairStyle === "long") {
    grid.behind(0, 4, 2, 10, recipe.hair);
    grid.behind(14, 4, 2, 10, recipe.hair);
  }
  if (recipe.hairStyle === "ponytail") {
    grid.behind(13, 3, 3, 5, recipe.hair);
    grid.set(15, 8, recipe.hair);
    grid.set(15, 9, recipe.hair);
    grid.set(13, 3, recipe.accent);
  }
  if (recipe.hairStyle === "twintails") {
    // Ekor menjuntai lebih panjang dari rambut biasa, sampai menyentuh bahu.
    grid.rect(1, 5, 2, 7, recipe.hair);
    grid.rect(13, 5, 2, 7, recipe.hair);
    // Tepi dalam lebih gelap supaya ekor terpisah dari pipi.
    const tailShade = recipe.hairShade;
    grid.rect(2, 6, 1, 6, tailShade);
    grid.rect(13, 6, 1, 6, tailShade);
    // Pita kupu-kupu 3×3 di pangkal ekor.
    grid.set(2, 3, recipe.accent);
    grid.set(1, 4, recipe.accent);
    grid.set(3, 4, recipe.accent);
    grid.set(2, 5, recipe.accent);
    grid.set(13, 3, recipe.accent);
    grid.set(12, 4, recipe.accent);
    grid.set(14, 4, recipe.accent);
    grid.set(13, 5, recipe.accent);
    // Kilau di sisi luar.
    grid.set(1, 7, recipe.hairLight);
    grid.set(14, 8, recipe.hairLight);
  }
  if (recipe.beard) {
    grid.set(5, 10, recipe.hair);
    grid.set(11, 10, recipe.hair);
    grid.rect(6, 11, 4, 1, recipe.hair);
    grid.set(7, 10, recipe.mouth);
    grid.set(8, 10, recipe.mouth);
  }

  return grid;
}

/** Portrait karakter 64×64 dengan latar panel malam. */
export function portrait(name) {
  const recipe = RECIPES[name];
  const canvas = createCanvas(64, 64);

  canvas.vgradient(0, 0, 64, 64, [
    { at: 0, color: RAMP.nightMid },
    { at: 1, color: RAMP.deep },
  ]);
  canvas.disc(32, 40, 24, mix(RAMP.nightMid, PALETTE.cool, 0.16));
  for (let i = 0; i < 64; i += 4) {
    canvas.blend(i, 61, mix(RAMP.nightMid, PALETTE.cool, 0.3), 0.35);
    canvas.blend(i + 2, 62, mix(RAMP.nightMid, PALETTE.cool, 0.3), 0.2);
  }

  const grid = buildPortraitGrid(recipe);
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.cells[y][x];
      if (!color || color === ".") continue;
      canvas.rect(x * 4, y * 4, 4, 4, color);
    }
  }
  canvas.outline(OUTLINE);

  canvas.frame(1, 1, 62, 62, 2, RAMP.neutral700);
  canvas.frame(3, 3, 58, 58, 1, mix(PALETTE.bone, RAMP.nightMid, 0.72));
  return canvas;
}

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
