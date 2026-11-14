import Phaser from "phaser";

import { WORLD } from "@/assets/manifest";
import type { Story } from "@/story/schema";

import type { GameBus } from "../gameBus";
import { collectStoryAssets } from "../sceneAssets";

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
 * Scene ini **tidak menggambar apa pun** ke canvas: progres dan judul cerita
 * ditampilkan `LoadingScreen` (DOM) supaya tajam dan bisa dipakai dengan
 * pembaca layar. Yang dikirim ke React hanya angka progres lewat bus.
 */
export class PreloadScene extends Phaser.Scene {
  private readonly story: Story;
  private readonly bus?: GameBus;

  constructor(story: Story, bus?: GameBus) {
    super("PreloadScene");
    this.story = story;
    this.bus = bus;
  }

  preload() {
    // 0% dikirim lebih dulu supaya layar muat langsung berubah dari keadaan
    // "menyiapkan" (tanpa angka) ke bilah progres yang terukur.
    this.bus?.emit({ type: "loading", progress: 0 });

    this.load.on("progress", (nilai: number) => {
      this.bus?.emit({ type: "loading", progress: nilai });
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
