/**
 * Data map dummy untuk fase explore (ADR 0008).
 *
 * Sengaja didefinisikan di sisi game dan tidak mengubah kontrak Story JSON:
 * ruangan diambil per scene lewat id sederhana. Saat tileset nyata tersedia
 * dari manifest, bentuk data ini yang tinggal diganti — pemanggil
 * (GameScene) tidak perlu refactor.
 */

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapNpc = {
  /** Id karakter dari `story.cast`, bukan id baru. */
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomMap = {
  /** Saat ini id scene dari Story; nanti dipetakan lewat backgroundId. */
  sceneId: string;
  width: number;
  height: number;
  floorColor: number;
  wallColor: number;
  spawn: { x: number; y: number };
  walls: Rect[];
  npcs: MapNpc[];
};

/** Ukuran ruangan default mengikuti resolusi internal game (ADR 0009). */
export const ROOM_WIDTH = 640;
export const ROOM_HEIGHT = 360;

/** Ketebalan dinding keliling ruangan. */
export const WALL_THICKNESS = 8;

/**
 * Ruangan dummy satu layar: dinding keliling, satu meja, dan Pak Bima di
 * kanan atas. Nilai warna placeholder sampai aset nyata tersedia.
 */
export const DUMMY_ROOM: RoomMap = {
  sceneId: "sc_01_01",
  width: ROOM_WIDTH,
  height: ROOM_HEIGHT,
  floorColor: 0x2b3a2f,
  wallColor: 0x4a5b4e,
  spawn: { x: 80, y: 268 },
  walls: [
    // Dinding keliling.
    { x: 0, y: 0, width: ROOM_WIDTH, height: WALL_THICKNESS },
    {
      x: 0,
      y: ROOM_HEIGHT - WALL_THICKNESS,
      width: ROOM_WIDTH,
      height: WALL_THICKNESS,
    },
    { x: 0, y: 0, width: WALL_THICKNESS, height: ROOM_HEIGHT },
    {
      x: ROOM_WIDTH - WALL_THICKNESS,
      y: 0,
      width: WALL_THICKNESS,
      height: ROOM_HEIGHT,
    },
    // Objek padat: meja kelas 6×3 tile.
    { x: 224, y: 160, width: 96, height: 48 },
  ],
  npcs: [
    { id: "char_pak_bima", x: 480, y: 200, width: 24, height: 32 },
    { id: "char_tirta", x: 160, y: 96, width: 24, height: 32 },
  ],
};
