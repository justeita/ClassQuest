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
 * atas. Karakter berbadan pendek dinaikkan skalanya sedikit supaya isinya
 * menyentuh tepi bawah, jadi tidak ada celah transparan yang membuat potret
 * tampak melayang di atas kotak dialog.
 *
 * Penyekalaan memakai rata-rata kotak berbobot alpha (premultiplied), jadi tepi
 * rambut tidak berhalo gelap. Seluruh potret karakter digeser dengan **satu
 * nilai tetap**: sisi kiri kanvas menjadi patokan bersama, jadi potret tidak
 * bergeser sama sekali saat ekspresi berganti (hanya pose wajahnya yang
 * berubah). Nilainya nol — siluet karakter tidak dipotong di sisi luar; jarak
 * dari kotak dialog diatur slot DOM (`PORTRAIT.inset`). MC dicerminkan
 * `DialogueBox`, sehingga rata kiri di kanvas menjadi rata kanan di slotnya.
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
 * 456:360 — sama persis dengan `PORTRAIT` di `src/game/layout.ts` — supaya
 * `object-contain` mengisi slot tanpa sisa; berkasnya juga lebih kecil dari
 * kanvas lama (648×512) supaya potret lebih cepat dimuat.
 */
const LEBAR_KANVAS = 456;

/** Jarak tepi atas kepala dari tepi atas kanvas (px). */
const MARGIN_ATAS = 28;

/**
 * Tinggi kepala target (px). Sekitar 0,52 dari tinggi kanvas: bingkai memuat
 * kepala plus badan di bawahnya, cukup besar untuk terbaca tetapi tidak
 * menutupi dialog.
 *
 * Kalau badan sebuah karakter lebih pendek dari sisa kanvas, importer menaikkan
 * skala karakter itu (lihat `skalaIsi`) sampai isinya menyentuh tepi bawah —
 * jadi kepala tidak "melayang" di atas kotak dialog.
 */
const TINGGI_KEPALA = 188;

/**
 * Geser horizontal tetap semua potret (px kanvas). Nol berarti tepi kiri bbox
 * karakter tepat di tepi kiri kanvas: seluruh siluet ikut terlihat, tidak ada
 * bagian badan yang terpotong. Jarak dari kotak dialog diatur di DOM
 * (`PORTRAIT.inset`), jadi importer tidak perlu memotong sisi luar. Dipakai
 * sama rata untuk semua ekspresi supaya potret tidak melompat saat ekspresi
 * berganti.
 */
const GESER_TEPI = 0;

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

  padatkanDasar(data);
  return { width: LEBAR_KANVAS, height: TINGGI_KANVAS, data };
}

/**
 * Rapikan tepi bawah potret supaya badan benar-benar **terpotong** di dasar
 * kanvas, bukan memudar.
 *
 * Beberapa aset sumber punya tepi bawah ber-alpha rendah (fringe 2–4 px, alpha
 * 6–93) karena badannya di-fade halus ke transparan. Setelah diskalakan, fringe
 * itu jadi selaput tipis di atas kotak dialog: badan tampak berhenti sedikit di
 * atas panel — persis kesan "melayang" yang sulit ditunjuk. Di sini tiap kolom
 * yang piksel pekatnya berhenti dekat dasar kanvas diperpanjang sampai baris
 * terakhir dengan alpha penuh, jadi siluetnya terpotong rata di tepi bawah.
 *
 * Kolom yang isinya memang berhenti jauh di atas dasar (mis. celah di bawah
 * lengan) dibiarkan, supaya tidak tergambar garis memanjang yang aneh.
 */
function padatkanDasar(data) {
  for (let x = 0; x < LEBAR_KANVAS; x += 1) {
    let bawah = -1;
    for (let y = TINGGI_KANVAS - 1; y >= 0; y -= 1) {
      if (data[(y * LEBAR_KANVAS + x) * 4 + 3] >= AMBANG_PADAT) {
        bawah = y;
        break;
      }
    }
    if (bawah < 0 || TINGGI_KANVAS - 1 - bawah > BATAS_PADAT) continue;
    const asal = (bawah * LEBAR_KANVAS + x) * 4;
    for (let y = bawah + 1; y < TINGGI_KANVAS; y += 1) {
      const at = (y * LEBAR_KANVAS + x) * 4;
      data[at] = data[asal];
      data[at + 1] = data[asal + 1];
      data[at + 2] = data[asal + 2];
      data[at + 3] = 255;
    }
  }
}

/** Alpha minimum yang dianggap bagian pekat badan (bukan fringe). */
const AMBANG_PADAT = 160;

/**
 * Seberapa dekat ke dasar kanvas sebuah kolom masih boleh diperpanjang. Cukup
 * untuk menelan fringe hasil skala, tetapi tidak sampai menarik badan yang
 * memang berhenti jauh di atas tepi.
 */
const BATAS_PADAT = 10;

/**
 * Jarak baris pekat terbawah dari tepi bawah kanvas. Dipakai sebagai pemeriksa
 * supaya potret tidak "melayang" di atas kotak dialog: yang dihitung hanya
 * piksel badan yang pekat, bukan fringe transparan.
 */
function celahBawah(data) {
  for (let y = TINGGI_KANVAS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < LEBAR_KANVAS; x += 1) {
      if (data[(y * LEBAR_KANVAS + x) * 4 + 3] >= AMBANG_PADAT) {
        return TINGGI_KANVAS - 1 - y;
      }
    }
  }
  return TINGGI_KANVAS;
}

/**
 * Celah bawah yang masih diterima (px kanvas). Harus nol: `padatkanDasar`
 * memotong badan rata di tepi bawah, dan `skalaIsi` memastikan badannya memang
 * sampai ke sana. Kalau pemeriksa ini menyala, ada karakter yang potretnya
 * mengapung di atas kotak dialog.
 */
const MAKS_CELAH_BAWAH = 0;

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
  const skalaKepala = TINGGI_KEPALA / median(ukur.map((entri) => entri.kepala));

  // Isi potret harus menyentuh tepi bawah kanvas: kalau tidak, ada celah
  // transparan antara badan karakter dan tepi atas kotak dialog sehingga
  // potret tampak "melayang". Karakter berbadan pendek (kepala + bahu saja)
  // dinaikkan skalanya sedikit dengan satu faktor yang sama untuk semua
  // ekspresinya — kepala tetap rata di `MARGIN_ATAS`, dan potret tidak
  // melompat saat ekspresi berganti.
  const isiBawah = TINGGI_KANVAS - MARGIN_ATAS;
  const skalaIsi =
    isiBawah / median(ukur.map((entri) => entri.box.maxY - entri.box.minY + 1));
  const skala = Math.max(skalaKepala, skalaIsi);

  for (const { ekspresi, image, box } of ukur) {
    const potret = susunPotret(image, box, skala, GESER_TEPI);
    const celah = celahBawah(potret.data);
    if (celah > MAKS_CELAH_BAWAH) {
      throw new Error(
        `potret melayang: ${nama}/${ekspresi} menyisakan ${celah} px kosong di bawah`,
      );
    }
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
