import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "./page";

afterEach(cleanup);

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

  it("menautkan kartu guru ke portal dan kartu siswa ke demo", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /masuk sebagai guru/i }),
    ).toHaveAttribute("href", "/guru");
    expect(
      screen.getByRole("link", { name: /masuk sebagai siswa/i }),
    ).toHaveAttribute("href", "/game");
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

  it("menampilkan cuplikan game yang punya teks alternatif", () => {
    render(<Home />);

    expect(screen.getByAltText(/peta desa/i)).toBeInTheDocument();
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
