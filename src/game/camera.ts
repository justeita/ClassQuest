/**
 * Keputusan kamera per ruangan (world-design.md § Kamera, ADR 0010).
 *
 * Modul murni supaya keputusannya bisa dites tanpa Phaser. GameScene yang
 * menerapkannya lewat `setBounds`, `startFollow`, `setDeadzone`, dan
 * `centerOn`.
 */

import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "./constants";

/** Ukuran ruangan dalam tile (bukan piksel) — bentuknya dari `RoomData`. */
export type RoomSizeTiles = { widthTiles: number; heightTiles: number };

/** Dead zone: kamera diam selama pemain masih di dalam kotak 8×6 tile. */
export const DEADZONE_TILES = { width: 8, height: 6 };

/** Pergerakan kamera halus, tidak menempel kaku (world-design.md § Kamera). */
export const CAMERA_LERP = 0.12;

export type CameraMode = "lock" | "follow";

/**
 * Ruangan yang muat satu layar dikunci ke tengah; ruangan lebih luas dari
 * layar mengikuti pemain dengan batas map.
 */
export function kameraMode(room: RoomSizeTiles): CameraMode {
  const width = room.widthTiles * TILE_SIZE;
  const height = room.heightTiles * TILE_SIZE;
  return width <= GAME_WIDTH && height <= GAME_HEIGHT ? "lock" : "follow";
}

/** Dead zone dalam piksel, untuk `cameras.main.setDeadzone`. */
export function deadzonePx(): { width: number; height: number } {
  return {
    width: DEADZONE_TILES.width * TILE_SIZE,
    height: DEADZONE_TILES.height * TILE_SIZE,
  };
}
