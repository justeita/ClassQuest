import Phaser from "phaser";

import { DEPTH_UI } from "./depth";
import { Typewriter } from "./typewriter";

/**
 * Textbox dialog sesuai docs/04-game/scene-format.md (skala 640×360, ADR 0009):
 * kotak di x=16, y=240, lebar 608, tinggi 104; nama di baris pertama;
 * teks maks 3 baris (~80 karakter/baris); indikator berkedip saat menunggu.
 *
 * Panel memakai `ui_textbox` dari manifest. Kalau texture gagal dimuat,
 * kotak warna lama dipakai supaya dialog tetap terbaca.
 */

const TEXTBOX_X = 16;
const TEXTBOX_Y = 240;
const TEXTBOX_WIDTH = 608;
const TEXTBOX_HEIGHT = 104;
const PADDING = 16;
const WRAP_WIDTH = 576;

const PORTRAIT_X = 26;
const PORTRAIT_Y = 164;
const PORTRAIT_SIZE = 64;
const PORTRAIT_FRAME_INSET = 4;

const WARNA_LATAR = 0x14201a;
const WARNA_BINGKAI = 0xf7f4ec;
const WARNA_NAMA = "#F7F4EC";
const WARNA_TEKS = "#D9E4DA";

const FONT_FAMILY = "monospace";

export type BeatView = {
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  text: string;
  /** Key texture portrait (`<charId>:portrait`), null bila tidak ada. */
  portraitKey?: string | null;
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
  // `setScrollFactor(0)` membuat textbox menempel di layar. Tanpa ini, textbox
  // ikut tergeser kamera (kamera mengikuti pemain) sehingga teks terpotong.
  const container = scene.add
    .container(0, 0)
    .setVisible(false)
    .setDepth(DEPTH_UI)
    .setScrollFactor(0);

  const background = scene.textures.exists("ui_textbox")
    ? scene.add.image(TEXTBOX_X, TEXTBOX_Y, "ui_textbox").setOrigin(0)
    : scene.add
        .rectangle(
          TEXTBOX_X + TEXTBOX_WIDTH / 2,
          TEXTBOX_Y + TEXTBOX_HEIGHT / 2,
          TEXTBOX_WIDTH,
          TEXTBOX_HEIGHT,
          WARNA_LATAR,
          0.92,
        )
        .setStrokeStyle(2, WARNA_BINGKAI);

  const portrait = scene.add
    .image(
      PORTRAIT_X + PORTRAIT_FRAME_INSET,
      PORTRAIT_Y + PORTRAIT_FRAME_INSET,
      scene.textures.exists("ui_default") ? "ui_default" : "__MISSING",
    )
    .setOrigin(0)
    .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
    .setVisible(false);

  const portraitFrame = scene.textures.exists("ui_portrait_frame")
    ? scene.add
        .image(PORTRAIT_X, PORTRAIT_Y, "ui_portrait_frame")
        .setOrigin(0)
        .setVisible(false)
    : null;

  const nameText = scene.add
    .text(TEXTBOX_X + PADDING, TEXTBOX_Y + 6, "", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: WARNA_NAMA,
      fontStyle: "bold",
    })
    .setAlpha(0.85);

  const bodyText = scene.add.text(TEXTBOX_X + PADDING, TEXTBOX_Y + 22, "", {
    fontFamily: FONT_FAMILY,
    fontSize: "14px",
    color: WARNA_TEKS,
    wordWrap: { width: WRAP_WIDTH },
    lineSpacing: 6,
  });

  const indicator = scene.add
    .text(
      TEXTBOX_X + TEXTBOX_WIDTH - 18,
      TEXTBOX_Y + TEXTBOX_HEIGHT - 16,
      "▼",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: WARNA_NAMA,
      },
    )
    .setVisible(false);

  container.add([background, portrait, nameText, bodyText, indicator]);
  if (portraitFrame) container.add(portraitFrame);

  // Kedip lambat ala pixel game; hanya tampak saat menunggu input.
  scene.tweens.add({
    targets: indicator,
    alpha: { from: 1, to: 0.15 },
    duration: 450,
    yoyo: true,
    repeat: -1,
  });

  let typewriter = new Typewriter("");

  function sembunyikanPortrait() {
    portrait.setVisible(false);
    portraitFrame?.setVisible(false);
  }

  return {
    show(beat) {
      nameText.setText(beat.name ?? "");
      typewriter = new Typewriter(beat.text);
      bodyText.setText("");
      container.setVisible(true);
      indicator.setVisible(false);

      if (beat.portraitKey && scene.textures.exists(beat.portraitKey)) {
        portrait.setTexture(beat.portraitKey);
        portrait.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
        portrait.setVisible(true);
        portraitFrame?.setVisible(true);
      } else {
        sembunyikanPortrait();
      }
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
