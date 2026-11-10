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

/** Delapan arah hadap: empat arah utama + empat diagonal. */
export type ArahGerak =
  | "down"
  | "up"
  | "left"
  | "right"
  | "down-left"
  | "down-right"
  | "up-left"
  | "up-right";

/**
 * Layout sheet karakter 24×32 (18 frame, generator `scripts/lib/characters.mjs`):
 * 0–1 idle menghadap kamera, lalu 2 frame jalan untuk 8 arah. `diam` adalah
 * frame berdiri per arah non-kamera — pemain yang berhenti menghadap samping
 * atau diagonal tidak berbalik ke depan (world-design.md § Sprite karakter).
 */
export const FRAME_ANIMASI = {
  idle: { start: 0, end: 1 },
  jalan: {
    down: [2, 3],
    up: [4, 5],
    left: [6, 7],
    right: [8, 9],
    "down-left": [10, 11],
    "down-right": [12, 13],
    "up-left": [14, 15],
    "up-right": [16, 17],
  },
  diam: {
    up: 4,
    left: 6,
    right: 8,
    "down-left": 10,
    "down-right": 12,
    "up-left": 14,
    "up-right": 16,
  },
} as const;

/**
 * Arah hadap dari tombol yang sedang ditekan. Diagonal dihitung dari kombinasi
 * horizontal + vertikal; `null` bila tidak ada tombol gerak.
 */
export function arahGerak(keys?: MovementKeys): ArahGerak | null {
  const kiri = keys?.left.some((key) => key.isDown) ?? false;
  const kanan = keys?.right.some((key) => key.isDown) ?? false;
  const atas = keys?.up.some((key) => key.isDown) ?? false;
  const bawah = keys?.down.some((key) => key.isDown) ?? false;

  const horizontal = kiri ? "left" : kanan ? "right" : null;
  const vertikal = atas ? "up" : bawah ? "down" : null;

  if (horizontal && vertikal) {
    return `${vertikal}-${horizontal}` as ArahGerak;
  }
  return horizontal ?? vertikal;
}

/** Vektor gerak dari tombol; diagonal dinormalisasi agar kecepatannya sama. */
function vektorGerak(keys?: MovementKeys): { vx: number; vy: number } {
  const arah = arahGerak(keys);
  if (!arah) return { vx: 0, vy: 0 };

  const horizontal = arah.endsWith("left")
    ? -1
    : arah.endsWith("right")
      ? 1
      : 0;
  const vertikal = arah.startsWith("up") ? -1 : arah.startsWith("down") ? 1 : 0;
  const diagonal = horizontal !== 0 && vertikal !== 0 ? Math.SQRT1_2 : 1;

  return { vx: horizontal * diagonal, vy: vertikal * diagonal };
}

export function ambilTombolGerak(
  scene: Phaser.Scene,
): MovementKeys | undefined {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return undefined;

  // Nonaktifkan global capture agar input teks HTML (DOM) tidak diblokir oleh Phaser
  keyboard.disableGlobalCapture();

  const wasd = keyboard.addKeys("W,A,S,D") as Record<
    "W" | "A" | "S" | "D",
    Phaser.Input.Keyboard.Key
  >;
  const panah = keyboard.addKeys("up,down,left,right") as Record<
    "up" | "down" | "left" | "right",
    Phaser.Input.Keyboard.Key
  >;

  // Bersihkan capture browser agar pengetikan huruf W, A, S, D di DOM berjalan normal
  keyboard.clearCaptures();

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

  const { vx, vy } = vektorGerak(keys);
  body.setVelocity(vx * speed, vy * speed);
}
