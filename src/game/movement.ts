import Phaser from "phaser";

import type { PlayerConfig } from "./types";
import type { RoomMap } from "./map";
import { DEFAULT_CHARACTER_ID } from "./sceneAssets";

/**
 * Gerak pemain top-down 4 arah (ADR 0008): arcade physics dengan gravitasi 0,
 * velocity dari keyboard. Sprite memakai `spriteId` dari cerita; bila texture
 * tidak ada, jatuh ke `char_default` tanpa menghentikan permainan.
 */

/**
 * Kotak tabrakan kecil di kaki sprite 24×32, bukan seluruh badan
 * (world-design.md § Objek dan collision).
 */
export const PLAYER_BODY_WIDTH = 12;
export const PLAYER_BODY_HEIGHT = 8;
export const PLAYER_NAMA = "player";

const FRAME_WIDTH = 24;
const FRAME_HEIGHT = 32;

/** Tombol gerak: tiap arah bisa dipicu beberapa tombol (panah + WASD). */
export type MovementKeys = Record<
  "left" | "right" | "up" | "down",
  Phaser.Input.Keyboard.Key[]
>;

export type ArahGerak = "left" | "right" | "up" | "down";

/**
 * Layout sheet karakter 24×32 (10 frame, generator `scripts/lib/characters.mjs`):
 * 0–1 idle menghadap kamera, lalu 2 frame jalan per arah. `diam` adalah frame
 * berdiri per arah non-kamera — pemain yang berhenti menghadap samping tidak
 * berbalik ke depan (world-design.md § Sprite karakter).
 */
export const FRAME_ANIMASI = {
  idle: { start: 0, end: 1 },
  jalan: { down: [2, 3], up: [4, 5], left: [6, 7], right: [8, 9] },
  diam: { up: 4, left: 6, right: 8 },
} as const;

/** Arah yang sedang ditekan; `null` bila tidak ada tombol gerak. */
export function arahGerak(keys?: MovementKeys): ArahGerak | null {
  if (keys?.left.some((key) => key.isDown)) return "left";
  if (keys?.right.some((key) => key.isDown)) return "right";
  if (keys?.up.some((key) => key.isDown)) return "up";
  if (keys?.down.some((key) => key.isDown)) return "down";
  return null;
}

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

  const arah = arahGerak(keys);

  let vx = 0;
  let vy = 0;
  if (arah === "left") vx -= speed;
  if (arah === "right") vx += speed;
  if (arah === "up") vy -= speed;
  if (arah === "down") vy += speed;

  if (vx !== 0 && vy !== 0) {
    // 1 / sqrt(2): diagonal tetap bergerak secepat gerak lurus.
    const diagonal = Math.SQRT1_2;
    vx *= diagonal;
    vy *= diagonal;
  }

  body.setVelocity(vx, vy);
}
