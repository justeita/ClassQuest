import Phaser from "phaser";

import { createGameConfig } from "./config";
import { GameBus } from "./gameBus";
import type { GameHandle } from "./types";

export function createGame(parent: HTMLElement): GameHandle {
  const bus = new GameBus();
  const game = new Phaser.Game(createGameConfig(parent, bus));

  return {
    bus,
    destroy() {
      game.destroy(true);
    },
  };
}
