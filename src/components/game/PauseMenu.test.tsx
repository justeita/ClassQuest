import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PengaturanAudio } from "@/game/audioSettings";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { PauseMenu } = await import("./PauseMenu");

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

afterEach(cleanup);

function buka(pengaturan: PengaturanAudio = { music: 0.3, sfx: 0.5 }) {
  const props = {
    onLanjut: vi.fn(),
    onUlangiChapter: vi.fn(),
    pengaturan,
    onUbahAudio: vi.fn(),
  };
  render(<PauseMenu {...props} />);
  return props;
}

describe("PauseMenu", () => {
  it("menampilkan semua pilihan dalam satu dialog", () => {
    buka();

    expect(screen.getByRole("dialog", { name: "Jeda" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^lanjut$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ulangi chapter/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /keluar/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("mengirim aksi lanjut dan ulangi chapter", () => {
    const props = buka();

    fireEvent.click(screen.getByRole("button", { name: /^lanjut$/i }));
    fireEvent.click(screen.getByRole("button", { name: /ulangi chapter/i }));

    expect(props.onLanjut).toHaveBeenCalledTimes(1);
    expect(props.onUlangiChapter).toHaveBeenCalledTimes(1);
  });

  it("mengubah volume per kanal dan bisa mematikan suara", () => {
    const props = buka();

    fireEvent.change(screen.getByRole("slider", { name: "Musik" }), {
      target: { value: "70" },
    });
    expect(props.onUbahAudio).toHaveBeenCalledWith("music", 0.7);

    fireEvent.click(screen.getByRole("button", { name: "Musik nyala" }));
    expect(props.onUbahAudio).toHaveBeenCalledWith("music", 0);
  });

  it("memberi penanda tata letak dua kolom untuk lanskap pendek", () => {
    buka();

    const dialog = screen.getByRole("dialog", { name: "Jeda" });
    expect(dialog.className).toContain("menu-jeda");
    expect(dialog.querySelector(".menu-jeda-isi")).not.toBeNull();
    expect(dialog.querySelector(".menu-jeda-suara")).not.toBeNull();
    expect(dialog.querySelector(".menu-jeda-aksi")).not.toBeNull();

    // Aturan CSS-nya yang membuat dua kolom benar-benar aktif di layar pendek.
    const blok = CSS.slice(CSS.indexOf("@media (max-height: 30rem)"));
    expect(blok).toContain(".menu-jeda-isi");
    expect(blok).toContain("grid-template-columns");
    expect(blok).toContain("minmax(0, 1fr)");
  });
});
