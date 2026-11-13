import { describe, expect, it } from "vitest";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import {
  INSET_PENANDA,
  duniaKeLayar,
  posisiPenanda,
  terlihatDiLayar,
  type InsetPenanda,
} from "./layar";

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

describe("terlihatDiLayar", () => {
  it("menganggap titik di dalam bidang layar sebagai terlihat", () => {
    expect(terlihatDiLayar({ x: 0, y: 0 })).toBe(true);
    expect(terlihatDiLayar({ x: GAME_WIDTH, y: GAME_HEIGHT })).toBe(true);
  });

  it("menyembunyikan titik yang sudah melewati tepi layar", () => {
    expect(terlihatDiLayar({ x: -1, y: 100 })).toBe(false);
    expect(terlihatDiLayar({ x: GAME_WIDTH + 1, y: 100 })).toBe(false);
    expect(terlihatDiLayar({ x: 100, y: -1 })).toBe(false);
    expect(terlihatDiLayar({ x: 100, y: GAME_HEIGHT + 1 })).toBe(false);
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
    expect(posisiPenanda({ x: -120, y: 150 })).toEqual({
      x: INSET_PENANDA.kiri,
      y: 150,
      tepi: true,
      sudut: 180,
    });
  });

  it("menjepit ke sudut kanan-bawah dan menunjuk diagonal", () => {
    const posisi = posisiPenanda({ x: 700, y: 400 });

    expect(posisi.x).toBe(GAME_WIDTH - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(GAME_HEIGHT - INSET_PENANDA.bawah);
    expect(posisi.tepi).toBe(true);
    // NPC di kanan-bawah → penunjuk menghadap kanan-bawah.
    expect(posisi.sudut).toBeGreaterThan(0);
    expect(posisi.sudut).toBeLessThan(90);
  });

  it("menjepit ke tepi atas dan menunjuk ke atas", () => {
    const posisi = posisiPenanda({ x: 320, y: -40 });

    expect(posisi.x).toBe(320);
    expect(posisi.y).toBe(INSET_PENANDA.atas);
    expect(posisi.tepi).toBe(true);
    // NPC di atas layar → penunjuk menghadap ke atas.
    expect(posisi.sudut).toBe(-90);
  });

  it("mengikuti lebar kamera internal yang adaptif", () => {
    const posisi = posisiPenanda({ x: 900, y: 180 }, 780, GAME_HEIGHT);

    expect(posisi.x).toBe(780 - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(180);
    expect(posisi.tepi).toBe(true);
    expect(posisi.sudut).toBe(0);
  });

  it("menerima jarak aman khusus tanpa mengubah perilaku jepitan", () => {
    const inset: InsetPenanda = { atas: 10, kanan: 10, bawah: 10, kiri: 10 };

    expect(posisiPenanda({ x: -5, y: 50 }, 640, 360, inset)).toEqual({
      x: 10,
      y: 50,
      tepi: true,
      sudut: 180,
    });
  });

  it("tidak membalik area aman di layar yang sangat kecil", () => {
    const posisi = posisiPenanda({ x: 5, y: 5 }, 20, 20);

    expect(posisi.tepi).toBe(true);
    expect(posisi.x).toBeGreaterThanOrEqual(0);
    expect(posisi.y).toBeGreaterThanOrEqual(0);
  });
});
