/**
 * Bentuk data dunia desa (satu peta, satu dunia).
 *
 * Sumbernya `project.json` milik editor peta, disalin apa adanya oleh
 * `scripts/import-world.mjs` ke `village.json`. Tidak ada angka yang dihitung
 * ulang di runtime: koordinat, ukuran, dan urutan gambar sudah final di data.
 *
 * Semua posisi memakai **piksel peta** (2390×1792), bukan tile. Objek digambar
 * berjangkar kiri-atas; NPC digambar berjangkar di titik kaki (`x`, `y`).
 */

export type WorldObject = {
  /** Id manifest kind `world`, mis. `world_house_red`. */
  assetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Urutan gambar (ysort): bagian kaki objek yang dibulatkan. */
  depth: number;
};

export type WorldNpc = {
  /** Id anggota `story.cast`, mis. `char_npc_7`. */
  id: string;
  /** Titik kaki NPC: tempat sprite dijangkar dan inti kotak tabrakannya. */
  x: number;
  y: number;
  /** Indeks frame arah hadap 0–7 (lihat `FRAME_ARAH` di `karakter.ts`). */
  face: number;
  depth: number;
  /** 1 = memblok pemain; 0 = bisa dilewati. */
  solid: number;
};

export type WorldData = {
  /** Gambar peta (id manifest kind `world`). */
  mapId: string;
  width: number;
  height: number;
  /** Ukuran satu sel collision editor, dalam piksel. */
  cell: { width: number; height: number };
  /** Titik kaki pemain saat mulai, dan sprite yang dipakai. */
  player: { id: string; x: number; y: number; face: number };
  /** Sel collision yang padat, sebagai `"kolom,baris"`. */
  blocked: string[];
  objects: WorldObject[];
  npcs: WorldNpc[];
};
