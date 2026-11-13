import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NpcMarker } from "./NpcMarker";
import { PENANDA, cqw, persenLebar, persenTinggi } from "@/game/layout";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function penandaDekat() {
  return document.querySelector<HTMLElement>('[data-tanda="dekat"]');
}

/** Elemen paket di dalam penanda dekat: pembungkus `!` (+ `Space`). */
function paketDekat() {
  return penandaDekat()?.firstElementChild as HTMLElement | null;
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

    // Animasi idle duduk di paket, bukan di kotak `!` saja, supaya `!` dan
    // `Space` naik-turun bersama.
    expect(paketDekat()?.className).toContain("animate-quest-bob");

    // Kotak memakai gaya HUD yang sama dengan beacon.
    const kotak = screen.getByText("!");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#E8A87C]");
    expect(kotak.className).not.toContain("animate-quest-bob");

    // Tanpa prompt, tidak ada kotak `Space`.
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
  });

  it("menempelkan kotak Space di kanan ! dalam satu paket saat pemain di zona", () => {
    render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 200, y: 120 }}
        prompt="Space"
      />,
    );

    // `!` dan `Space` berada di paket yang sama, jadi ikut naik-turun bersama.
    const paket = paketDekat();
    const kotakSpace = screen.getByText("Space");
    expect(paket?.contains(kotakSpace)).toBe(true);
    expect(paket?.contains(screen.getByText("!"))).toBe(true);

    // Benar-benar menempel: sudut kiri `Space` di tepi kanan `!`, tinggi sama.
    expect(kotakSpace.className).toContain("absolute");
    expect(kotakSpace.className).toContain("left-full");
    expect(kotakSpace.style.height).toBe(cqw(PENANDA.kotak));
    // Muncul meluncur keluar dari `!`.
    expect(kotakSpace.className).toContain("animate-quest-slide-in");
    expect(kotakSpace.className).not.toContain("animate-quest-slide-out");
  });

  it("mengeluarkan kotak Space dengan animasi saat pemain keluar zona", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <NpcMarker
        marker={{ npcId: "char_npc_10", x: 200, y: 120 }}
        prompt="Space"
      />,
    );
    expect(screen.getByText("Space").className).toContain(
      "animate-quest-slide-in",
    );

    // Prompt hilang: kotak ditahan sebentar dan memainkan animasi keluar.
    rerender(<NpcMarker marker={{ npcId: "char_npc_10", x: 200, y: 120 }} />);
    const keluar = screen.getByText("Space");
    expect(keluar.className).toContain("animate-quest-slide-out");
    expect(keluar.className).not.toContain("animate-quest-slide-in");

    // Setelah durasi keluar, kotak baru benar-benar dilepas dari DOM.
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
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
