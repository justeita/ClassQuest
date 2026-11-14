import Phaser from "phaser";

import type { Story } from "@/story/schema";

import type { GameBus } from "./gameBus";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

/** Resolusi internal 640×360 (ADR 0009). */
export { GAME_WIDTH, GAME_HEIGHT } from "./constants";

import { GAME_HEIGHT, ukuranKanvas } from "./constants";

/**
 * Kanvas diskalakan sendiri lewat `Scale.NONE` + `zoom`.
 *
 * `ukuranKanvas()` memilih skala **bulat** saat sisa ruangnya tipis (pixel art
 * paling tajam) dan skala **penuh** saat tidak — supaya game tidak jadi strip
 * kecil dengan bar gelap besar di layar pendek. Lebar internal ikut dihitung
 * supaya kanvas mengisi bingkai, bukan cuma rasio 16:9 tetap.
 */
export function createGameConfig(
  parent: HTMLElement,
  story: Story,
  bus?: GameBus,
): Phaser.Types.Core.GameConfig {
  const { skala, lebar } = ukuranKanvas(
    parent.clientWidth,
    parent.clientHeight,
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
      mode: Phaser.Scale.NONE,
      zoom: skala,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new PreloadScene(story, bus), new GameScene(story, bus)],
  };
}
