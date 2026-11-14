import type Phaser from "phaser";

/**
 * Input lanjut dialog: `Space`/`Enter`, satu tekanan = satu langkah.
 *
 * `isDown` dibaca per frame. Kalau tombol ditekan dan sudah lepas sebelum frame
 * berikutnya, ketukan itu terlewat; kalau tombol ditahan, `isDown` terus `true`
 * sehingga dialog justru berputar sendiri tiap kali jeda habis. Karena itu input
 * dibaca dari event `keydown` saja: satu tekanan fisik menghasilkan satu latch,
 * dan menahan tombol tidak menambah langkah (pola seperti OMORI — harus lepas
 * lalu tekan lagi untuk beat berikutnya).
 *
 * `Space`/`Enter` didaftarkan lewat `addKeys` supaya Phaser menekan auto-repeat:
 * `keydown-SPACE` hanya dipancarkan sekali per tekanan fisik selama
 * `key.isDown` masih `true`.
 */
export type AdvanceInput = {
  /** `true` sekali untuk tiap tekanan baru sejak pembacaan terakhir. */
  lanjutDitekan(): boolean;
  /** Buang tekanan yang belum dibaca (mis. selama tantangan memegang kendali). */
  bersihkan(): void;
  /** Lepas listener; panggil saat scene dimatikan. */
  lepas(): void;
};

export function buatInputLanjut(
  keyboard?: Phaser.Input.Keyboard.KeyboardPlugin | null,
): AdvanceInput {
  // Tanpa pendaftaran ini Phaser tidak punya `key.isDown` untuk dibandingkan,
  // jadi tiap auto-repeat akan dianggap tekanan baru.
  keyboard?.addKeys("space,enter");

  let segar = false;
  const catat = () => {
    segar = true;
  };

  keyboard?.on("keydown-SPACE", catat);
  keyboard?.on("keydown-ENTER", catat);

  return {
    lanjutDitekan() {
      const baru = segar;
      segar = false;
      return baru;
    },
    bersihkan() {
      segar = false;
    },
    lepas() {
      keyboard?.off("keydown-SPACE", catat);
      keyboard?.off("keydown-ENTER", catat);
    },
  };
}
