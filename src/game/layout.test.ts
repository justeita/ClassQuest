import { describe, expect, it } from "vitest";

import { PORTRAIT, PORTRAIT_SOURCE, TEXTBOX } from "./layout";

describe("layout potret dialog", () => {
  it("slot potret lebih kecil dari setengah panel", () => {
    // Potret setengah panel menutupi terlalu banyak layar; ukurannya sengaja
    // diturunkan sedikit.
    expect(PORTRAIT.width).toBeLessThan(TEXTBOX.width / 2);
    expect(PORTRAIT.width).toBeGreaterThan(TEXTBOX.width / 4);
  });

  it("rasio slot potret sama dengan kanvas berkas importer", () => {
    expect(PORTRAIT.width / PORTRAIT.height).toBeCloseTo(
      PORTRAIT_SOURCE.width / PORTRAIT_SOURCE.height,
      6,
    );
  });

  it("potret tidak bertumpuk dengan lengkungan sudut panel", () => {
    // Kalau potret menempel tepat di tepi panel, lengkungan sudut memotong
    // bahu karakter dan menyisakan latar di bawahnya — potret tampak
    // melayang. Jarak masuk yang lebih besar dari radius membersihkan
    // lengkungan itu.
    expect(PORTRAIT.inset).toBeGreaterThan(TEXTBOX.radius);
  });

  it("dasar potret menempel tepi atas panel", () => {
    expect(PORTRAIT.height).toBeLessThanOrEqual(TEXTBOX.y);
  });

  it("dua slot potret tidak memotong isi kanvasnya", () => {
    expect(PORTRAIT.inset * 2).toBeLessThan(TEXTBOX.width);
  });
});
