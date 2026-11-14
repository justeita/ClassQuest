import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TombolLayarPenuh } from "./TombolLayarPenuh";

afterEach(cleanup);

type Tiruan = {
  request: ReturnType<typeof vi.fn>;
  exit: ReturnType<typeof vi.fn>;
  lock: ReturnType<typeof vi.fn>;
  unlock: ReturnType<typeof vi.fn>;
  /** Tiru peramban menyelesaikan permintaan layar penuh. */
  selesaiMasuk: () => void;
};

/**
 * jsdom tidak punya Fullscreen API maupun `screen.orientation`. Tiruan kecil ini
 * memasang keduanya supaya kontrak tombol — panggil `requestFullscreen`, kunci
 * mendatar, lepas saat keluar — bisa diperiksa tanpa peramban sungguhan.
 */
function pasangApi(didukung = true): Tiruan {
  const request = vi.fn().mockResolvedValue(undefined);
  const exit = vi.fn().mockResolvedValue(undefined);
  const lock = vi.fn().mockResolvedValue(undefined);
  const unlock = vi.fn();

  Object.defineProperty(document, "fullscreenEnabled", {
    value: didukung,
    configurable: true,
  });
  Object.defineProperty(document, "fullscreenElement", {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    value: request,
    configurable: true,
  });
  Object.defineProperty(document, "exitFullscreen", {
    value: exit,
    configurable: true,
  });
  Object.defineProperty(window.screen, "orientation", {
    value: { lock, unlock },
    configurable: true,
  });

  return {
    request,
    exit,
    lock,
    unlock,
    selesaiMasuk: () => {
      (
        document as unknown as { fullscreenElement: Element | null }
      ).fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

function bersihkanApi() {
  delete (document as unknown as Record<string, unknown>).fullscreenEnabled;
  delete (document as unknown as Record<string, unknown>).fullscreenElement;
  delete (document.documentElement as unknown as Record<string, unknown>)
    .requestFullscreen;
  delete (document as unknown as Record<string, unknown>).exitFullscreen;
  delete (window.screen as unknown as Record<string, unknown>).orientation;
}

describe("TombolLayarPenuh", () => {
  it("menghilang bila peramban tidak punya Fullscreen API", () => {
    pasangApi(false);
    render(<TombolLayarPenuh />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    bersihkanApi();
  });

  it("meminta layar penuh lalu mengunci orientasi mendatar", async () => {
    const api = pasangApi();
    render(<TombolLayarPenuh />);

    fireEvent.click(
      screen.getByRole("button", { name: "Main layar penuh mendatar" }),
    );

    expect(api.request).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.lock).toHaveBeenCalledWith("landscape"));

    bersihkanApi();
  });

  it("label berganti jadi Keluar setelah peramban masuk layar penuh", async () => {
    const api = pasangApi();
    render(<TombolLayarPenuh />);

    api.selesaiMasuk();

    const tombol = await screen.findByRole("button", {
      name: "Keluar dari layar penuh",
    });
    expect(tombol).toHaveAttribute("aria-pressed", "true");
    expect(tombol).toHaveTextContent("Keluar");

    bersihkanApi();
  });

  it("keluar melepas kunci orientasi lebih dulu", async () => {
    const api = pasangApi();
    render(<TombolLayarPenuh />);
    api.selesaiMasuk();

    fireEvent.click(
      await screen.findByRole("button", { name: "Keluar dari layar penuh" }),
    );

    await waitFor(() => expect(api.exit).toHaveBeenCalledTimes(1));
    expect(api.unlock).toHaveBeenCalledTimes(1);

    bersihkanApi();
  });

  it("mode ringkas menyembunyikan label teks", async () => {
    const api = pasangApi();
    render(<TombolLayarPenuh ringkas />);

    const tombol = screen.getByRole("button", {
      name: "Main layar penuh mendatar",
    });
    expect(tombol).not.toHaveTextContent("Layar penuh");

    void api;
    bersihkanApi();
  });
});
