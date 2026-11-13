import Phaser from "phaser";

import type { Story } from "@/story/schema";

import type { GameBus } from "./gameBus";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

/** Resolusi internal 640×360 (ADR 0009). */
export { GAME_WIDTH, GAME_HEIGHT } from "./constants";

import { GAME_HEIGHT, lebarInternal } from "./constants";

export function createGameConfig(
  parent: HTMLElement,
  story: Story,
  bus?: GameBus,
): Phaser.Types.Core.GameConfig {
  const lebar = lebarInternal(
    parent.clientHeight > 0 ? parent.clientWidth / parent.clientHeight : 16 / 9,
  );

  return {
    type: Phaser.AUTO,
    parent,
    width: lebar,
    height: GAME_HEIGHT,
    backgroundColor: "#14201a",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new PreloadScene(story), new GameScene(story, bus)],
  };
}
