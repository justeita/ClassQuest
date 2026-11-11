/**
 * Bentuk data map per scene (ADR 0010).
 *
 * Semua posisi dinyatakan dalam **tile** (16×16 px, ADR 0009) — tidak ada
 * piksel lepas di data map. Setiap objek yang `solid` sekaligus menentukan
 * gambar dan collider-nya, sehingga tidak ada collider yang ditulis terpisah
 * dari visual (penyebab bug "nabrak benda tak terlihat").
 *
 * Lantai tidak masuk daftar objek: ia selalu menutupi seluruh peta, tidak
 * pernah solid, jadi cukup satu field `floorTile` per ruangan.
 *
 * Kind `exit` (world-design.md § Objek) sengaja belum ada: alur antar-scene
 * masih linear otomatis sesuai ADR 0008; pintu interaktif menyusul saat
 * transisi antar-scene berbasis jalan diimplementasikan.
 */

export { TILE_SIZE } from "../constants";

/** Ukuran satu tile dalam piksel: 16 (ADR 0009). */

/**
 * - `wall`: dinding dari `wallTile` ruangan.
 * - `prop`: sprite dari manifest.
 * - `npc`: anggota `story.cast`.
 * - `zone`: collider murni tanpa gambar (ADR 0012). Dipakai ruangan bergambar
 *   penuh, di mana visual sudah menyatu di gambar peta dan `objects` tinggal
 *   menandai area yang padat.
 */
export type RoomObjectKind = "wall" | "prop" | "npc" | "zone";

/**
 * Collider sub-area untuk prop besar (ADR 0011).
 *
 * Offset dan ukuran dinyatakan dalam tile relatif terhadap pojok kiri atas
 * objek, jadi nilainya boleh pecahan (mis. `0.5`) untuk batang pohon yang lebih
 * sempit dari satu tile. Tanpa collider ini, seluruh kotak `tileW`×`tileH`
 * menjadi solid — untuk pohon 8×8 tile itu memblok hampir seluruh taman.
 */
export type RoomObjectCollider = {
  /** Jarak dari tepi kiri objek, dalam tile. */
  x: number;
  /** Jarak dari tepi atas objek, dalam tile. */
  y: number;
  /** Lebar area solid, dalam tile. */
  w: number;
  /** Tinggi area solid, dalam tile. */
  h: number;
};

export type RoomObject = {
  kind: RoomObjectKind;
  /**
   - `wall`: tidak dipakai (dinding memakai `wallTile` ruangan).
   - `prop`: id aset manifest, mis. `prop_desk`.
   - `npc`: id anggota `story.cast`, bukan id karakter baru.
   - `zone`: tidak dipakai (collider tanpa gambar).
   */
  id?: string;
  /** Posisi pojok kiri atas dalam tile. */
  tileX: number;
  tileY: number;
  /** Ukuran dalam tile. */
  tileW: number;
  tileH: number;
  /** true = memblok pemain. Dinding dan zona selalu solid. */
  solid: boolean;
  /**
   * Area solid opsional di dalam kotak objek. Bila ada, collider memakai area
   * ini apa adanya (tanpa inset 2 px) dan `tileW`/`tileH` tetap menentukan
   * jangkar gambar.
   */
  collider?: RoomObjectCollider;
};

export type RoomData = {
  /**
   * Identitas ruangan, bukan identitas scene. Beberapa scene yang terjadi di
   * lokasi sama memakai `roomId` yang sama, sehingga posisi pemain tidak
   * di-reset saat cerita pindah scene.
   */
  roomId: string;
  /** Tile lantai yang diulang di seluruh peta (id manifest `tile_*`). */
  floorTile: string;
  /** Tile dinding untuk keliling dan pita atas (id manifest `tile_*`). */
  wallTile: string;
  /**
   * Gambar peta penuh opsional (id manifest `map_*`, ADR 0012). Bila ada,
   * GameScene menggambar satu gambar ini dan **melewatkan** lantai, dinding,
   * serta prop; `objects` tinggal menentukan collider (lewat `zone`) dan NPC.
   * Ukurannya wajib sama dengan `widthTiles`×`heightTiles`.
   */
  mapImage?: string;
  widthTiles: number;
  heightTiles: number;
  /** Tile spawn pemain; kaki pemain di dasar tile ini. */
  spawnTile: { x: number; y: number };
  objects: RoomObject[];
};
