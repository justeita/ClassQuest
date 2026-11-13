import { describe, expect, it } from "vitest";

import { arahGerak, langkahPemain, vektorArah } from "./movement";
import type { MovementKeys } from "./movement";
import { DT_MAKSIMUM, KECEPATAN_PEMAIN } from "./movement";

/** Key palsu: cukup `isDown` untuk logika arah (tanpa Phaser). */
const key = (down: boolean) =>
  ({ isDown: down }) as MovementKeys["left"][number];

function keys(
  left = false,
  right = false,
  up = false,
  down = false,
): MovementKeys {
  return {
    left: [key(left)],
    right: [key(right)],
    up: [key(up)],
    down: [key(down)],
  };
}

describe("arahGerak", () => {
  it("tanpa tombol ditekan mengembalikan null", () => {
    expect(arahGerak(keys())).toBeNull();
    expect(arahGerak(undefined)).toBeNull();
  });

  it("mengembalikan arah tunggal", () => {
    expect(arahGerak(keys(true))).toBe("left");
    expect(arahGerak(keys(false, true))).toBe("right");
    expect(arahGerak(keys(false, false, true))).toBe("up");
    expect(arahGerak(keys(false, false, false, true))).toBe("down");
  });

  it("kombinasi horizontal + vertikal menghasilkan diagonal", () => {
    expect(arahGerak(keys(true, false, true))).toBe("up-left");
    expect(arahGerak(keys(true, false, false, true))).toBe("down-left");
    expect(arahGerak(keys(false, true, true))).toBe("up-right");
    expect(arahGerak(keys(false, true, false, true))).toBe("down-right");
  });
});

describe("vektorArah", () => {
  it("nilainya -1, 0, atau 1 per sumbu", () => {
    expect(vektorArah("up")).toEqual({ x: 0, y: -1 });
    expect(vektorArah("down-right")).toEqual({ x: 1, y: 1 });
    expect(vektorArah("up-left")).toEqual({ x: -1, y: -1 });
  });

  it("diagonal tidak dinormalisasi, sama seperti editor", () => {
    expect(vektorArah("down-right")).toEqual({ x: 1, y: 1 });
  });
});

describe("langkahPemain", () => {
  const batas = { width: 1000, height: 1000 };
  const bebas = () => false;

  it("diam bila tidak ada arah", () => {
    const hasil = langkahPemain({
      x: 100,
      y: 100,
      arah: null,
      dt: 1,
      tabrakan: bebas,
      batas,
    });

    expect(hasil).toEqual({ x: 100, y: 100 });
  });

  it("bergerak sejauh kecepatan × waktu", () => {
    const hasil = langkahPemain({
      x: 100,
      y: 100,
      arah: "right",
      dt: 0.5,
      tabrakan: bebas,
      batas,
    });

    expect(hasil.x).toBe(100 + KECEPATAN_PEMAIN * 0.5);
    expect(hasil.y).toBe(100);
  });

  it("diagonal bergerak penuh di kedua sumbu", () => {
    const hasil = langkahPemain({
      x: 0,
      y: 0,
      arah: "down-right",
      dt: DT_MAKSIMUM,
      tabrakan: bebas,
      batas,
    });

    const langkah = KECEPATAN_PEMAIN * DT_MAKSIMUM;
    expect(hasil.x).toBeCloseTo(langkah, 5);
    expect(hasil.y).toBeCloseTo(langkah, 5);
  });

  it("menahan sumbu yang menabrak, sumbu lain tetap jalan", () => {
    // Dinding memblok semua x > 200; y bebas.
    const tabrakan = (x: number) => x > 200;
    const hasil = langkahPemain({
      x: 200,
      y: 100,
      arah: "down-right",
      dt: 0.5,
      tabrakan,
      batas,
    });

    expect(hasil.x).toBe(200);
    expect(hasil.y).toBe(190);
  });

  it("tidak keluar dari batas dunia", () => {
    const kanan = langkahPemain({
      x: 995,
      y: 100,
      arah: "right",
      dt: 1,
      tabrakan: bebas,
      batas,
    });
    const atas = langkahPemain({
      x: 100,
      y: 1,
      arah: "up",
      dt: 1,
      tabrakan: bebas,
      batas,
    });

    expect(kanan.x).toBe(1000 - 8);
    expect(atas.y).toBe(9);
  });
});
