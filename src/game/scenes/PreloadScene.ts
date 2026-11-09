import Phaser from "phaser";

import type { Story } from "@/story/schema";

import { collectStoryAssets } from "../sceneAssets";

/** Ukuran satu frame spritesheet karakter (docs/07-assets/asset-guide.md). */
export const SPRITE_FRAME_WIDTH = 24;
export const SPRITE_FRAME_HEIGHT = 32;

/**
 * Muat hanya aset yang dipakai cerita ini. Semua key loader memakai `id`
 * manifest, jadi scene tidak pernah menebak path file.
 *
 * `create()` langsung menyerahkan kendali ke `GameScene`; layar loading React
 * belum ada, jadi teks progres kecil digambar di canvas.
 */
export class PreloadScene extends Phaser.Scene {
  private readonly story: Story;

  constructor(story: Story) {
    super("PreloadScene");
    this.story = story;
  }

  preload() {
    const label = this.add
      .text(240, 135, "Memuat… 0%", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#F7F4EC",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.load.on("progress", (nilai: number) => {
      label.setText(`Memuat… ${Math.round(nilai * 100)}%`);
    });

    for (const asset of collectStoryAssets(this.story)) {
      if (asset.kind === "character") {
        this.load.spritesheet(asset.id, asset.path, {
          frameWidth: SPRITE_FRAME_WIDTH,
          frameHeight: SPRITE_FRAME_HEIGHT,
        });
        if (asset.portraitPath) {
          this.load.image(`${asset.id}:portrait`, asset.portraitPath);
        }
      } else if (asset.kind === "music" || asset.kind === "sfx") {
        this.load.audio(asset.id, asset.path);
      } else {
        this.load.image(asset.id, asset.path);
      }
    }
  }

  create() {
    this.scene.start("GameScene");
  }
}
