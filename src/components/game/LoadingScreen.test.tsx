import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";

import { LoadingScreen } from "./LoadingScreen";

/**
 * Layar muat menggantikan teks progres di canvas, jadi kontraknya diuji di sini:
 * keadaan tak tentu vs terukur, pemudaran setelah `selesai`, dan jalan keluar
 * saat Phaser gagal dimuat. Tanpa yang terakhir, layar muat bisa berputar
 * selamanya — kegagalan yang tidak tertangkap typecheck.
 */

const TANPA_AKSI = () => {};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LoadingScreen", () => {
  it("menampilkan judul dan asal materi cerita", () => {
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={null}
        selesai={false}
        onBatal={TANPA_AKSI}
      />,
    );

    expect(screen.getByText(DEMO_STORY.meta.title)).toBeInTheDocument();
    expect(
      screen.getByText(
        `${DEMO_STORY.meta.subject} · ${DEMO_STORY.meta.gradeLevel}`,
      ),
    ).toBeInTheDocument();
  });

  it("keadaan tak tentu tidak mengarang persentase", () => {
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={null}
        selesai={false}
        onBatal={TANPA_AKSI}
      />,
    );

    const bilah = screen.getByRole("progressbar", {
      name: /memuat permainan/i,
    });
    expect(bilah).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByRole("status")).toHaveTextContent("Menyiapkan dunia…");
    expect(screen.getByText("··")).toBeInTheDocument();
  });

  it("menampilkan persen aset dan status akhir saat progres penuh", () => {
    const { rerender } = render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={0.42}
        selesai={false}
        onBatal={TANPA_AKSI}
      />,
    );

    const bilah = screen.getByRole("progressbar", {
      name: /memuat permainan/i,
    });
    expect(bilah).toHaveAttribute("aria-valuenow", "42");
    expect(bilah).toHaveAttribute("aria-valuetext", "42%");
    expect(screen.getByRole("status")).toHaveTextContent("Memuat aset desa…");

    rerender(
      <LoadingScreen
        story={DEMO_STORY}
        progress={1}
        selesai={false}
        onBatal={TANPA_AKSI}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Menyusun scene pertama…",
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("progres di luar 0–1 dijepit, bukan menghasilkan lebar aneh", () => {
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={1.8}
        selesai={false}
        onBatal={TANPA_AKSI}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: /memuat permainan/i }),
    ).toHaveAttribute("aria-valuenow", "100");
  });

  it("memudar lalu melepas diri setelah siap dimainkan", () => {
    vi.useFakeTimers();
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={1}
        selesai
        onBatal={TANPA_AKSI}
      />,
    );

    const lapisan = screen
      .getByText(DEMO_STORY.meta.title)
      .closest("[data-muat]");
    expect(lapisan).toHaveAttribute("data-muat", "selesai");
    expect(lapisan?.className).not.toContain("opacity-0");

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(lapisan?.className).toContain("opacity-0");

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText(DEMO_STORY.meta.title)).not.toBeInTheDocument();
  });

  it("saat gagal menampilkan pesan dan tombol coba lagi, bukan bilah selamanya", () => {
    const cobaLagi = vi.fn();
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={null}
        selesai={false}
        gagal
        onBatal={TANPA_AKSI}
        onCobaLagi={cobaLagi}
      />,
    );

    expect(
      screen.queryByRole("progressbar", { name: /memuat permainan/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Game gagal dimuat. Periksa koneksi, lalu coba lagi.",
    );

    screen.getByRole("button", { name: /coba lagi/i }).click();
    expect(cobaLagi).toHaveBeenCalledTimes(1);
  });

  it("tombol Batal memanggil pemanggil, bukan menutup tab", () => {
    const batal = vi.fn();
    render(
      <LoadingScreen
        story={DEMO_STORY}
        progress={0.1}
        selesai={false}
        onBatal={batal}
      />,
    );

    screen.getByRole("button", { name: /^batal$/i }).click();
    expect(batal).toHaveBeenCalledTimes(1);
  });
});
