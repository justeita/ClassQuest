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

export type AssetKind = "background" | "character" | "music" | "sfx" | "ui";

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
 * Background memakai resolusi tetap 480×270 (`docs/07-assets/asset-guide.md`).
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
    width: 480,
    height: 270,
  },
  {
    id: "bg_schoolyard_day",
    kind: "background",
    path: "/assets/bg/schoolyard_day.png",
    label: "Halaman sekolah, siang",
    tags: ["halaman", "sekolah", "luar", "siang", "schoolyard", "outdoor"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_schoolyard_evening",
    kind: "background",
    path: "/assets/bg/schoolyard_evening.png",
    label: "Halaman sekolah, sore",
    tags: ["halaman", "sekolah", "sore", "senja", "sunset", "outdoor"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_cloud_sky",
    kind: "background",
    path: "/assets/bg/cloud_sky.png",
    label: "Langit di atas awan",
    tags: ["langit", "awan", "tinggi", "terang", "sky", "cloud"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_mountain_night",
    kind: "background",
    path: "/assets/bg/mountain_night.png",
    label: "Gunung, malam",
    tags: ["gunung", "malam", "gelap", "dingin", "mountain", "night"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_river_day",
    kind: "background",
    path: "/assets/bg/river_day.png",
    label: "Sungai, siang",
    tags: ["sungai", "air", "alam", "siang", "river", "nature"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_library_evening",
    kind: "background",
    path: "/assets/bg/library_evening.png",
    label: "Perpustakaan, sore",
    tags: ["perpustakaan", "buku", "sore", "tenang", "library", "indoor"],
    width: 480,
    height: 270,
  },
  {
    id: "bg_default",
    kind: "background",
    path: "/assets/bg/default.png",
    label: "Latar default",
    tags: ["default", "cadangan", "netral", "fallback"],
    width: 480,
    height: 270,
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
] as const satisfies readonly AssetEntry[];

export const ASSETS_BY_ID = new Map(ASSETS.map((asset) => [asset.id, asset]));

export const BACKGROUNDS = ASSETS.filter(
  (asset) => asset.kind === "background",
);
export const CHARACTERS = ASSETS.filter((asset) => asset.kind === "character");
export const MUSIC = ASSETS.filter((asset) => asset.kind === "music");
export const SFX = ASSETS.filter((asset) => asset.kind === "sfx");
export const UI = ASSETS.filter((asset) => asset.kind === "ui");

/**
 * Bentuk minimal yang dipakai `validateStory` (`AssetManifest`): hanya `id` dan
 * `kind`. Murni dan sinkron, jadi aman dipanggil di browser.
 */
export function toAssetManifest(
  assets: readonly AssetEntry[] = ASSETS,
): AssetManifest {
  return assets.map((asset) => ({ id: asset.id, kind: asset.kind }));
}
