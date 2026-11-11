/**
 * Data ruangan per scene (ADR 0010).
 *
 * Scene demo yang sudah punya map khusus: lorong sekolah (`sc_01_01`), kelas
 * (`sc_01_02`, `sc_01_03`), dan halaman sekolah (`sc_02_*`, `sc_03_*`). Scene
 * lain jatuh ke template `default` — pola yang sama dengan `resolveSceneLook()`
 * di `src/game/sceneAssets.ts`.
 *
 * Ukuran `tileW`/`tileH` prop mengikuti ukuran PNG aslinya (16 px per tile),
 * karena `renderProp()` memakai kotak itu sebagai jangkar gambar. Prop besar
 * seperti pohon memakai `collider` sub-area (ADR 0011) supaya pemain bisa
 * berjalan di bawah kanopi.
 *
 * Ruangan boleh menggambar dirinya dari satu gambar peta penuh lewat `mapImage`
 * (ADR 0012). Di sana lantai, dinding, dan prop tidak digambar dari data:
 * `zone` menjadi collider di posisi visual yang sudah menyatu di gambar, dan
 * hanya NPC yang tetap berupa sprite.
 *
 * NPC di data hanya menyebut **di mana** anggota cast berdiri; `buildRoomMap`
 * yang memetakan id ke `story.cast` dan menurunkan fallback bila id tidak
 * dikenal, sehingga map tidak pernah menambah karakter baru.
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
    // Rani dan Pak Bima berhenti di depan genangan (sc_01_01). Rani yang
    // menyapa lebih dulu, jadi ia pemberi quest untuk scene itu.
    {
      kind: "npc",
      id: "char_rani",
      tileX: 10,
      tileY: 9,
      tileW: 1,
      tileH: 2,
      solid: true,
    },
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

/**
 * Zona collider tanpa gambar (ADR 0012). Dipakai ruangan bergambar penuh: visual
 * sudah menyatu di gambar peta, jadi objek di sini hanya menandai area padat.
 */
function zona(
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
): RoomObject {
  return { kind: "zone", tileX, tileY, tileW, tileH, solid: true };
}

/**
 * Zona di pangkal sebuah prop. `cx` kolom tengah dan `base` baris dasar tempat
 * prop dijahit di gambar peta (berjangkar dasar-tengah, `scripts/compose-map.mjs`),
 * jadi collider ikut bergeser kalau posisinya diubah — bukan angka lepas.
 */
function zonaPangkal(
  cx: number,
  base: number,
  tileW: number,
  tileH: number,
): RoomObject {
  return zona(cx - tileW / 2, base + 1 - tileH, tileW, tileH);
}

/** Pangkal pohon 1×1 tile: pemain bisa lewat di bawah kanopi, tertahan di batang. */
const pohonPeta = (cx: number, base: number) => zonaPangkal(cx, base, 1, 1);

/** Pangkal semak 1.5×1 tile. */
const semakPeta = (cx: number, base: number) => zonaPangkal(cx, base, 1.5, 1);

/** Kolom tengah pohon di gambar peta (TREE_SPOTS `compose-map.mjs`). */
const POHON_PETA: ReadonlyArray<readonly [number, number]> = [
  [4, 4],
  [12, 4],
  [20, 4],
  [36, 4],
  [44, 5],
  [51, 6],
  [3, 13],
  [52, 14],
  [4, 26],
  [52, 27],
  [15, 32],
  [40, 32],
  [10, 32],
  [46, 32],
];

/** Posisi semak di gambar peta (BUSH_SPOTS `compose-map.mjs`). */
const SEMAK_PETA: ReadonlyArray<readonly [number, number]> = [
  [16, 3],
  [24, 3],
  [32, 3],
  [48, 3],
  [2, 19],
  [53, 21],
  [16, 32],
  [42, 32],
  [30, 30],
  [34, 22],
];

/**
 * Halaman sekolah & taman edukasi 56×34 tile (896×544 px). Digambar dari satu
 * gambar peta penuh `map_halaman_sekolah` (ADR 0012), jadi objek di bawah bukan
 * sprite melainkan collider (`zone`) dan NPC. Pangkal tiap zona mengikuti posisi
 * di `scripts/compose-map.mjs`.
 */
const HALAMAN: RoomData = {
  roomId: "halaman_sekolah",
  floorTile: "tile_floor_grass",
  wallTile: "tile_wall_hedge",
  mapImage: "map_halaman_sekolah",
  widthTiles: 56,
  heightTiles: 34,
  spawnTile: { x: 28, y: 30 },
  objects: [
    // Dinding keliling: di gambar peta tepinya sudah rumput + pohon, jadi tidak
    // terlihat, tetapi tetap jadi pembatas dunia.
    ...dindingKeliling(56, 34),
    // Kolam taman (airnya saja; pasir di sekeliling tetap bisa diinjak).
    zona(7, 22, 8, 7),
    // Dua petak bunga di kanan-kiri jalan bawah.
    zona(19, 26, 5, 5),
    zona(32, 26, 5, 5),
    // Pepohonan dan semak di sepanjang tepi.
    ...POHON_PETA.map(([cx, base]) => pohonPeta(cx, base)),
    ...SEMAK_PETA.map(([cx, base]) => semakPeta(cx, base)),
    // Perabot taman yang menonjol.
    zonaPangkal(20, 19, 1, 1), // bangku kiri
    zonaPangkal(36, 19, 1, 1), // bangku kanan
    zonaPangkal(45, 21, 2, 1.5), // sumur
    zonaPangkal(11, 12, 2.5, 1), // papan pengumuman
    // Tiang lampu, papan petunjuk, tong, dan keranjang: collider tipis.
    zonaPangkal(22, 21, 0.5, 1),
    zonaPangkal(34, 21, 0.5, 1),
    zonaPangkal(24, 31, 1.5, 1),
    zonaPangkal(40, 21, 1.5, 1),
    zonaPangkal(17, 13, 1, 1),
    zonaPangkal(19, 13, 1.5, 1),
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
    {
      kind: "npc",
      id: "char_rani",
      tileX: 30,
      tileY: 20,
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
  ["sc_02_01", HALAMAN],
  ["sc_02_02", HALAMAN],
  ["sc_02_03", HALAMAN],
  ["sc_03_01", HALAMAN],
  ["sc_03_02", HALAMAN],
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

/** Semua aset ruangan yang terdaftar — dipakai PreloadScene untuk memuatnya. */
export function listRoomAssets(): {
  tiles: string[];
  props: string[];
  maps: string[];
} {
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
  const maps = [
    ...new Set(
      rooms
        .map((room) => room.mapImage)
        .filter((id): id is string => id !== undefined),
    ),
  ];
  return { tiles, props, maps };
}
