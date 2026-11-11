/**
 * Data ruangan per scene (ADR 0010).
 *
 * Scene demo yang sudah punya map khusus: lorong sekolah (`sc_01_01`), kelas
 * (`sc_01_02`, `sc_01_03`), dan halaman sekolah (`sc_03_03`). Scene lain jatuh
 * ke template `default` — pola yang sama dengan `resolveSceneLook()` di
 * `src/game/sceneAssets.ts`.
 *
 * Ukuran `tileW`/`tileH` prop mengikuti ukuran PNG aslinya (16 px per tile),
 * karena `renderProp()` memakai kotak itu sebagai jangkar gambar. Prop besar
 * seperti pohon memakai `collider` sub-area (ADR 0011) supaya pemain bisa
 * berjalan di bawah kanopi.
 *
 * NPC di data hanya menyebut **di mana** anggota cast berdiri; `buildRoomMap`
 * yang memetakan id ke `story.cast` dan menurunkan fallback bila id tidak
 * dikenal, sehingga map tidak pernah menambah karakter baru. Rani menyusul di
 * PR cerita karena `char_rani` belum ada di cast demo.
 */

import type { RoomData, RoomObject } from "./types";

/** Ukuran template default: 48×28 tile = 768×448 px, lebih luas dari layar. */
const RUANG_LEBAR = 48;
const RUANG_TINGGI = 28;

/** Keliling dinding 1 tile; pita atas 2 tile sebagai wajah ruangan. */
function dindingKeliling(widthTiles: number, heightTiles: number) {
  return [
    // Pita atas 2 tile.
    {
      kind: "wall",
      tileX: 0,
      tileY: 0,
      tileW: widthTiles,
      tileH: 2,
      solid: true,
    },
    // Bawah, kiri, kanan 1 tile.
    {
      kind: "wall",
      tileX: 0,
      tileY: heightTiles - 1,
      tileW: widthTiles,
      tileH: 1,
      solid: true,
    },
    {
      kind: "wall",
      tileX: 0,
      tileY: 0,
      tileW: 1,
      tileH: heightTiles,
      solid: true,
    },
    {
      kind: "wall",
      tileX: widthTiles - 1,
      tileY: 0,
      tileW: 1,
      tileH: heightTiles,
      solid: true,
    },
  ] satisfies RoomData["objects"];
}

/** Meja siswa 3×2 tile — ukuran asli `prop_desk` (48×32 px). */
function mejaSiswa(tileX: number, tileY: number): RoomObject {
  return {
    kind: "prop",
    id: "prop_desk",
    tileX,
    tileY,
    tileW: 3,
    tileH: 2,
    solid: true,
  };
}

/** Template untuk scene yang belum punya map khusus. */
const DEFAULT_ROOM: RoomData = {
  roomId: "default",
  floorTile: "tile_floor_wood",
  wallTile: "tile_wall_plaster",
  widthTiles: RUANG_LEBAR,
  heightTiles: RUANG_TINGGI,
  spawnTile: { x: 24, y: 24 },
  objects: [
    ...dindingKeliling(RUANG_LEBAR, RUANG_TINGGI),
    // Papan tulis di tengah pita atas (ukuran asli 7×3 tile).
    {
      kind: "prop",
      id: "prop_blackboard",
      tileX: 20,
      tileY: 2,
      tileW: 7,
      tileH: 3,
      solid: true,
    },
    // Dua meja menghadap papan.
    mejaSiswa(10, 12),
    mejaSiswa(20, 12),
    // Guru di depan papan (tengah atas), teman di kiri. Sengaja tidak di
    // sudut kanan-atas: area itu tertutup HUD dan dekat tepi kamera.
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 24,
      tileY: 6,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_tirta",
      tileX: 8,
      tileY: 5,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

/**
 * Lorong sekolah 60×24 tile (960×384 px): hub horizontal dengan pintu kelas di
 * pita atas dan pintu keluar di ujung kanan.
 */
const LORONG: RoomData = {
  roomId: "lorong_sekolah",
  floorTile: "tile_floor_corridor",
  wallTile: "tile_wall_plaster",
  widthTiles: 60,
  heightTiles: 24,
  spawnTile: { x: 8, y: 19 },
  objects: [
    ...dindingKeliling(60, 24),
    // Mading sekolah menempel di pita atas; dekorasi, jadi tidak solid.
    {
      kind: "prop",
      id: "prop_blackboard",
      tileX: 4,
      tileY: 1,
      tileW: 7,
      tileH: 3,
      solid: false,
    },
    // Rak di dinding kiri-atas; hanya kaki rak yang memblok.
    {
      kind: "prop",
      id: "prop_shelf",
      tileX: 12,
      tileY: 2,
      tileW: 2,
      tileH: 3,
      solid: true,
      collider: { x: 0, y: 1.5, w: 2, h: 1.5 },
    },
    // Pintu kelas A dan B di pita atas, pintu keluar di ujung kanan.
    {
      kind: "prop",
      id: "prop_door",
      tileX: 16,
      tileY: 0,
      tileW: 2,
      tileH: 2,
      solid: false,
    },
    {
      kind: "prop",
      id: "prop_door",
      tileX: 36,
      tileY: 0,
      tileW: 2,
      tileH: 2,
      solid: false,
    },
    {
      kind: "prop",
      id: "prop_door",
      tileX: 56,
      tileY: 0,
      tileW: 2,
      tileH: 2,
      solid: false,
    },
    // Pak Bima menunjuk genangan di depan kelas (sc_01_01).
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 14,
      tileY: 7,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

/**
 * Kelas A 48×28 tile (768×448 px): papan tulis di atas, meja berjajar dengan
 * lorong tengah selebar 11 tile, pintu keluar di bawah.
 */
const KELAS_A: RoomData = {
  roomId: "kelas_a",
  floorTile: "tile_floor_wood",
  wallTile: "tile_wall_plaster",
  widthTiles: RUANG_LEBAR,
  heightTiles: RUANG_TINGGI,
  spawnTile: { x: 24, y: 25 },
  objects: [
    ...dindingKeliling(RUANG_LEBAR, RUANG_TINGGI),
    {
      kind: "prop",
      id: "prop_blackboard",
      tileX: 20,
      tileY: 2,
      tileW: 7,
      tileH: 3,
      solid: true,
    },
    // Meja guru di sisi kiri papan.
    mejaSiswa(6, 5),
    // Empat pasang meja siswa, dua baris. Lorong tengah (tile 16–26) kosong.
    mejaSiswa(8, 12),
    mejaSiswa(13, 12),
    mejaSiswa(27, 12),
    mejaSiswa(32, 12),
    mejaSiswa(8, 19),
    mejaSiswa(13, 19),
    mejaSiswa(27, 19),
    mejaSiswa(32, 19),
    // Pintu keluar di pita bawah; dinding di belakangnya sudah solid.
    {
      kind: "prop",
      id: "prop_door",
      tileX: 24,
      tileY: 27,
      tileW: 2,
      tileH: 1,
      solid: false,
    },
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 23,
      tileY: 6,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_tirta",
      tileX: 10,
      tileY: 8,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

/** Collider batang pohon besar 8×8 tile: 1×2 tile di tengah bawah. */
const BATANG_POHON_BESAR = { x: 3.5, y: 6, w: 1, h: 2 } as const;

/**
 * Halaman sekolah & taman edukasi 56×34 tile (896×544 px): rumput, pagar
 * tanaman, pohon besar, semak, kolam, dan pagar kayu.
 */
const HALAMAN: RoomData = {
  roomId: "halaman_sekolah",
  floorTile: "tile_floor_grass",
  wallTile: "tile_wall_hedge",
  widthTiles: 56,
  heightTiles: 34,
  spawnTile: { x: 28, y: 30 },
  objects: [
    ...dindingKeliling(56, 34),
    // Pohon rindang dan pohon berbunga: kanopi 8×8 tile, solid hanya batang.
    {
      kind: "prop",
      id: "prop_tree_large",
      tileX: 6,
      tileY: 3,
      tileW: 8,
      tileH: 8,
      solid: true,
      collider: BATANG_POHON_BESAR,
    },
    {
      kind: "prop",
      id: "prop_tree_flower",
      tileX: 42,
      tileY: 5,
      tileW: 8,
      tileH: 8,
      solid: true,
      collider: BATANG_POHON_BESAR,
    },
    // Pohon sedang 4×4 tile, batang lebih kecil.
    {
      kind: "prop",
      id: "prop_tree_medium",
      tileX: 28,
      tileY: 4,
      tileW: 4,
      tileH: 4,
      solid: true,
      collider: { x: 1.75, y: 2.75, w: 0.75, h: 1.25 },
    },
    // Semak bertekstur dan semak bunga: padat hampir seluruh kotaknya.
    {
      kind: "prop",
      id: "prop_bush_small",
      tileX: 16,
      tileY: 10,
      tileW: 4,
      tileH: 4,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_bush_flower",
      tileX: 20,
      tileY: 12,
      tileW: 4,
      tileH: 4,
      solid: true,
    },
    // Kolam taman 6×4 tile di sisi kiri-bawah.
    {
      kind: "prop",
      id: "prop_pond",
      tileX: 8,
      tileY: 22,
      tileW: 6,
      tileH: 4,
      solid: true,
    },
    // Pagar kayu memisahkan area bawah (native 3×1 tile per segmen).
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 22,
      tileY: 24,
      tileW: 3,
      tileH: 1,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 25,
      tileY: 24,
      tileW: 3,
      tileH: 1,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 28,
      tileY: 24,
      tileW: 3,
      tileH: 1,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 34,
      tileY: 18,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_tirta",
      tileX: 16,
      tileY: 21,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

/** Semua template ruangan; dipakai juga untuk memuat aset tile/prop. */
const ROOM_PRESETS = [DEFAULT_ROOM, LORONG, KELAS_A, HALAMAN];

/**
 * Scene → ruangan. Scene yang terjadi di lokasi sama sengaja berbagi objek
 * ruangan yang sama, supaya berpindah scene tidak membangun ulang peta dan
 * tidak mengembalikan pemain ke spawn.
 */
const ROOMS_BY_SCENE = new Map<string, RoomData>([
  ["sc_01_01", LORONG],
  ["sc_01_02", KELAS_A],
  ["sc_01_03", KELAS_A],
  ["sc_03_03", HALAMAN],
]);

/**
 * Map untuk satu scene. Scene tanpa map khusus jatuh ke template `default`,
 * sama seperti aturan fallback di `resolveSceneLook()`.
 */
export function resolveRoomData(sceneId: string | null | undefined): RoomData {
  if (!sceneId) return DEFAULT_ROOM;
  return ROOMS_BY_SCENE.get(sceneId) ?? DEFAULT_ROOM;
}

/** Semua map yang terdaftar — dipakai PreloadScene untuk memuat tile/prop. */
export function listRoomAssets(): { tiles: string[]; props: string[] } {
  const rooms = ROOM_PRESETS;
  const tiles = [
    ...new Set(rooms.flatMap((room) => [room.floorTile, room.wallTile])),
  ];
  const props = [
    ...new Set(
      rooms.flatMap((room) =>
        room.objects
          .filter(
            (o): o is typeof o & { id: string } => o.kind === "prop" && !!o.id,
          )
          .map((o) => o.id),
      ),
    ),
  ];
  return { tiles, props };
}
