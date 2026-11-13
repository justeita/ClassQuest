import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `next/font/google` baru bekerja setelah ditransformasi Next.js; di Vitest
 * modulnya kosong. Stub ini mengembalikan nama variabel CSS supaya komponen
 * bisa dirender tanpa build. Yang diuji di sini perilaku halaman, bukan
 * pemuatan font (itu urusan `bun run build`).
 */
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "--font-stub", className: "font-stub" });
  return { Inter: font, Pixelify_Sans: font, Plus_Jakarta_Sans: font };
});

import NotFound from "./not-found";

afterEach(cleanup);

describe("NotFound", () => {
  it("menjelaskan bahwa halaman tidak ditemukan", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /halaman tidak ditemukan/i,
      }),
    ).toBeInTheDocument();
  });

  it("menawarkan jalan keluar: beranda dan dua portal", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: /kembali ke beranda/i }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /portal guru/i })).toHaveAttribute(
      "href",
      "/guru",
    );
    expect(screen.getByRole("link", { name: /arena siswa/i })).toHaveAttribute(
      "href",
      "/game",
    );
  });
});
