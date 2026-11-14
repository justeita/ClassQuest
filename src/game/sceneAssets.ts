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
 * SFX dan aset dasar yang selalu dibutuhkan runtime game.
 *
 * Panel dan potret dialog tidak ada di sini: keduanya dirender DOM
 * (`DialogueBox.tsx`) langsung dari `public/`, jadi tidak perlu dimuat Phaser.
 */
const RUNTIME_ASSET_IDS = [
  DEFAULT_BACKGROUND_ID,
  DEFAULT_MUSIC_ID,
  "sfx_click",
  "sfx_correct",
  "sfx_wrong",
  "sfx_page",
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
