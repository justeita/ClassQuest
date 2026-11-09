import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { DUMMY_ROOM, type RoomMap } from "../map";
import {
  applyMovement,
  createPlayer,
  ambilTombolGerak,
  type MovementKeys,
} from "../movement";
import type { PlayerConfig } from "../types";

/** Kecepatan pemain placeholder (piksel/detik) hingga ada pengaturan. */
const PLAYER_CONFIG: PlayerConfig = { speed: 120 };

/** Warna kotak placeholder NPC sampai sprite nyata tersedia. */
const NPC_COLOR = 0x8a9bb0;

export class GameScene extends Phaser.Scene {
  private room: RoomMap = DUMMY_ROOM;
  private player?: Phaser.GameObjects.Rectangle;
  private keys?: MovementKeys;

  constructor() {
    super("GameScene");
  }

  create() {
    this.renderRoom();

    this.player = createPlayer(this, this.room, PLAYER_CONFIG);
    this.keys = ambilTombolGerak(this);

    // Pemain tertahan oleh dinding dan objek padat ruangan.
    const wallBodies = this.physics.add.staticGroup();
    for (const wall of this.room.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height,
        this.room.wallColor,
      );
      this.physics.add.existing(rect, true);
      wallBodies.add(rect);
    }
    this.physics.add.collider(this.player, wallBodies);
  }

  update() {
    if (this.player) {
      applyMovement(this.player, this.keys);
    }
  }

  /** Lantai satu warna placeholder; diganti tileset nyata dari manifest nanti. */
  private renderRoom() {
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        this.room.floorColor,
      )
      .setDepth(-1);

    // NPC placeholder: kotak statis, tanpa interaksi dulu (PR berikutnya).
    for (const npc of this.room.npcs) {
      this.add.rectangle(npc.x, npc.y, npc.width, npc.height, NPC_COLOR);
    }
  }
}
