import { describe, expect, it } from "vitest";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { dalamLayar, duniaKeLayar } from "./layar";

describe("duniaKeLayar", () => {
  it("kamera di titik nol tidak menggeser koordinat", () => {
    expect(duniaKeLayar({ scrollX: 0, scrollY: 0 }, 120, 80)).toEqual({
      x: 120,
      y: 80,
    });
  });

  it("mengurangi koordinat dunia dengan scroll kamera", () => {
    expect(duniaKeLayar({ scrollX: 64, scrollY: 32 }, 120, 80)).toEqual({
      x: 56,
      y: 48,
    });
  });
});

describe("dalamLayar", () => {
  it("titik di tepi masih dianggap terlihat", () => {
    expect(dalamLayar({ x: 0, y: 0 })).toBe(true);
    expect(dalamLayar({ x: GAME_WIDTH, y: GAME_HEIGHT })).toBe(true);
  });

  it("titik di luar batas tidak terlihat", () => {
    expect(dalamLayar({ x: -1, y: 10 })).toBe(false);
    expect(dalamLayar({ x: 10, y: GAME_HEIGHT + 1 })).toBe(false);
  });

  it("margin mengizinkan titik sedikit di luar layar", () => {
    expect(dalamLayar({ x: -20, y: -20 }, GAME_WIDTH, GAME_HEIGHT, 40)).toBe(
      true,
    );
    expect(dalamLayar({ x: -60, y: 10 }, GAME_WIDTH, GAME_HEIGHT, 40)).toBe(
      false,
    );
    // Lebar kamera bisa lebih besar dari 640 (lebar internal adaptif).
    expect(dalamLayar({ x: 700, y: 180 }, 775, GAME_HEIGHT)).toBe(true);
  });
});
