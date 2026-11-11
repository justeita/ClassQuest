/**
 * Manifest aset — daftar resmi aset yang boleh dipakai cerita.
 *
 * Kontrak: `docs/02-data-model/asset-manifest.md` (bentuk dan aturan) dan
 * `docs/07-assets/inventory.md` (satu-satunya daftar aset). Modul ini statis,
 * tanpa dependensi, dan aman diimpor dari browser: validator, prompt builder,
 * editor, dan game boleh memakainya. Tidak ada pembacaan disk di sini —
 * pemeriksaan file hidup di `manifest.test.ts`.
 *
 * `path` relatif terhadap `public/`, mis. `/assets/bg/classroom_day.png`
 * menunjuk `public/assets/bg/classroom_day.png`.
 */

import type { AssetManifest } from "../story/validate";

export type AssetKind =
  "background" | "character" | "tile" | "prop" | "map" | "music" | "sfx" | "ui";

export type AssetEntry = {
  id: string;
  kind: AssetKind;
  /** Relatif terhadap `public/`, mis. `/assets/bg/classroom_day.png`. */
  path: string;
  label: string;
  tags: string[];
  width?: number;
  height?: number;
  /** Hanya untuk kind `character`; file harus ada di `public/`. */
  portraitPath?: string;
};

/**
 * Aset dari `docs/07-assets/inventory.md`, dalam urutan tabelnya.
 *
 * Background memakai resolusi tetap 640×360 (`docs/07-assets/asset-guide.md`,
 * ADR 0009).
 * Sprite karakter sengaja tanpa `width`/`height`: file-nya spritesheet
 * horizontal, jadi angka per frame tidak sama dengan ukuran file.
 */
export const ASSETS: readonly AssetEntry[] = [
  /* Background */
  {
    id: "bg_classroom_day",
    kind: "background",
    path: "/assets/bg/classroom_day.png",
    label: "Kelas, siang",
    tags: ["kelas", "sekolah", "belajar", "siang", "classroom", "indoor"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_schoolyard_day",
    kind: "background",
    path: "/assets/bg/schoolyard_day.png",
    label: "Halaman sekolah, siang",
    tags: ["halaman", "sekolah", "luar", "siang", "schoolyard", "outdoor"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_schoolyard_evening",
    kind: "background",
    path: "/assets/bg/schoolyard_evening.png",
    label: "Halaman sekolah, sore",
    tags: ["halaman", "sekolah", "sore", "senja", "sunset", "outdoor"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_cloud_sky",
    kind: "background",
    path: "/assets/bg/cloud_sky.png",
    label: "Langit di atas awan",
    tags: ["langit", "awan", "tinggi", "terang", "sky", "cloud"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_mountain_night",
    kind: "background",
    path: "/assets/bg/mountain_night.png",
    label: "Gunung, malam",
    tags: ["gunung", "malam", "gelap", "dingin", "mountain", "night"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_river_day",
    kind: "background",
    path: "/assets/bg/river_day.png",
    label: "Sungai, siang",
    tags: ["sungai", "air", "alam", "siang", "river", "nature"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_library_evening",
    kind: "background",
    path: "/assets/bg/library_evening.png",
    label: "Perpustakaan, sore",
    tags: ["perpustakaan", "buku", "sore", "tenang", "library", "indoor"],
    width: 640,
    height: 360,
  },
  {
    id: "bg_default",
    kind: "background",
    path: "/assets/bg/default.png",
    label: "Latar default",
    tags: ["default", "cadangan", "netral", "fallback"],
    width: 640,
    height: 360,
  },

  /* Karakter */
  {
    id: "char_nara",
    kind: "character",
    path: "/assets/char/nara.png",
    label: "Nara (siswa)",
    tags: ["siswa", "perempuan", "seragam", "remaja", "student"],
    portraitPath: "/assets/portrait/nara.png",
  },
  {
    id: "char_pak_bima",
    kind: "character",
    path: "/assets/char/pak_bima.png",
    label: "Pak Bima (guru)",
    tags: ["guru", "dewasa", "pria", "pengajar", "teacher"],
    portraitPath: "/assets/portrait/pak_bima.png",
  },
  {
    id: "char_tirta",
    kind: "character",
    path: "/assets/char/tirta.png",
    label: "Tirta (roh air)",
    tags: ["air", "roh", "biru", "kecil", "spirit", "water"],
    portraitPath: "/assets/portrait/tirta.png",
  },
  {
    id: "char_rani",
    kind: "character",
    path: "/assets/char/rani.png",
    label: "Rani (siswa)",
    tags: ["siswa", "perempuan", "rambut pendek", "teman"],
    portraitPath: "/assets/portrait/rani.png",
  },
  {
    id: "char_nino",
    kind: "character",
    path: "/assets/char/nino.png",
    label: "Nino (siswa pindahan)",
    tags: ["siswa", "perempuan", "ekor kembar", "pita", "remaja", "student"],
    portraitPath: "/assets/portrait/nino.png",
  },
  {
    id: "char_default",
    kind: "character",
    path: "/assets/char/default.png",
    label: "Karakter default",
    tags: ["default", "cadangan", "fallback", "netral"],
  },

  /* Musik */
  {
    id: "bgm_school_calm",
    kind: "music",
    path: "/assets/music/school_calm.ogg",
    label: "Sekolah tenang",
    tags: ["tenang", "sekolah", "pagi", "hangat", "calm"],
  },
  {
    id: "bgm_adventure",
    kind: "music",
    path: "/assets/music/adventure.ogg",
    label: "Petualangan",
    tags: ["petualangan", "naik", "semangat", "adventure"],
  },
  {
    id: "bgm_mystery",
    kind: "music",
    path: "/assets/music/mystery.ogg",
    label: "Misteri",
    tags: ["misteri", "gelap", "penasaran", "mystery"],
  },
  {
    id: "bgm_ending",
    kind: "music",
    path: "/assets/music/ending.ogg",
    label: "Penutup",
    tags: ["penutup", "hangat", "lega", "ending"],
  },
  {
    id: "bgm_default",
    kind: "music",
    path: "/assets/music/default.ogg",
    label: "Musik default",
    tags: ["default", "cadangan", "netral", "tenang"],
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

  /* Tile lantai dan dinding (top-down, ADR 0009/0010) */
  {
    id: "tile_floor_wood",
    kind: "tile",
    path: "/assets/tile/floor_wood.png",
    label: "Lantai kayu",
    tags: ["lantai", "kayu", "kelas", "indoor", "floor", "wood"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_floor_grass",
    kind: "tile",
    path: "/assets/tile/floor_grass.png",
    label: "Rumput",
    tags: ["lantai", "rumput", "halaman", "luar", "grass", "outdoor"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_floor_cloud",
    kind: "tile",
    path: "/assets/tile/floor_cloud.png",
    label: "Lantai awan",
    tags: ["lantai", "awan", "langit", "terang", "cloud", "sky"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_floor_rock",
    kind: "tile",
    path: "/assets/tile/floor_rock.png",
    label: "Batu",
    tags: ["lantai", "batu", "gunung", "gelap", "rock", "mountain"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_floor_water",
    kind: "tile",
    path: "/assets/tile/floor_water.png",
    label: "Air",
    tags: ["lantai", "air", "sungai", "dingin", "water", "river"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_floor_corridor",
    kind: "tile",
    path: "/assets/tile/floor_corridor.png",
    label: "Lantai koridor",
    tags: ["lantai", "koridor", "ubin", "sekolah", "indoor", "corridor"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_wall_plaster",
    kind: "tile",
    path: "/assets/tile/wall_plaster.png",
    label: "Dinding plester",
    tags: ["dinding", "plester", "kelas", "indoor", "wall", "interior"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_wall_hedge",
    kind: "tile",
    path: "/assets/tile/wall_hedge.png",
    label: "Pagar tanaman",
    tags: ["dinding", "tanaman", "halaman", "luar", "hedge", "outdoor"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_wall_rock",
    kind: "tile",
    path: "/assets/tile/wall_rock.png",
    label: "Dinding batu",
    tags: ["dinding", "batu", "gunung", "gelap", "rock", "outdoor"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_canopy",
    kind: "tile",
    path: "/assets/tile/canopy.png",
    label: "Kanopi penutup",
    tags: ["kanopi", "pohon", "langit-langit", "penutup", "canopy", "overlay"],
    width: 16,
    height: 16,
  },
  {
    id: "tile_default",
    kind: "tile",
    path: "/assets/tile/default.png",
    label: "Tile default",
    tags: ["default", "cadangan", "netral", "fallback"],
    width: 16,
    height: 16,
  },

  /* Prop: objek padat dengan collider dari data yang sama (ADR 0010) */
  {
    id: "prop_desk",
    kind: "prop",
    path: "/assets/prop/desk.png",
    label: "Meja kelas",
    tags: ["meja", "kelas", "belajar", "indoor", "desk", "school"],
    width: 48,
    height: 32,
  },
  {
    id: "prop_blackboard",
    kind: "prop",
    path: "/assets/prop/blackboard.png",
    label: "Papan tulis",
    tags: ["papan", "tulisan", "kelas", "mengajar", "blackboard", "school"],
    width: 112,
    height: 48,
  },
  {
    id: "prop_tree",
    kind: "prop",
    path: "/assets/prop/tree.png",
    label: "Pohon",
    tags: ["pohon", "halaman", "alam", "luar", "tree", "nature"],
    width: 32,
    height: 48,
  },
  {
    id: "prop_fence",
    kind: "prop",
    path: "/assets/prop/fence.png",
    label: "Pagar kayu",
    tags: ["pagar", "halaman", "luar", "kayu", "fence", "outdoor"],
    width: 48,
    height: 16,
  },
  {
    id: "prop_tree_large",
    kind: "prop",
    path: "/assets/prop/tree_large.png",
    label: "Pohon rindang besar",
    tags: ["pohon", "rindang", "taman", "luar", "tree", "shade"],
    width: 128,
    height: 128,
  },
  {
    id: "prop_tree_medium",
    kind: "prop",
    path: "/assets/prop/tree_medium.png",
    label: "Pohon sedang",
    tags: ["pohon", "sedang", "taman", "luar", "tree", "outdoor"],
    width: 64,
    height: 64,
  },
  {
    id: "prop_tree_flower",
    kind: "prop",
    path: "/assets/prop/tree_flower.png",
    label: "Pohon berbunga",
    tags: ["pohon", "bunga", "taman", "luar", "flower", "tree"],
    width: 128,
    height: 128,
  },
  {
    id: "prop_bush_small",
    kind: "prop",
    path: "/assets/prop/bush_small.png",
    label: "Semak kecil",
    tags: ["semak", "daun", "taman", "luar", "bush", "outdoor"],
    width: 64,
    height: 64,
  },
  {
    id: "prop_bush_flower",
    kind: "prop",
    path: "/assets/prop/bush_flower.png",
    label: "Semak bunga merah muda",
    tags: ["semak", "bunga", "merah muda", "taman", "bush", "flower"],
    width: 64,
    height: 64,
  },
  {
    id: "prop_shelf",
    kind: "prop",
    path: "/assets/prop/shelf.png",
    label: "Rak buku",
    tags: ["rak", "buku", "kelas", "indoor", "shelf", "library"],
    width: 32,
    height: 48,
  },
  {
    id: "prop_door",
    kind: "prop",
    path: "/assets/prop/door.png",
    label: "Pintu kayu",
    tags: ["pintu", "kayu", "koridor", "indoor", "door", "sekolah"],
    width: 32,
    height: 32,
  },
  {
    id: "prop_pond",
    kind: "prop",
    path: "/assets/prop/pond.png",
    label: "Kolam taman",
    tags: ["kolam", "air", "taman", "luar", "pond", "water"],
    width: 96,
    height: 64,
  },
  {
    id: "prop_default",
    kind: "prop",
    path: "/assets/prop/default.png",
    label: "Prop default",
    tags: ["default", "cadangan", "netral", "fallback"],
    width: 16,
    height: 16,
  },

  /* Peta jadi: satu gambar penuh per ruangan (ADR 0012) */
  {
    id: "map_halaman_sekolah",
    kind: "map",
    path: "/assets/map/halaman_sekolah.png",
    label: "Peta halaman sekolah",
    tags: ["peta", "halaman", "taman", "sekolah", "luar", "map", "outdoor"],
    width: 896,
    height: 544,
  },
] as const satisfies readonly AssetEntry[];

export const ASSETS_BY_ID = new Map(ASSETS.map((asset) => [asset.id, asset]));

export const BACKGROUNDS = ASSETS.filter(
  (asset) => asset.kind === "background",
);
export const CHARACTERS = ASSETS.filter((asset) => asset.kind === "character");
export const MUSIC = ASSETS.filter((asset) => asset.kind === "music");
export const SFX = ASSETS.filter((asset) => asset.kind === "sfx");
export const UI = ASSETS.filter((asset) => asset.kind === "ui");
export const TILES = ASSETS.filter((asset) => asset.kind === "tile");
export const PROPS = ASSETS.filter((asset) => asset.kind === "prop");
export const MAPS = ASSETS.filter((asset) => asset.kind === "map");

/**
 * Bentuk minimal yang dipakai `validateStory` (`AssetManifest`): hanya `id` dan
 * `kind`. Murni dan sinkron, jadi aman dipanggil di browser.
 */
/**
 * Bentuk minimal untuk `validateStory`. Tile, prop, dan peta **sengaja
 * dikeluarkan**: ketiganya dipakai sisi game (map top-down, ADR 0010/0012) dan
 * tidak pernah dirujuk Story JSON, sedangkan `AssetKind` di
 * `src/story/validate.ts` milik backend dan tidak boleh diperluas dari sini.
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
