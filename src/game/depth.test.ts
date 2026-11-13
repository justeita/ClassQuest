import { describe, expect, it } from "vitest";

import { DEPTH_LATAR, DEPTH_UI } from "./depth";
import { VILLAGE } from "./world/village";

describe("urutan depth", () => {
  it("peta desa di bawah UI", () => {
    expect(DEPTH_LATAR).toBeLessThan(DEPTH_UI);
  });

  it("UI di atas objek dunia setinggi apa pun", () => {
    // Objek dunia memakai setDepth(depth) dari data; kedalaman terbesar adalah
    // kaki objek paling bawah di peta.
    const tertinggi = Math.max(
      ...VILLAGE.objects.map((object) => object.depth),
      ...VILLAGE.npcs.map((npc) => npc.depth),
      VILLAGE.height,
    );

    expect(DEPTH_UI).toBeGreaterThan(tertinggi);
    expect(tertinggi).toBeGreaterThan(0);
  });
});
