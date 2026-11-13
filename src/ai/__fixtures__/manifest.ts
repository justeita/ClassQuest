/**
 * Manifest mini untuk fixture AI di `src/ai/__fixtures__/outputs/`.
 *
 * Hanya berisi id yang dipakai fixture; kind dan path tetap diambil dari
 * manifest asli supaya tidak ada salinan kedua yang bisa basi. Test yang butuh
 * seluruh inventory memakai `toAssetManifest()` langsung.
 */

import { ASSETS_BY_ID, toAssetManifest } from "../../assets/manifest";

/** Id yang dipakai fixture mock; harus sama dengan isi `outputs/`. */
const FIXTURE_ASSET_IDS = [
  "bg_default",
  "char_mc",
  "char_npc_10",
  "char_npc_1",
  "bgm_default",
] as const;

export const MOCK_ASSET_MANIFEST = toAssetManifest(
  FIXTURE_ASSET_IDS.map((id) => {
    const asset = ASSETS_BY_ID.get(id);
    if (!asset) throw new Error(`Fixture memakai aset yang tidak ada: ${id}`);
    return asset;
  }),
);
