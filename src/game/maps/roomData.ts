/**
 * Data ruangan per scene (ADR 0010).
 *
 * Scene demo yang sudah punya map khusus: kelas (`sc_01_01`) dan halaman
 * sekolah (`sc_03_03`). Scene lain jatuh ke template `default` — pola yang
 * sama dengan `resolveSceneLook()` di `src/game/sceneAssets.ts`.
 *
 * NPC di data hanya menyebut **di mana** anggota cast berdiri; `buildRoomMap`
 * yang memetakan id ke `story.cast` dan menurunkan fallback bila id tidak
 * dikenal, sehingga map tidak pernah menambah karakter baru.
 */

import type { RoomData } from "./types";

/** Ukuran ruangan tipikal: 48×28 tile = 768×448 px, lebih luas dari layar. */
const RUANG_LEBAR = 48;
const RUANG_TINGGI = 28;

/** Keliling dinding 1 tile; pita atas 2 tile sebagai wajah ruangan. */
function dindingKeliling() {
  return [
    // Pita atas 2 tile.
    {
      kind: "wall",
      tileX: 0,
      tileY: 0,
      tileW: RUANG_LEBAR,
      tileH: 2,
      solid: true,
    },
    // Bawah, kiri, kanan 1 tile.
    {
      kind: "wall",
      tileX: 0,
      tileY: RUANG_TINGGI - 1,
      tileW: RUANG_LEBAR,
      tileH: 1,
      solid: true,
    },
    {
      kind: "wall",
      tileX: 0,
      tileY: 0,
      tileW: 1,
      tileH: RUANG_TINGGI,
      solid: true,
    },
    {
      kind: "wall",
      tileX: RUANG_LEBAR - 1,
      tileY: 0,
      tileW: 1,
      tileH: RUANG_TINGGI,
      solid: true,
    },
  ] satisfies RoomData["objects"];
}

/** Template untuk scene yang belum punya map khusus. */
const DEFAULT_ROOM: RoomData = {
  sceneId: "default",
  floorTile: "tile_floor_wood",
  wallTile: "tile_wall_plaster",
  widthTiles: RUANG_LEBAR,
  heightTiles: RUANG_TINGGI,
  spawnTile: { x: 24, y: 24 },
  objects: [
    ...dindingKeliling(),
    // Papan tulis di tengah pita atas.
    {
      kind: "prop",
      id: "prop_blackboard",
      tileX: 21,
      tileY: 2,
      tileW: 7,
      tileH: 2,
      solid: true,
    },
    // Dua meja menghadap papan.
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 10,
      tileY: 12,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 20,
      tileY: 12,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    // Guru di dekat papan, teman di kiri.
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 34,
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

/** Kelas: meja berjajar menghadap papan, guru di depan. */
const CLASSROOM: RoomData = {
  sceneId: "sc_01_01",
  floorTile: "tile_floor_wood",
  wallTile: "tile_wall_plaster",
  widthTiles: RUANG_LEBAR,
  heightTiles: RUANG_TINGGI,
  spawnTile: { x: 24, y: 25 },
  objects: [
    ...dindingKeliling(),
    {
      kind: "prop",
      id: "prop_blackboard",
      tileX: 20,
      tileY: 2,
      tileW: 8,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 8,
      tileY: 12,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 16,
      tileY: 12,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 28,
      tileY: 12,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 12,
      tileY: 19,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_desk",
      tileX: 24,
      tileY: 19,
      tileW: 3,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 36,
      tileY: 6,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_tirta",
      tileX: 10,
      tileY: 6,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

/** Halaman sekolah: rumput, pagar tanaman, pohon, dan pagar kayu. */
const SCHOOLYARD: RoomData = {
  sceneId: "sc_03_03",
  floorTile: "tile_floor_grass",
  wallTile: "tile_wall_hedge",
  widthTiles: RUANG_LEBAR,
  heightTiles: RUANG_TINGGI,
  spawnTile: { x: 24, y: 24 },
  objects: [
    ...dindingKeliling(),
    // Pohon besar sebagai penanda sudut.
    {
      kind: "prop",
      id: "prop_tree",
      tileX: 6,
      tileY: 4,
      tileW: 2,
      tileH: 3,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_tree",
      tileX: 38,
      tileY: 5,
      tileW: 2,
      tileH: 3,
      solid: true,
    },
    // Pagar kayu memisahkan area bawah.
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 4,
      tileY: 16,
      tileW: 6,
      tileH: 1,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 16,
      tileY: 16,
      tileW: 6,
      tileH: 1,
      solid: true,
    },
    {
      kind: "prop",
      id: "prop_fence",
      tileX: 28,
      tileY: 16,
      tileW: 6,
      tileH: 1,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_pak_bima",
      tileX: 42,
      tileY: 6,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
    {
      kind: "npc",
      id: "char_tirta",
      tileX: 14,
      tileY: 20,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
  ],
};

const ROOMS_BY_SCENE = new Map<string, RoomData>(
  [CLASSROOM, SCHOOLYARD].map((room) => [room.sceneId, room]),
);

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
  const rooms = [DEFAULT_ROOM, ...ROOMS_BY_SCENE.values()];
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
