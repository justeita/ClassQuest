/**
 * Manifest aset — daftar resmi aset yang boleh dipakai cerita.
 *
 * Kontrak: `docs/02-data-model/asset-manifest.md` (bentuk dan aturan) dan
 * `docs/07-assets/inventory.md` (satu-satunya daftar aset). Modul ini statis,
 * tanpa dependensi, dan aman diimpor dari browser: validator, prompt builder,
 * editor, dan game boleh memakainya. Tidak ada pembacaan disk di sini —
 * pemeriksaan file hidup di `manifest.test.ts`.
 *
 * `path` relatif terhadap `public/`, mis. `/assets/bg/default.png` menunjuk
 * `public/assets/bg/default.png`.
 *
 * Kind `world` (peta desa dan potongan objeknya) dibangkitkan oleh
 * `scripts/import-world.mjs` ke `worldAssets.ts` dan disebar di sini. Ia milik
 * sisi game, bukan kontrak cerita: lihat `STORY_ASSET_KINDS`.
 */

import type { AssetManifest } from "../story/validate";

import { WORLD_ASSETS } from "./worldAssets";

export type AssetKind =
  "background" | "character" | "world" | "music" | "sfx" | "ui";

export type AssetEntry = {
  id: string;
  kind: AssetKind;
  /** Relatif terhadap `public/`, mis. `/assets/bg/default.png`. */
  path: string;
  label: string;
  tags: string[];
  width?: number;
  height?: number;
  /** Hanya untuk kind `character`; file harus ada di `public/`. */
  portraitPath?: string;
  /** Hanya untuk kind `character`: ukuran satu frame spritesheet. */
  frameWidth?: number;
  frameHeight?: number;
};

/**
 * Aset inti: latar, karakter, musik, efek, dan UI. Entri dunia desa
 * (`WORLD_ASSETS`, dibangkitkan) disebar di akhir daftar.
 *
 * Background memakai resolusi tetap 640×360 (`docs/07-assets/asset-guide.md`,
 * ADR 0009). Sprite karakter memakai `frameWidth`/`frameHeight` karena berkasnya
 * spritesheet horizontal per frame.
 */
const CORE_ASSETS: readonly AssetEntry[] = [
  /* Background: latar layar judul dan hasil. */
  {
    id: "bg_default",
    kind: "background",
    path: "/assets/bg/default.png",
    label: "Latar default",
    tags: ["default", "cadangan", "netral", "fallback", "latar"],
    width: 640,
    height: 360,
  },

  /* Karakter: pemain desa, warga desa, dan siluet cadangan. */
  {
    id: "char_mc",
    kind: "character",
    path: "/assets/char/mc.png",
    label: "Pemuda syal biru",
    tags: ["pemuda", "syal", "biru", "desa", "pemain", "karakter"],
    portraitPath: "/assets/portrait/mc.png",
    frameWidth: 34,
    frameHeight: 64,
  },
  {
    id: "char_npc_1",
    kind: "character",
    path: "/assets/char/npc_1.png",
    label: "Pelajar bertopi biru",
    tags: ["pelajar", "topi", "biru", "desa", "remaja", "warga"],
    portraitPath: "/assets/portrait/npc_1.png",
    frameWidth: 38,
    frameHeight: 64,
  },
  {
    id: "char_npc_3",
    kind: "character",
    path: "/assets/char/npc_3.png",
    label: "Pelajar berkacamata",
    tags: ["pelajar", "kacamata", "desa", "remaja", "warga", "siswa"],
    portraitPath: "/assets/portrait/npc_3.png",
    frameWidth: 36,
    frameHeight: 64,
  },
  {
    id: "char_npc_4",
    kind: "character",
    path: "/assets/char/npc_4.png",
    label: "Gadis berjubah biru",
    tags: ["gadis", "jubah", "biru", "desa", "warga", "remaja"],
    portraitPath: "/assets/portrait/npc_4.png",
    frameWidth: 35,
    frameHeight: 64,
  },
  {
    id: "char_npc_5",
    kind: "character",
    path: "/assets/char/npc_5.png",
    label: "Nenek bertongkat",
    tags: ["nenek", "tongkat", "tua", "desa", "warga", "bijak"],
    portraitPath: "/assets/portrait/npc_5.png",
    frameWidth: 45,
    frameHeight: 64,
  },
  {
    id: "char_npc_6",
    kind: "character",
    path: "/assets/char/npc_6.png",
    label: "Kakek berjubah hijau",
    tags: ["kakek", "jubah", "hijau", "desa", "warga", "tua"],
    portraitPath: "/assets/portrait/npc_6.png",
    frameWidth: 40,
    frameHeight: 64,
  },
  {
    id: "char_npc_7",
    kind: "character",
    path: "/assets/char/npc_7.png",
    label: "Nelayan desa",
    tags: ["nelayan", "perahu", "ikan", "desa", "warga", "sungai"],
    portraitPath: "/assets/portrait/npc_7.png",
    frameWidth: 51,
    frameHeight: 64,
  },
  {
    id: "char_npc_8",
    kind: "character",
    path: "/assets/char/npc_8.png",
    label: "Penjaga desa",
    tags: ["penjaga", "jaga", "desa", "warga", "aman", "pos"],
    portraitPath: "/assets/portrait/npc_8.png",
    frameWidth: 51,
    frameHeight: 64,
  },
  {
    id: "char_npc_9",
    kind: "character",
    path: "/assets/char/npc_9.png",
    label: "Petani desa",
    tags: ["petani", "sawah", "tani", "desa", "warga", "panen"],
    portraitPath: "/assets/portrait/npc_9.png",
    frameWidth: 46,
    frameHeight: 64,
  },
  {
    id: "char_npc_10",
    kind: "character",
    path: "/assets/char/npc_10.png",
    label: "Tetua bijak desa",
    tags: ["tetua", "bijak", "tua", "desa", "warga", "penasihat"],
    portraitPath: "/assets/portrait/npc_10.png",
    frameWidth: 40,
    frameHeight: 64,
  },
  {
    id: "char_default",
    kind: "character",
    path: "/assets/char/default.png",
    label: "Karakter default",
    tags: ["default", "cadangan", "fallback", "netral", "siluet"],
    frameWidth: 24,
    frameHeight: 32,
  },

  /* Musik: satu lagu untuk seluruh permainan. */
  {
    id: "bgm_default",
    kind: "music",
    path: "/assets/music/default.mp3",
    label: "Musik desa",
    tags: ["desa", "tenang", "hangat", "pengantar", "musik"],
  },

  /* SFX */
  {
    id: "sfx_click",
    kind: "sfx",
    path: "/assets/sfx/click.ogg",
    label: "Klik",
    tags: ["klik", "pilih", "ui", "click"],
  },
  {
    id: "sfx_correct",
    kind: "sfx",
    path: "/assets/sfx/correct.ogg",
    label: "Jawaban benar",
    tags: ["benar", "berhasil", "tepat", "correct"],
  },
  {
    id: "sfx_wrong",
    kind: "sfx",
    path: "/assets/sfx/wrong.ogg",
    label: "Jawaban salah",
    tags: ["salah", "lembut", "keliru", "wrong"],
  },
  {
    id: "sfx_page",
    kind: "sfx",
    path: "/assets/sfx/page.ogg",
    label: "Ganti scene",
    tags: ["transisi", "halaman", "pindah", "page"],
  },

  /* UI */
  {
    id: "ui_textbox",
    kind: "ui",
    path: "/assets/ui/textbox.png",
    label: "Kotak dialog",
    tags: ["dialog", "teks", "panel", "textbox"],
  },
  {
    id: "ui_portrait_frame",
    kind: "ui",
    path: "/assets/ui/portrait_frame.png",
    label: "Bingkai potret",
    tags: ["potret", "bingkai", "karakter", "frame"],
  },
  {
    id: "ui_default",
    kind: "ui",
    path: "/assets/ui/default.png",
    label: "UI default",
    tags: ["default", "cadangan", "panel", "netral"],
  },
];

export const ASSETS: readonly AssetEntry[] = [...CORE_ASSETS, ...WORLD_ASSETS];

export const ASSETS_BY_ID = new Map(ASSETS.map((asset) => [asset.id, asset]));

export const BACKGROUNDS = ASSETS.filter(
  (asset) => asset.kind === "background",
);
export const CHARACTERS = ASSETS.filter((asset) => asset.kind === "character");
export const WORLD = ASSETS.filter((asset) => asset.kind === "world");
export const MUSIC = ASSETS.filter((asset) => asset.kind === "music");
export const SFX = ASSETS.filter((asset) => asset.kind === "sfx");
export const UI = ASSETS.filter((asset) => asset.kind === "ui");

/**
 * Bentuk minimal untuk `validateStory`. Kind `world` **sengaja dikeluarkan**:
 * ia dipakai sisi game (peta desa) dan tidak pernah dirujuk Story JSON,
 * sedangkan `AssetKind` di `src/story/validate.ts` milik backend dan tidak
 * boleh diperluas dari sini.
 */
export const STORY_ASSET_KINDS: readonly string[] = [
  "background",
  "character",
  "music",
  "sfx",
  "ui",
];

export function toAssetManifest(
  assets: readonly AssetEntry[] = ASSETS.filter((asset) =>
    STORY_ASSET_KINDS.includes(asset.kind),
  ),
): AssetManifest {
  return assets.map((asset) => ({
    id: asset.id,
    kind: asset.kind as AssetManifest[number]["kind"],
  }));
}
