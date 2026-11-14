import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

/**
 * jsdom belum punya pemutaran media: `play()` hanya mencetak "Not implemented".
 * Ganti dengan stub senyap supaya `GamePreview` (yang memanggil `play()` saat
 * mount) tidak membanjiri keluaran tes dengan peringatan.
 */
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() =>
    Promise.resolve(),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Home", () => {
  it("menampilkan ajakan memilih peran", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /pilih peran/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /portal guru/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /arena siswa/i }),
    ).toBeInTheDocument();
  });

  it("menautkan kartu guru ke portal dan kartu siswa ke gerbang kode kelas", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /masuk sebagai guru/i }),
    ).toHaveAttribute("href", "/guru");
    expect(
      screen.getByRole("link", { name: /masuk sebagai siswa/i }),
    ).toHaveAttribute("href", "/play");
  });

  it("menjelaskan alur empat langkah di halaman yang sama", () => {
    render(<Home />);

    for (const judul of [
      "Unggah PDF",
      "AI menyusun cerita",
      "Guru menyunting",
      "Siswa bermain",
    ]) {
      expect(screen.getByText(judul)).toBeInTheDocument();
    }
  });

  it("memutar rekaman game dengan autoplay senyap yang berulang", () => {
    render(<Home />);

    const rekaman = screen.getByLabelText(/rekaman permainan/i);
    expect(rekaman.tagName).toBe("VIDEO");
    expect(rekaman).toHaveAttribute("src", "/menu/hero_loop.mp4");
    // Autoplay hanya diizinkan browser bila video senyap dan main di tempat.
    expect((rekaman as HTMLVideoElement).muted).toBe(true);
    expect(rekaman).toHaveAttribute("playsinline");
    expect(rekaman).toHaveAttribute("loop");
    expect(rekaman).toHaveAttribute("autoplay");
    expect(rekaman).toHaveAttribute("poster", "/menu/hero_loop.jpg");
  });

  it("membingkai halaman dengan kepala dan kaki yang sama", () => {
    render(<Home />);

    // Logo kepala halaman menautkan pulang.
    expect(
      screen.getByRole("link", { name: /class quest — beranda/i }),
    ).toHaveAttribute("href", "/");

    // Kaki halaman menyebut penyelenggara dan menyediakan jalan kembali ke atas.
    expect(screen.getByText(/smart & fun education/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /kembali ke atas/i }),
    ).toHaveAttribute("href", "#atas");
  });
});
