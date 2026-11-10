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

  it("diagonal tetap satu arah (prioritas horizontal dulu)", () => {
    expect(arahGerak(keys(true, false, true))).toBe("left");
    expect(arahGerak(keys(false, true, false, true))).toBe("right");
  });
});

describe("FRAME_ANIMASI", () => {
  it("layout sheet 10 frame: idle 2, jalan 2×4 arah, diam per arah", () => {
    expect(FRAME_ANIMASI.idle).toEqual({ start: 0, end: 1 });
    expect(FRAME_ANIMASI.jalan).toEqual({
      down: [2, 3],
      up: [4, 5],
      left: [6, 7],
      right: [8, 9],
    });
    expect(FRAME_ANIMASI.diam).toEqual({ up: 4, left: 6, right: 8 });
  });
});
