import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "./page";

afterEach(cleanup);

describe("Home", () => {
  it("menampilkan judul utama dan penjelasan alur", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /materi pelajaran jadi game pixel yang dimainkan siswa/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /unggah materi/i }),
    ).toBeInTheDocument();
  });

  it("menautkan ke portal guru dan game demo", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /masuk sebagai guru/i }),
    ).toHaveAttribute("href", "/guru/masuk");

    const demo = screen.getByRole("link", { name: /coba game demo/i });
    expect(demo.getAttribute("href")).toMatch(/^\/play\/.+/);
  });
});
