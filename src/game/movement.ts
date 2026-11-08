import Phaser from "phaser";

import type { PlayerConfig } from "./types";
import type { RoomMap } from "./map";

/**
 * Gerak pemain top-down 4 arah (ADR 0008): arcade physics dengan gravitasi 0,
 * velocity dari keyboard. Sprite placeholder berupa kotak berwarna sampai
 * sprite karakter nyata tersedia dari manifest.
 */

export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 40;
export const PLAYER_COLOR = 0xf2f2f2;
export const PLAYER_NAMA = "player";

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
): Phaser.GameObjects.Rectangle {
  const player = scene.add.rectangle(
    map.spawn.x,
    map.spawn.y,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    PLAYER_COLOR,
  );
  scene.physics.add.existing(player);

  const body = player.body as Phaser.Physics.Arcade.Body;
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
  player: Phaser.GameObjects.Rectangle,
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
