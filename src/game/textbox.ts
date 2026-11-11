import Phaser from "phaser";

import { DEPTH_UI } from "./depth";
import { PORTRAIT, TEXTBOX } from "./layout";
import { Typewriter } from "./typewriter";

/**
 * Panel textbox sesuai docs/04-game/scene-format.md (skala 640×360, ADR 0009).
 *
 * Yang digambar Phaser hanya **panel dan portrait**: aset pixel `ui_textbox`
 * dan `ui_portrait_frame`. Nama, isi dialog, dan indikator "lanjut" dirender
 * DOM (`DialogueBox.tsx`) supaya tajam — canvas 640×360 di-upscale dengan
 * `image-rendering: pixelated`, jadi huruf di dalamnya selalu bergerigi
 * (lihat ADR 0007 dan `docs/04-game/world-design.md`).
 *
 * Modul ini tetap pemegang state dialog di sisi game: typewriter berjalan di
 * `update()` scene, lalu potongan teks dikirim ke React lewat callback.
 */

const WARNA_LATAR = 0x14201a;
const WARNA_BINGKAI = 0xf7f4ec;

export type BeatView = {
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  text: string;
  /** Key texture portrait (`<charId>:portrait`), null bila tidak ada. */
  portraitKey?: string | null;
};

/** Keadaan textbox yang dikirim ke React setiap kali berubah. */
export type DialogueState = {
  visible: boolean;
  name: string | null;
  text: string;
  waiting: boolean;
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

/**
 * @param onPerubahan Dipanggil saat isi textbox berubah, untuk dikirim ke DOM.
 */
export function createTextbox(
  scene: Phaser.Scene,
  onPerubahan: (state: DialogueState) => void,
): Textbox {
  // `setScrollFactor(0)` membuat panel menempel di layar. Tanpa ini, panel ikut
  // tergeser kamera (kamera mengikuti pemain) sehingga terpotong.
  const container = scene.add
    .container(0, 0)
    .setVisible(false)
    .setDepth(DEPTH_UI)
    .setScrollFactor(0);

  // Panel dan portrait selalu di tengah layar. Lebar internal mengikuti rasio
  // viewport, jadi posisi x dihitung dari lebar kamera — bukan angka 16 tetap.
  const lebarLayar = scene.scale.width;
  const panelX = Math.round((lebarLayar - TEXTBOX.width) / 2);
  // Portrait menempel di batas kiri panel dialog, sejajar dengan tepi kotak.
  const portraitX = panelX;

  const background = scene.textures.exists("ui_textbox")
    ? scene.add.image(panelX, TEXTBOX.y, "ui_textbox").setOrigin(0)
    : scene.add
        .rectangle(
          panelX + TEXTBOX.width / 2,
          TEXTBOX.y + TEXTBOX.height / 2,
          TEXTBOX.width,
          TEXTBOX.height,
          WARNA_LATAR,
          0.92,
        )
        .setStrokeStyle(2, WARNA_BINGKAI);

  const portrait = scene.add
    .image(
      portraitX + PORTRAIT.imageInset,
      PORTRAIT.yAtas + PORTRAIT.imageInset,
      scene.textures.exists("ui_default") ? "ui_default" : "__MISSING",
    )
    .setOrigin(0)
    .setDisplaySize(PORTRAIT.imageSize, PORTRAIT.imageSize)
    .setVisible(false);

  const portraitFrame = scene.textures.exists("ui_portrait_frame")
    ? scene.add
        .image(portraitX, PORTRAIT.yAtas, "ui_portrait_frame")
        .setOrigin(0)
    : null;

  container.add([background, portrait]);
  if (portraitFrame) container.add(portraitFrame);

  let typewriter = new Typewriter("");
  let nama: string | null = null;
  /** Teks terakhir yang dikirim; cegah render DOM tiap frame. */
  let terakhirDikirim: string | null = null;

  function kirim() {
    const text = typewriter.current();
    // Typewriter hanya menambah karakter, jadi teks yang sama berarti tidak ada
    // perubahan yang perlu dirender ulang React.
    if (container.visible && text === terakhirDikirim) return;
    terakhirDikirim = container.visible ? text : null;

    onPerubahan({
      visible: container.visible,
      name: nama,
      text,
      waiting: container.visible && typewriter.isDone(),
    });
  }

  function sembunyikanPortrait() {
    portrait.setVisible(false);
    portraitFrame?.setVisible(false);
  }

  return {
    show(beat) {
      nama = beat.name;
      typewriter = new Typewriter(beat.text);
      terakhirDikirim = null;
      container.setVisible(true);

      if (beat.portraitKey && scene.textures.exists(beat.portraitKey)) {
        portrait.setTexture(beat.portraitKey);
        portrait.setDisplaySize(PORTRAIT.imageSize, PORTRAIT.imageSize);
        portrait.setVisible(true);
        portraitFrame?.setVisible(true);
      } else {
        sembunyikanPortrait();
      }

      kirim();
    },
    tick(deltaMs) {
      if (typewriter.isDone()) return;
      typewriter.tick(deltaMs);
      kirim();
    },
    complete() {
      typewriter.finish();
      kirim();
    },
    isTyping() {
      return !typewriter.isDone();
    },
    isWaiting() {
      return typewriter.isDone() && container.visible;
    },
    hide() {
      container.setVisible(false);
      nama = null;
      terakhirDikirim = null;
      sembunyikanPortrait();
      kirim();
    },
  };
}
