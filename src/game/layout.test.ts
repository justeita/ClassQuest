import { describe, expect, it } from "vitest";

import { PORTRAIT, PORTRAIT_SOURCE, TEXTBOX } from "./layout";

describe("layout potret dialog", () => {
  it("slot potret menutup separuh panel tanpa celah di tengah", () => {
    expect(PORTRAIT.width * 2).toBe(TEXTBOX.width);
  });

  it("rasio slot potret sama dengan kanvas berkas importer", () => {
    expect(PORTRAIT.width / PORTRAIT.height).toBeCloseTo(
      PORTRAIT_SOURCE.width / PORTRAIT_SOURCE.height,
      6,
    );
  });

  it("potret masuk sejauh radius sudut panel", () => {
    // Kalau potret menempel tepat di tepi panel, lengkungan sudut memotong
    // bahu karakter dan menyisakan latar di bawahnya — potret tampak
    // melayang. Jarak masuk yang sama dengan radius membuat tepi potret
    // berhenti tepat di titik singgung lengkungan.
    expect(PORTRAIT.inset).toBe(TEXTBOX.radius);
  });

  it("dua slot potret tidak memotong isi kanvasnya", () => {
    // Slot selebar setengah panel, ditambah jarak masuk di kedua sisi, masih
    // menyisakan ruang di tengah untuk dua potret yang bersebelahan.
    expect(PORTRAIT.inset * 2).toBeLessThan(TEXTBOX.width);
    expect(PORTRAIT.height).toBe(TEXTBOX.y);
  });
});
