import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameBus } from "@/game/gameBus";
import { DEMO_STORY } from "@/game/demoStory";
import type { PlayResult } from "@/story/scoring";

// Phaser tidak bisa hidup di jsdom. Yang diuji di sini hanya kontrak
// bus → React: overlay tantangan, layar hasil, dan "Main lagi".
const mocks = vi.hoisted(() => ({ createGame: vi.fn() }));

vi.mock("@/game/createGame", () => ({ createGame: mocks.createGame }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const { GameShell } = await import("./GameShell");

const bus = new GameBus();

const hasilPalsu: PlayResult = {
  totalPoints: 60,
  earnedPoints: 40,
  correctCount: 4,
  totalChallenges: 6,
  weakConcepts: ["Kondensasi"],
};

/** Tunggu sampai GameCanvas selesai memasang pendengar bus-nya. */
async function tungguBusTerpasang() {
  await vi.waitFor(() => expect(mocks.createGame).toHaveBeenCalled());
}

afterEach(cleanup);

beforeEach(() => {
  mocks.createGame.mockReset();
  mocks.createGame.mockImplementation(() => ({ bus, destroy: () => {} }));
});

describe("GameShell", () => {
  it("menampilkan layar hasil saat event finished datang", async () => {
    render(<GameShell story={DEMO_STORY} />);
    await tungguBusTerpasang();

    bus.emit({ type: "finished", result: hasilPalsu });

    expect(
      await screen.findByText(/Perjalanan ini sudah sampai ujung/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coba ulang bagian ini: Kondensasi"),
    ).toBeInTheDocument();
  });

  it("Main lagi menyembunyikan layar hasil", async () => {
    render(<GameShell story={DEMO_STORY} />);
    await tungguBusTerpasang();

    bus.emit({ type: "finished", result: hasilPalsu });
    fireEvent.click(await screen.findByRole("button", { name: /main lagi/i }));

    expect(
      screen.queryByText(/Perjalanan ini sudah sampai ujung/i),
    ).not.toBeInTheDocument();
  });

  it("overlay tantangan muncul dari event challenge", async () => {
    render(<GameShell story={DEMO_STORY} />);
    await tungguBusTerpasang();

    bus.emit({
      type: "challenge",
      view: {
        id: "chl_01_01",
        type: "true_false",
        prompt: "Uap air naik karena lebih ringan.",
        conceptTag: "Evaporasi",
        statement: "Uap air lebih ringan daripada air cair.",
      },
    });

    expect(await screen.findByLabelText("Tantangan")).toBeInTheDocument();
  });
});
