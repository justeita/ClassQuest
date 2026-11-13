import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NpcMarker } from "./NpcMarker";
import { persenLebar, persenTinggi } from "@/game/layout";

afterEach(cleanup);

function penandaDekat() {
  return document.querySelector<HTMLElement>('[data-tanda="dekat"]');
}

describe("NpcMarker", () => {
  it("menampilkan kotak ! yang naik-turun di atas kepala NPC", () => {
    render(<NpcMarker marker={{ npcId: "char_npc_10", x: 200, y: 120 }} />);

    const pembungkus = penandaDekat();
    expect(pembungkus?.className).toContain("-translate-y-full");
    expect(pembungkus?.className).toContain("z-10");
    expect(pembungkus?.className).toContain("pointer-events-none");
    expect(pembungkus).not.toHaveAttribute("data-tepi");
    expect(pembungkus?.style.left).toBe(persenLebar(200));
    expect(pembungkus?.style.top).toBe(persenTinggi(120));

    // Kotak memakai gaya HUD yang sama dengan beacon, dengan animasi bob.
    const kotak = screen.getByText("!");
    expect(kotak.className).toContain("animate-quest-bob");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#E8A87C]");
  });

  it("menampilkan beacon tepi layar dengan penunjuk arah", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 16, y: 180, tepi: true, sudut: 180 }}
      />,
    );

    const pembungkus =
      document.querySelector<HTMLElement>('[data-tepi="true"]');
    expect(pembungkus?.className).toContain("-translate-x-1/2");
    expect(pembungkus?.className).toContain("-translate-y-1/2");
    // Di depan baris HUD, tetapi tetap tembus klik.
    expect(pembungkus?.className).toContain("z-30");
    expect(pembungkus?.className).toContain("pointer-events-none");

    // Kotak indikator memakai gaya HUD yang sama dengan mode dekat.
    const kotak = screen.getByText("!");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#E8A87C]");
    expect(kotak.className).not.toContain("animate-quest-bob");

    // Cincin denyut menandai "ada yang perlu dituju".
    expect(
      document.querySelector<HTMLElement>(".animate-quest-beacon"),
    ).not.toBeNull();

    // Penunjuk duduk di luar kotak dan berputar mengikuti arah NPC.
    const penunjuk = document.querySelector<HTMLElement>(
      '[data-penunjuk="true"]',
    );
    expect(penunjuk).toHaveAttribute("data-sudut", "180");
    expect(penunjuk?.style.transform).toBe("rotate(270deg)");
  });

  it("menghadapkan penunjuk ke atas saat NPC berada di atas layar", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 320, y: 24, tepi: true, sudut: -90 }}
      />,
    );

    expect(
      document.querySelector<HTMLElement>('[data-penunjuk="true"]')?.style
        .transform,
    ).toBe("rotate(0deg)");
  });
});
