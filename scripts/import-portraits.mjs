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
 * `<nama>` mengikuti id sprite tanpa prefix (`mc`, `npc_1`, `npc_3`, ..., `npc_10`;
 * game melewatkan `npc_2`). Folder sumber `2` adalah karakter pemain; folder
 * lain dipetakan langsung ke nomornya.
 *
 * ## Kenapa potret lama tampak tidak seragam
 *
 * Aset mentah memakai pembingkaian berbeda-beda: sebagian hanya kepala sampai
 * bahu, sebagian menyertakan dada lebih banyak. Kalau tiap potret hanya
 * ditinggikan ke 512 px (cara lama), kepala karakter berbingkai rapat jadi
 * raksasa sementara yang berbingkai lebar terlihat kecil.
 *
 * Karena itu importer menormalkan **tinggi kepala**, bukan tinggi gambar:
 * leher dideteksi dari penyempitan lebar terbawah antara kepala dan bahu, lalu
 * tiap karakter disekalakan supaya tingginya sama (`TINGGI_KEPALA`). Semua
 * potret juga disusun ke kanvas berukuran dan berasio identik
 * (`LEBAR_KANVAS`×`TINGGI_KANVAS`), jadi `object-contain` di slot DOM mengisi
 * persis dan wajah semua karakter tampil sebesar yang sama. Badan yang lebih
 * panjang dari bingkai terpotong rapi di tepi bawah — potret selalu dada ke
 * atas.
 *
 * Penyekalaan memakai rata-rata kotak berbobot alpha (premultiplied), jadi tepi
 * rambut tidak berhalo gelap. Seluruh potret karakter digeser dengan **satu
 * nilai tetap**: sisi kiri kanvas menjadi patokan bersama, jadi potret tidak
 * bergeser sama sekali saat ekspresi berganti (hanya pose wajahnya yang
 * berubah). `GESER_TEPI` negatif memotong sedikit sisi luar supaya karakternya
 * benar-benar mentok tepi kotak dialog. MC dicerminkan `DialogueBox`, sehingga
 * rata kiri di kanvas menjadi rata kanan di slotnya.
 *
 * Berkas disimpan dengan filter PNG adaptif supaya gradasi halusnya ringkas —
 * potret jadi lebih cepat diunduh tanpa menurunkan mutu.
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

/** Tinggi kanvas potret hasil; cukup tajam untuk kanvas yang di-upscale. */
const TINGGI_KANVAS = 360;

/**
 * Lebar kanvas potret hasil. Semua karakter memakai kanvas berukuran sama
 * supaya rasio dan resolusinya identik. Angkanya menjaga rasio `lebar:tinggi`
 * sama persis dengan `PORTRAIT` di `src/game/layout.ts` (304:240) supaya
 * `object-contain` mengisi slot tanpa sisa; berkasnya juga lebih kecil dari
 * kanvas lama (648×512) supaya potret lebih cepat dimuat.
 */
const LEBAR_KANVAS = 456;

/** Jarak tepi atas kepala dari tepi atas kanvas (px). */
const MARGIN_ATAS = 28;

/**
 * Tinggi kepala target (px). Sekitar 0,52 dari tinggi kanvas: bingkai memuat
 * kepala plus badan di bawahnya, cukup besar untuk terbaca tetapi tidak
 * menutupi dialog. Karena rasio bbox:tinggi-kepala semua karakter ≥ 1,67, badan
 * selalu mencapai tepi bawah kanvas — tidak ada celah transparan yang membuat
 * potret "melayang".
 */
const TINGGI_KEPALA = 188;

/**
 * Geser horizontal tetap semua potret (px kanvas). Nilai ≤ 0 menempelkan sisi
 * kiri potret ke tepi kiri kanvas; negatif memotongnya sedikit supaya karakter
 * benar-benar mentok tepi kotak dialog. Dipakai sama rata untuk semua ekspresi
 * supaya potret tidak melompat saat ekspresi berganti.
 */
const GESER_TEPI = -16;

/** Ambang alpha untuk menghitung kotak isi (buang bercak hampir transparan). */
const AMBANG_ALPHA = 16;

/**
 * Porsi bbox yang dipakai sebagai tinggi kepala kalau leher tidak terdeteksi —
 * mis. tokoh berambut/jubah lebar yang lebarnya tidak menyempit di leher.
 * Nilainya rata-rata leher karakter lain.
 */
const PORSI_KEPALA_BAWAAN = 0.52;

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

/** Profil lebar opaque tiap baris di dalam kotak isi. */
function profilLebar(image, box) {
  const tinggi = box.maxY - box.minY + 1;
  const profil = new Array(tinggi);
  for (let k = 0; k < tinggi; k += 1) {
    const y = box.minY + k;
    let minX = image.width;
    let maxX = -1;
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < AMBANG_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    profil[k] = maxX < 0 ? 0 : maxX - minX + 1;
  }
  return profil;
}

/**
 * Tinggi kepala dalam px sumber: dari tepi atas bbox sampai leher — penyempitan
 * lebar terdalam antara puncak kepala/bahu dan 80% bbox. Bila tidak ada
 * penyempitan berarti (rambut atau jubah lebar), pakai rasio bawaan supaya
 * skalanya tidak melejit.
 */
function tinggiKepala(image, box) {
  const profil = profilLebar(image, box);
  const tinggi = profil.length;

  const lo = Math.max(0, Math.round(tinggi * 0.15));
  const hi = Math.max(lo, Math.round(tinggi * 0.45));
  let iPuncak = lo;
  let lebarPuncak = -1;
  for (let i = lo; i <= hi; i += 1) {
    if (profil[i] > lebarPuncak) {
      lebarPuncak = profil[i];
      iPuncak = i;
    }
  }

  let iLeher = iPuncak;
  let lebarLeher = Infinity;
  const batasLeher = Math.max(iPuncak, Math.round(tinggi * 0.8));
  for (let i = iPuncak; i <= batasLeher; i += 1) {
    if (profil[i] < lebarLeher) {
      lebarLeher = profil[i];
      iLeher = i;
    }
  }

  if (lebarPuncak <= 0 || lebarLeher > lebarPuncak * 0.8) {
    return Math.max(1, Math.round(tinggi * PORSI_KEPALA_BAWAAN));
  }
  return Math.max(1, iLeher);
}

/** Nilai tengah; dipakai supaya satu ekspresi janggal tidak menggeser skala. */
function median(nilai) {
  const urut = [...nilai].sort((a, b) => a - b);
  const tengah = Math.floor(urut.length / 2);
  return urut.length % 2 === 0
    ? (urut[tengah - 1] + urut[tengah]) / 2
    : urut[tengah];
}

/**
 * Susun satu ekspresi ke kanvas tetap: kepala ditinggikan `skala` kali,
 * puncaknya di `MARGIN_ATAS`, dan gambar digeser `geserKiri` px. Karena
 * penyusunan selalu relatif ke tepi kiri bbox ekspresi itu, `geserKiri` yang
 * sama menaruh sisi kiri semua ekspresi di titik yang sama — potret tidak
 * melompat saat wajahnya berganti. Badan yang lebih panjang dari bingkai
 * terpotong di tepi bawah.
 */
function susunPotret(image, box, skala, geserKiri) {
  const data = new Uint8Array(LEBAR_KANVAS * TINGGI_KANVAS * 4);
  const kiri = geserKiri;

  for (let y = 0; y < TINGGI_KANVAS; y += 1) {
    const sy0 = box.minY + (y - MARGIN_ATAS) / skala;
    const sy1 = box.minY + (y + 1 - MARGIN_ATAS) / skala;
    for (let x = 0; x < LEBAR_KANVAS; x += 1) {
      const sx0 = box.minX + (x - kiri) / skala;
      const sx1 = box.minX + (x + 1 - kiri) / skala;
      const [r, g, b, a] = rataKanvas(image, sx0, sx1, sy0, sy1);
      const at = (y * LEBAR_KANVAS + x) * 4;
      data[at] = Math.round(r);
      data[at + 1] = Math.round(g);
      data[at + 2] = Math.round(b);
      data[at + 3] = Math.round(a);
    }
  }

  return { width: LEBAR_KANVAS, height: TINGGI_KANVAS, data };
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

  // Ukur tiap ekspresi dulu: kotak isi + tinggi kepala.
  const ukur = EKSPRESI.map((ekspresi) => {
    const image = gambar.get(ekspresi);
    const box = kotakOpaque(image);
    return { ekspresi, image, box, kepala: tinggiKepala(image, box) };
  });

  // Satu skala per karakter (median antar-ekspresi) supaya ukuran kepala tidak
  // berubah saat ekspresi berganti.
  const skala = TINGGI_KEPALA / median(ukur.map((entri) => entri.kepala));

  for (const { ekspresi, image, box } of ukur) {
    const potret = susunPotret(image, box, skala, GESER_TEPI);
    writeFileSync(
      join(dir, `${ekspresi}.png`),
      Buffer.from(encodePng(potret, { filter: "adaptive" })),
    );
    jumlah += 1;
  }
  log(
    `  ${`portrait/${nama}/`.padEnd(22)} ${EKSPRESI.length} ekspresi` +
      `${pemain ? " · pemain (MC)" : ""}`,
  );
}
log(`  total ${jumlah} berkas`);
