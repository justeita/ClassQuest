import Phaser from "phaser";

import type { PlayerConfig } from "./types";
import type { RoomMap } from "./map";
import { DEFAULT_CHARACTER_ID } from "./sceneAssets";

/**
 * Gerak pemain top-down 4 arah (ADR 0008): arcade physics dengan gravitasi 0,
 * velocity dari keyboard. Sprite memakai `spriteId` dari cerita; bila texture
 * tidak ada, jatuh ke `char_default` tanpa menghentikan permainan.
 */

/** Kotak tabrakan kecil di kaki sprite 48×72, bukan seluruh badan. */
export const PLAYER_BODY_WIDTH = 20;
export const PLAYER_BODY_HEIGHT = 16;
export const PLAYER_NAMA = "player";

const FRAME_WIDTH = 48;
const FRAME_HEIGHT = 72;

/** Tombol gerak: tiap arah bisa dipicu beberapa tombol (panah + WASD). */
export type MovementKeys = Record<
  "left" | "right" | "up" | "down",
  Phaser.Input.Keyboard.Key[]
>;

export function ambilTombolGerak(
  scene: Phaser.Scene,
): MovementKeys | undefined {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return undefined;

  const wasd = keyboard.addKeys("W,A,S,D") as Record<
    "W" | "A" | "S" | "D",
    Phaser.Input.Keyboard.Key
  >;
  const panah = keyboard.addKeys("up,down,left,right") as Record<
    "up" | "down" | "left" | "right",
    Phaser.Input.Keyboard.Key
  >;

  return {
    left: [wasd.A, panah.left],
    right: [wasd.D, panah.right],
    up: [wasd.W, panah.up],
    down: [wasd.S, panah.down],
  };
}

export function createPlayer(
  scene: Phaser.Scene,
  map: RoomMap,
  config: PlayerConfig,
  spriteId: string = DEFAULT_CHARACTER_ID,
): Phaser.Physics.Arcade.Sprite {
  const key = scene.textures.exists(spriteId) ? spriteId : DEFAULT_CHARACTER_ID;
  const player = scene.physics.add.sprite(map.spawn.x, map.spawn.y, key, 0);

  // Kaki di titik spawn; tabrakan hanya area kaki agar pemain bisa berdiri
  // dekat dinding tanpa badan sprite menembus latar.
  player.setOrigin(0.5, 1);
  const body = player.body as Phaser.Physics.Arcade.Body;
  body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
  body.setOffset(
    (FRAME_WIDTH - PLAYER_BODY_WIDTH) / 2,
    FRAME_HEIGHT - PLAYER_BODY_HEIGHT,
  );
  body.setCollideWorldBounds(true);

  // Konfigurasi tersimpan di sprite agar update tidak butuh parameter tambahan.
  player.setData("speed", config.speed);

  return player;
}

/**
 * Set velocity pemain dari tombol yang ditekan. Gerak 4 arah: diagonal
 * dinormalisasi supaya kecepatannya sama dengan gerak lurus.
 */
export function applyMovement(
  player: Phaser.Physics.Arcade.Sprite,
  keys: MovementKeys | undefined,
): void {
  const body = player.body as Phaser.Physics.Arcade.Body;
  const speed = (player.getData("speed") as number) ?? 0;

  const kiri = keys?.left.some((key) => key.isDown) ?? false;
  const kanan = keys?.right.some((key) => key.isDown) ?? false;
  const atas = keys?.up.some((key) => key.isDown) ?? false;
  const bawah = keys?.down.some((key) => key.isDown) ?? false;

  let vx = 0;
  let vy = 0;
  if (kiri) vx -= speed;
  if (kanan) vx += speed;
  if (atas) vy -= speed;
  if (bawah) vy += speed;

  if (vx !== 0 && vy !== 0) {
    // 1 / sqrt(2): diagonal tetap bergerak secepat gerak lurus.
    const diagonal = Math.SQRT1_2;
    vx *= diagonal;
    vy *= diagonal;
  }

  body.setVelocity(vx, vy);
}
