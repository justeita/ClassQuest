import Phaser from "phaser";

import { createGameConfig } from "./config";
import type { GameHandle } from "./types";

export function createGame(parent: HTMLElement): GameHandle {
  const game = new Phaser.Game(createGameConfig(parent));

  return {
    destroy() {
      game.destroy(true);
    },
  };
}
