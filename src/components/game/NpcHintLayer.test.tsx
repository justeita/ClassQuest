import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NpcHintLayer } from "./NpcHintLayer";
import { DURASI_KELUAR_MS } from "./animasiPrompt";
import { GameBus } from "@/game/gameBus";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NpcHintLayer", () => {
  it("menahan kotak Space obrolan singkat selama animasi keluar", () => {
    vi.useFakeTimers();
    const bus = new GameBus();
    render(<NpcHintLayer bus={bus} tersembunyi={false} />);

    act(() => {
      bus.emit({
        type: "prompt",
        hint: { text: "Space", x: 320, y: 180, menempel: false },
      });
    });
    expect(screen.getByText("Space").className).toContain("animate-quest-pop");

    // Pemain keluar zona: kotak tidak langsung hilang, tetapi beranimasi keluar.
    act(() => {
      bus.emit({ type: "prompt", hint: null });
    });
    expect(screen.getByText("Space").className).toContain(
      "animate-quest-pop-out",
    );

    // Setelah durasi keluar, kotak baru benar-benar dilepas dari DOM.
    act(() => {
      vi.advanceTimersByTime(DURASI_KELUAR_MS + 10);
    });
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
  });

  it("membatalkan animasi keluar bila pemain masuk lagi", () => {
    vi.useFakeTimers();
    const bus = new GameBus();
    render(<NpcHintLayer bus={bus} tersembunyi={false} />);

    act(() => {
      bus.emit({
        type: "prompt",
        hint: { text: "Space", x: 320, y: 180, menempel: false },
      });
      bus.emit({ type: "prompt", hint: null });
    });
    expect(screen.getByText("Space").className).toContain(
      "animate-quest-pop-out",
    );

    // Masuk lagi sebelum jeda habis: timer batal dan kotak memainkan animasi
    // masuk, jadi tidak sempat terlepas di tengah jalan.
    act(() => {
      bus.emit({
        type: "prompt",
        hint: { text: "Space", x: 300, y: 170, menempel: false },
      });
    });
    expect(screen.getByText("Space").className).toContain("animate-quest-pop");

    act(() => {
      vi.advanceTimersByTime(DURASI_KELUAR_MS + 10);
    });
    expect(screen.getByText("Space")).toBeInTheDocument();
  });

  it("tidak menggandakan kotak saat paket penanda quest keluar", () => {
    vi.useFakeTimers();
    const bus = new GameBus();
    render(<NpcHintLayer bus={bus} tersembunyi={false} />);

    act(() => {
      bus.emit({
        type: "markers",
        markers: [{ npcId: "char_npc_6", x: 320, y: 120 }],
      });
      bus.emit({
        type: "prompt",
        hint: { text: "Space", x: 320, y: 96, menempel: true },
      });
    });

    // Pemberi quest menempel: `!` dan `Space` satu paket, bukan dua kotak.
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(screen.getAllByText("Space")).toHaveLength(1);

    // Saat keluar, kotak paket dianimasikan oleh `NpcMarker`, jadi
    // `NpcHintLayer` tidak boleh menambah salinan standalone.
    act(() => {
      bus.emit({ type: "prompt", hint: null });
    });
    expect(screen.getAllByText("Space")).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(DURASI_KELUAR_MS + 10);
    });
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
  });
});
