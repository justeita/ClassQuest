import { describe, expect, it } from "vitest";

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GAME_WIDTH_MAKS,
  lebarKanvas,
  skalaBulat,
} from "./constants";

describe("skalaBulat", () => {
  it("memakai kelipatan penuh yang masih muat di kontainer", () => {
    expect(skalaBulat(1920, 1080)).toBe(3);
    expect(skalaBulat(1280, 720)).toBe(2);
    expect(skalaBulat(640, 360)).toBe(1);
  });

  it("sisi sempit yang menentukan, bukan sisi lebar", () => {
    expect(skalaBulat(1920, 700)).toBe(1);
    expect(skalaBulat(900, 1080)).toBe(1);
  });

  it("tidak pernah di bawah 1 walau kontainer lebih kecil dari kanvas", () => {
    expect(skalaBulat(320, 180)).toBe(1);
    expect(skalaBulat(0, 0)).toBe(1);
  });

  it("selalu bilangan bulat", () => {
    expect(Number.isInteger(skalaBulat(1366, 768))).toBe(true);
    expect(Number.isInteger(skalaBulat(1728, 1117))).toBe(true);
  });
});

describe("lebarKanvas", () => {
  it("mengisi kontainer selebar mungkin tanpa melebihi batas", () => {
    expect(lebarKanvas(1920, 3)).toBe(640);
    expect(lebarKanvas(1366, 2)).toBe(683);
    expect(lebarKanvas(768, 1)).toBe(768);
  });

  it("kanvas tidak pernah melebihi kontainer", () => {
    for (const [kontainer, skala] of [
      [1920, 3],
      [1366, 2],
      [1024, 1],
      [3840, 2],
    ] as const) {
      expect(lebarKanvas(kontainer, skala) * skala).toBeLessThanOrEqual(
        kontainer,
      );
    }
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
