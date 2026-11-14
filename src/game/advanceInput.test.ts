import { describe, expect, it } from "vitest";

import { buatInputLanjut } from "./advanceInput";

/**
 * Keyboard Phaser tiruan: cukup `addKeys`, `on`, dan `off` yang dipakai modul.
 * `pancar()` meniru event `keydown-SPACE`/`keydown-ENTER` dari plugin asli.
 */
function keyboardPalsu() {
  const tombol = { space: { isDown: false }, enter: { isDown: false } };
  const pendengar = new Map<string, Array<() => void>>();

  return {
    tombol,
    addKeys: () => tombol,
    on: (event: string, listener: () => void) => {
      pendengar.set(event, [...(pendengar.get(event) ?? []), listener]);
    },
    off: (event: string, listener: () => void) => {
      pendengar.set(
        event,
        (pendengar.get(event) ?? []).filter((entry) => entry !== listener),
      );
    },
    pancar: (event: string) => {
      for (const listener of pendengar.get(event) ?? []) listener();
    },
  };
}

type KeyboardPalsu = ReturnType<typeof keyboardPalsu>;

/** Modul hanya menyentuh `addKeys`/`on`/`off`; sisanya boleh kosong. */
function buat(palsu: KeyboardPalsu) {
  return buatInputLanjut(
    palsu as unknown as Parameters<typeof buatInputLanjut>[0],
  );
}

describe("input lanjut Space/Enter", () => {
  it("melaporkan tombol yang masih ditahan", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    expect(input.lanjutDitekan()).toBe(false);
    palsu.tombol.space.isDown = true;
    expect(input.lanjutDitekan()).toBe(true);
    // Masih ditahan: menahan tombol tetap maju seperti perilaku lama.
    expect(input.lanjutDitekan()).toBe(true);
  });

  it("mencatat ketukan yang sudah lepas sebelum frame berikutnya", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    // keydown lalu keyup tanpa frame di antaranya: `isDown` sudah `false` lagi,
    // tetapi latch event tetap terbaca sekali.
    palsu.pancar("keydown-SPACE");
    palsu.tombol.space.isDown = false;

    expect(input.lanjutDitekan()).toBe(true);
    expect(input.lanjutDitekan()).toBe(false);
  });

  it("menghitung beberapa event dalam satu frame sebagai satu langkah", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    palsu.pancar("keydown-SPACE");
    palsu.pancar("keydown-ENTER");

    expect(input.lanjutDitekan()).toBe(true);
    expect(input.lanjutDitekan()).toBe(false);
  });

  it("membuang ketukan lewat `bersihkan` tanpa mengonsumsi tombol yang ditahan", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    palsu.pancar("keydown-SPACE");
    input.bersihkan();
    expect(input.lanjutDitekan()).toBe(false);

    palsu.tombol.enter.isDown = true;
    expect(input.lanjutDitekan()).toBe(true);
  });

  it("berhenti mencatat setelah listener dilepas", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    input.lepas();
    palsu.pancar("keydown-SPACE");
    expect(input.lanjutDitekan()).toBe(false);
  });

  it("aman tanpa keyboard (scene headless)", () => {
    const input = buatInputLanjut(undefined);
    expect(input.lanjutDitekan()).toBe(false);
    expect(() => input.bersihkan()).not.toThrow();
  });
});
