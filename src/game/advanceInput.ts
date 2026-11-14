import type Phaser from "phaser";

/**
 * Input lanjut dialog: `Space`/`Enter`.
 *
 * `isDown` (dan juga `JustDown`) dibaca per frame. Kalau tombol ditekan dan
 * sudah lepas sebelum frame berikutnya, keduanya sudah kembali `false` dan
 * ketukan itu hilang. Tekanan manusia normal bertahan jauh lebih lama dari satu
 * frame, jadi ini jarang terasa saat dimainkan — tetapi menggagalkan auto-test
 * yang mengirim `keydown` lalu `keyup` beruntun.
 *
 * Karena itu tiap `keydown` Phaser (yang dipancarkan sinkron, sebelum
 * `update()` scene dijalankan) juga menyalakan latch `segar`. Pembacaan
 * menggabungkan latch itu dengan `isDown`, jadi menahan tombol tetap maju
 * seperti sebelumnya sementara ketukan cepat tidak terlewat. Auto-repeat tidak
 * ikut menyalakan latch: Phaser menahan `keydown-SPACE` berulang selama
 * `key.isDown` masih `true`.
 */
export type AdvanceInput = {
  /** `true` bila `Space`/`Enter` ditahan atau baru ditekan sejak pembacaan terakhir. */
  lanjutDitekan(): boolean;
  /** Buang ketukan yang belum dibaca (mis. selama tantangan memegang kendali). */
  bersihkan(): void;
  /** Lepas listener; panggil saat scene dimatikan. */
  lepas(): void;
};

export function buatInputLanjut(
  keyboard?: Phaser.Input.Keyboard.KeyboardPlugin | null,
): AdvanceInput {
  const keys = keyboard?.addKeys("space,enter") as
    Record<"space" | "enter", Phaser.Input.Keyboard.Key> | undefined;

  let segar = false;
  const catat = () => {
    segar = true;
  };

  keyboard?.on("keydown-SPACE", catat);
  keyboard?.on("keydown-ENTER", catat);

  return {
    lanjutDitekan() {
      const ditahan =
        (keys?.space.isDown ?? false) || (keys?.enter.isDown ?? false);
      const baru = segar;
      segar = false;
      return ditahan || baru;
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
