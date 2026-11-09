/**
 * Manifest palsu untuk test MockProvider.
 *
 * `src/assets/manifest.ts` baru dibuat di tugas 9, jadi daftar ini disalin dari
 * `docs/07-assets/inventory.md` — hanya id yang dipakai fixture. Begitu manifest
 * asli ada, test harus memakai manifest itu, bukan salinan ini.
 */

import type { AssetManifest } from "../../story/validate";

export const MOCK_ASSET_MANIFEST: AssetManifest = [
  { id: "bg_classroom_day", kind: "background" },
  { id: "bg_schoolyard_day", kind: "background" },
  { id: "char_nara", kind: "character" },
  { id: "char_pak_bima", kind: "character" },
  { id: "char_tirta", kind: "character" },
  { id: "bgm_school_calm", kind: "music" },
  { id: "bgm_adventure", kind: "music" },
];
