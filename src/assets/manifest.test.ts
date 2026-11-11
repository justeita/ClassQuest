import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  ASSETS,
  ASSETS_BY_ID,
  BACKGROUNDS,
  CHARACTERS,
  MAPS,
  MUSIC,
  PROPS,
  SFX,
  TILES,
  UI,
  STORY_ASSET_KINDS,
  type AssetEntry,
  type AssetKind,
  toAssetManifest,
} from "./manifest";

/**
 * Kontrak manifest: `docs/02-data-model/asset-manifest.md` bagian **Test wajib**
 * dan `docs/07-assets/inventory.md` bagian **Cara memeriksa konsistensi**.
 *
 * Test ini menjaga docs tetap jujur: id, prefix, path, tag, fallback, ukuran
 * background, dan jumlah per kind. Pemeriksaan file memakai daftar
 * `PENDING_FILES` di bawah — lihat komentarnya.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIC_DIR = join(REPO, "public");

const PREFIX: Record<AssetKind, string> = {
  background: "bg_",
  character: "char_",
  tile: "tile_",
  prop: "prop_",
  map: "map_",
  music: "bgm_",
  sfx: "sfx_",
  ui: "ui_",
};

const EXTENSION: Record<AssetKind, string> = {
  background: "png",
  character: "png",
  tile: "png",
  prop: "png",
  map: "png",
  music: "ogg",
  sfx: "ogg",
  ui: "png",
};

/** Jumlah per kind dari tabel ringkasan `inventory.md`. */
const INVENTORY_COUNTS: Record<AssetKind, number> = {
  background: 8,
  character: 6,
  tile: 11,
  prop: 13,
  map: 1,
  music: 5,
  sfx: 4,
  ui: 3,
};

/** Fallback yang wajib ada, dari `asset-manifest.md`. `sfx` boleh tidak ada. */
const REQUIRED_FALLBACKS: Partial<Record<AssetKind, string>> = {
  background: "bg_default",
  character: "char_default",
  tile: "tile_default",
  prop: "prop_default",
  music: "bgm_default",
  ui: "ui_default",
};

/**
 * File yang **sengaja belum dibuat**. Saat ini kosong: semua aset di
 * `inventory.md` sudah berstatus `ready` dan berkasnya ada di `public/`.
 *
 * Kunci memakai `id`, atau `id#portrait` untuk `portraitPath`. Test di bawah
 * membandingkan daftar file yang hilang dengan daftar ini **persis**: menambah
 * atau menghapus file aset akan menggagalkan test sampai daftar ini diperbarui,
 * jadi tidak ada aset yang hilang diam-diam. Begitu file aset dibuat, hapus
 * barisnya di sini.
 */
const PENDING_FILES: readonly string[] = [];

const fileEntries = (asset: AssetEntry) => [
  { key: asset.id, path: asset.path },
  ...(asset.portraitPath === undefined
    ? []
    : [{ key: `${asset.id}#portrait`, path: asset.portraitPath }]),
];

const diskPath = (assetPath: string) =>
  join(PUBLIC_DIR, assetPath.replace(/^\//, ""));

describe("manifest — id", () => {
  it("semua id unik", () => {
    const ids = ASSETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("id hanya memakai huruf kecil, angka, dan garis bawah", () => {
    const wrong = ASSETS.filter((asset) => !/^[a-z0-9_]+$/.test(asset.id)).map(
      (asset) => asset.id,
    );

    expect(wrong).toEqual([]);
  });

  it("setiap id memakai prefix kind-nya", () => {
    const wrong = ASSETS.filter(
      (asset) => !asset.id.startsWith(PREFIX[asset.kind]),
    ).map((asset) => `${asset.id} (${asset.kind})`);

    expect(wrong).toEqual([]);
  });

  it("ASSETS_BY_ID memuat semua aset", () => {
    expect(ASSETS_BY_ID.size).toBe(ASSETS.length);
    for (const asset of ASSETS) {
      expect(ASSETS_BY_ID.get(asset.id)).toBe(asset);
    }
  });

  it("filter per kind sesuai isi ASSETS", () => {
    expect(BACKGROUNDS.every((a) => a.kind === "background")).toBe(true);
    expect(CHARACTERS.every((a) => a.kind === "character")).toBe(true);
    expect(MUSIC.every((a) => a.kind === "music")).toBe(true);
    expect(SFX.every((a) => a.kind === "sfx")).toBe(true);
    expect(UI.every((a) => a.kind === "ui")).toBe(true);
    expect(MAPS.every((a) => a.kind === "map")).toBe(true);
  });
});

describe("manifest — path", () => {
  it("semua path unik", () => {
    const paths = ASSETS.map((asset) => asset.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("path menunjuk ke /assets/ dengan nama file snake_case", () => {
    const wrong = ASSETS.filter((asset) => {
      const name = asset.id.slice(PREFIX[asset.kind].length);
      return (
        asset.path !==
        `/assets/${folderOf(asset.kind)}/${name}.${EXTENSION[asset.kind]}`
      );
    }).map((asset) => asset.path);

    expect(wrong).toEqual([]);
  });

  it("portraitPath hanya untuk character dan memakai folder portrait", () => {
    const wrong = ASSETS.filter((asset) => {
      if (asset.portraitPath === undefined) return false;
      if (asset.kind !== "character") return true;
      const name = asset.id.slice(PREFIX.character.length);
      return asset.portraitPath !== `/assets/portrait/${name}.png`;
    }).map((asset) => asset.id);

    expect(wrong).toEqual([]);
  });
});

describe("manifest — label dan tag", () => {
  it("setiap aset punya minimal 4 tag unik", () => {
    const wrong = ASSETS.filter((asset) => new Set(asset.tags).size < 4).map(
      (asset) => `${asset.id} (${new Set(asset.tags).size})`,
    );

    expect(wrong).toEqual([]);
  });

  it("label tidak memakai id dan tidak kosong", () => {
    const wrong = ASSETS.filter(
      (asset) => asset.label.trim() === "" || asset.label.includes(asset.id),
    ).map((asset) => asset.id);

    expect(wrong).toEqual([]);
  });
});

describe("manifest — fallback dan ukuran", () => {
  it("fallback setiap kind ada", () => {
    for (const [kind, id] of Object.entries(REQUIRED_FALLBACKS)) {
      expect(ASSETS_BY_ID.get(id!), `${kind} → ${id}`).toBeDefined();
      expect(ASSETS_BY_ID.get(id!)?.kind).toBe(kind);
    }
  });

  it("tile memakai 16×16", () => {
    const wrong = TILES.filter(
      (asset) => asset.width !== 16 || asset.height !== 16,
    ).map((asset) => `${asset.id} (${asset.width}×${asset.height})`);

    expect(wrong).toEqual([]);
  });

  it("prop memakai kelipatan 16", () => {
    const wrong = PROPS.filter(
      (asset) =>
        (asset.width ?? 0) % 16 !== 0 || (asset.height ?? 0) % 16 !== 0,
    ).map((asset) => `${asset.id} (${asset.width}×${asset.height})`);

    expect(wrong).toEqual([]);
  });

  it("background memakai 640×360", () => {
    const wrong = BACKGROUNDS.filter(
      (asset) => asset.width !== 640 || asset.height !== 360,
    ).map((asset) => `${asset.id} (${asset.width}×${asset.height})`);

    expect(wrong).toEqual([]);
  });

  it("peta memakai kelipatan 16 agar sejajar grid tile", () => {
    const wrong = MAPS.filter(
      (asset) =>
        (asset.width ?? 0) % 16 !== 0 ||
        (asset.height ?? 0) % 16 !== 0 ||
        !asset.width ||
        !asset.height,
    ).map((asset) => `${asset.id} (${asset.width}×${asset.height})`);

    expect(wrong).toEqual([]);
  });

  it("jumlah per kind sesuai ringkasan inventory", () => {
    for (const [kind, count] of Object.entries(INVENTORY_COUNTS)) {
      const actual = ASSETS.filter((asset) => asset.kind === kind).length;
      expect(actual, kind).toBe(count);
    }
  });
});

describe("manifest — bentuk untuk validator", () => {
  it("toAssetManifest hanya memuat kind yang boleh dirujuk cerita", () => {
    const manifest = toAssetManifest();
    const storyAssets = ASSETS.filter((asset) =>
      STORY_ASSET_KINDS.includes(asset.kind),
    );

    expect(manifest).toHaveLength(storyAssets.length);
    expect(manifest).toEqual(
      storyAssets.map((asset) => ({ id: asset.id, kind: asset.kind })),
    );
    // Tile, prop, dan peta milik map game (ADR 0010/0012), bukan kontrak cerita.
    for (const asset of [...TILES, ...PROPS, ...MAPS]) {
      expect(manifest.find((entry) => entry.id === asset.id)).toBeUndefined();
    }
  });

  it("toAssetManifest bisa menerima daftar bagian", () => {
    expect(toAssetManifest(BACKGROUNDS)).toHaveLength(BACKGROUNDS.length);
  });
});

describe("manifest — file", () => {
  it("melaporkan tepat file yang belum dibuat, tanpa ada yang hilang diam-diam", () => {
    const missing = ASSETS.flatMap(fileEntries)
      .filter((entry) => !existsSync(diskPath(entry.path)))
      .map((entry) => entry.key)
      .sort();

    expect(missing).toEqual([...PENDING_FILES].sort());
  });

  it("setiap file di public/assets terdaftar di manifest", () => {
    const assetsDir = join(PUBLIC_DIR, "assets");
    if (!existsSync(assetsDir)) return;

    const registered = new Set(
      ASSETS.flatMap(fileEntries).map((entry) => entry.path.replace(/^\//, "")),
    );
    const onDisk = readdirSync(assetsDir, { recursive: true })
      .map((entry) => String(entry).split(sep).join("/"))
      .filter((entry) => /\.[a-z0-9]+$/.test(entry))
      .map((entry) => `assets/${entry}`);
    const stray = onDisk.filter((entry) => !registered.has(entry));

    expect(stray).toEqual([]);
  });
});

describe("manifest — pemakai", () => {
  it("demo fixture hanya memakai id dari manifest", () => {
    const demo = JSON.parse(
      readFileSync(join(REPO, "src/game/fixture/demo-story.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(unknownIdsIn(demo)).toEqual([]);
  });

  it("cerita contoh di docs hanya memakai id dari manifest", () => {
    const example = JSON.parse(
      readFileSync(join(REPO, "docs/02-data-model/story.example.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(unknownIdsIn(example)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Bantuan                                                                    */
/* -------------------------------------------------------------------------- */

function folderOf(kind: AssetKind): string {
  if (kind === "background") return "bg";
  if (kind === "character") return "char";
  if (kind === "tile") return "tile";
  if (kind === "prop") return "prop";
  return kind;
}

/**
 * Kumpulkan id aset yang dipakai sebuah `Story` mentah, lalu saring yang tidak
 * ada di manifest. Tidak memakai tipe `Story` supaya fixture boleh dibaca tanpa
 * validasi penuh.
 */
function unknownIdsIn(story: Record<string, unknown>): string[] {
  const used = new Set<string>();
  const chapters = Array.isArray(story.chapters) ? story.chapters : [];
  const cast = Array.isArray(story.cast) ? story.cast : [];

  for (const chapter of chapters as Record<string, unknown>[]) {
    if (typeof chapter.backgroundId === "string") {
      used.add(chapter.backgroundId);
    }
    if (typeof chapter.musicId === "string") used.add(chapter.musicId);

    const scenes = Array.isArray(chapter.scenes) ? chapter.scenes : [];
    for (const scene of scenes as Record<string, unknown>[]) {
      if (typeof scene.backgroundId === "string") {
        used.add(scene.backgroundId);
      }
      if (typeof scene.musicId === "string") used.add(scene.musicId);
    }
  }

  for (const character of cast as Record<string, unknown>[]) {
    if (typeof character.spriteId === "string") used.add(character.spriteId);
  }

  const usage = story.assetUsage as Record<string, unknown> | undefined;
  for (const key of ["backgrounds", "music", "sprites"]) {
    const list = usage?.[key];
    if (!Array.isArray(list)) continue;
    for (const id of list) {
      if (typeof id === "string") used.add(id);
    }
  }

  return [...used].filter((id) => !ASSETS_BY_ID.has(id)).sort();
}
