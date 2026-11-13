import Phaser from "phaser";

import { WORLD } from "@/assets/manifest";
import type { Story } from "@/story/schema";

import { collectStoryAssets } from "../sceneAssets";
import { fontGame } from "../font";
import { teksTajam } from "../text";

/** Dipakai hanya bila entri karakter lupa mengisi ukuran frame. */
const FRAME_WIDTH_DEFAULT = 24;
const FRAME_HEIGHT_DEFAULT = 32;

/**
 * Muat hanya aset yang dipakai cerita ini, ditambah seluruh aset dunia desa.
 * Semua key loader memakai `id` manifest, jadi scene tidak pernah menebak path
 * file.
 *
 * Spritesheet karakter memakai `frameWidth`/`frameHeight` dari manifest karena
 * tiap karakter desa punya lebar frame sendiri.
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
    const label = teksTajam(
      this.add
        .text(320, 180, "Memuat... 0%", {
          fontFamily: fontGame(),
          fontSize: "14px",
          color: "#F7F4EC",
        })
        .setOrigin(0.5),
    ).setDepth(1000);

    this.load.on("progress", (nilai: number) => {
      label.setText(`Memuat... ${Math.round(nilai * 100)}%`);
    });

    // Dunia desa: satu gambar peta dan potongan objeknya. Tidak dirujuk cerita,
    // jadi dimuat langsung dari manifest (bukan `collectStoryAssets`).
    for (const asset of WORLD) {
      if (!this.textures.exists(asset.id))
        this.load.image(asset.id, asset.path);
    }

    for (const asset of collectStoryAssets(this.story)) {
      if (asset.kind === "character") {
        this.load.spritesheet(asset.id, asset.path, {
          frameWidth: asset.frameWidth ?? FRAME_WIDTH_DEFAULT,
          frameHeight: asset.frameHeight ?? FRAME_HEIGHT_DEFAULT,
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
