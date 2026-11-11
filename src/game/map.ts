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
  /** Dinding yang sudah disesuaikan lebarnya; dipakai untuk menggambar. */
  walls: Rect[];
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
export function buildRoomMap(
  data: RoomData,
  story: Story,
  /** Lebar minimum dalam tile (mis. selebar viewport). 0 = pakai data apa adanya. */
  minWidthTiles = 0,
): RoomMap {
  // Ruangan dilebarkan sampai minimal selebar layar supaya lantai dan dinding
  // kanan selalu menutup tepi viewport (lebar internal ikut rasio layar).
  const widthTiles = Math.max(data.widthTiles, Math.ceil(minWidthTiles));
  const width = widthTiles * TILE_SIZE;
  const height = data.heightTiles * TILE_SIZE;

  const pemain = story.cast.find((member) => member.role === "player")?.id;
  const cadangan =
    story.cast.find((member) => member.id !== pemain)?.id ?? null;

  const solids: Rect[] = [];
  const walls: Rect[] = [];
  const npcs: MapNpc[] = [];

  for (const object of data.objects) {
    // Dinding keliling ikut melebar: dinding atas/bawah yang menutup seluruh
    // lebar ruangan diperpanjang, dan dinding kanan digeser ke tepi baru.
    const objectLebar =
      object.kind === "wall" &&
      object.tileX === 0 &&
      object.tileW === data.widthTiles &&
      object.tileH !== data.heightTiles
        ? { ...object, tileW: widthTiles }
        : object.kind === "wall" &&
            object.tileX === data.widthTiles - 1 &&
            object.tileW === 1 &&
            object.tileH === data.heightTiles
          ? { ...object, tileX: widthTiles - 1 }
          : object;

    const rect = rectOf(objectLebar);
    if (objectLebar.kind === "npc") {
      const id = objectLebar.id ?? cadangan;
      const finalId = id && story.cast.some((m) => m.id === id) ? id : cadangan;
      if (!finalId) continue;
      npcs.push({
        id: finalId,
        ...pusat(objectLebar),
        width: rect.width,
        height: rect.height,
      });
    }
    if (objectLebar.kind === "wall") {
      walls.push(rect);
      solids.push(rect);
    } else if (objectLebar.solid) {
      solids.push(colliderOf(objectLebar));
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
    walls,
    npcs,
  };
}

/** Peta runtime untuk scene aktif (menurunkan `default` bila tidak ada khusus). */
export function roomForScene(
  sceneId: string | null | undefined,
  story: Story,
  minWidthTiles = 0,
): RoomMap {
  return buildRoomMap(resolveRoomData(sceneId), story, minWidthTiles);
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

/**
 * Collider objek solid dalam piksel.
 *
 * Prop tanpa `collider` memakai kotak penuh dikurangi 2 px di sisi depan
 * (world-design.md § collision). Prop besar seperti pohon memakai sub-area dari
 * `collider` apa adanya, supaya pemain bisa berjalan di bawah kanopi tapi tetap
 * tertahan di batang (ADR 0011).
 */
function colliderOf(object: RoomObject): Rect {
  const area = object.collider;
  if (!area) {
    const rect = rectOf(object);
    return { ...rect, height: rect.height - SOLID_INSET_BOTTOM };
  }
  return {
    x: (object.tileX + area.x) * TILE_SIZE,
    y: (object.tileY + area.y) * TILE_SIZE,
    width: area.w * TILE_SIZE,
    height: area.h * TILE_SIZE,
  };
}

/** Titik pusat objek dalam piksel — acuan zona interaksi NPC. */
function pusat(object: RoomObject): { x: number; y: number } {
  return {
    x: object.tileX * TILE_SIZE + (object.tileW * TILE_SIZE) / 2,
    y: object.tileY * TILE_SIZE + (object.tileH * TILE_SIZE) / 2,
  };
}
