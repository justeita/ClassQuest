import { describe, expect, it } from "vitest";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import {
  INSET_PENANDA,
  duniaKeLayar,
  posisiPenanda,
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

describe("posisiPenanda", () => {
  it("membiarkan penanda menempel pada NPC selama masih terlihat", () => {
    expect(posisiPenanda({ x: 320, y: 120 })).toEqual({
      x: 320,
      y: 120,
      tepi: false,
    });
  });

  it("menjepit penanda ke tepi kiri saat NPC di luar pandangan", () => {
    expect(posisiPenanda({ x: -120, y: 150 })).toEqual({
      x: INSET_PENANDA.kiri,
      y: 150,
      tepi: true,
    });
  });

  it("menjepit ke sudut kanan-bawah memakai jarak aman masing-masing sisi", () => {
    const posisi = posisiPenanda({ x: 700, y: 400 });

    expect(posisi.x).toBe(GAME_WIDTH - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(GAME_HEIGHT - INSET_PENANDA.bawah);
    expect(posisi.tepi).toBe(true);
  });

  it("memberi jarak lebih lebar di atas agar tidak menutupi HUD", () => {
    const posisi = posisiPenanda({ x: 320, y: -40 });

    expect(posisi.x).toBe(320);
    expect(posisi.y).toBe(INSET_PENANDA.atas);
    expect(posisi.tepi).toBe(true);
  });

  it("mengikuti lebar kamera internal yang adaptif", () => {
    const posisi = posisiPenanda({ x: 900, y: 180 }, 780, GAME_HEIGHT);

    expect(posisi.x).toBe(780 - INSET_PENANDA.kanan);
    expect(posisi.y).toBe(180);
    expect(posisi.tepi).toBe(true);
  });

  it("menerima jarak aman khusus tanpa mengubah perilaku jepitan", () => {
    const inset: InsetPenanda = { atas: 10, kanan: 10, bawah: 10, kiri: 10 };

    expect(posisiPenanda({ x: -5, y: 50 }, 640, 360, inset)).toEqual({
      x: 10,
      y: 50,
      tepi: true,
    });
  });

  it("tidak membalik area aman di layar yang sangat kecil", () => {
    const posisi = posisiPenanda({ x: 5, y: 5 }, 20, 20);

    expect(posisi.tepi).toBe(true);
    expect(posisi.x).toBeGreaterThanOrEqual(0);
    expect(posisi.y).toBeGreaterThanOrEqual(0);
  });
});
