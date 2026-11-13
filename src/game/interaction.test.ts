import { describe, expect, it } from "vitest";

import {
  findNpcInZone,
  GESER_PROMPT,
  JARAK_PROMPT,
  posisiPrompt,
  ZONA_HISTERESIS,
  ZONA_RADIUS,
} from "./interaction";
import { TINGGI_KARAKTER } from "./world/karakter";

const npcs = [
  { id: "a", x: 100, y: 100 },
  { id: "b", x: 200, y: 100 },
];

describe("findNpcInZone", () => {
  it("mengembalikan NPC di dalam radius, termasuk tepat di tepi", () => {
    expect(findNpcInZone(npcs, 100 + ZONA_RADIUS, 100)).toBe("a");
    expect(findNpcInZone(npcs, 100 + ZONA_RADIUS + 1, 100)).toBeNull();
  });

  it("radius keluar lebih besar memberi histeresis", () => {
    const keluar = ZONA_RADIUS + ZONA_HISTERESIS;
    expect(findNpcInZone(npcs, 100 + keluar, 100, keluar)).toBe("a");
    expect(findNpcInZone(npcs, 100 + keluar + 1, 100, keluar)).toBeNull();
  });

  it("memilih NPC terdekat bila dua-duanya di dalam radius", () => {
    const berdekatan = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 140, y: 100 },
    ];
    expect(findNpcInZone(berdekatan, 118, 100)).toBe("a");
    expect(findNpcInZone(berdekatan, 122, 100)).toBe("b");
  });
});

describe("posisiPrompt", () => {
  it("menaruh kotak di kanan penanda, di atas ubun-ubun NPC", () => {
    expect(posisiPrompt(npcs, "a")).toEqual({
      text: "Space",
      x: 100 + GESER_PROMPT,
      y: 100 - TINGGI_KARAKTER - JARAK_PROMPT,
    });
  });

  it("memusatkan kotak di titik kaki NPC untuk obrolan singkat", () => {
    // Tanpa penanda `!`, kotak sejajar dengan papan nama yang juga center.
    expect(posisiPrompt(npcs, "a", false)).toEqual({
      text: "Space",
      x: 100,
      y: 100 - TINGGI_KARAKTER - JARAK_PROMPT,
    });
  });

  it("tidak mengembalikan posisi untuk NPC yang tidak ada", () => {
    expect(posisiPrompt(npcs, "tidak-ada")).toBeNull();
  });
});
