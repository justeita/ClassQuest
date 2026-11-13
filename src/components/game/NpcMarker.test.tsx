import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NpcMarker } from "./NpcMarker";
import { persenLebar, persenTinggi } from "@/game/layout";

afterEach(cleanup);

/** Badge `!`; pembungkusnya adalah elemen yang mengatur posisi & jangkar. */
function badge() {
  return screen.getByText("!");
}

describe("NpcMarker", () => {
  it("menempel di atas kepala NPC saat NPC terlihat", () => {
    render(<NpcMarker marker={{ npcId: "char_npc_10", x: 200, y: 120 }} />);

    const pembungkus = badge().parentElement;
    expect(pembungkus?.className).toContain("-translate-y-full");
    expect(pembungkus?.className).toContain("z-10");
    expect(pembungkus).not.toHaveAttribute("data-tepi");
    expect(badge().querySelector("svg")).toBeNull();
    expect(pembungkus?.style.left).toBe(persenLebar(200));
    expect(pembungkus?.style.top).toBe(persenTinggi(120));
  });

  it("memakai badge oranye yang sama saat NPC terlihat", () => {
    render(<NpcMarker marker={{ npcId: "char_npc_10", x: 200, y: 120 }} />);

    expect(badge().className).toContain("bg-[#E8A87C]");
    expect(badge().className).toContain("font-bold");
  });

  it("menampilkan beacon HUD di tepi layar tanpa panah saat NPC jauh", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 18, y: 180, tepi: true }}
      />,
    );

    const pembungkus = badge().parentElement;
    expect(pembungkus).toHaveAttribute("data-tepi", "true");
    // Beacon duduk di tengah titik jepitan, bukan digeser ke atas.
    expect(pembungkus?.className).toContain("-translate-x-1/2");
    expect(pembungkus?.className).toContain("-translate-y-1/2");
    // Di depan baris HUD, tetapi tetap tembus klik.
    expect(pembungkus?.className).toContain("z-30");
    expect(pembungkus?.className).toContain("pointer-events-none");

    // Tidak ada panah/segitiga: arah ditunjukkan oleh posisi beacon.
    expect(badge().querySelector("svg")).toBeNull();
    expect(pembungkus?.querySelector("svg")).toBeNull();

    // Gaya menyatu dengan tombol HUD, bukan badge oranye di atas NPC.
    expect(badge().className).toContain("bg-[#0b120e]/90");
    expect(badge().className).toContain("text-[#E8A87C]");
  });
});
