import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CookiePage from "./cookie/page";
import PenafianPage from "./penafian/page";
import PrivasiPage from "./privasi/page";
import SyaratPage from "./syarat/page";

/**
 * Empat dokumen legal adalah halaman terpisah, bukan tab SPA. Tes ini menjaga:
 * - setiap route menampilkan judulnya sendiri;
 * - navigasi dokumen menandai halaman aktif dengan `aria-current`;
 * - kaki halaman menautkan keempat dokumen;
 * - isi yang paling mudah salah (kunci cookie) tetap sesuai kode.
 */

afterEach(cleanup);

const HALAMAN = [
  {
    path: "/privasi",
    label: "Privasi",
    judul: "Kebijakan Privasi",
    Halaman: PrivasiPage,
  },
  {
    path: "/syarat",
    label: "Syarat & Ketentuan",
    judul: "Syarat & Ketentuan",
    Halaman: SyaratPage,
  },
  {
    path: "/penafian",
    label: "Penafian",
    judul: "Penafian",
    Halaman: PenafianPage,
  },
  {
    path: "/cookie",
    label: "Cookie",
    judul: "Kebijakan Cookie & Penyimpanan Lokal",
    Halaman: CookiePage,
  },
] as const;

const SEMUA_HREF = HALAMAN.map((halaman) => halaman.path);

describe("halaman legal", () => {
  it.each(HALAMAN)(
    "$path menampilkan judul dan dokumen lain",
    ({ label, judul, Halaman }) => {
      render(<Halaman />);

      expect(
        screen.getByRole("heading", { level: 1, name: judul }),
      ).toBeInTheDocument();

      const nav = screen.getByRole("navigation", { name: "Dokumen legal" });

      expect(
        within(nav)
          .getAllByRole("link")
          .map((tautan) => tautan.getAttribute("href")),
      ).toEqual(SEMUA_HREF);

      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );

  it("menautkan dokumen legal dari kaki halaman", () => {
    render(<PrivasiPage />);

    const footer = screen.getByRole("navigation", { name: "Tautan legal" });

    expect(
      within(footer)
        .getAllByRole("link")
        .map((tautan) => tautan.getAttribute("href")),
    ).toEqual(SEMUA_HREF);
  });

  it("kebijakan cookie hanya menyebut kunci yang dipakai kode", () => {
    render(<CookiePage />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    // Kunci tampil dua kali: sekali di tabel (layar lebar) dan sekali di kartu
    // (layar kecil); hanya salah satu yang terlihat lewat CSS.
    expect(
      screen.getAllByText("classquest_teacher_session").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("classquest:settings:v1").length,
    ).toBeGreaterThan(0);

    // Kunci dari desain HTML asal tidak boleh muncul lagi.
    expect(screen.queryByText("cq_session_auth")).toBeNull();
    expect(screen.queryByText("cq_class_token")).toBeNull();
    expect(screen.queryByText("eduacademic_teacher_draft")).toBeNull();
  });

  it("kebijakan privasi menyebut PDF tidak disimpan", () => {
    render(<PrivasiPage />);

    expect(
      screen.getByText(/tidak disimpan ke disk, bucket, atau database/i),
    ).toBeInTheDocument();
  });

  it("tidak menjanjikan fitur backlog di dokumen legal", () => {
    for (const { Halaman } of HALAMAN) {
      const { container, unmount } = render(<Halaman />);

      expect(container.textContent).not.toMatch(/leaderboard|lencana/i);

      unmount();
    }
  });
});
