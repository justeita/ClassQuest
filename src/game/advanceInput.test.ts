import { describe, expect, it } from "vitest";

import { buatInputLanjut } from "./advanceInput";

/**
 * Keyboard Phaser tiruan: cukup `addKeys`, `on`, dan `off` yang dipakai modul.
 * `pancar()` meniru event `keydown-SPACE`/`keydown-ENTER` dari plugin asli.
 */
function keyboardPalsu() {
  const pendengar = new Map<string, Array<() => void>>();
  const didaftarkan: string[] = [];

  return {
    didaftarkan,
    addKeys: (keys: string) => {
      didaftarkan.push(keys);
      return {};
    },
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
  it("mendaftarkan Space/Enter supaya auto-repeat tidak jadi langkah baru", () => {
    const palsu = keyboardPalsu();
    buat(palsu);

    expect(palsu.didaftarkan).toContain("space,enter");
  });

  it("mencatat satu tekanan sebagai satu langkah", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    expect(input.lanjutDitekan()).toBe(false);
    palsu.pancar("keydown-SPACE");

    expect(input.lanjutDitekan()).toBe(true);
    expect(input.lanjutDitekan()).toBe(false);
  });

  it("tidak menambah langkah selama tombol ditahan", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    // Satu tekanan fisik: Phaser hanya memancarkan `keydown-SPACE` sekali,
    // walau tombol tetap ditahan. Latch habis dibaca, jadi tidak berulang.
    palsu.pancar("keydown-SPACE");
    expect(input.lanjutDitekan()).toBe(true);

    expect(input.lanjutDitekan()).toBe(false);
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

  it("membuang tekanan lewat `bersihkan`", () => {
    const palsu = keyboardPalsu();
    const input = buat(palsu);

    palsu.pancar("keydown-SPACE");
    input.bersihkan();
    expect(input.lanjutDitekan()).toBe(false);
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
