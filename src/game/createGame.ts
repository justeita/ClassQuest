import Phaser from "phaser";

import type { Story } from "@/story/schema";

import { createGameConfig } from "./config";
import { GAME_HEIGHT, ukuranKanvas } from "./constants";
import { GameBus } from "./gameBus";
import type { GameHandle } from "./types";

/**
 * Nyalakan Phaser untuk satu cerita. Cerita diberikan pemanggil (halaman
 * siswa atau halaman dev) — scene tidak lagi memuat fixture sendiri.
 */
export function createGame(parent: HTMLElement, story: Story): GameHandle {
  const bus = new GameBus();
  const game = new Phaser.Game(createGameConfig(parent, story, bus));

  /**
   * Mode `Scale.NONE` tidak menyesuaikan diri sendiri seperti `FIT`: setelah
   * jendela berubah ukuran, skala dan lebar internal dihitung ulang di sini.
   * Kamera scene ikut menyesuaikan lewat `CameraManager` Phaser.
   */
  const aturUkuran = () => {
    const { skala, lebar } = ukuranKanvas(
      parent.clientWidth,
      parent.clientHeight,
    );
    game.scale.setZoom(skala);
    game.scale.resize(lebar, GAME_HEIGHT);
  };
  window.addEventListener("resize", aturUkuran);

  /**
   * Tata letak sentuh mengubah ukuran kontainer tanpa memicu `resize` jendela
   * (mis. panggung game menyusut saat dek kontrol muncul di bawahnya).
   * `ResizeObserver` menangkap itu, jadi kanvas selalu pas dengan bingkainya.
   */
  const pengamatUkuran =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => aturUkuran());
  pengamatUkuran?.observe(parent);

  return {
    bus,
    destroy() {
      window.removeEventListener("resize", aturUkuran);
      pengamatUkuran?.disconnect();
      game.destroy(true);
    },
  };
}
