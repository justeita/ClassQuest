#!/usr/bin/env bun
/**
 * Impor dunia desa dari editor peta (`project.json`).
 *
 *   bun scripts/import-world.mjs
 *
 * Sumbernya ada di luar repo:
 *   D:/Data/LOGICODIX 26/Asset/assets_classquest/
 *     ├── project.json          # S = { map, assets, objs, g, cells, pl }
 *     └── bgm/Tune of the Town.mp3
 *
 * Yang dihasilkan (semua deterministik, sekali jalan, lalu di-commit):
 *
 *   public/assets/world/map_village.jpg   gambar desa (2390×1792)
 *   public/assets/world/<slug>.png        80 objek yang dipakai peta
 *   public/assets/music/default.mp3       satu-satunya musik game
 *   src/game/world/village.json           data dunia untuk Phaser
 *   src/assets/worldAssets.ts             entri manifest kind `world`
 *
 * Spritesheet dan potret karakter **tidak** dibuat di sini: aset animasi
 * karakter punya skripnya sendiri (`scripts/import-characters.mjs`).
 *
 * Editor memakai koordinat piksel peta apa adanya: objek ysort digambar dengan
 * jangkar kiri-atas, NPC berjangkar di titik kaki (`x + w/2`, `y + h`), dan
 * urutan gambar = bagian kaki yang dibulatkan (`round(y + dy*h)`). Skrip ini
 * menyalin angka itu mentah-mentah ke `village.json` supaya dunia di game sama
 * persis dengan yang dilihat di editor.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  process.env.CLASSQUEST_WORLD_SOURCE ??
  "D:/Data/LOGICODIX 26/Asset/assets_classquest";

/** Nama karakter default di repo untuk pemain (editor memakai `npc_2`). */
const MC_KEY = "npc_2";

/* -------------------------------------------------------------------------- */
/* Bantuan                                                                    */
/* -------------------------------------------------------------------------- */

const log = (message) => process.stdout.write(`${message}\n`);

/** `data:image/png;base64,...` → { buffer, extension }. */
function decodeDataUrl(source) {
  const comma = source.indexOf(",");
  if (comma < 0) throw new Error("data URL tanpa koma");
  const meta = source.slice(0, comma);
  if (!meta.startsWith("data:") || !meta.endsWith(";base64")) {
    throw new Error(`data URL tidak dikenal: ${meta.slice(0, 40)}`);
  }
  const mime = meta.slice("data:".length, -";base64".length);
  const extension = mime === "image/jpeg" ? "jpg" : mime.slice("image/".length);
  return { buffer: Buffer.from(source.slice(comma + 1), "base64"), extension };
}

/** Kunci editor → bagian id manifest tanpa prefix (`world_`). */
const slugOf = (key) => key.toLowerCase().replace(/[^a-z0-9_]/g, "_");

const wordsOf = (slug) => slug.split("_").filter((word) => word.length > 0);

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** Label manusia untuk kunci editor; sengaja tidak memuat id manifest. */
const labelOf = (slug) => wordsOf(slug).map(capitalize).join(" ");

/** Minimal 4 tag unik untuk setiap entri manifest. */
const TAGS_FILLER = ["dunia", "desa", "objek", "aset", "dekorasi", "sprite"];

function tagsOf(slug) {
  const tags = [...new Set([...wordsOf(slug), "desa", "objek", "aset"])];
  for (const filler of TAGS_FILLER) {
    if (tags.length >= 4) break;
    if (!tags.includes(filler)) tags.push(filler);
  }
  return tags.slice(0, 8);
}

const round = (value) => Math.round(value);
const round4 = (value) => Number(value.toFixed(4));

/** Kunci karakter editor → nama di repo: `npc_2` (MC) → `mc`, lain apa adanya. */
const characterNameOf = (key) => (key === MC_KEY ? "mc" : key);

/* -------------------------------------------------------------------------- */
/* Sumber                                                                     */
/* -------------------------------------------------------------------------- */

const project = JSON.parse(readFileSync(join(SOURCE, "project.json"), "utf8"));
const S = project.S;

if (!S || !S.map || !S.map.src) throw new Error("project.json tanpa S.map.src");
if (!Array.isArray(S.assets) || !Array.isArray(S.objs)) {
  throw new Error("project.json tanpa S.assets/S.objs");
}

/** Kunci aset editor → definisi (termasuk `src` data URL). */
const assetByKey = new Map(S.assets.map((asset) => [asset.key, asset]));

/* -------------------------------------------------------------------------- */
/* Keluaran: bantuan tulis                                                    */
/* -------------------------------------------------------------------------- */

function writePublic(relativePath, buffer) {
  const target = join(ROOT, "public", "assets", relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  log(
    `  aset    ${relativePath.padEnd(42)} ${(buffer.length / 1024).toFixed(0)} KB`,
  );
  return `/assets/${relativePath}`;
}

/* -------------------------------------------------------------------------- */
/* 1. Peta dan satu-satunya musik                                             */
/* -------------------------------------------------------------------------- */

log("Dunia desa:");

const mapDecoded = decodeDataUrl(S.map.src);
if (mapDecoded.extension !== "jpg") {
  throw new Error(`peta harus JPEG, bukan ${mapDecoded.extension}`);
}
const MAP_PATH = writePublic("world/map_village.jpg", mapDecoded.buffer);

const musicBuffer = readFileSync(join(SOURCE, "bgm", "Tune of the Town.mp3"));
writePublic("music/default.mp3", musicBuffer);

/* -------------------------------------------------------------------------- */
/* 2. Objek peta (kind `world`)                                               */
/* -------------------------------------------------------------------------- */

const usedKeys = new Set(
  S.objs.filter((object) => object.t === "s").map((object) => object.a),
);

const worldEntries = [
  {
    id: "world_map_village",
    kind: "world",
    path: MAP_PATH,
    label: "Peta desa",
    tags: ["peta", "desa", "dunia", "latar", "map", "village"],
    width: S.map.w,
    height: S.map.h,
  },
];

const objectSlugByKey = new Map();
const seenSlug = new Set();

for (const key of [...usedKeys].sort()) {
  const asset = assetByKey.get(key);
  if (!asset) throw new Error(`aset tidak ada untuk kunci ${key}`);

  const slug = slugOf(key);
  if (seenSlug.has(slug)) throw new Error(`slug ganda: ${slug}`);
  seenSlug.add(slug);
  objectSlugByKey.set(key, slug);

  const { buffer } = decodeDataUrl(asset.src);
  const path = writePublic(`world/${slug}.png`, buffer);

  worldEntries.push({
    id: `world_${slug}`,
    kind: "world",
    path,
    label: labelOf(slug),
    tags: tagsOf(slug),
    width: asset.w,
    height: asset.h,
  });
}

/* -------------------------------------------------------------------------- */
/* 3. village.json                                                            */
/* -------------------------------------------------------------------------- */

const blocked = Object.keys(S.cells).sort((a, b) => {
  const [ca, ra] = a.split(",").map(Number);
  const [cb, rb] = b.split(",").map(Number);
  return ca - cb || ra - rb;
});

const spawn = S.objs.find((object) => object.t === "p");
if (!spawn) throw new Error("tidak ada titik mulai pemain (t: p)");

const objects = S.objs
  .filter((object) => object.t === "s")
  .map((object) => ({
    assetId: `world_${objectSlugByKey.get(object.a)}`,
    x: round4(object.x),
    y: round4(object.y),
    w: round4(object.w),
    h: round4(object.h),
    depth: round(object.y + object.dy * object.h),
  }));

const npcs = S.objs
  .filter((object) => object.t === "n")
  .map((object) => ({
    id: `char_${characterNameOf(object.n)}`,
    x: round4(object.x + object.w / 2),
    y: round4(object.y + object.h),
    face: object.face ?? 0,
    depth: round(object.y + object.h),
    solid: object.solid ? 1 : 0,
  }));

const village = {
  mapId: "world_map_village",
  width: S.map.w,
  height: S.map.h,
  cell: { width: S.g.w, height: S.g.h },
  player: {
    id: `char_${characterNameOf(S.pl.k ?? MC_KEY)}`,
    x: round4(spawn.x + spawn.w / 2),
    y: round4(spawn.y + spawn.h),
    face: spawn.face ?? 0,
  },
  blocked,
  objects,
  npcs,
};

const villageTarget = join(ROOT, "src", "game", "world", "village.json");
mkdirSync(dirname(villageTarget), { recursive: true });
writeFileSync(villageTarget, `${JSON.stringify(village, null, 2)}\n`);
log(
  `  data    world/village.json (${objects.length} objek, ${npcs.length} NPC, ${blocked.length} sel padat)`,
);

/* -------------------------------------------------------------------------- */
/* 4. worldAssets.ts                                                          */
/* -------------------------------------------------------------------------- */

const entryLines = worldEntries
  .map(
    (entry) => `  {
    id: ${JSON.stringify(entry.id)},
    kind: "world",
    path: ${JSON.stringify(entry.path)},
    label: ${JSON.stringify(entry.label)},
    tags: ${JSON.stringify(entry.tags)},
    width: ${entry.width},
    height: ${entry.height},
  },`,
  )
  .join("\n");

const worldAssetsSource = `/**
 * Aset dunia desa — **dibangkitkan**, jangan disunting tangan.
 *
 * Sumber dan cara membuatnya: \`scripts/import-world.mjs\`. Kind \`world\` berisi
 * satu gambar peta desa dan ${worldEntries.length - 1} potongan objek yang
 * dipakai peta; tidak ada entri di sini yang boleh dirujuk Story JSON (lihat
 * \`STORY_ASSET_KINDS\` di \`manifest.ts\`).
 *
 * Urutan mengikuti entri di file ini: entri ini disebar ke \`ASSETS\` oleh
 * \`manifest.ts\`.
 */

import type { AssetEntry } from "./manifest";

export const WORLD_ASSETS: readonly AssetEntry[] = [
${entryLines}
];
`;

writeFileSync(join(ROOT, "src", "assets", "worldAssets.ts"), worldAssetsSource);
log(`  kode    src/assets/worldAssets.ts (${worldEntries.length} entri)`);

log("Selesai.");
