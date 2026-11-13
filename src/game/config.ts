import Phaser from "phaser";

import type { Story } from "@/story/schema";

import type { GameBus } from "./gameBus";
import { GameScene } from "./scenes/GameScene";
import { PreloadScene } from "./scenes/PreloadScene";

/** Resolusi internal 640×360 (ADR 0009). */
export { GAME_WIDTH, GAME_HEIGHT } from "./constants";

import { GAME_HEIGHT, lebarKanvas, skalaBulat } from "./constants";

/**
 * Kanvas di-upscale dengan skala bulat (`Scale.NONE` + `zoom`), bukan `FIT`.
 *
 * `FIT` menyeret kanvas ke ukuran kontainer apa pun, sehingga rasionya sering
 * pecahan (mis. 2,41×) dan piksel bergantian 2–3 px layar. Pola itu bergeser
 * saat kamera bergerak dan terbaca sebagai pixel art yang berkedip. Dengan
 * skala bulat, satu piksel internal selalu tepat beberapa piksel layar; sisa
 * ruang menjadi bar gelap yang menyatu dengan latar halaman.
 */
export function createGameConfig(
  parent: HTMLElement,
  story: Story,
  bus?: GameBus,
): Phaser.Types.Core.GameConfig {
  const skala = skalaBulat(parent.clientWidth, parent.clientHeight);
  const lebar = lebarKanvas(parent.clientWidth, skala);

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
    scene: [new PreloadScene(story), new GameScene(story, bus)],
  };
}
