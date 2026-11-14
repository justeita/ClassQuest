/**
 * Resolusi aset cerita → manifest.
 *
 * Aturan di docs/04-game/scene-format.md: background/musik scene menimpa nilai
 * chapter, dan `bg_default`/`bgm_default` hanya dipakai kalau id yang diminta
 * tidak ada — bukan pengganti diam-diam untuk id yang salah. Modul ini murni
 * (tanpa Phaser) supaya bisa diuji di jsdom.
 */

import { ASSETS, ASSETS_BY_ID, type AssetEntry } from "@/assets/manifest";
import type { Chapter, Scene, Story } from "@/story/schema";

export const DEFAULT_BACKGROUND_ID = "bg_default";
export const DEFAULT_MUSIC_ID = "bgm_default";

/**
 * Track musik latar yang boleh dipakai permainan. Cerita hanya melihat
 * `bgm_default` sebagai nilai default; track awal dipilih acak sekali per sesi,
 * lalu kedua track diputar bergantian (lihat `musikSesiBerikutnya`) supaya tiap
 * permainan bisa terasa berbeda. Kedua track selalu ikut dimuat, walau cerita
 * tidak menyebut salah satunya.
 */
export const GAMEPLAY_MUSIC_IDS = ["bgm_default", "bgm_vellore"] as const;

/**
 * Pilih satu track musik acak dari `pool`.
 *
 * Tidak memakai seed: hasilnya sengaja berbeda tiap sesi (pemain baru atau
 * halaman dimuat ulang). `acak` bisa diganti di tes supaya deterministik.
 */
export function pilihMusikAcak(
  acak: () => number = Math.random,
  pool: readonly string[] = GAMEPLAY_MUSIC_IDS,
): string {
  if (pool.length === 0) return DEFAULT_MUSIC_ID;
  const nilai = acak();
  const aman = Number.isFinite(nilai) ? Math.min(Math.max(nilai, 0), 1) : 0;
  const index = Math.min(pool.length - 1, Math.floor(aman * pool.length));
  return pool[index] ?? DEFAULT_MUSIC_ID;
}

/**
 * Track berikutnya dalam rotasi musik latar sesi.
 *
 * Rotasi mengikuti urutan `pool` dan kembali ke awal. Dengan dua track hasilnya
 * bergantian: pilihan acak → track lain → pilihan acak lagi, dan seterusnya.
 * Id di luar daftar (mis. override scene) memulai rotasi dari track pertama.
 */
export function musikSesiBerikutnya(
  sekarang: string,
  pool: readonly string[] = GAMEPLAY_MUSIC_IDS,
): string {
  if (pool.length === 0) return DEFAULT_MUSIC_ID;
  const index = pool.indexOf(sekarang);
  if (index === -1) return pool[0] ?? DEFAULT_MUSIC_ID;
  return pool[(index + 1) % pool.length] ?? DEFAULT_MUSIC_ID;
}

/**
 * SFX dan aset dasar yang selalu dibutuhkan runtime game.
 *
 * Panel dan potret dialog tidak ada di sini: keduanya dirender DOM
 * (`DialogueBox.tsx`) langsung dari `public/`, jadi tidak perlu dimuat Phaser.
 * `GAMEPLAY_MUSIC_IDS` ikut karena track rotasi bisa terpilih walau cerita
 * tidak menyebutnya.
 */
const RUNTIME_ASSET_IDS = [
  DEFAULT_BACKGROUND_ID,
  ...GAMEPLAY_MUSIC_IDS,
  "sfx_click",
  "sfx_correct",
  "sfx_wrong",
  "sfx_page",
  "sfx_type",
] as const;

export type SceneLook = {
  backgroundId: string;
  musicId: string;
};

/** Nilai efektif satu scene: override scene → chapter → default. */
export function resolveSceneLook(
  chapter: Chapter,
  scene: Scene | null | undefined,
): SceneLook {
  return {
    backgroundId:
      scene?.backgroundId ?? chapter.backgroundId ?? DEFAULT_BACKGROUND_ID,
    musicId: scene?.musicId ?? chapter.musicId ?? DEFAULT_MUSIC_ID,
  };
}

/**
 * Semua aset manifest yang perlu dimuat untuk satu cerita, dalam urutan
 * `ASSETS` agar hasil preload stabil. Karakter membawa `portraits` juga, tetapi
 * potretnya dirender DOM dan bukan tanggung jawab `PreloadScene`.
 */
export function collectStoryAssets(story: Story): AssetEntry[] {
  const dipakai = new Set<string>(RUNTIME_ASSET_IDS);

  for (const chapter of story.chapters) {
    if (chapter.backgroundId) dipakai.add(chapter.backgroundId);
    if (chapter.musicId) dipakai.add(chapter.musicId);
    for (const scene of chapter.scenes) {
      if (scene.backgroundId) dipakai.add(scene.backgroundId);
      if (scene.musicId) dipakai.add(scene.musicId);
    }
  }

  for (const karakter of story.cast) {
    dipakai.add(karakter.spriteId);
  }

  return ASSETS.filter((asset) => dipakai.has(asset.id));
}

/** Path manifest untuk id; `undefined` kalau id tidak terdaftar. */
export function assetEntry(assetId: string): AssetEntry | undefined {
  return ASSETS_BY_ID.get(assetId);
}
