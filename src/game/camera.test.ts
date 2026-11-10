import { describe, expect, it } from "vitest";

import { CAMERA_LERP, DEADZONE_TILES, deadzonePx, kameraMode } from "./camera";

describe("kameraMode", () => {
  it("ruangan seukuran layar dikunci ke tengah", () => {
    expect(kameraMode({ widthTiles: 40, heightTiles: 22.5 })).toBe("lock");
    expect(kameraMode({ widthTiles: 30, heightTiles: 20 })).toBe("lock");
  });

  it("ruangan lebih luas dari layar mengikuti pemain", () => {
    expect(kameraMode({ widthTiles: 48, heightTiles: 28 })).toBe("follow");
    expect(kameraMode({ widthTiles: 41, heightTiles: 23 })).toBe("follow");
  });

  it("melebihi salah satu dimensi saja sudah cukup untuk follow", () => {
    expect(kameraMode({ widthTiles: 64, heightTiles: 20 })).toBe("follow");
    expect(kameraMode({ widthTiles: 20, heightTiles: 40 })).toBe("follow");
  });
});

describe("deadzone dan lerp", () => {
  it("dead zone 8×6 tile dalam piksel", () => {
    expect(deadzonePx()).toEqual({ width: 128, height: 96 });
    expect(DEADZONE_TILES).toEqual({ width: 8, height: 6 });
  });

  it("lerp 0.12 sesuai world-design.md", () => {
    expect(CAMERA_LERP).toBe(0.12);
  });
});
