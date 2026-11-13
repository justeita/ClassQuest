import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NpcMarker } from "./NpcMarker";
import { persenLebar, persenTinggi } from "@/game/layout";

afterEach(cleanup);

function penandaDekat() {
  return document.querySelector<HTMLElement>('[data-tanda="dekat"]');
}

describe("NpcMarker", () => {
  it("menampilkan tanda seru tinggi dan nama di atas kepala NPC", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", nama: "Pak Wira", x: 200, y: 120 }}
      />,
    );

    const pembungkus = penandaDekat();
    expect(pembungkus?.className).toContain("-translate-y-full");
    expect(pembungkus?.className).toContain("z-10");
    expect(pembungkus).not.toHaveAttribute("data-tepi");
    expect(pembungkus?.style.left).toBe(persenLebar(200));
    expect(pembungkus?.style.top).toBe(persenTinggi(120));

    // Tanda seru digambar sebagai batang + titik, bukan badge kecil.
    expect(pembungkus?.querySelector('[data-bagian="batang"]')).not.toBeNull();
    expect(pembungkus?.querySelector('[data-bagian="titik"]')).not.toBeNull();
    expect(screen.queryByText("!")).not.toBeInTheDocument();
  });

  it("menulis nama display NPC dengan jelas di papan nama", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", nama: "Pak Wira", x: 200, y: 120 }}
      />,
    );

    const nama = screen.getByText("Pak Wira");
    expect(nama).toHaveAttribute("data-bagian", "nama");
    expect(nama.className).toContain("bg-[#0b120e]/90");
    expect(nama.className).toContain("text-[#F7F4EC]");
    expect(nama.className).toContain("font-bold");
  });

  it("menampilkan beacon besar di tepi layar dengan penunjuk arah", () => {
    render(
      <NpcMarker
        marker={{
          npcId: "char_npc_10",
          nama: "Pak Wira",
          x: 26,
          y: 180,
          tepi: true,
          sudut: 180,
        }}
      />,
    );

    const pembungkus =
      document.querySelector<HTMLElement>('[data-tepi="true"]');
    expect(pembungkus?.className).toContain("-translate-x-1/2");
    expect(pembungkus?.className).toContain("-translate-y-1/2");
    // Di depan baris HUD, tetapi tetap tembus klik.
    expect(pembungkus?.className).toContain("z-30");
    expect(pembungkus?.className).toContain("pointer-events-none");

    // Kotak indikator memakai gaya HUD, bukan badge oranye di atas NPC.
    const kotak = screen.getByText("!");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#E8A87C]");

    // Penunjuk duduk di luar kotak dan berputar mengikuti arah NPC.
    const penunjuk = document.querySelector<HTMLElement>(
      '[data-penunjuk="true"]',
    );
    expect(penunjuk).toHaveAttribute("data-sudut", "180");
    expect(penunjuk?.style.transform).toBe("rotate(270deg)");

    // Nama tidak ikut ke beacon karena NPC sedang di luar layar.
    expect(screen.queryByText("Pak Wira")).not.toBeInTheDocument();
  });

  it("menghadapkan penunjuk ke atas saat NPC berada di atas layar", () => {
    render(
      <NpcMarker
        marker={{
          npcId: "char_npc_10",
          nama: "Pak Wira",
          x: 320,
          y: 68,
          tepi: true,
          sudut: -90,
        }}
      />,
    );

    expect(
      document.querySelector<HTMLElement>('[data-penunjuk="true"]')?.style
        .transform,
    ).toBe("rotate(0deg)");
  });
});
