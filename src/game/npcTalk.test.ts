import { describe, expect, it } from "vitest";

import { npcBisaDiajak, petaObrolan } from "./npcTalk";

const npcs = [
  { id: "char_a", x: 0, y: 0 },
  { id: "char_b", x: 0, y: 0 },
  { id: "char_c", x: 0, y: 0 },
];

describe("petaObrolan", () => {
  it("hanya memuat karakter yang punya obrolan tidak kosong", () => {
    const peta = petaObrolan([
      { id: "char_a", smallTalk: "Ada yang bisa kubantu?" },
      { id: "char_b", smallTalk: "   " },
      { id: "char_c" },
    ]);

    expect([...peta.keys()]).toEqual(["char_a"]);
    expect(peta.get("char_a")).toBe("Ada yang bisa kubantu?");
  });

  it("merapikan spasi di ujung baris obrolan", () => {
    const peta = petaObrolan([{ id: "char_a", smallTalk: "  Halo!  " }]);

    expect(peta.get("char_a")).toBe("Halo!");
  });
});

describe("npcBisaDiajak", () => {
  it("memasukkan pemberi quest walau tanpa baris obrolan", () => {
    const daftar = npcBisaDiajak(npcs, "char_b", new Map());

    expect(daftar.map((npc) => npc.id)).toEqual(["char_b"]);
  });

  it("memasukkan NPC dengan obrolan dan membiarkan sisanya diam", () => {
    const obrolan = new Map([
      ["char_a", "Halo!"],
      ["char_c", "Hai!"],
    ]);
    const daftar = npcBisaDiajak(npcs, "char_b", obrolan);

    expect(daftar.map((npc) => npc.id)).toEqual(["char_a", "char_b", "char_c"]);
  });

  it("mengembalikan daftar kosong bila tidak ada yang bisa diajak", () => {
    expect(npcBisaDiajak(npcs, null, new Map())).toEqual([]);
  });
});
