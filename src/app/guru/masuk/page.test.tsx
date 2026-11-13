import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import MasukPage from "./page";

/**
 * Halaman masuk guru.
 *
 * Yang dijaga: identitas brand (logo penuh + chip kompetisi) dan empat langkah
 * alur tampil, dan panel brand **tidak** menjanjikan fitur yang belum ada
 * (XP, lencana, leaderboard) — itu bertentangan dengan
 * `docs/00-product/mvp-scope.md` dan aturan copy di
 * `docs/05-frontend/ui-conventions.md`.
 */

afterEach(cleanup);

describe("MasukPage", () => {
  it("menampilkan identitas brand dan empat langkah alur", () => {
    render(<MasukPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ubah materi pelajaran jadi game/i,
    );
    expect(
      screen.getByRole("link", { name: /class quest — beranda/i }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByText("LOGICODIX 2026")).toBeInTheDocument();

    for (const judul of [
      "Unggah PDF",
      "AI menyusun cerita",
      "Guru menyunting",
      "Siswa bermain",
    ]) {
      expect(screen.getByText(judul)).toBeInTheDocument();
    }
  });

  it("menyediakan jalan kembali ke beranda", () => {
    render(<MasukPage />);

    expect(
      screen.getByRole("link", { name: /kembali ke beranda/i }),
    ).toHaveAttribute("href", "/");
  });

  it("tidak menjanjikan fitur yang belum ada di panel brand", () => {
    render(<MasukPage />);

    expect(
      screen.queryByText(/lencana|leaderboard|\bXP\b|active students/i),
    ).not.toBeInTheDocument();
  });
});
