import { describe, expect, it } from "vitest";

import { buatTabrakan, KAKI_DALAM, KAKI_SETENGAH_LEBAR } from "./collision";
import type { WorldData } from "./types";

/**
 * Kontrak tabrakan: sama dengan editor peta (`pixel-map-placer.html`).
 *
 * Data uji sengaja kecil dan buatan supaya angka harapannya bisa dihitung
 * tangan — dunia sungguhan diuji lewat `village.json`.
 *
 * Sel padat: `5,5` mencakup x 50–60 dan y 50–60. Kotak kaki pemain 16×9 yang
 * membentang ke atas, jadi "di luar" butuh jarak lebih dari 8 px ke samping.
 */

const DUNIA: WorldData = {
  mapId: "world_map_village",
  width: 200,
  height: 200,
  cell: { width: 10, height: 10 },
  player: { id: "char_mc", x: 100, y: 100, face: 0 },
  blocked: ["5,5"],
  objects: [],
  npcs: [
    { id: "char_npc_1", x: 150, y: 20, face: 0, depth: 20, solid: 1 },
    { id: "char_npc_3", x: 30, y: 150, face: 0, depth: 150, solid: 0 },
  ],
};

describe("buatTabrakan", () => {
  const tabrakan = buatTabrakan(DUNIA);

  it("area bebas tidak menabrak apa pun", () => {
    expect(tabrakan(100, 100)).toBe(false);
  });

  it("sel padat memblok kotak kaki persis seperti editor", () => {
    expect(tabrakan(55, 55)).toBe(true);
    // Menyentuh tepi kiri dan atas sel lewat kotak kaki.
    expect(tabrakan(60, 60)).toBe(true);
    // Sudah lewat: 39 + 8 = 47 (kolom 4), 44 + 0 = 44 (baris 4).
    expect(tabrakan(39, 55)).toBe(false);
    expect(tabrakan(55, 70)).toBe(false);
    expect(tabrakan(55, 44)).toBe(false);
  });

  it("NPC solid memblok, NPC yang tidak solid tidak", () => {
    expect(tabrakan(150, 15)).toBe(true);
    expect(tabrakan(30, 145)).toBe(false);
  });

  it("kotak kaki NPC memakai batas 16×9 yang sama", () => {
    const tepi = 150 - KAKI_SETENGAH_LEBAR * 2;
    expect(tabrakan(tepi + 0.5, 15)).toBe(true);
    expect(tabrakan(tepi, 15)).toBe(false);
    expect(tabrakan(150, 20 - KAKI_DALAM + 0.5)).toBe(true);
    expect(tabrakan(150, 20 - KAKI_DALAM)).toBe(false);
  });
});
