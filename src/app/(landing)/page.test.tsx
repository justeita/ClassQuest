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
});
