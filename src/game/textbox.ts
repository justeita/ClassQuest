import Phaser from "phaser";

import { Typewriter } from "./typewriter";

/**
 * Textbox dialog sesuai docs/04-game/scene-format.md:
 * kotak di x=12, y=180, lebar 456, tinggi 78; nama di baris pertama;
 * teks maks 3 baris (~60 karakter/baris); indikator berkedip saat menunggu.
 * Semua komponen DOM/teks tetap di dalam resolusi 480×270.
 */

const TEXTBOX_X = 12;
const TEXTBOX_Y = 180;
const TEXTBOX_WIDTH = 456;
const TEXTBOX_HEIGHT = 78;
const PADDING = 12;
const WRAP_WIDTH = 432;

const WARNA_LATAR = 0x14201a;
const WARNA_BINGKAI = 0xf7f4ec;
const WARNA_NAMA = "#F7F4EC";
const WARNA_TEKS = "#D9E4DA";

const FONT_FAMILY = "monospace";

export type BeatView = {
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  text: string;
};

export type Textbox = {
  show: (beat: BeatView) => void;
  /** Majukan efek ketik; dipanggil dari update() scene dengan delta (ms). */
  tick: (deltaMs: number) => void;
  /** Selesaikan teks seketika (pemain menekan lanjut saat sedang mengetik). */
  complete: () => void;
  /** Teks sedang diketik dan belum tuntas. */
  isTyping: () => boolean;
  /** Teks sudah tampil penuh, menunggu pemain melanjutkan. */
  isWaiting: () => boolean;
  hide: () => void;
};

export function createTextbox(scene: Phaser.Scene): Textbox {
  const container = scene.add.container(0, 0).setVisible(false).setDepth(100);

  const background = scene.add
    .rectangle(
      TEXTBOX_X + TEXTBOX_WIDTH / 2,
      TEXTBOX_Y + TEXTBOX_HEIGHT / 2,
      TEXTBOX_WIDTH,
      TEXTBOX_HEIGHT,
      WARNA_LATAR,
      0.92,
    )
    .setStrokeStyle(2, WARNA_BINGKAI);

  const nameText = scene.add
    .text(TEXTBOX_X + PADDING, TEXTBOX_Y + 6, "", {
      fontFamily: FONT_FAMILY,
      fontSize: "10px",
      color: WARNA_NAMA,
      fontStyle: "bold",
    })
    .setAlpha(0.85);

  const bodyText = scene.add.text(TEXTBOX_X + PADDING, TEXTBOX_Y + 22, "", {
    fontFamily: FONT_FAMILY,
    fontSize: "11px",
    color: WARNA_TEKS,
    wordWrap: { width: WRAP_WIDTH },
    lineSpacing: 4,
  });

  const indicator = scene.add
    .text(
      TEXTBOX_X + TEXTBOX_WIDTH - 18,
      TEXTBOX_Y + TEXTBOX_HEIGHT - 16,
      "▼",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: WARNA_NAMA,
      },
    )
    .setVisible(false);

  container.add([background, nameText, bodyText, indicator]);

  // Kedip lambat ala pixel game; hanya tampak saat menunggu input.
  scene.tweens.add({
    targets: indicator,
    alpha: { from: 1, to: 0.15 },
    duration: 450,
    yoyo: true,
    repeat: -1,
  });

  let typewriter = new Typewriter("");

  return {
    show(beat) {
      nameText.setText(beat.name ?? "");
      typewriter = new Typewriter(beat.text);
      bodyText.setText("");
      container.setVisible(true);
      indicator.setVisible(false);
    },
    tick(deltaMs) {
      if (typewriter.isDone()) return;
      typewriter.tick(deltaMs);
      bodyText.setText(typewriter.current());
      indicator.setVisible(false);
    },
    complete() {
      typewriter.finish();
      bodyText.setText(typewriter.current());
    },
    isTyping() {
      return !typewriter.isDone();
    },
    isWaiting() {
      return typewriter.isDone() && container.visible;
    },
    hide() {
      container.setVisible(false);
      indicator.setVisible(false);
    },
  };
}
