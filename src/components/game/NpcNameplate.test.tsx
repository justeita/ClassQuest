import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NpcNameplate } from "./NpcNameplate";
import { persenLebar, persenTinggi } from "@/game/layout";

afterEach(cleanup);

describe("NpcNameplate", () => {
  it("menulis nama NPC di atas kepalanya dengan gaya chip HUD", () => {
    render(
      <NpcNameplate
        plate={{ npcId: "char_npc_10", nama: "Edric", x: 200, y: 120 }}
      />,
    );

    const pembungkus = document.querySelector<HTMLElement>(
      '[data-nama-npc="char_npc_10"]',
    );
    expect(pembungkus?.className).toContain("-translate-x-1/2");
    expect(pembungkus?.className).toContain("-translate-y-full");
    expect(pembungkus?.className).toContain("pointer-events-none");
    expect(pembungkus?.style.left).toBe(persenLebar(200));
    expect(pembungkus?.style.top).toBe(persenTinggi(120));

    const nama = screen.getByText("Edric");
    expect(nama.className).toContain("bg-[#0b120e]/85");
    expect(nama.className).toContain("border-[#3D4B41]");
    expect(nama.className).toContain("text-[#F7F4EC]");
    expect(nama.className).toContain("font-bold");
    // Nama panjang dipotong elipsis, bukan menutupi dunia.
    expect(nama.className).toContain("text-ellipsis");
    expect(nama.className).toContain("overflow-hidden");
  });
});
