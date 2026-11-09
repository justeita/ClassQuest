import Phaser from "phaser";

import type { Story } from "@/story/schema";

import { createGameConfig } from "./config";
import { GameBus } from "./gameBus";
import type { GameHandle } from "./types";

/**
 * Nyalakan Phaser untuk satu cerita. Cerita diberikan pemanggil (halaman
 * siswa atau halaman dev) — scene tidak lagi memuat fixture sendiri.
 */
export function createGame(parent: HTMLElement, story: Story): GameHandle {
  const bus = new GameBus();
  const game = new Phaser.Game(createGameConfig(parent, story, bus));

  return {
    bus,
    destroy() {
      game.destroy(true);
    },
  };
}
