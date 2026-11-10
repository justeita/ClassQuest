/**
 * Peta runtime untuk fase explore (ADR 0008 + ADR 0010).
 *
 * `RoomData` (di `maps/`) adalah **sumber kebenaran** dalam tile; modul ini
 * mengonversinya ke piksel untuk Phaser. Collider `solids` dibangun dari objek
 * yang sama yang digambar — tidak ada collider yang ditulis terpisah, sehingga
 * bug "nabrak benda tak terlihat" tidak bisa muncul.
 *
 * Warna fallback (`floorColor`/`wallColor`) tetap ada untuk bila tile dari
 * manifest gagal dimuat.
 */

import { TILE_SIZE, type RoomData, type RoomObject } from "./maps/types";
import { resolveRoomData } from "./maps/roomData";
import type { Story } from "@/story/schema";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapNpc = {
  /** Id karakter dari `story.cast`, bukan id baru. */
  id: string;
  /** Titik pusat NPC dalam piksel; sprite digambar berjangkar di kaki. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomMap = {
  /** Identitas ruangan; dipakai untuk memutuskan kapan pemain perlu spawn. */
  roomId: string;
  /** Ukuran ruangan dalam piksel (kelipatan TILE_SIZE). */
  width: number;
  height: number;
  /** Tile manifest untuk lantai dan dinding; digambar sebagai tileSprite. */
  floorTile: string;
  wallTile: string;
  /** Warna fallback bila tile gagal dimuat. */
  floorColor: number;
  wallColor: number;
  /** Kaki pemain saat muncul. */
  spawn: { x: number; y: number };
  /** Collider dari objek solid (dinding, prop, NPC) dalam piksel. */
  solids: Rect[];
  npcs: MapNpc[];
};

/** Ukuran ruangan default mengikuti resolusi internal game (ADR 0009). */
export const ROOM_WIDTH = 640;
export const ROOM_HEIGHT = 360;

/** Warna fallback lama (dipakai bila tile gagal dimuat). */
const FLOOR_COLOR = 0x2b3a2f;
const WALL_COLOR = 0x4a5b4e;

/**
 * Inset collider untuk prop dan NPC: 2 px di sisi depan (bawah) supaya pemain
 * bisa berdiri rapat tanpa terlihat melayang (world-design.md § collision).
 */
const SOLID_INSET_BOTTOM = 2;

/**
 * Bangun peta runtime dari `RoomData`.
 *
 * NPC dengan id yang tidak ada di `story.cast` diganti anggota cast pertama
 * yang bukan pemain — map tidak pernah menambah karakter baru. Kalau cast
 * kosong (tidak mungkin lewat validator, tapi dijaga), NPC itu dibuang.
 */
export function buildRoomMap(data: RoomData, story: Story): RoomMap {
  const width = data.widthTiles * TILE_SIZE;
  const height = data.heightTiles * TILE_SIZE;

  const pemain = story.cast.find((member) => member.role === "player")?.id;
  const cadangan =
    story.cast.find((member) => member.id !== pemain)?.id ?? null;

  const solids: Rect[] = [];
  const npcs: MapNpc[] = [];

  for (const object of data.objects) {
    const rect = rectOf(object);
    if (object.kind === "npc") {
      const id = object.id ?? cadangan;
      const finalId = id && story.cast.some((m) => m.id === id) ? id : cadangan;
      if (!finalId) continue;
      npcs.push({
        id: finalId,
        ...pusat(object),
        width: rect.width,
        height: rect.height,
      });
    }
    if (object.kind === "wall" || object.solid) {
      solids.push(
        object.kind === "wall"
          ? rect
          : { ...rect, height: rect.height - SOLID_INSET_BOTTOM },
      );
    }
  }

  return {
    roomId: data.roomId,
    width,
    height,
    floorTile: data.floorTile,
    wallTile: data.wallTile,
    floorColor: FLOOR_COLOR,
    wallColor: WALL_COLOR,
    spawn: {
      x: data.spawnTile.x * TILE_SIZE + TILE_SIZE / 2,
      y: (data.spawnTile.y + 1) * TILE_SIZE,
    },
    solids,
    npcs,
  };
}

/** Peta runtime untuk scene aktif (menurunkan `default` bila tidak ada khusus). */
export function roomForScene(
  sceneId: string | null | undefined,
  story: Story,
): RoomMap {
  return buildRoomMap(resolveRoomData(sceneId), story);
}

/** Rect objek dalam piksel. */
function rectOf(object: RoomObject): Rect {
  return {
    x: object.tileX * TILE_SIZE,
    y: object.tileY * TILE_SIZE,
    width: object.tileW * TILE_SIZE,
    height: object.tileH * TILE_SIZE,
  };
}

/** Titik pusat objek dalam piksel — acuan zona interaksi NPC. */
function pusat(object: RoomObject): { x: number; y: number } {
  return {
    x: object.tileX * TILE_SIZE + (object.tileW * TILE_SIZE) / 2,
    y: object.tileY * TILE_SIZE + (object.tileH * TILE_SIZE) / 2,
  };
}
