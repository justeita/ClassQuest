#!/usr/bin/env bun
/**
 * Menyusun **satu gambar peta** halaman sekolah dari aset The Fan-tasy Tileset.
 *
 * Skrip ini bukan bagian `assets:generate`: aset mentah pihak ketiga tidak ikut
 * masuk repo, jadi peta dijahit sekali di sini lalu hasilnya di-commit sebagai
 * `public/assets/map/halaman_sekolah.png`. Untuk menjalankan ulang, berkas sumber
 * harus ada di `--asset-dir`.
 *
 *   bun scripts/compose-map.mjs
 *   bun scripts/compose-map.mjs --asset-dir "D:/Data/LOGICODIX 26/Asset" \
 *       --out public/assets/map/halaman_sekolah.png
 *
 * Semua langkah deterministik (tanpa waktu dan tanpa PRNG tanpa benih), jadi
 * menjalankan ulang menghasilkan berkas yang sama. Posisi tiap pohon/bangku di
 * bawah dipakai sebagai acuan saat menulis `collider` di
 * `src/game/maps/roomData.ts` — kalau gambar digeser, collider ikut digeser.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { createCanvas, encodePng, random } from "./lib/pixel.mjs";
import { decodePng } from "./lib/png.mjs";

/* -------------------------------------------------------------------------- */
/* Argumen                                                                    */
/* -------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args[at + 1];
};

const ASSET_DIR = resolve(argOf("--asset-dir", "D:/Data/LOGICODIX 26/Asset"));
const OUT = resolve(argOf("--out", "public/assets/map/halaman_sekolah.png"));
const FAN = join(ASSET_DIR, "The Fan-tasy Tileset (Free)", "Art");

/* -------------------------------------------------------------------------- */
/* Ukuran peta                                                                */
/* -------------------------------------------------------------------------- */

const TILE = 16;
/** Sama dengan `widthTiles`/`heightTiles` `halaman_sekolah` di roomData.ts. */
const COLS = 56;
const ROWS = 34;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

/* -------------------------------------------------------------------------- */
/* Tile pilihan                                                               */
/* -------------------------------------------------------------------------- */

/*
 * Indeks di bawah ditemukan dengan memeriksa tilesheet: tile "isi polos"
 * (256 piksel opaque, tepi kiri≈kanan dan atas≈bawah) supaya bisa diulang tanpa
 * jahitan. Beberapa indeks dipakai bergantian agar rumput tidak terlihat rata.
 */
const GRASS = [96, 97, 98, 99, 96, 97, 98, 99, 98, 97, 109, 110, 14, 20];
const COBBLE = [48, 48, 48, 50];
const WATER = [26, 26, 26, 32, 38];
/** Tiga bingkai bunga (animasi kipas) yang aman dipakai sebagai hiasan diam. */
const FLOWER_FRAMES = [0, 1, 2];

/** Warna turunan untuk tepi, diambil dari nada aset Fan-tasy. */
const SAND = "#d7b588";
const PATH_EDGE = "#4a3524";
const SAND_EDGE = "#8a6a44";
const WATER_EDGE = "#5f9cbb";

/* -------------------------------------------------------------------------- */
/* Muat berkas sumber                                                         */
/* -------------------------------------------------------------------------- */

const loadSheet = (relative) => decodePng(readFileSync(join(FAN, relative)));
const loadProp = (relative) => decodePng(readFileSync(join(FAN, relative)));

const GROUND = loadSheet("Ground Tileset/Tileset_Ground.png");
const ROAD = loadSheet("Ground Tileset/Tileset_Road.png");
const WATER_SHEET = loadSheet("Water and Sand/Tileset_Water.png");

const TREES = [
  "Trees and Bushes/Tree_Emerald_1.png",
  "Trees and Bushes/Tree_Emerald_2.png",
  "Trees and Bushes/Tree_Emerald_3.png",
  "Trees and Bushes/Tree_Emerald_4.png",
].map(loadProp);
const BUSHES = [1, 2, 3, 4].map((n) =>
  loadProp(`Trees and Bushes/Bush_Emerald_${n}.png`),
);
const PROPS = {
  bench: loadProp("Props/Bench_1.png"),
  sign: loadProp("Props/Sign_1.png"),
  lamp: loadProp("Props/LampPost_3.png"),
  board: loadProp("Props/BulletinBoard_1.png"),
  barrel: loadProp("Props/Barrel_Small_Empty.png"),
  basket: loadProp("Props/Basket_Empty.png"),
  plant: loadProp("Props/Plant_2.png"),
  well: loadProp("Buildings/Well_Hay_1.png"),
  gate: loadProp("Buildings/CityWall_Gate_1.png"),
};
const FLOWERS = [
  loadProp("Props/Animation/Flowers_Red.png"),
  loadProp("Props/Animation/Flowers_White.png"),
];

/* -------------------------------------------------------------------------- */
/* Primitif gambar                                                            */
/* -------------------------------------------------------------------------- */

const canvas = createCanvas(WIDTH, HEIGHT);
const rng = random(20261111);

/** Salin satu ubin dari tilesheet ke kanvas, di posisi ubin (tx, ty). */
function drawTile(sheet, index, tx, ty) {
  const cols = Math.floor(sheet.width / TILE);
  const sx = (index % cols) * TILE;
  const sy = Math.floor(index / cols) * TILE;
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const at = ((sy + y) * sheet.width + sx + x) * 4;
      if (sheet.data[at + 3] === 0) continue;
      canvas.blend(
        tx * TILE + x,
        ty * TILE + y,
        [sheet.data[at], sheet.data[at + 1], sheet.data[at + 2]],
        sheet.data[at + 3] / 255,
      );
    }
  }
}

/** Gambar prop berjangkar dasar-tengah: `cx` dihitung dari tile, `base` baris dasar. */
function drawProp(image, cxTile, baseTile) {
  const x = Math.round(cxTile * TILE + TILE / 2 - image.width / 2);
  const y = Math.round((baseTile + 1) * TILE - image.height);
  canvas.blit(image, x, y);
}

/** Bayangan lunak di kaki prop supaya tidak terlihat melayang. */
function drawShadow(cxTile, baseTile, rx, ry) {
  const cx = cxTile * TILE + TILE / 2;
  const cy = (baseTile + 1) * TILE - ry;
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) continue;
      canvas.blend(Math.round(cx + dx), Math.round(cy + dy), "#26401f", 0.22);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Topeng ubin (path dan air)                                                 */
/* -------------------------------------------------------------------------- */

const pathTiles = new Set();
const waterTiles = new Set();
const bedTiles = new Set();

const key = (tx, ty) => ty * COLS + tx;

function addRect(set, x0, y0, x1, y1) {
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS) set.add(key(tx, ty));
    }
  }
}

function addDisc(set, cx, cy, radius) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (Math.hypot(tx - cx, ty - cy) <= radius) set.add(key(tx, ty));
    }
  }
}

// Jalan utama: batang vertikal dari gerbang (baris 8) ke tepi bawah, batang
// horizontal di tengah, plaza bundar di persimpangan, dan cabang ke kolam.
addRect(pathTiles, 26, 8, 29, 33);
addRect(pathTiles, 6, 15, 50, 18);
addDisc(pathTiles, 28, 16.5, 5.4);
addRect(pathTiles, 15, 19, 18, 25);

// Kolam: persegi membulat di kiri-bawah.
for (let ty = 22; ty <= 28; ty += 1) {
  for (let tx = 7; tx <= 14; tx += 1) {
    const sudutX = tx < 9 ? 9 - tx : tx > 12 ? tx - 12 : 0;
    const sudutY = ty < 24 ? 24 - ty : ty > 26 ? ty - 26 : 0;
    if (sudutX + sudutY >= 3) continue;
    waterTiles.add(key(tx, ty));
  }
}

// Petak bunga: dua lajur tanah di kiri dan kanan jalan bawah.
addRect(bedTiles, 19, 26, 23, 30);
addRect(bedTiles, 32, 26, 36, 30);

/** Perlebar himpunan ubin sebanyak `ring` ubin ke segala arah (8 tetangga). */
function dilate(set, ring = 1) {
  let current = new Set(set);
  for (let step = 0; step < ring; step += 1) {
    const next = new Set(current);
    for (const id of current) {
      const tx = id % COLS;
      const ty = Math.floor(id / COLS);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS)
            next.add(key(nx, ny));
        }
      }
    }
    current = next;
  }
  return current;
}

/* -------------------------------------------------------------------------- */
/* Topeng piksel                                                              */
/* -------------------------------------------------------------------------- */

const maskPath = new Uint8Array(WIDTH * HEIGHT);
const maskWater = new Uint8Array(WIDTH * HEIGHT);
const maskSand = new Uint8Array(WIDTH * HEIGHT);
const maskBed = new Uint8Array(WIDTH * HEIGHT);

function paintMask(mask, set) {
  for (const id of set) {
    const tx = id % COLS;
    const ty = Math.floor(id / COLS);
    for (let y = 0; y < TILE; y += 1) {
      mask.fill(
        1,
        (ty * TILE + y) * WIDTH + tx * TILE,
        (ty * TILE + y) * WIDTH + tx * TILE + TILE,
      );
    }
  }
}

const sandTiles = dilate(waterTiles, 1);
paintMask(maskPath, pathTiles);
paintMask(maskWater, waterTiles);
paintMask(maskSand, sandTiles);
paintMask(maskBed, bedTiles);

/* -------------------------------------------------------------------------- */
/* Gambar: lantai → jalan → kolam → petak → tepi                              */
/* -------------------------------------------------------------------------- */

// 1. Rumput menutup seluruh peta.
for (let ty = 0; ty < ROWS; ty += 1) {
  for (let tx = 0; tx < COLS; tx += 1) {
    drawTile(GROUND, GRASS[Math.floor(rng() * GRASS.length)], tx, ty);
  }
}

// 2. Pasir di sekitar kolam.
for (const id of sandTiles) {
  canvas.rect(
    (id % COLS) * TILE,
    Math.floor(id / COLS) * TILE,
    TILE,
    TILE,
    SAND,
  );
}

// 3. Petak bunga: alas pasir, ditaburi kuntum bunga yang dipilih deterministik.
for (const id of bedTiles) {
  canvas.rect(
    (id % COLS) * TILE,
    Math.floor(id / COLS) * TILE,
    TILE,
    TILE,
    SAND,
  );
}
for (const id of bedTiles) {
  if (rng() < 0.15) continue;
  const sheet = FLOWERS[rng() < 0.5 ? 0 : 1];
  drawTile(
    sheet,
    FLOWER_FRAMES[Math.floor(rng() * FLOWER_FRAMES.length)],
    id % COLS,
    Math.floor(id / COLS),
  );
}

// 4. Jalan batu.
for (const id of pathTiles) {
  drawTile(
    ROAD,
    COBBLE[Math.floor(rng() * COBBLE.length)],
    id % COLS,
    Math.floor(id / COLS),
  );
}

// 5. Air kolam.
for (const id of waterTiles) {
  drawTile(
    WATER_SHEET,
    WATER[Math.floor(rng() * WATER.length)],
    id % COLS,
    Math.floor(id / COLS),
  );
}

/**
 * Tepi 1 px mengelilingi sebuah topeng. `over` dipakai untuk menimpa topeng yang
 * berada di atasnya (mis. garis pasir tidak digambar di bawah jalan).
 */
function outlineMask(mask, color, over = []) {
  const copy = new Uint8Array(mask);
  const covered = (x, y) => over.some((other) => other[y * WIDTH + x] === 1);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (copy[y * WIDTH + x] === 0) continue;
      const tepi =
        x === 0 ||
        y === 0 ||
        x === WIDTH - 1 ||
        y === HEIGHT - 1 ||
        copy[y * WIDTH + x - 1] === 0 ||
        copy[y * WIDTH + x + 1] === 0 ||
        copy[(y - 1) * WIDTH + x] === 0 ||
        copy[(y + 1) * WIDTH + x] === 0;
      if (tepi && !covered(x, y)) canvas.px(x, y, color);
    }
  }
}

outlineMask(maskSand, SAND_EDGE, [maskPath]);
outlineMask(maskBed, SAND_EDGE, [maskPath]);
outlineMask(maskPath, PATH_EDGE, []);
outlineMask(maskWater, WATER_EDGE, []);

/* -------------------------------------------------------------------------- */
/* Hiasan                                                                     */
/* -------------------------------------------------------------------------- */

// Gerbang sekolah di ujung atas jalan utama.
drawProp(PROPS.gate, 28, 8);

// Pepohonan dan semak di sepanjang tepi (dinding keliling tetap jadi collider).
const TREE_SPOTS = [
  [4, 4, 2],
  [12, 4, 0],
  [20, 4, 3],
  [36, 4, 1],
  [44, 5, 3],
  [51, 6, 2],
  [3, 13, 0],
  [52, 14, 1],
  [4, 26, 2],
  [52, 27, 3],
  [15, 32, 3],
  [40, 32, 2],
  [10, 32, 0],
  [46, 32, 1],
];
for (const [cx, base, which] of TREE_SPOTS) {
  drawShadow(cx, base, 10, 4);
  drawProp(TREES[which], cx, base);
}

const BUSH_SPOTS = [
  [16, 3, 0],
  [24, 3, 2],
  [32, 3, 1],
  [48, 3, 0],
  [2, 19, 1],
  [53, 21, 0],
  [16, 32, 1],
  [42, 32, 0],
  [30, 30, 2],
  [34, 22, 3],
];
for (const [cx, base, which] of BUSH_SPOTS) {
  drawShadow(cx, base, 7, 3);
  drawProp(BUSHES[which], cx, base);
}

// Perabot taman.
drawProp(PROPS.bench, 20, 19);
drawProp(PROPS.bench, 36, 19);
drawProp(PROPS.lamp, 22, 21);
drawProp(PROPS.lamp, 34, 21);
drawProp(PROPS.board, 11, 12);
drawProp(PROPS.sign, 24, 31);
drawProp(PROPS.sign, 40, 21);
drawProp(PROPS.well, 45, 21);
drawProp(PROPS.barrel, 17, 13);
drawProp(PROPS.basket, 19, 13);

// Tanaman kecil di petak bunga dan sekitarnya.
const PLANT_SPOTS = [
  [20, 28],
  [22, 28],
  [20, 30],
  [22, 30],
  [33, 28],
  [35, 28],
  [33, 30],
  [35, 30],
  [9, 20],
  [12, 20],
  [46, 27],
  [50, 27],
  [7, 13],
  [42, 13],
];
for (const [cx, base] of PLANT_SPOTS) drawProp(PROPS.plant, cx, base);

// Rumpun bunga liar di rumput, mengikuti alur jalan.
const FLOWER_SPOTS = [
  [14, 11],
  [43, 11],
  [9, 17],
  [47, 20],
  [21, 23],
  [38, 23],
  [24, 6],
  [33, 6],
  [2, 29],
  [53, 30],
];
for (const [tx, ty] of FLOWER_SPOTS) {
  const sheet = FLOWERS[rng() < 0.5 ? 0 : 1];
  drawTile(
    sheet,
    FLOWER_FRAMES[Math.floor(rng() * FLOWER_FRAMES.length)],
    tx,
    ty,
  );
}

/* -------------------------------------------------------------------------- */
/* Simpan                                                                     */
/* -------------------------------------------------------------------------- */

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePng(canvas));
console.log(`peta ${COLS}×${ROWS} tile (${WIDTH}×${HEIGHT} px) → ${OUT}`);
