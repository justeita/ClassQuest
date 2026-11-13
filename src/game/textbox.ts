import { Typewriter } from "./typewriter";

/**
 * State dialog sisi game (docs/04-game/scene-format.md, ADR 0007 + ADR 0017).
 *
 * Modul ini tidak menggambar apa pun: typewriter berjalan di `tick()` scene,
 * lalu potongan teks dan potret dikirim ke React lewat callback. Panel pixel,
 * potret, nama, dan indikator "lanjut" dirender DOM (`DialogueBox.tsx`) supaya
 * tajam di atas kanvas 640×360 yang di-upscale dengan `image-rendering:
 * pixelated`.
 */

/** Potret yang sedang tampil; `src` relatif terhadap `public/`. */
export type PortraitView = {
  src: string;
  /** Nama karakter; dipakai sebagai teks alternatif gambar. */
  alt: string;
};

export type BeatView = {
  /** Nama speaker; null untuk beat narration. */
  name: string | null;
  text: string;
  /** Potret pembicara; null bila beat ini tidak menampilkan potret. */
  portrait?: PortraitView | null;
};

/** Keadaan dialog yang dikirim ke React setiap kali berubah. */
export type DialogueState = {
  visible: boolean;
  name: string | null;
  text: string;
  waiting: boolean;
  portrait: PortraitView | null;
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
  /**
   * Ganti potret yang sedang tampil tanpa mengubah teks; dipakai feedback
   * jawaban (benar → `happy`, salah → `angry`).
   */
  setPortrait: (portrait: PortraitView | null) => void;
  hide: () => void;
};

/**
 * @param onPerubahan Dipanggil saat isi dialog berubah, untuk dikirim ke DOM.
 */
export function createTextbox(
  onPerubahan: (state: DialogueState) => void,
): Textbox {
  let typewriter = new Typewriter("");
  let terlihat = false;
  let nama: string | null = null;
  let potret: PortraitView | null = null;
  /** Sidik state terakhir yang dikirim; cegah render DOM tiap frame. */
  let terakhir: string | null = null;

  function state(): DialogueState {
    return {
      visible: terlihat,
      name: nama,
      text: terlihat ? typewriter.current() : "",
      waiting: terlihat && typewriter.isDone(),
      portrait: terlihat ? potret : null,
    };
  }

  function kirim() {
    const berikut = state();
    const sidik = JSON.stringify(berikut);
    if (sidik === terakhir) return;
    terakhir = sidik;
    onPerubahan(berikut);
  }

  return {
    show(beat) {
      nama = beat.name;
      potret = beat.portrait ?? null;
      typewriter = new Typewriter(beat.text);
      terlihat = true;
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
      return typewriter.isDone() && terlihat;
    },
    setPortrait(berikut) {
      potret = berikut;
      kirim();
    },
    hide() {
      terlihat = false;
      nama = null;
      potret = null;
      kirim();
    },
  };
}
