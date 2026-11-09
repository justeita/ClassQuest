import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";

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

const { TitleScreen } = await import("./TitleScreen");

afterEach(cleanup);

describe("TitleScreen", () => {
  it("menampilkan ringkasan cerita dari meta dan chapter", () => {
    render(<TitleScreen story={DEMO_STORY} onStart={() => {}} />);

    expect(
      screen.getByRole("heading", { name: DEMO_STORY.meta.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(DEMO_STORY.meta.synopsis)).toBeInTheDocument();
    expect(screen.getByText(DEMO_STORY.meta.subject)).toBeInTheDocument();
    expect(screen.getByText(DEMO_STORY.meta.gradeLevel)).toBeInTheDocument();
    expect(
      screen.getByText(`${DEMO_STORY.chapters.length} chapter`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`± ${DEMO_STORY.meta.estimatedMinutes} menit`),
    ).toBeInTheDocument();
  });

  it("menyediakan menu Mulai, Kontrol, dan Kembali", () => {
    render(<TitleScreen story={DEMO_STORY} onStart={() => {}} />);

    expect(
      screen.getByRole("button", { name: /^mulai$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^kontrol$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^kembali$/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("Mulai memanggil onStart", () => {
    const onStart = vi.fn();
    render(<TitleScreen story={DEMO_STORY} onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: /^mulai$/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("panah bawah dan atas memindahkan fokus antar menu", () => {
    render(<TitleScreen story={DEMO_STORY} onStart={() => {}} />);
    const menu = screen.getByRole("navigation", { name: /menu utama/i });
    const kontrol = screen.getByRole("button", { name: /^kontrol$/i });
    const kembali = screen.getByRole("link", { name: /^kembali$/i });

    expect(screen.getByRole("button", { name: /^mulai$/i })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(kontrol).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(kembali).toHaveFocus();

    // Dari item terakhir, panah bawah kembali ke item pertama.
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: /^mulai$/i })).toHaveFocus();

    // Dan panah atas dari item pertama membungkus ke item terakhir.
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(kembali).toHaveFocus();
  });

  it("Kontrol membuka dan menutup panel bantuan tanpa memulai game", () => {
    const onStart = vi.fn();
    render(<TitleScreen story={DEMO_STORY} onStart={onStart} />);
    const kontrol = screen.getByRole("button", { name: /^kontrol$/i });
    const panel = screen.getByLabelText("Kontrol permainan");

    expect(kontrol).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();

    fireEvent.click(kontrol);
    expect(kontrol).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
    expect(
      screen.getByText(/Panah atas dan bawah memilih menu/i),
    ).toBeVisible();

    fireEvent.click(kontrol);
    expect(kontrol).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
    expect(onStart).not.toHaveBeenCalled();
  });
});
