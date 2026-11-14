import { describe, expect, it, vi } from "vitest";

import { createTextbox } from "./textbox";

const beat = (text: string) => ({
  name: null,
  text,
  portrait: null,
  pendamping: null,
});

describe("createTextbox — kait onKetik", () => {
  it("mengirim potongan teks yang baru muncul tiap tick", () => {
    const onKetik = vi.fn();
    const textbox = createTextbox(() => {}, { onKetik });

    textbox.show(beat("abcdefghij"));
    // 35 karakter/detik × 0,1 detik = 3,5 → floor 3 karakter.
    textbox.tick(100);
    expect(onKetik).toHaveBeenLastCalledWith("abc");

    textbox.tick(100);
    expect(onKetik).toHaveBeenLastCalledWith("defg");
  });

  it("tidak memanggil kait saat tick tidak membuka karakter baru", () => {
    const onKetik = vi.fn();
    const textbox = createTextbox(() => {}, { onKetik });

    textbox.show(beat("teks panjang"));
    // 1 ms hanya menambah 0,035 karakter, belum cukup untuk satu karakter.
    textbox.tick(1);
    expect(onKetik).not.toHaveBeenCalled();
  });

  it("berhenti memanggil kait setelah teks tampil penuh", () => {
    const onKetik = vi.fn();
    const textbox = createTextbox(() => {}, { onKetik });

    textbox.show(beat("pendek"));
    textbox.tick(60000);
    expect(onKetik).toHaveBeenCalledTimes(1);

    textbox.tick(60000);
    expect(onKetik).toHaveBeenCalledTimes(1);
  });

  it("complete tidak memicu blip susulan", () => {
    const onKetik = vi.fn();
    const textbox = createTextbox(() => {}, { onKetik });

    textbox.show(beat("pendek"));
    textbox.complete();
    expect(textbox.isTyping()).toBe(false);
    expect(onKetik).not.toHaveBeenCalled();
  });

  it("tetap berjalan tanpa kait", () => {
    const textbox = createTextbox(() => {});

    textbox.show(beat("halo"));
    expect(() => textbox.tick(100)).not.toThrow();
  });
});
