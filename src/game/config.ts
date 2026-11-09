import Phaser from "phaser";

import type { Story } from "@/story/schema";

import type { GameBus } from "./gameBus";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

/** Resolusi internal 640×360, kelipatan tile 16 (ADR 0009). */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export function createGameConfig(
  parent: HTMLElement,
  story: Story,
  bus?: GameBus,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#14201a",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [new PreloadScene(story), new GameScene(story, bus)],
  };
}
