import Phaser from "phaser";

import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export function createGameConfig(
  parent: HTMLElement,
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
    scene: [PreloadScene, GameScene],
  };
}
