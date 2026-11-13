import { describe, expect, it } from "vitest";

import {
  CAMERA_LERP,
  DEADZONE_PX,
  ZOOM_KAMERA,
  deadzoneDunia,
  deadzonePx,
  kameraMode,
} from "./camera";

describe("kameraMode", () => {
  it("dunia seukuran layar atau lebih kecil dikunci ke tengah", () => {
    expect(kameraMode({ width: 640, height: 360 })).toBe("lock");
    expect(kameraMode({ width: 480, height: 300 })).toBe("lock");
  });

  it("dunia lebih luas dari layar mengikuti pemain", () => {
    expect(kameraMode({ width: 2390, height: 1792 })).toBe("follow");
    expect(kameraMode({ width: 641, height: 360 })).toBe("follow");
  });

  it("melebihi salah satu dimensi saja sudah cukup untuk follow", () => {
    expect(kameraMode({ width: 1024, height: 200 })).toBe("follow");
    expect(kameraMode({ width: 200, height: 400 })).toBe("follow");
  });
});

describe("deadzone dan lerp", () => {
  it("dead zone 128×96 px", () => {
    expect(deadzonePx()).toEqual({ width: 128, height: 96 });
    expect(DEADZONE_PX).toEqual({ width: 128, height: 96 });
  });

  it("kamera menempel pemain tanpa luncuran", () => {
    expect(CAMERA_LERP).toBe(1);
  });
});

describe("zoom kamera", () => {
  it("sedikit di bawah 1 supaya dunia terasa lebih luas tanpa ekstrem", () => {
    expect(ZOOM_KAMERA).toBeGreaterThan(0.6);
    expect(ZOOM_KAMERA).toBeLessThan(1);
  });

  it("dead zone dunia dikompensasi supaya tetap 128×96 px di layar", () => {
    expect(deadzoneDunia(ZOOM_KAMERA)).toEqual({
      width: DEADZONE_PX.width / ZOOM_KAMERA,
      height: DEADZONE_PX.height / ZOOM_KAMERA,
    });
    // Pada zoom 1 nilainya sama dengan dead zone layar.
    expect(deadzoneDunia(1)).toEqual({ width: 128, height: 96 });
  });
});
