#!/usr/bin/env bun
/**
 * Impor karakter desa **beranimasi** dari aset dunia desa.
 *
 *   bun run assets:characters
 *
 * Sumbernya ada di luar repo:
 *   D:/Data/LOGICODIX 26/Asset/assets_classquest/character/
 *     ├── main_character/                     # pemain (Nara)
 *     │   ├── Idle/animations/Breathing_Idle/<arah>/frame_*.png
 *     │   └── Walk/animations/Walking/<arah>/frame_*.png
 *     └── npc/npc_<n>/Idle/animations/<nama>/<arah>/frame_*.png
 *
 * Yang dihasilkan (deterministik, sekali jalan, lalu di-commit):
 *
 *   public/assets/char/<nama>.png     spritesheet 8 arah × (idle [+ walk])
 *   src/assets/characterFrames.ts     metadata frame (dibaca manifest & game)
 *
 * **Tata letak spritesheet** sama untuk semua karakter: satu baris per arah,
 * urut mengikuti `FRAME_ARAH` di `src/game/world/karakter.ts` (selatan dulu,
 * lalu searah jarum jam). Kolomnya idle lebih dulu, baru walk. Jadi indeks frame
 * arah `d`, animasi idle frame `f` adalah `d * kolom + f`, dan walk frame `f`
 * adalah `d * kolom + idleFrames + f`.
 *
 * Setiap frame dipotong ke kotak karakter (bounding box piksel opaque) lalu
 * diletakkan dengan kaki di dasar frame, jadi sprite di game berjangkar tepat di
 * titik kaki. Tinggi hasilnya diseragamkan di runtime ke `TINGGI_KARAKTER`.
 *
 * Pemetaan folder sumber → id game **berurutan**: `npc_1..npc_9` menjadi
 * `char_npc_1, 3, 4, 5, 6, 7, 8, 9, 10` (game melewatkan `npc_2`).
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, encodePng } from "./lib/pixel.mjs";
import { decodePng } from "./lib/png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  process.env.CLASSQUEST_WORLD_SOURCE ??
  "D:/Data/LOGICODIX 26/Asset/assets_classquest";
const CHAR_DIR = join(SOURCE, "character");

const log = (message) => process.stdout.write(`${message}\n`);

/**
 * Urutan 8 arah = indeks `face` di `village.json` (`FRAME_ARAH`).
 * Selatan (0) dulu, lalu searah jarum jam.
 */
const ARAH = [
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west",
];

/** Id game → folder sumber. Pemain dari `main_character`, NPC berurutan. */
const PETA = [
  { id: "mc", folder: "main_character", jalan: true },
  { id: "npc_1", folder: "npc/npc_1" },
  { id: "npc_3", folder: "npc/npc_2" },
  { id: "npc_4", folder: "npc/npc_3" },
  { id: "npc_5", folder: "npc/npc_4" },
  { id: "npc_6", folder: "npc/npc_5" },
  { id: "npc_7", folder: "npc/npc_6" },
  { id: "npc_8", folder: "npc/npc_7" },
  { id: "npc_9", folder: "npc/npc_8" },
  { id: "npc_10", folder: "npc/npc_9" },
];

/** Nama folder animasi di dalam `animations/`; jumlahnya harus satu. */
function namaAnimasi(base, jenis) {
  const root = join(base, jenis, "animations");
  const animasi = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (animasi.length !== 1) {
    throw new Error(`${root} harus punya tepat satu folder animasi`);
  }
  return join(root, animasi[0]);
}

/** Semua frame satu arah, terurut menurut nomor file. */
function frameArah(root, arah) {
  const dir = join(root, arah);
  const berkas = readdirSync(dir)
    .filter((nama) => /^frame_\d+\.png$/.test(nama))
    .sort();
  if (berkas.length === 0) throw new Error(`tanpa frame di ${dir}`);
  return berkas.map((nama) => decodePng(readFileSync(join(dir, nama))));
}

/** Kotak piksel opaque sebuah frame; `null` kalau frame kosong. */
function kotakOpaque(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("frame kosong (tanpa piksel opaque)");
  return { minX, minY, maxX, maxY };
}

/** Kanvas → spritesheet beranimasi; metadata dipakai untuk manifest/game. */
function susunSpritesheet(id, gambar) {
  const { idle, walk } = gambar;
  const semua = [...idle.flat(), ...(walk ? walk.flat() : [])];

  // Jendela potong seragam: horizontal dari pusat kanvas, vertikal dari kaki
  // (bawah bounding box) supaya gerak naik-turun (napas/langkah) tetap terlihat.
  let kiri = 0;
  let kanan = 0;
  let atas = 0;
  for (const image of semua) {
    const box = kotakOpaque(image);
    const pusat = image.width / 2;
    kiri = Math.max(kiri, Math.ceil(pusat - box.minX));
    kanan = Math.max(kanan, Math.ceil(box.maxX - pusat));
    atas = Math.max(atas, box.maxY - box.minY);
  }

  const frameWidth = kiri + kanan + 1;
  const frameHeight = atas + 1;
  const idleFrames = idle[0].length;
  const walkFrames = walk ? walk[0].length : 0;
  const kolom = idleFrames + walkFrames;
  const sheet = createCanvas(frameWidth * kolom, frameHeight * ARAH.length);

  /** Salin satu frame ke sel `(kolom, baris)` spritesheet, dipotong ke jendela. */
  const tempatkan = (image, kolom, baris) => {
    const box = kotakOpaque(image);
    const sx = Math.round(image.width / 2 - kiri);
    const sy = box.maxY - atas;
    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const sumberX = sx + x;
        const sumberY = sy + y;
        if (
          sumberX < 0 ||
          sumberY < 0 ||
          sumberX >= image.width ||
          sumberY >= image.height
        ) {
          continue;
        }
        const at = (sumberY * image.width + sumberX) * 4;
        const alpha = image.data[at + 3];
        if (alpha === 0) continue;
        sheet.pxAlpha(
          kolom * frameWidth + x,
          baris * frameHeight + y,
          [image.data[at], image.data[at + 1], image.data[at + 2]],
          alpha / 255,
        );
      }
    }
  };

  for (let baris = 0; baris < ARAH.length; baris += 1) {
    idle[baris].forEach((image, frame) => tempatkan(image, frame, baris));
    if (walk) {
      walk[baris].forEach((image, frame) =>
        tempatkan(image, idleFrames + frame, baris),
      );
    }
  }

  const target = join(ROOT, "public", "assets", "char", `${id}.png`);
  mkdirSync(dirname(target), { recursive: true });
  const png = Buffer.from(encodePng(sheet));
  writeFileSync(target, png);
  log(
    `  sprite  char/${`${id}.png`.padEnd(14)} ${frameWidth}×${frameHeight} px ` +
      `· 8 arah · idle ${idleFrames}${walkFrames > 0 ? ` · walk ${walkFrames}` : ""} ` +
      `(${(png.length / 1024).toFixed(0)} KB)`,
  );

  return {
    id: `char_${id}`,
    name: id,
    frameWidth,
    frameHeight,
    idleFrames,
    walkFrames,
  };
}

log("Karakter beranimasi:");

const metadata = PETA.map(({ id, folder, jalan }) => {
  const base = join(CHAR_DIR, folder);
  const idleRoot = namaAnimasi(base, "Idle");
  const idle = ARAH.map((arah) => frameArah(idleRoot, arah));
  const walk = jalan
    ? ARAH.map((arah) => frameArah(namaAnimasi(base, "Walk"), arah))
    : null;

  for (const [nama, set] of [
    ["idle", idle],
    ["walk", walk],
  ]) {
    if (!set) continue;
    const jumlah = set[0].length;
    if (set.some((frames) => frames.length !== jumlah)) {
      throw new Error(`${id}: jumlah frame ${nama} tidak sama antar arah`);
    }
  }

  return susunSpritesheet(id, { idle, walk });
});

const baris = metadata
  .map(
    (entry) => `  {
    id: ${JSON.stringify(entry.id)},
    name: ${JSON.stringify(entry.name)},
    frameWidth: ${entry.frameWidth},
    frameHeight: ${entry.frameHeight},
    idleFrames: ${entry.idleFrames},
    walkFrames: ${entry.walkFrames},
  },`,
  )
  .join("\n");

const sumber = `/**
 * Metadata frame spritesheet karakter — **dibangkitkan**, jangan disunting tangan.
 *
 * Sumber dan cara membuatnya: \`scripts/import-characters.mjs\`. Setiap karakter
 * punya satu spritesheet 8 arah: satu baris per arah (urut \`FRAME_ARAH\`) dan
 * kolomnya idle lebih dulu, baru walk. Indeks frame arah \`d\` pada animasi idle
 * adalah \`d * (idleFrames + walkFrames) + f\`; pada walk ditambah \`idleFrames\`.
 *
 * Dipakai dua tempat: \`manifest.ts\` (untuk \`frameWidth\`/\`frameHeight\` yang
 * dipakai \`PreloadScene\`) dan \`GameScene\` (untuk mendaftarkan animasi dan
 * memilih frame arah hadap).
 */

export type CharacterFrames = {
  /** Id manifest, mis. \`char_mc\`. */
  id: string;
  /** Nama tanpa prefix, mis. \`mc\`; sama dengan nama berkas sprite. */
  name: string;
  frameWidth: number;
  frameHeight: number;
  /** Jumlah frame idle per arah. */
  idleFrames: number;
  /** Jumlah frame walk per arah; \`0\` berarti karakter hanya punya idle. */
  walkFrames: number;
};

export const CHARACTER_FRAMES: readonly CharacterFrames[] = [
${baris}
];
`;

const kodeTarget = join(ROOT, "src", "assets", "characterFrames.ts");
writeFileSync(kodeTarget, sumber);
log(`  kode    src/assets/characterFrames.ts (${metadata.length} entri)`);

log("Selesai.");
