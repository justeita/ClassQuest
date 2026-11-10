import { describe, expect, it } from "vitest";

import { DEPTH_DINDING, DEPTH_LANTAI, DEPTH_UI } from "./depth";
import { resolveRoomData } from "./maps/roomData";
import { TILE_SIZE } from "./maps/types";

describe("urutan depth", () => {
  it("lantai di bawah dinding, dinding di bawah UI", () => {
    expect(DEPTH_LANTAI).toBeLessThan(DEPTH_DINDING);
    expect(DEPTH_DINDING).toBeLessThan(DEPTH_UI);
  });

  it("UI di atas objek dunia setinggi map terbesar", () => {
    // Objek dunia memakai setDepth(y); y terbesar = tinggi map dalam piksel.
    const tertinggi = Math.max(
      ...["default", "sc_01_01", "sc_03_03", "sc_02_01", "sc_03_01"].map(
        (id) => resolveRoomData(id).heightTiles * TILE_SIZE,
      ),
    );

    expect(DEPTH_UI).toBeGreaterThan(tertinggi);
    expect(tertinggi).toBeGreaterThan(0);
  });
});
