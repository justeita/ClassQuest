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

/** Ukuran ruangan mengikuti resolusi internal game. */
export const ROOM_WIDTH = 480;
export const ROOM_HEIGHT = 270;

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
  spawn: { x: 60, y: 200 },
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
    // Objek padat: meja kelas.
    { x: 170, y: 120, width: 96, height: 40 },
  ],
  npcs: [
    { id: "char_pak_bima", x: 360, y: 150, width: 24, height: 40 },
    { id: "char_tirta", x: 120, y: 70, width: 24, height: 40 },
  ],
};
