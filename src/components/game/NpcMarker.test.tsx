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
    expect(pembungkus).not.toHaveAttribute("data-tepi");
    expect(badge().querySelector("svg")).toBeNull();
    expect(pembungkus?.style.left).toBe(persenLebar(200));
    expect(pembungkus?.style.top).toBe(persenTinggi(120));
  });

  it("menempel di tepi layar dengan panah arah saat NPC di luar pandangan", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 20, y: 180, tepi: true, sudut: 180 }}
      />,
    );

    const pembungkus = badge().parentElement;
    expect(pembungkus).toHaveAttribute("data-tepi", "true");
    expect(pembungkus).toHaveAttribute("data-sudut", "180");
    // Jangkar sama dengan penanda biasa supaya tidak melompat saat NPC masuk
    // layar: kiri-bawah, dengan panah sebagai pembeda mode tepi.
    expect(pembungkus?.className).toContain("-translate-x-1/2");
    expect(pembungkus?.className).toContain("-translate-y-full");

    const panah = badge().querySelector("svg");
    expect(panah).not.toBeNull();
    expect(panah?.getAttribute("style")).toContain("rotate(180deg)");
  });
});
