/**
 * Gambar latar 480×270 (docs/07-assets/asset-guide.md → Background).
 *
 * Setiap fungsi mengembalikan kanvas baru. Palet dan turunannya ada di
 * `palette.mjs`; di sini hanya komposisi. Area 90 px paling bawah sengaja
 * dibuat lapang supaya textbox tidak menutupi detail penting.
 */

import { createCanvas, mix, random } from "./pixel.mjs";
import { PALETTE, RAMP } from "./palette.mjs";

const W = 480;
const H = 270;

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

/** Garis punggung bukit 1 px di sepanjang titik puncak (tanpa sisi penutup). */
function traceRidge(canvas, points, color) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let step = 0; step <= steps; step += 1) {
      const x = Math.round(x1 + ((x2 - x1) * step) / steps);
      const y = Math.round(y1 + ((y2 - y1) * step) / steps);
      canvas.px(x, y, color);
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

/** Pohon sederhana: batang gelap + kanopi tiga tumpuk. */
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

/** Jendela dengan langit di dalamnya, plus kusen dan tirai. */
function drawWindow(canvas, x, y, w, h, skyStops, frameColor) {
  canvas.vgradient(x, y, w, h, skyStops);
  canvas.frame(x - 2, y - 2, w + 4, h + 4, 3, frameColor);
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
  // Langit-langit dan garis sudut.
  canvas.rect(0, 0, W, 14, mix(PALETTE.paper, PALETTE.bone, 0.5));
  canvas.hline(0, 14, W, wallShade);
  // Lantai.
  canvas.rect(0, 186, W, H - 186, floor);
  canvas.hline(0, 186, W, floorDark);
  canvas.dither(0, 246, W, 24, floor, floorDark, 0.34);

  // Dua jendela besar dengan langit siang yang sama.
  const sky = [
    { at: 0, color: mix(PALETTE.cool, PALETTE.paper, 0.25) },
    { at: 0.55, color: RAMP.skyDay },
    { at: 1, color: PALETTE.bone },
  ];
  for (const x of [44, 214]) {
    drawWindow(
      canvas,
      x,
      40,
      118,
      84,
      sky,
      mix(PALETTE.paper, PALETTE.night, 0.28),
    );
    drawCloud(
      canvas,
      x + 26,
      78,
      0.5,
      PALETTE.bone,
      mix(PALETTE.bone, PALETTE.cool, 0.3),
    );
    // Tirai.
    canvas.rect(x - 8, 34, 7, 96, mix(PALETTE.warm, PALETTE.paper, 0.3));
    canvas.rect(x + 119, 34, 7, 96, mix(PALETTE.warm, PALETTE.paper, 0.3));
  }

  // Papan tulis di kanan.
  canvas.rect(346, 44, 118, 82, RAMP.nightMid);
  canvas.frame(346, 44, 118, 82, 3, mix(PALETTE.warm, PALETTE.night, 0.35));
  canvas.rect(356, 64, 44, 1, RAMP.neutral500);
  canvas.rect(356, 76, 70, 1, RAMP.neutral500);
  canvas.rect(356, 88, 52, 1, RAMP.neutral500);
  canvas.rect(356, 100, 82, 1, mix(PALETTE.moss, PALETTE.paper, 0.3));
  canvas.disc(438, 88, 9, mix(PALETTE.moss, PALETTE.paper, 0.55));

  // Berkas cahaya dari jendela ke lantai.
  canvas.polygonBlend(
    [
      [60, 126],
      [150, 126],
      [206, 270],
      [96, 270],
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
  desk(96, 208, 1.1);
  desk(196, 208, 1.1);
  desk(296, 208, 1.1);
  desk(146, 244, 1.2);
  desk(262, 244, 1.2);

  // Peredupan lembut di tepi bawah agar teks di atas tetap terbaca.
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

  canvas.vgradient(0, 0, W, 168, skyStops);

  // Matahari: tinggi di siang, rendah dan besar di sore.
  if (evening) {
    canvas.ring(404, 132, 26, PALETTE.warm, 0.12);
    canvas.disc(404, 132, 19, mix(PALETTE.gold, PALETTE.paper, 0.7));
    canvas.disc(404, 132, 14, mix(PALETTE.gold, PALETTE.bone, 0.8));
  } else {
    canvas.ring(404, 46, 24, PALETTE.bone, 0.14);
    canvas.disc(404, 46, 15, mix(PALETTE.gold, PALETTE.bone, 0.75));
  }

  const cloudLight = evening
    ? mix(PALETTE.warm, PALETTE.paper, 0.5)
    : PALETTE.bone;
  const cloudDark = evening
    ? mix(PALETTE.warm, PALETTE.night, 0.3)
    : mix(PALETTE.bone, PALETTE.cool, 0.35);
  drawCloud(canvas, 60, 58, 1, cloudLight, cloudDark);
  drawCloud(canvas, 250, 40, 0.7, cloudLight, cloudDark);

  // Tanah.
  const grass = evening
    ? mix(PALETTE.moss, PALETTE.night, 0.35)
    : mix(PALETTE.moss, PALETTE.paper, 0.42);
  const grassDark = mix(grass, PALETTE.night, 0.3);
  canvas.rect(0, 196, W, H - 196, grass);
  canvas.dither(0, 196, W, 18, grass, grassDark, 0.4);

  // Bangunan sekolah.
  const wallColor = evening
    ? mix(PALETTE.paper, PALETTE.night, 0.42)
    : mix(PALETTE.paper, PALETTE.bone, 0.4);
  const wallShadow = mix(wallColor, PALETTE.night, 0.22);
  const trim = evening
    ? mix(PALETTE.night, PALETTE.warm, 0.2)
    : mix(PALETTE.warm, PALETTE.night, 0.35);

  canvas.rect(64, 118, 236, 82, wallColor);
  canvas.rect(300, 132, 62, 68, wallShadow);
  // Atap.
  canvas.polygon(
    [
      [52, 120],
      [182, 84],
      [312, 120],
      [306, 128],
      [64, 128],
    ],
    evening
      ? mix(PALETTE.warm, PALETTE.night, 0.55)
      : mix(PALETTE.warm, PALETTE.night, 0.4),
  );
  canvas.hline(64, 128, 242, trim);
  // Cerobong.
  canvas.rect(232, 88, 16, 24, wallShadow);
  // Jendela deret atas dan bawah.
  for (let i = 0; i < 4; i += 1) {
    const x = 84 + i * 52;
    canvas.rect(
      x,
      138,
      32,
      24,
      evening ? RAMP.glow : mix(PALETTE.cool, PALETTE.paper, 0.3),
    );
    canvas.frame(x, 138, 32, 24, 2, trim);
    if (evening) canvas.blend(x + 14, 148, PALETTE.bone, 0.3);
  }
  // Pintu masuk.
  canvas.rect(
    168,
    168,
    34,
    32,
    evening
      ? mix(PALETTE.gold, PALETTE.warm, 0.3)
      : mix(PALETTE.warm, PALETTE.paper, 0.2),
  );
  canvas.frame(168, 168, 34, 32, 2, trim);
  canvas.rect(183, 168, 2, 32, trim);

  // Jalur setapak dari pintu ke bawah layar.
  const path = evening
    ? mix(PALETTE.gold, PALETTE.paper, 0.42)
    : mix(PALETTE.paper, PALETTE.warm, 0.3);
  canvas.polygon(
    [
      [168, 200],
      [202, 200],
      [246, 270],
      [126, 270],
    ],
    path,
  );

  // Pepohonan.
  const canopy = evening ? mix(PALETTE.moss, PALETTE.night, 0.45) : RAMP.leaf;
  const canopyLight = evening
    ? mix(PALETTE.moss, PALETTE.warm, 0.25)
    : RAMP.leafLight;
  drawTree(
    canvas,
    34,
    200,
    1.1,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );
  drawTree(
    canvas,
    404,
    206,
    1.35,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );
  drawTree(
    canvas,
    456,
    198,
    0.9,
    canopy,
    canopyLight,
    evening ? RAMP.deep : RAMP.neutral700,
  );

  // Bayangan panjang di sore hari.
  if (evening) {
    canvas.polygon(
      [
        [300, 198],
        [470, 198],
        [470, 214],
        [300, 214],
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
    { at: 0.58, color: mix(PALETTE.bone, PALETTE.cool, 0.38) },
    { at: 1, color: mix(PALETTE.bone, PALETTE.cool, 0.5) },
  ]);

  // Matahari tinggi di kiri dengan halo bertingkat.
  canvas.ring(96, 54, 52, PALETTE.bone, 0.05);
  canvas.ring(96, 54, 40, PALETTE.bone, 0.08);
  canvas.ring(96, 54, 28, PALETTE.bone, 0.12);
  canvas.disc(96, 54, 18, mix(PALETTE.gold, PALETTE.bone, 0.82));

  // Awan jauh.
  drawCloud(
    canvas,
    300,
    70,
    0.55,
    mix(PALETTE.bone, PALETTE.paper, 0.3),
    mix(PALETTE.cool, PALETTE.paper, 0.45),
  );
  drawCloud(
    canvas,
    210,
    106,
    0.4,
    mix(PALETTE.bone, PALETTE.paper, 0.3),
    mix(PALETTE.cool, PALETTE.paper, 0.45),
  );

  // Kabut tipis di garis cakrawala.
  canvas.polygonBlend(
    [
      [0, 172],
      [W, 166],
      [W, 210],
      [0, 214],
    ],
    mix(PALETTE.bone, PALETTE.paper, 0.4),
    0.22,
  );

  // Awan jauh berbaris di atas cakrawala.
  for (let i = 0; i < 6; i += 1) {
    const x = 24 + i * 82 + (i % 2) * 20;
    const y = 138 + ((i * 17) % 26);
    drawCloud(
      canvas,
      x,
      y,
      0.32,
      mix(PALETTE.bone, PALETTE.cool, 0.15),
      mix(PALETTE.cool, PALETTE.paper, 0.4),
    );
  }

  // Lautan awan: alas padat, lalu puncak bergelombang dengan sisi terang.
  const cloudLight = PALETTE.bone;
  const cloudMid = mix(PALETTE.bone, PALETTE.cool, 0.22);

  const seaTop = 208;
  canvas.rect(0, seaTop + 18, W, H - seaTop - 18, cloudMid);
  for (let i = 0; i < 11; i += 1) {
    const x = -10 + i * 50 + ((i * 37) % 23);
    const radius = 24 + ((i * 13) % 17);
    const cy = seaTop + 18 + ((i * 7) % 9);
    canvas.disc(x, cy, radius, cloudMid);
    canvas.disc(x, cy - 3, radius - 4, cloudLight);
  }
  canvas.rect(0, seaTop + 42, W, H - seaTop - 42, cloudLight);
  canvas.dither(0, seaTop + 42, W, 8, cloudLight, cloudMid, 0.28);

  // Burung kecil.
  for (const [x, y] of [
    [318, 104],
    [334, 96],
    [352, 108],
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

  canvas.vgradient(0, 0, W, 200, [
    { at: 0, color: RAMP.deep },
    { at: 0.3, color: RAMP.nightMid },
    { at: 0.62, color: RAMP.skyNight },
    { at: 0.86, color: mix(PALETTE.night, PALETTE.cool, 0.34) },
    { at: 1, color: RAMP.skyDusk },
  ]);

  drawStars(canvas, 20261109, 90, 168);

  // Bulan dengan tiga lapis halo.
  const moonX = 356;
  const moonY = 84;
  canvas.ring(moonX, moonY, 62, PALETTE.bone, 0.05);
  canvas.ring(moonX, moonY, 52, PALETTE.bone, 0.07);
  canvas.ring(moonX, moonY, 43, PALETTE.bone, 0.1);
  canvas.disc(moonX, moonY, 30, mix(PALETTE.paper, PALETTE.bone, 0.5));
  canvas.disc(moonX, moonY, 26, PALETTE.bone);
  // Kawah halus di sisi kanan bawah agar bulan tidak terlihat seperti stiker.
  canvas.disc(moonX + 9, moonY + 8, 5, mix(PALETTE.paper, PALETTE.warm, 0.25));
  canvas.disc(moonX - 8, moonY - 6, 3, mix(PALETTE.paper, PALETTE.warm, 0.25));

  // Tiga lapis gunung. Lapis jauh lebih terang (kena cahaya bulan), lapis dekat
  // hampir hitam — supaya kedalamannya terbaca, bukan menyatu jadi satu blok.
  const farRidge = [
    [0, 176],
    [58, 132],
    [104, 158],
    [168, 118],
    [232, 162],
    [292, 138],
    [356, 170],
    [420, 130],
    [480, 166],
  ];
  canvas.polygon(
    [...farRidge, [480, 214], [0, 214]],
    mix(PALETTE.night, PALETTE.cool, 0.4),
  );
  traceRidge(canvas, farRidge, mix(PALETTE.night, PALETTE.cool, 0.62));

  const midRidge = [
    [0, 194],
    [72, 160],
    [128, 184],
    [206, 152],
    [268, 186],
    [332, 164],
    [402, 192],
    [480, 168],
  ];
  canvas.polygon(
    [...midRidge, [480, 222], [0, 222]],
    mix(PALETTE.night, PALETTE.cool, 0.24),
  );
  traceRidge(canvas, midRidge, mix(PALETTE.night, PALETTE.cool, 0.4));

  // Kabut tipis di lembah antara lapis tengah dan dekat.
  canvas.polygonBlend(
    [
      [0, 188],
      [480, 182],
      [480, 208],
      [0, 212],
    ],
    mix(PALETTE.night, PALETTE.cool, 0.55),
    0.14,
  );

  const nearRidge = [
    [0, 214],
    [96, 190],
    [168, 210],
    [250, 188],
    [326, 212],
    [398, 194],
    [480, 216],
  ];
  canvas.polygon(
    [...nearRidge, [480, 240], [0, 240]],
    mix(PALETTE.night, PALETTE.ink, 0.55),
  );
  traceRidge(canvas, nearRidge, mix(PALETTE.night, PALETTE.cool, 0.2));

  // Tanah gelap di dasar layar.
  canvas.rect(0, 224, W, H - 224, RAMP.deep);
  canvas.dither(0, 224, W, 10, RAMP.near, RAMP.deep, 0.5);
  canvas.hline(0, 224, W, mix(PALETTE.cool, PALETTE.night, 0.3));

  // Sekolah kecil di kiri dengan jendela menyala.
  const wall = mix(PALETTE.night, PALETTE.ink, 0.5);
  canvas.rect(50, 190, 92, 34, wall);
  canvas.polygon(
    [
      [42, 192],
      [96, 172],
      [150, 192],
      [148, 196],
      [44, 196],
    ],
    mix(PALETTE.night, PALETTE.warm, 0.18),
  );
  for (let i = 0; i < 3; i += 1) {
    const x = 62 + i * 26;
    canvas.rect(x, 202, 12, 12, RAMP.glow);
    canvas.blend(x + 4, 206, PALETTE.bone, 0.5);
  }
  canvas.rect(96, 210, 12, 14, mix(PALETTE.gold, PALETTE.night, 0.45));

  // Pohon-pohon siluet kanan.
  drawTree(
    canvas,
    402,
    232,
    0.85,
    RAMP.deep,
    mix(PALETTE.moss, PALETTE.night, 0.55),
    RAMP.deep,
  );
  drawTree(
    canvas,
    448,
    236,
    1.05,
    RAMP.deep,
    mix(PALETTE.moss, PALETTE.night, 0.55),
    RAMP.deep,
  );

  // Rumput tipis di garis tanah.
  const rng = random(77);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.round(rng() * W);
    const h = 2 + Math.round(rng() * 4);
    canvas.vline(x, 240 - h, h, mix(PALETTE.moss, PALETTE.night, 0.6));
  }

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Sungai, siang                                                              */
/* -------------------------------------------------------------------------- */

export function riverDay() {
  const canvas = createCanvas(W, H);
  canvas.vgradient(0, 0, W, 140, [
    { at: 0, color: mix(PALETTE.cool, PALETTE.paper, 0.15) },
    { at: 0.6, color: RAMP.skyDay },
    { at: 1, color: PALETTE.bone },
  ]);
  drawCloud(
    canvas,
    90,
    40,
    0.8,
    PALETTE.bone,
    mix(PALETTE.bone, PALETTE.cool, 0.3),
  );
  drawCloud(
    canvas,
    320,
    60,
    0.6,
    PALETTE.bone,
    mix(PALETTE.bone, PALETTE.cool, 0.3),
  );

  // Bukit jauh.
  canvas.polygon(
    [
      [0, 132],
      [82, 96],
      [168, 128],
      [256, 92],
      [346, 126],
      [430, 100],
      [480, 124],
      [480, 150],
      [0, 150],
    ],
    RAMP.far,
  );
  canvas.polygon(
    [
      [0, 146],
      [70, 122],
      [150, 146],
      [244, 118],
      [330, 144],
      [420, 124],
      [480, 146],
      [480, 164],
      [0, 164],
    ],
    mix(PALETTE.moss, PALETTE.night, 0.45),
  );

  // Air.
  canvas.rect(0, 158, W, 78, RAMP.water);
  canvas.dither(0, 158, W, 10, RAMP.water, RAMP.waterDeep, 0.5);
  for (let i = 0; i < 26; i += 1) {
    const y = 166 + ((i * 7) % 62);
    const x = (i * 53) % W;
    const width = 12 + ((i * 11) % 26);
    canvas.hline(x, y, width, RAMP.waterDeep);
    if (i % 3 === 0)
      canvas.hline(x + 8, y + 1, Math.round(width / 2), PALETTE.bone);
  }
  // Batu di air.
  for (const [x, y, r] of [
    [120, 196, 6],
    [300, 208, 8],
    [392, 186, 5],
  ]) {
    canvas.disc(x, y, r, RAMP.neutral700);
    canvas.disc(x, y - 1, r - 2, RAMP.neutral500);
  }

  // Tepi rumput depan dan belakang.
  const bank = RAMP.leaf;
  canvas.rect(0, 228, W, H - 228, bank);
  canvas.dither(0, 228, W, 12, bank, mix(bank, PALETTE.night, 0.35), 0.45);
  canvas.rect(0, 150, W, 8, bank);
  const rng = random(11);
  for (let i = 0; i < 70; i += 1) {
    const x = Math.round(rng() * W);
    const h = 4 + Math.round(rng() * 8);
    canvas.vline(x, 236 - h, h, mix(PALETTE.moss, PALETTE.night, 0.5));
  }
  drawTree(canvas, 42, 232, 0.9, RAMP.leaf, RAMP.leafLight, RAMP.neutral700);
  drawTree(canvas, 438, 236, 1, RAMP.leaf, RAMP.leafLight, RAMP.neutral700);

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
  canvas.rect(0, 0, W, 12, mix(wall, PALETTE.night, 0.3));
  canvas.rect(0, 190, W, H - 190, floor);
  canvas.hline(0, 190, W, mix(floor, PALETTE.night, 0.4));
  canvas.dither(0, 246, W, 24, floor, mix(floor, PALETTE.night, 0.3), 0.3);

  // Jendela sore di tengah.
  canvas.vgradient(206, 44, 68, 96, [
    { at: 0, color: mix(PALETTE.cool, PALETTE.night, 0.3) },
    { at: 0.5, color: RAMP.skyDusk },
    { at: 1, color: mix(PALETTE.gold, PALETTE.paper, 0.5) },
  ]);
  canvas.frame(203, 41, 74, 102, 3, mix(PALETTE.warm, PALETTE.night, 0.4));
  canvas.rect(236, 44, 2, 96, mix(PALETTE.warm, PALETTE.night, 0.4));

  // Rak buku kiri dan kanan.
  const shelf = (x, w) => {
    canvas.rect(x, 34, w, 154, mix(PALETTE.warm, PALETTE.night, 0.3));
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
    for (let row = 0; row < 4; row += 1) {
      const y = 44 + row * 36;
      canvas.rect(
        x + 4,
        y + 26,
        w - 8,
        3,
        mix(PALETTE.warm, PALETTE.night, 0.5),
      );
      let cursor = x + 6;
      while (cursor < x + w - 10) {
        const bookWidth = 3 + Math.round(rng() * 4);
        const bookHeight = 16 + Math.round(rng() * 9);
        const color = spines[Math.floor(rng() * spines.length)];
        canvas.rect(cursor, y + 26 - bookHeight, bookWidth, bookHeight, color);
        canvas.vline(
          cursor,
          y + 26 - bookHeight,
          bookHeight,
          mix(color, PALETTE.night, 0.35),
        );
        cursor += bookWidth + 1;
      }
    }
  };
  shelf(16, 152);
  shelf(300, 164);

  // Meja baca + lampu.
  canvas.rect(120, 214, 240, 8, mix(PALETTE.warm, PALETTE.night, 0.25));
  canvas.rect(132, 222, 6, 30, mix(PALETTE.warm, PALETTE.night, 0.45));
  canvas.rect(342, 222, 6, 30, mix(PALETTE.warm, PALETTE.night, 0.45));
  // Lampu meja.
  canvas.rect(232, 190, 4, 24, mix(PALETTE.warm, PALETTE.night, 0.45));
  canvas.polygon(
    [
      [220, 190],
      [248, 190],
      [242, 178],
      [226, 178],
    ],
    PALETTE.gold,
  );
  // Cahaya lampu: cincin lembut + kerucut ke meja. Jangan pakai cakram opaque —
  // sebelumnya menutupi lampu dan meja dengan bulatan emas.
  canvas.ring(234, 196, 30, PALETTE.gold, 0.05);
  canvas.ring(234, 196, 20, PALETTE.gold, 0.07);
  canvas.polygonBlend(
    [
      [226, 194],
      [242, 194],
      [286, 226],
      [182, 226],
    ],
    PALETTE.gold,
    0.12,
  );

  // Buku terbuka di meja.
  canvas.rect(196, 204, 30, 10, PALETTE.paper);
  canvas.rect(228, 204, 30, 10, PALETTE.paper);
  canvas.vline(227, 204, 10, mix(PALETTE.paper, PALETTE.warm, 0.5));
  canvas.hline(200, 208, 22, mix(PALETTE.paper, PALETTE.cool, 0.4));
  canvas.hline(232, 208, 22, mix(PALETTE.paper, PALETTE.cool, 0.4));

  // Berkas cahaya jendela.
  canvas.polygonBlend(
    [
      [206, 140],
      [274, 140],
      [318, 270],
      [176, 270],
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
  drawStars(canvas, 5, 40, 150);
  canvas.disc(392, 62, 14, PALETTE.bone);
  canvas.ring(392, 62, 22, PALETTE.bone, 0.08);
  canvas.polygon(
    [
      [0, 208],
      [120, 190],
      [240, 206],
      [360, 188],
      [480, 204],
      [480, 226],
      [0, 226],
    ],
    RAMP.near,
  );
  canvas.rect(0, 226, W, H - 226, RAMP.deep);
  return canvas;
}
