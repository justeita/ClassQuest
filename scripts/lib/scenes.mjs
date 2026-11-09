/**
 * Gambar latar 640×360 (asset-guide.md → Background, ADR 0009).
 *
 * Latar ini **hanya dipakai layar judul dan layar hasil** (world-design.md §
 * Lampiran aset latar) — di dalam permainan, ruangan disusun dari tile di
 * `tiles.mjs`. Area ±120 px paling bawah dibuat lapang supaya teks tetap
 * terbaca di atasnya.
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

/** Awan bergaya blok: tumpukan cakram dengan dasar lebih gelap. */
function drawCloud(canvas, x, y, scale, light, dark) {
  const puffs = [
    [0, 0, 12],
    [13, -4, 15],
    [28, 0, 11],
    [9, 5, 12],
    [22, 5, 12],
  ];
  for (const [dx, dy, radius] of puffs) {
    canvas.disc(
      x + dx * scale,
      y + dy * scale,
      Math.max(2, Math.round(radius * scale)),
      light,
    );
  }
  for (const [dx, dy, radius] of puffs) {
    const cy = y + dy * scale + Math.round(radius * scale) - 2;
    canvas.disc(
      x + dx * scale,
      cy,
      Math.max(1, Math.round((radius - 3) * scale)),
      dark,
    );
  }
  return canvas;
}

/** Pohon dekoratif untuk latar pemandangan (bukan prop map). */
function drawTree(canvas, x, groundY, scale, canopy, canopyLight, trunk) {
  const trunkWidth = Math.max(2, Math.round(4 * scale));
  canvas.rect(
    x - Math.round(trunkWidth / 2),
    groundY - Math.round(22 * scale),
    trunkWidth,
    Math.round(24 * scale),
    trunk,
  );
  canvas.disc(
    x,
    groundY - Math.round(30 * scale),
    Math.round(15 * scale),
    canopy,
  );
  canvas.disc(
    x - Math.round(11 * scale),
    groundY - Math.round(24 * scale),
    Math.round(11 * scale),
    canopy,
  );
  canvas.disc(
    x + Math.round(11 * scale),
    groundY - Math.round(24 * scale),
    Math.round(11 * scale),
    canopy,
  );
  canvas.disc(
    x - Math.round(4 * scale),
    groundY - Math.round(35 * scale),
    Math.round(8 * scale),
    canopyLight,
  );
  return canvas;
}

/** Jendela dengan langit di dalamnya, kusen, dan tirai. */
function drawWindow(canvas, x, y, w, h, skyStops, frameColor) {
  canvas.vgradient(x, y, w, h, skyStops);
  canvas.frame(x - 3, y - 3, w + 6, h + 6, 4, frameColor);
  canvas.rect(x + Math.round(w / 2) - 1, y, 2, h, frameColor);
  canvas.rect(x, y + Math.round(h / 2) - 1, w, 2, frameColor);
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Kelas, siang                                                               */
/* -------------------------------------------------------------------------- */

export function classroomDay() {
  const canvas = createCanvas(W, H);
  const wall = mix(PALETTE.paper, PALETTE.warm, 0.14);
  const wallShade = mix(PALETTE.paper, PALETTE.warm, 0.26);
  const floor = mix(PALETTE.paper, PALETTE.warm, 0.42);
  const floorDark = mix(PALETTE.warm, PALETTE.night, 0.42);

  canvas.rect(0, 0, W, H, wall);
  canvas.rect(0, 0, W, 18, mix(PALETTE.paper, PALETTE.bone, 0.5));
  canvas.hline(0, 18, W, wallShade);
  canvas.rect(0, 248, W, H - 248, floor);
  canvas.hline(0, 248, W, floorDark);
  canvas.dither(0, 328, W, 32, floor, floorDark, 0.34);

  const sky = [
    { at: 0, color: mix(PALETTE.cool, PALETTE.paper, 0.25) },
    { at: 0.55, color: RAMP.skyDay },
    { at: 1, color: PALETTE.bone },
  ];
  for (const x of [58, 286]) {
    drawWindow(
      canvas,
      x,
      52,
      158,
      112,
      sky,
      mix(PALETTE.paper, PALETTE.night, 0.28),
    );
    drawCloud(
      canvas,
      x + 34,
      102,
      0.66,
      PALETTE.bone,
      mix(PALETTE.bone, PALETTE.cool, 0.3),
    );
    canvas.rect(x - 11, 44, 9, 128, mix(PALETTE.warm, PALETTE.paper, 0.3));
    canvas.rect(x + 159, 44, 9, 128, mix(PALETTE.warm, PALETTE.paper, 0.3));
  }

  // Papan tulis di kanan.
  canvas.rect(462, 58, 156, 110, RAMP.nightMid);
  canvas.frame(462, 58, 156, 110, 4, mix(PALETTE.warm, PALETTE.night, 0.35));
  canvas.rect(476, 86, 58, 2, RAMP.neutral500);
  canvas.rect(476, 102, 92, 2, RAMP.neutral500);
  canvas.rect(476, 118, 70, 2, RAMP.neutral500);
  canvas.rect(476, 134, 110, 2, mix(PALETTE.moss, PALETTE.paper, 0.3));
  canvas.disc(584, 118, 12, mix(PALETTE.moss, PALETTE.paper, 0.55));

  // Berkas cahaya dari jendela ke lantai.
  canvas.polygonBlend(
    [
      [80, 166],
      [200, 166],
      [274, 360],
      [128, 360],
    ],
    PALETTE.bone,
    0.16,
  );

  // Meja-meja kelas.
  const desk = (x, y, scale) => {
    const top = Math.round(34 * scale);
    const height = Math.round(5 * scale);
    canvas.rect(x, y, top, height, mix(PALETTE.warm, PALETTE.paper, 0.15));
    canvas.rect(
      x,
      y + height,
      top,
      Math.round(2 * scale),
      mix(PALETTE.warm, PALETTE.night, 0.4),
    );
    canvas.rect(
      x + Math.round(4 * scale),
      y + height,
      Math.round(3 * scale),
      Math.round(16 * scale),
      RAMP.neutral700,
    );
    canvas.rect(
      x + top - Math.round(7 * scale),
      y + height,
      Math.round(3 * scale),
      Math.round(16 * scale),
      RAMP.neutral700,
    );
  };
  desk(128, 278, 1.2);
  desk(262, 278, 1.2);
  desk(396, 278, 1.2);
  desk(196, 326, 1.3);
  desk(350, 326, 1.3);

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Halaman sekolah                                                            */
/* -------------------------------------------------------------------------- */

function schoolyard(variant) {
  const canvas = createCanvas(W, H);
  const evening = variant === "evening";

  const skyStops = evening
    ? [
        { at: 0, color: mix(PALETTE.cool, PALETTE.night, 0.35) },
        { at: 0.45, color: RAMP.skyDusk },
        { at: 0.8, color: mix(PALETTE.warm, PALETTE.paper, 0.35) },
        { at: 1, color: mix(PALETTE.gold, PALETTE.paper, 0.55) },
      ]
    : [
        { at: 0, color: mix(PALETTE.cool, PALETTE.paper, 0.2) },
        { at: 0.6, color: RAMP.skyDay },
        { at: 1, color: PALETTE.bone },
      ];

  canvas.vgradient(0, 0, W, 224, skyStops);

  if (evening) {
    canvas.ring(538, 176, 34, PALETTE.warm, 0.12);
    canvas.disc(538, 176, 25, mix(PALETTE.gold, PALETTE.paper, 0.7));
    canvas.disc(538, 176, 19, mix(PALETTE.gold, PALETTE.bone, 0.8));
  } else {
    canvas.ring(538, 62, 32, PALETTE.bone, 0.14);
    canvas.disc(538, 62, 20, mix(PALETTE.gold, PALETTE.bone, 0.75));
  }

  const cloudLight = evening
    ? mix(PALETTE.warm, PALETTE.paper, 0.5)
    : PALETTE.bone;
  const cloudDark = evening
    ? mix(PALETTE.warm, PALETTE.night, 0.3)
    : mix(PALETTE.bone, PALETTE.cool, 0.35);
  drawCloud(canvas, 80, 78, 1.2, cloudLight, cloudDark);
  drawCloud(canvas, 332, 54, 0.85, cloudLight, cloudDark);

  const grass = evening
    ? mix(PALETTE.moss, PALETTE.night, 0.35)
    : mix(PALETTE.moss, PALETTE.paper, 0.42);
  const grassDark = mix(grass, PALETTE.night, 0.3);
  canvas.rect(0, 262, W, H - 262, grass);
  canvas.dither(0, 262, W, 24, grass, grassDark, 0.4);

  const wallColor = evening
    ? mix(PALETTE.paper, PALETTE.night, 0.42)
    : mix(PALETTE.paper, PALETTE.bone, 0.4);
  const wallShadow = mix(wallColor, PALETTE.night, 0.22);
  const trim = evening
    ? mix(PALETTE.night, PALETTE.warm, 0.2)
    : mix(PALETTE.warm, PALETTE.night, 0.35);

  canvas.rect(86, 158, 315, 110, wallColor);
  canvas.rect(400, 176, 83, 92, wallShadow);
  canvas.polygon(
    [
      [70, 160],
      [243, 112],
      [416, 160],
      [408, 171],
      [86, 171],
    ],
    evening
      ? mix(PALETTE.warm, PALETTE.night, 0.55)
      : mix(PALETTE.warm, PALETTE.night, 0.4),
  );
  canvas.hline(86, 171, 322, trim);
  canvas.rect(310, 118, 21, 32, wallShadow);
  for (let i = 0; i < 4; i += 1) {
    const x = 112 + i * 70;
    canvas.rect(
      x,
      184,
      43,
      32,
      evening ? RAMP.glow : mix(PALETTE.cool, PALETTE.paper, 0.3),
    );
    canvas.frame(x, 184, 43, 32, 3, trim);
    if (evening) canvas.blend(x + 19, 198, PALETTE.bone, 0.3);
  }
  canvas.rect(
    224,
    224,
    45,
    44,
    evening
      ? mix(PALETTE.gold, PALETTE.warm, 0.3)
      : mix(PALETTE.warm, PALETTE.paper, 0.2),
  );
  canvas.frame(224, 224, 45, 44, 3, trim);
  canvas.rect(244, 224, 3, 44, trim);

  const path = evening
    ? mix(PALETTE.gold, PALETTE.paper, 0.42)
    : mix(PALETTE.paper, PALETTE.warm, 0.3);
  canvas.polygon(
    [
      [224, 268],
      [269, 268],
      [328, 360],
      [168, 360],
    ],
    path,
  );

  const canopy = evening ? mix(PALETTE.moss, PALETTE.night, 0.45) : RAMP.leaf;
  const canopyLight = evening
    ? mix(PALETTE.moss, PALETTE.warm, 0.25)
    : RAMP.leafLight;
  drawTree(
    canvas,
    45,
    268,
    1.4,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );
  drawTree(
    canvas,
    540,
    276,
    1.7,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );
  drawTree(
    canvas,
    608,
    264,
    1.1,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );

  if (evening) {
    canvas.polygon(
      [
        [400, 264],
        [626, 264],
        [626, 286],
        [400, 286],
      ],
      mix(PALETTE.night, PALETTE.moss, 0.3),
    );
  }

  return canvas;
}

export const schoolyardDay = () => schoolyard("day");
export const schoolyardEvening = () => schoolyard("evening");

/* -------------------------------------------------------------------------- */
/* Langit di atas awan                                                        */
/* -------------------------------------------------------------------------- */

export function cloudSky() {
  const canvas = createCanvas(W, H);
  canvas.vgradient(0, 0, W, H, [
    { at: 0, color: mix(PALETTE.cool, PALETTE.night, 0.12) },
    { at: 0.28, color: RAMP.skyDay },
    { at: 0.62, color: mix(PALETTE.bone, PALETTE.paper, 0.4) },
    { at: 1, color: PALETTE.bone },
  ]);

  canvas.ring(128, 72, 52, PALETTE.bone, 0.12);
  canvas.ring(128, 72, 40, PALETTE.bone, 0.16);
  canvas.disc(128, 72, 24, mix(PALETTE.gold, PALETTE.bone, 0.82));

  drawCloud(
    canvas,
    400,
    94,
    0.7,
    mix(PALETTE.bone, PALETTE.paper, 0.3),
    mix(PALETTE.cool, PALETTE.paper, 0.45),
  );
  drawCloud(
    canvas,
    280,
    142,
    0.5,
    mix(PALETTE.bone, PALETTE.paper, 0.3),
    mix(PALETTE.cool, PALETTE.paper, 0.45),
  );

  const cloudLight = PALETTE.bone;
  const cloudMid = mix(PALETTE.bone, PALETTE.cool, 0.22);
  const cloudDark = mix(PALETTE.cool, PALETTE.paper, 0.55);

  canvas.rect(0, 286, W, H - 286, cloudMid);
  canvas.dither(0, 286, W, H - 286, cloudLight, cloudMid, 0.45);
  for (let i = 0; i < 7; i += 1) {
    const x = 26 + i * 96 + (i % 2) * 24;
    const y = 286 + ((i * 17) % 30);
    canvas.disc(x, y, 34 - (i % 3) * 4, cloudLight);
    canvas.disc(x + 26, y + 8, 24, cloudMid);
    canvas.disc(x - 20, y + 10, 18, cloudMid);
  }
  canvas.disc(160, 328, 60, cloudLight);
  canvas.disc(280, 344, 52, cloudLight);
  canvas.disc(440, 334, 68, cloudLight);
  canvas.disc(574, 350, 50, cloudLight);
  canvas.dither(0, 326, W, 34, cloudLight, cloudDark, 0.22);

  for (const [x, y] of [
    [424, 140],
    [446, 128],
    [470, 146],
  ]) {
    canvas.px(x, y, RAMP.neutral700);
    canvas.px(x + 1, y - 1, RAMP.neutral700);
    canvas.px(x + 2, y, RAMP.neutral700);
    canvas.px(x + 3, y - 1, RAMP.neutral700);
    canvas.px(x + 4, y, RAMP.neutral700);
  }

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Gunung, malam (latar layar judul)                                          */
/* -------------------------------------------------------------------------- */

export function mountainNight() {
  const canvas = createCanvas(W, H);

  canvas.vgradient(0, 0, W, 268, [
    { at: 0, color: RAMP.deep },
    { at: 0.3, color: RAMP.nightMid },
    { at: 0.62, color: RAMP.skyNight },
    { at: 0.86, color: mix(PALETTE.night, PALETTE.cool, 0.34) },
    { at: 1, color: RAMP.skyDusk },
  ]);

  drawStars(canvas, 20261109, 150, 224);

  const moonX = 474;
  const moonY = 112;
  canvas.ring(moonX, moonY, 82, PALETTE.bone, 0.05);
  canvas.ring(moonX, moonY, 68, PALETTE.bone, 0.07);
  canvas.ring(moonX, moonY, 56, PALETTE.bone, 0.1);
  canvas.disc(moonX, moonY, 40, mix(PALETTE.paper, PALETTE.bone, 0.5));
  canvas.disc(moonX, moonY, 34, PALETTE.bone);
  canvas.disc(
    moonX + 12,
    moonY + 10,
    7,
    mix(PALETTE.paper, PALETTE.warm, 0.25),
  );
  canvas.disc(moonX - 10, moonY - 8, 4, mix(PALETTE.paper, PALETTE.warm, 0.25));

  canvas.polygon(
    [
      [0, 236],
      [78, 176],
      [140, 210],
      [224, 158],
      [310, 216],
      [390, 184],
      [474, 226],
      [560, 174],
      [640, 222],
      [640, 286],
      [0, 286],
    ],
    RAMP.far,
  );
  canvas.polygon(
    [
      [0, 260],
      [96, 214],
      [172, 246],
      [276, 202],
      [358, 248],
      [444, 220],
      [536, 258],
      [640, 224],
      [640, 296],
      [0, 296],
    ],
    RAMP.mid,
  );
  canvas.polygon(
    [
      [0, 286],
      [128, 254],
      [224, 280],
      [334, 250],
      [434, 284],
      [530, 260],
      [640, 288],
      [640, 320],
      [0, 320],
    ],
    RAMP.near,
  );

  canvas.rect(0, 300, W, H - 300, RAMP.deep);
  canvas.dither(0, 300, W, 14, RAMP.near, RAMP.deep, 0.5);
  canvas.hline(0, 300, W, mix(PALETTE.cool, PALETTE.night, 0.3));

  // Sekolah kecil di kiri dengan jendela menyala.
  const wall = mix(PALETTE.night, PALETTE.ink, 0.5);
  canvas.rect(66, 254, 123, 46, wall);
  canvas.polygon(
    [
      [56, 257],
      [128, 230],
      [200, 257],
      [197, 262],
      [58, 262],
    ],
    mix(PALETTE.night, PALETTE.warm, 0.18),
  );
  for (let i = 0; i < 3; i += 1) {
    const x = 82 + i * 34;
    canvas.rect(x, 270, 16, 16, RAMP.glow);
    canvas.blend(x + 5, 275, PALETTE.bone, 0.5);
  }
  canvas.rect(128, 281, 16, 19, mix(PALETTE.gold, PALETTE.night, 0.45));

  drawTree(
    canvas,
    536,
    310,
    1.1,
    RAMP.deep,
    mix(PALETTE.moss, PALETTE.night, 0.55),
    RAMP.deep,
  );
  drawTree(
    canvas,
    598,
    316,
    1.35,
    RAMP.deep,
    mix(PALETTE.moss, PALETTE.night, 0.55),
    RAMP.deep,
  );

  const rng = random(77);
  for (let i = 0; i < 120; i += 1) {
    const x = Math.round(rng() * W);
    const h2 = 2 + Math.round(rng() * 5);
    canvas.vline(x, 320 - h2, h2, mix(PALETTE.moss, PALETTE.night, 0.6));
  }

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Sungai, siang                                                              */
/* -------------------------------------------------------------------------- */

export function riverDay() {
  const canvas = createCanvas(W, H);
  canvas.vgradient(0, 0, W, 188, [
    { at: 0, color: mix(PALETTE.cool, PALETTE.paper, 0.15) },
    { at: 0.6, color: RAMP.skyDay },
    { at: 1, color: PALETTE.bone },
  ]);
  drawCloud(
    canvas,
    120,
    54,
    1,
    PALETTE.bone,
    mix(PALETTE.bone, PALETTE.cool, 0.3),
  );
  drawCloud(
    canvas,
    426,
    80,
    0.75,
    PALETTE.bone,
    mix(PALETTE.bone, PALETTE.cool, 0.3),
  );

  canvas.polygon(
    [
      [0, 176],
      [110, 128],
      [224, 172],
      [342, 122],
      [462, 168],
      [574, 134],
      [640, 166],
      [640, 200],
      [0, 200],
    ],
    RAMP.far,
  );
  canvas.polygon(
    [
      [0, 196],
      [94, 162],
      [200, 196],
      [326, 156],
      [440, 192],
      [560, 166],
      [640, 196],
      [640, 220],
      [0, 220],
    ],
    mix(PALETTE.moss, PALETTE.night, 0.45),
  );

  canvas.rect(0, 212, W, 104, RAMP.water);
  canvas.dither(0, 212, W, 14, RAMP.water, RAMP.waterDeep, 0.5);
  for (let i = 0; i < 30; i += 1) {
    const y = 222 + ((i * 9) % 84);
    const x = (i * 71) % W;
    const width = 16 + ((i * 13) % 34);
    canvas.hline(x, y, width, RAMP.waterDeep);
    if (i % 3 === 0)
      canvas.hline(x + 10, y + 1, Math.round(width / 2), PALETTE.bone);
  }
  for (const [x, y, r] of [
    [160, 262, 8],
    [400, 278, 10],
    [522, 248, 6],
  ]) {
    canvas.disc(x, y, r, RAMP.neutral700);
    canvas.disc(x, y - 1, r - 2, RAMP.neutral500);
  }

  const bank = RAMP.leaf;
  canvas.rect(0, 304, W, H - 304, bank);
  canvas.dither(0, 304, W, 16, bank, mix(bank, PALETTE.night, 0.35), 0.45);
  canvas.rect(0, 200, W, 12, bank);
  const rng = random(11);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.round(rng() * W);
    const h2 = 4 + Math.round(rng() * 10);
    canvas.vline(x, 316 - h2, h2, mix(PALETTE.moss, PALETTE.night, 0.5));
  }
  drawTree(canvas, 56, 310, 1.15, RAMP.leaf, RAMP.leafLight, RAMP.neutral700);
  drawTree(canvas, 584, 316, 1.25, RAMP.leaf, RAMP.leafLight, RAMP.neutral700);

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Perpustakaan, sore                                                         */
/* -------------------------------------------------------------------------- */

export function libraryEvening() {
  const canvas = createCanvas(W, H);
  const wall = mix(PALETTE.paper, PALETTE.warm, 0.22);
  const floor = mix(PALETTE.warm, PALETTE.night, 0.42);

  canvas.rect(0, 0, W, H, wall);
  canvas.rect(0, 0, W, 16, mix(wall, PALETTE.night, 0.3));
  canvas.rect(0, 254, W, H - 254, floor);
  canvas.hline(0, 254, W, mix(floor, PALETTE.night, 0.4));
  canvas.dither(0, 328, W, 32, floor, mix(floor, PALETTE.night, 0.3), 0.3);

  canvas.vgradient(274, 58, 90, 128, [
    { at: 0, color: mix(PALETTE.cool, PALETTE.night, 0.3) },
    { at: 0.5, color: RAMP.skyDusk },
    { at: 1, color: mix(PALETTE.gold, PALETTE.paper, 0.5) },
  ]);
  canvas.frame(270, 54, 98, 136, 4, mix(PALETTE.warm, PALETTE.night, 0.4));
  canvas.rect(315, 58, 2, 128, mix(PALETTE.warm, PALETTE.night, 0.4));

  const shelf = (x, w) => {
    canvas.rect(x, 44, w, 206, mix(PALETTE.warm, PALETTE.night, 0.3));
    const spines = [
      PALETTE.paper,
      PALETTE.warm,
      PALETTE.cool,
      PALETTE.moss,
      PALETTE.gold,
      PALETTE.bone,
      RAMP.neutral300,
    ];
    const rng = random(x * 31 + 7);
    for (let row = 0; row < 5; row += 1) {
      const y = 58 + row * 38;
      canvas.rect(
        x + 6,
        y + 30,
        w - 12,
        4,
        mix(PALETTE.warm, PALETTE.night, 0.5),
      );
      let cursor = x + 8;
      while (cursor < x + w - 14) {
        const bookWidth = 4 + Math.round(rng() * 5);
        const bookHeight = 20 + Math.round(rng() * 12);
        const color = spines[Math.floor(rng() * spines.length)];
        canvas.rect(cursor, y + 30 - bookHeight, bookWidth, bookHeight, color);
        canvas.vline(
          cursor,
          y + 30 - bookHeight,
          bookHeight,
          mix(color, PALETTE.night, 0.35),
        );
        cursor += bookWidth + 1;
      }
    }
  };
  shelf(22, 204);
  shelf(400, 218);

  // Meja baca + lampu.
  canvas.rect(160, 286, 320, 10, mix(PALETTE.warm, PALETTE.night, 0.25));
  canvas.rect(176, 296, 8, 40, mix(PALETTE.warm, PALETTE.night, 0.45));
  canvas.rect(456, 296, 8, 40, mix(PALETTE.warm, PALETTE.night, 0.45));
  canvas.rect(310, 254, 6, 32, mix(PALETTE.warm, PALETTE.night, 0.45));
  canvas.polygon(
    [
      [294, 254],
      [332, 254],
      [324, 238],
      [302, 238],
    ],
    PALETTE.gold,
  );
  canvas.ring(312, 262, 30, PALETTE.gold, 0.12);
  canvas.blend(312, 262, PALETTE.paper, 0.1);

  // Buku terbuka di meja.
  canvas.rect(262, 272, 40, 13, PALETTE.paper);
  canvas.rect(304, 272, 40, 13, PALETTE.paper);
  canvas.vline(303, 272, 13, mix(PALETTE.paper, PALETTE.warm, 0.5));
  canvas.hline(268, 278, 30, mix(PALETTE.paper, PALETTE.cool, 0.4));
  canvas.hline(310, 278, 30, mix(PALETTE.paper, PALETTE.cool, 0.4));

  canvas.polygonBlend(
    [
      [274, 186],
      [364, 186],
      [424, 360],
      [236, 360],
    ],
    PALETTE.gold,
    0.14,
  );

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
