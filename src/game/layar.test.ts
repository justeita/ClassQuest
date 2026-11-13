import { describe, expect, it } from "vitest";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { dalamLayar, duniaKeLayar, posisiPenanda } from "./layar";

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

describe("posisiPenanda", () => {
  it("membiarkan penanda menempel pada NPC selama masih terlihat", () => {
    expect(posisiPenanda({ x: 320, y: 120 })).toEqual({
      x: 320,
      y: 120,
      tepi: false,
      sudut: 0,
    });
  });

  it("menjepit penanda ke tepi kiri dan menunjuk ke kiri", () => {
    const posisi = posisiPenanda({ x: -120, y: 150 }, 640, 360, 20);

    expect(posisi).toEqual({ x: 20, y: 150, tepi: true, sudut: 180 });
  });

  it("menjepit ke sudut dan menghitung arah diagonal", () => {
    const posisi = posisiPenanda({ x: 700, y: 400 }, 640, 360, 20);

    expect(posisi.x).toBe(620);
    expect(posisi.y).toBe(340);
    expect(posisi.tepi).toBe(true);
    // NPC di kanan-bawah → panah menghadap kanan-bawah (CSS rotate positif).
    expect(posisi.sudut).toBeCloseTo(36.87, 1);
  });

  it("mengikuti lebar kamera internal yang adaptif", () => {
    const posisi = posisiPenanda({ x: 900, y: 180 }, 780, 360, 20);

    expect(posisi.x).toBe(760);
    expect(posisi.y).toBe(180);
    expect(posisi.sudut).toBe(0);
  });
});
