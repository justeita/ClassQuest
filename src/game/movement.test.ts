import { describe, expect, it } from "vitest";

import { arahGerak, FRAME_ANIMASI } from "./movement";
import type { MovementKeys } from "./movement";

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

describe("FRAME_ANIMASI", () => {
  it("layout sheet 18 frame: idle 2, jalan 2×8 arah, diam per arah", () => {
    expect(FRAME_ANIMASI.idle).toEqual({ start: 0, end: 1 });
    expect(FRAME_ANIMASI.jalan).toEqual({
      down: [2, 3],
      up: [4, 5],
      left: [6, 7],
      right: [8, 9],
      "down-left": [10, 11],
      "down-right": [12, 13],
      "up-left": [14, 15],
      "up-right": [16, 17],
    });
    expect(FRAME_ANIMASI.diam).toEqual({
      up: 4,
      left: 6,
      right: 8,
      "down-left": 10,
      "down-right": 12,
      "up-left": 14,
      "up-right": 16,
    });
  });

  it("semua arah punya dua frame jalan dan satu frame diam", () => {
    const arah = Object.keys(FRAME_ANIMASI.jalan) as Array<
      keyof typeof FRAME_ANIMASI.jalan
    >;
    expect(arah).toHaveLength(8);
    for (const a of arah) {
      expect(FRAME_ANIMASI.jalan[a]).toHaveLength(2);
    }
    expect(Object.keys(FRAME_ANIMASI.diam)).toHaveLength(7);
  });
});
