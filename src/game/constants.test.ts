import { describe, expect, it } from "vitest";

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GAME_WIDTH_MAKS,
  SISA_SKALA_MAKS,
  lebarKanvas,
  skalaKanvas,
  ukuranKanvas,
} from "./constants";

const semuaUkuran = [
  [1920, 1080],
  [1920, 950],
  [1366, 660],
  [1280, 722],
  [1024, 768],
  [390, 844],
  [320, 180],
] as const;

describe("skalaKanvas", () => {
  it("memakai kelipatan penuh saat kontainer hampir pas", () => {
    expect(skalaKanvas(1920, 1080)).toBe(3);
    expect(skalaKanvas(1280, 720)).toBe(2);
    expect(skalaKanvas(640, 360)).toBe(1);
    // Sisa 2 px dari kelipatan 2× masih dianggap pas.
    expect(skalaKanvas(1280, 722)).toBe(2);
  });

  it("membesarkan kanvas penuh saat sisa kelipatan terlalu besar", () => {
    // 950 / 360 = 2,63× — kalau dibulatkan ke 2×, tinggi terpakai cuma 76%.
    expect(skalaKanvas(1920, 950)).toBeCloseTo(950 / 360, 10);
    // 660 / 360 = 1,83× — inilah kasus laptop yang dulu jadi strip 960×360.
    expect(skalaKanvas(1366, 660)).toBeCloseTo(660 / 360, 10);
  });

  it("sisi sempit yang menentukan", () => {
    // Lebar hanya cukup 0,56× walau tingginya lega (ponsel portrait).
    expect(skalaKanvas(360, 700)).toBeCloseTo(360 / GAME_WIDTH, 10);
    expect(skalaKanvas(900, 1080)).toBeCloseTo(900 / GAME_WIDTH, 10);
  });

  it("tidak pernah membuat kanvas lebih lebar atau lebih tinggi dari kontainer", () => {
    for (const [lebar, tinggi] of semuaUkuran) {
      const skala = skalaKanvas(lebar, tinggi);
      expect(skala * GAME_HEIGHT).toBeLessThanOrEqual(tinggi + 1e-6);
      expect(skala * GAME_WIDTH).toBeLessThanOrEqual(lebar + 1e-6);
    }
  });

  it("kontainer kosong tidak menghasilkan skala nol", () => {
    expect(skalaKanvas(0, 0)).toBe(1);
    expect(skalaKanvas(-10, -10)).toBe(1);
  });

  it("toleransi bar gelap konsisten dengan dokumentasi", () => {
    expect(SISA_SKALA_MAKS).toBe(0.06);
    // Sisa 3% masih bulat; di atas 6% kanvas dibesarkan penuh.
    expect(skalaKanvas(GAME_WIDTH * 1.03, GAME_HEIGHT * 1.03)).toBe(1);
    expect(skalaKanvas(GAME_WIDTH * 1.2, GAME_HEIGHT * 1.2)).toBeCloseTo(
      1.2,
      10,
    );
  });
});

describe("lebarKanvas", () => {
  it("mengisi lebar kontainer tanpa melebihi batas", () => {
    expect(lebarKanvas(1920, 3)).toBe(640);
    expect(lebarKanvas(1366, 2)).toBe(683);
    expect(lebarKanvas(768, 1)).toBe(768);
  });

  it("dijepit ke 640–960 agar dunia tidak sempit atau terlalu lebar", () => {
    expect(lebarKanvas(200, 1)).toBe(GAME_WIDTH);
    expect(lebarKanvas(4000, 1)).toBe(GAME_WIDTH_MAKS);
    expect(lebarKanvas(0, 1)).toBe(GAME_WIDTH);
  });

  it("tinggi internal selalu tetap 360", () => {
    expect(GAME_HEIGHT).toBe(360);
  });
});

describe("ukuranKanvas", () => {
  it("skala bulat dipakai saat sisa ruangnya tipis", () => {
    expect(ukuranKanvas(1920, 1080)).toEqual({ skala: 3, lebar: 640 });
    expect(ukuranKanvas(1280, 722)).toEqual({ skala: 2, lebar: 640 });
  });

  it("skala pecahan mengisi bingkai hampir seluruhnya", () => {
    for (const [lebarKontainer, tinggiKontainer] of [
      [1920, 950],
      [1366, 660],
      [1600, 861],
    ] as const) {
      const { skala, lebar } = ukuranKanvas(lebarKontainer, tinggiKontainer);
      // Tinggi terpakai mendekati penuh (selisih hanya pembulatan ke bawah).
      expect(skala * GAME_HEIGHT).toBeCloseTo(tinggiKontainer, 6);
      // Lebar internal membulat ke bawah: sisa paling banyak 1 piksel internal.
      expect(lebar * skala).toBeLessThanOrEqual(lebarKontainer);
      expect(lebarKontainer - lebar * skala).toBeLessThanOrEqual(skala + 1e-6);
    }
  });

  it("tidak pernah melebihi kontainer di ukuran apa pun", () => {
    for (const [lebar, tinggi] of semuaUkuran) {
      const { skala, lebar: internal } = ukuranKanvas(lebar, tinggi);
      expect(internal * skala).toBeLessThanOrEqual(lebar + 1e-6);
      expect(GAME_HEIGHT * skala).toBeLessThanOrEqual(tinggi + 1e-6);
    }
  });
});
