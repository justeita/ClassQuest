#!/usr/bin/env bun
/**
 * Impor potret dialog **berekspresi** dari paket aset proyek.
 *
 *   bun run assets:portraits
 *
 * Sumbernya ada di luar repo:
 *   D:/Data/LOGICODIX 26/Asset/assets_classquest/character/potrait/anime/
 *     ├── 1/ 01_neutral.png, 02_happy.png, ...     # NPC pertama
 *     ├── 2/ neutral.png, happy.png, ...           # karakter pemain (MC)
 *     └── 10/ neutral_expression.png, ...
 *
 * Nama berkas sumber beragam antar-folder (`shock.png`, `thinking_confused.png`,
 * `farmer_neutral_transparent.png`, dst). Importer menormalkannya ke enam nama
 * kanonik, jadi game selalu mencari `<ekspresi>.png` yang sama untuk semua
 * karakter.
 *
 * Yang dihasilkan (deterministik, sekali jalan, lalu di-commit):
 *
 *   public/assets/portrait/<nama>/<ekspresi>.png
 *
 * `<nama>` mengikuti id sprite tanpa prefix (`mc`, `npc_1`, `npc_3`, …, `npc_10`;
 * game melewatkan `npc_2`). Folder sumber `2` adalah karakter pemain; folder
 * lain dipetakan langsung ke nomornya.
 *
 * Setiap potret dipotong ke kotak piksel opaque-nya lalu tingginya diseragamkan
 * ke `TINGGI_POTRET`, supaya semua karakter tampil sebesar mungkin tanpa
 * membawa piksel transparan yang tidak terpakai. Penyekalaan memakai rata-rata
 * kotak berbobot alpha (premultiplied), jadi tepi rambut tidak berhalo gelap.
 */

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "./lib/pixel.mjs";
import { decodePng } from "./lib/png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  process.env.CLASSQUEST_WORLD_SOURCE ??
  "D:/Data/LOGICODIX 26/Asset/assets_classquest";
const ANIME_DIR = join(SOURCE, "character", "potrait", "anime");

const log = (message) => process.stdout.write(`${message}\n`);

/** Enam ekspresi kanonik, sama urutannya dengan enum `expression` di schema. */
const EKSPRESI = ["neutral", "happy", "sad", "angry", "shocked", "thinking"];

/** Folder sumber → nama berkas/id game. `2` adalah pemain. */
const PETA = [
  { folder: "1", nama: "npc_1" },
  { folder: "2", nama: "mc", pemain: true },
  { folder: "3", nama: "npc_3" },
  { folder: "4", nama: "npc_4" },
  { folder: "5", nama: "npc_5" },
  { folder: "6", nama: "npc_6" },
  { folder: "7", nama: "npc_7" },
  { folder: "8", nama: "npc_8" },
  { folder: "9", nama: "npc_9" },
  { folder: "10", nama: "npc_10" },
];

/**
 * Nama berkas sumber → ekspresi kanonik. Dicocokkan dengan kata kunci, karena
 * tiap folder memakai penamaan sendiri. Urutan cek penting: `shock` sebelum
 * `happ` tidak masalah, tetapi tiap ekspresi harus punya satu kata kunci unik.
 */
const KATA_KUNCI = [
  { ekspresi: "neutral", kata: ["neutral", "netral"] },
  { ekspresi: "happy", kata: ["happy", "senang", "smile", "ceria"] },
  { ekspresi: "sad", kata: ["sad", "sedih"] },
  { ekspresi: "angry", kata: ["angry", "anger", "marah"] },
  { ekspresi: "shocked", kata: ["shock", "kaget"] },
  { ekspresi: "thinking", kata: ["think", "pikir", "bingung", "confused"] },
];

/** Tinggi potret hasil; cukup tajam untuk kanvas yang di-upscale. */
const TINGGI_POTRET = 512;

/** Ambang alpha untuk menghitung kotak isi (buang bercak hampir transparan). */
const AMBANG_ALPHA = 16;

/** Nama berkas tanpa ekstensi → ekspresi; `null` bila tidak ada yang cocok. */
function ekspresiDariNama(nama) {
  const dasar = nama.toLowerCase().replace(/\.png$/, "");
  for (const { ekspresi, kata } of KATA_KUNCI) {
    if (kata.some((potongan) => dasar.includes(potongan))) return ekspresi;
  }
  return null;
}

/**
 * Baca satu folder sumber → rekaman `ekspresi → gambar`. Folder tanpa keenam
 * ekspresi dilempar sebagai error, bukan dibiarkan menghasilkan game setengah.
 */
function bacaFolder(nama) {
  const dir = join(ANIME_DIR, nama);
  const hasil = new Map();

  for (const berkas of readdirSync(dir).filter((entry) =>
    entry.endsWith(".png"),
  )) {
    const ekspresi = ekspresiDariNama(berkas);
    if (!ekspresi)
      throw new Error(`nama berkas tanpa ekspresi dikenal: ${nama}/${berkas}`);
    if (hasil.has(ekspresi)) {
      throw new Error(`ekspresi ganda (${ekspresi}) di folder ${nama}`);
    }
    hasil.set(ekspresi, decodePng(readFileSync(join(dir, berkas))));
  }

  const kurang = EKSPRESI.filter((ekspresi) => !hasil.has(ekspresi));
  if (kurang.length > 0) {
    throw new Error(`folder ${nama} kehilangan ekspresi: ${kurang.join(", ")}`);
  }
  return hasil;
}

/** Kotak piksel opaque sebuah gambar. */
function kotakOpaque(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < AMBANG_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("potret kosong (tanpa piksel opaque)");
  return { minX, minY, maxX, maxY };
}

/** Rata-rata berbobot alpha pada satu kotak sumber; hasil warna ter-premultiply. */
function rataKanvas(image, x0, x1, y0, y1) {
  const ix0 = Math.max(0, Math.floor(x0));
  const ix1 = Math.min(image.width, Math.ceil(x1));
  const iy0 = Math.max(0, Math.floor(y0));
  const iy1 = Math.min(image.height, Math.ceil(y1));
  let r = 0;
  let g = 0;
  let b = 0;
  let alpha = 0;
  let bobot = 0;

  for (let y = iy0; y < iy1; y += 1) {
    const wy = Math.min(y + 1, y1) - Math.max(y, y0);
    if (wy <= 0) continue;
    for (let x = ix0; x < ix1; x += 1) {
      const wx = Math.min(x + 1, x1) - Math.max(x, x0);
      if (wx <= 0) continue;
      const w = wx * wy;
      const at = (y * image.width + x) * 4;
      const a = image.data[at + 3] / 255;
      r += image.data[at] * a * w;
      g += image.data[at + 1] * a * w;
      b += image.data[at + 2] * a * w;
      alpha += a * w;
      bobot += w;
    }
  }

  if (alpha <= 0 || bobot <= 0) return [0, 0, 0, 0];
  return [r / alpha, g / alpha, b / alpha, (alpha / bobot) * 255];
}

/** Potong ke kotak isi lalu seragamkan tingginya; lebar mengikuti rasio asli. */
function rapikan(image) {
  const box = kotakOpaque(image);
  const lebar = box.maxX - box.minX + 1;
  const tinggi = box.maxY - box.minY + 1;
  const skala = TINGGI_POTRET / tinggi;
  const outW = Math.max(1, Math.round(lebar * skala));
  const outH = TINGGI_POTRET;
  const data = new Uint8Array(outW * outH * 4);

  for (let y = 0; y < outH; y += 1) {
    const sy0 = box.minY + (y / outH) * tinggi;
    const sy1 = box.minY + ((y + 1) / outH) * tinggi;
    for (let x = 0; x < outW; x += 1) {
      const sx0 = box.minX + (x / outW) * lebar;
      const sx1 = box.minX + ((x + 1) / outW) * lebar;
      const [r, g, b, a] = rataKanvas(image, sx0, sx1, sy0, sy1);
      const at = (y * outW + x) * 4;
      data[at] = Math.round(r);
      data[at + 1] = Math.round(g);
      data[at + 2] = Math.round(b);
      data[at + 3] = Math.round(a);
    }
  }

  return { width: outW, height: outH, data };
}

/** Hapus keluaran lama supaya folder sumber yang dihapus tidak menyisakan berkas. */
rmSync(join(ROOT, "public", "assets", "portrait"), {
  recursive: true,
  force: true,
});

log("Potret dialog");
let jumlah = 0;
for (const { folder, nama, pemain } of PETA) {
  const gambar = bacaFolder(folder);
  const dir = join(ROOT, "public", "assets", "portrait", nama);
  mkdirSync(dir, { recursive: true });

  for (const ekspresi of EKSPRESI) {
    const png = Buffer.from(encodePng(rapikan(gambar.get(ekspresi))));
    writeFileSync(join(dir, `${ekspresi}.png`), png);
    jumlah += 1;
  }

  log(
    `  ${`portrait/${nama}/`.padEnd(22)} ${EKSPRESI.length} ekspresi` +
      `${pemain ? " · pemain (MC)" : ""}`,
  );
}
log(`  total ${jumlah} berkas`);
