import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tautan masuk siswa: permintaan layar penuh harus terkirim di dalam gestur
 * klik, dan klik dengan tombol pengubah dibiarkan untuk tab baru.
 */
const mocks = vi.hoisted(() => ({ masuk: vi.fn() }));

vi.mock("@/game/layarPenuh", () => ({
  masukLayarPenuhLanskap: mocks.masuk,
}));

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

const { TautanLayarPenuh } = await import("./TautanLayarPenuh");

afterEach(() => {
  cleanup();
  mocks.masuk.mockClear();
});

describe("TautanLayarPenuh", () => {
  it("menautkan ke halaman game", () => {
    render(
      <TautanLayarPenuh href="/game" className="tombol">
        Masuk sebagai siswa
      </TautanLayarPenuh>,
    );

    const tautan = screen.getByRole("link", { name: /masuk sebagai siswa/i });
    expect(tautan).toHaveAttribute("href", "/game");
    expect(tautan).toHaveClass("tombol");
  });

  it("meminta layar penuh saat diklik", () => {
    render(<TautanLayarPenuh href="/game">Masuk</TautanLayarPenuh>);

    fireEvent.click(screen.getByRole("link", { name: "Masuk" }));
    expect(mocks.masuk).toHaveBeenCalledTimes(1);
  });

  it("tidak meminta layar penuh untuk klik tombol pengubah", () => {
    render(<TautanLayarPenuh href="/game">Masuk</TautanLayarPenuh>);

    const tautan = screen.getByRole("link", { name: "Masuk" });
    fireEvent.click(tautan, { ctrlKey: true });
    fireEvent.click(tautan, { metaKey: true });
    fireEvent.click(tautan, { shiftKey: true });
    fireEvent.click(tautan, { button: 1 });

    expect(mocks.masuk).not.toHaveBeenCalled();
  });
});
