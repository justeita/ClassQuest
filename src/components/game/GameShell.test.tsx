import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameBus } from "@/game/gameBus";
import { DEMO_STORY } from "@/game/demoStory";
import type { QuestState } from "@/game/questLog";
import type { PlayResult } from "@/story/scoring";

// Phaser tidak bisa hidup di jsdom. Yang diuji di sini hanya kontrak
// layar → bus → React: layar judul, HUD, menu jeda, overlay tantangan,
// layar hasil, dan "Main lagi".
const mocks = vi.hoisted(() => ({ createGame: vi.fn() }));

vi.mock("@/game/createGame", () => ({ createGame: mocks.createGame }));

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

const { GameShell } = await import("./GameShell");

let bus: GameBus;

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

/**
 * Render shell, lalu masuk ke permainan lewat layar judul. Sejak layar judul
 * ada, Phaser memang belum dinyalakan sebelum tombol "Mulai" ditekan.
 */
async function mainkan() {
  render(<GameShell story={DEMO_STORY} />);
  fireEvent.click(screen.getByRole("button", { name: /^mulai$/i }));
  await tungguBusTerpasang();
}

function bukaJeda() {
  fireEvent.click(screen.getByRole("button", { name: /^jeda$/i }));
}

afterEach(cleanup);

beforeEach(() => {
  bus = new GameBus();
  mocks.createGame.mockReset();
  mocks.createGame.mockImplementation(() => ({ bus, destroy: () => {} }));
});

describe("GameShell", () => {
  it("menampilkan layar judul tanpa menyalakan Phaser", () => {
    render(<GameShell story={DEMO_STORY} />);

    expect(
      screen.getByRole("heading", { name: DEMO_STORY.meta.title }),
    ).toBeInTheDocument();
    expect(mocks.createGame).not.toHaveBeenCalled();
  });

  it("Mulai menyembunyikan layar judul dan menyalakan Phaser", async () => {
    render(<GameShell story={DEMO_STORY} />);
    fireEvent.click(screen.getByRole("button", { name: /^mulai$/i }));

    await tungguBusTerpasang();
    expect(
      screen.queryByRole("heading", { name: DEMO_STORY.meta.title }),
    ).not.toBeInTheDocument();
  });

  it("panel quest muncul dari event quest dan ikut berganti scene", async () => {
    await mainkan();
    expect(screen.queryByRole("complementary", { name: "Daftar quest" })).toBe(
      null,
    );

    bus.emit({
      type: "quest",
      view: {
        chapterNumber: 1,
        chapterTotal: 3,
        chapterTitle: "Hujan di Atap Sekolah",
        sceneTitle: "Genangan yang Menghilang",
        activeQuestId: "sc_01_01",
        quests: [
          {
            id: "sc_01_01",
            title: "Genangan yang Menghilang",
            status: "aktif",
            tantangan: { total: 0, dijawab: 0 },
          },
          {
            id: "sc_01_02",
            title: "Uap yang Tak Terlihat",
            status: "terkunci",
            tantangan: { total: 1, dijawab: 0 },
          },
        ],
      },
    });

    expect(
      await screen.findByRole("complementary", { name: "Daftar quest" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Chapter 1/3").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Genangan yang Menghilang").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Uap yang Tak Terlihat")).toBeInTheDocument();
    expect(screen.getByText("(0/1)")).toBeInTheDocument();
  });

  it("event markers menampilkan penanda dan daftar kosong menyembunyikannya", async () => {
    await mainkan();

    bus.emit({
      type: "markers",
      markers: [{ npcId: "char_pak_bima", x: 200, y: 120 }],
    });
    expect(await screen.findByText("!")).toBeInTheDocument();

    bus.emit({ type: "markers", markers: [] });
    await vi.waitFor(() =>
      expect(screen.queryByText("!")).not.toBeInTheDocument(),
    );
  });

  it("kartu chapter muncul saat nomor chapter berubah", async () => {
    await mainkan();
    const view: QuestState = {
      chapterNumber: 2,
      chapterTotal: 3,
      chapterTitle: "Naik ke Langit",
      sceneTitle: "Tubuh yang Mengeras",
      activeQuestId: "sc_02_01",
      quests: [],
    };

    bus.emit({ type: "quest", view });
    expect(await screen.findByText("Naik ke Langit")).toBeInTheDocument();

    bus.emit({ type: "quest", view });
    // Chapter yang sama tidak memunculkan kartu baru; teks tetap dari event pertama.
    expect(screen.getAllByText("Naik ke Langit").length).toBeGreaterThan(0);
  });

  it("tombol Jeda membuka menu dan mengirim command pause", async () => {
    await mainkan();
    const pause = vi.fn();
    const lepas = bus.onCommand("pause", pause);

    bukaJeda();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Jeda" })).toBeInTheDocument();
    lepas();
  });

  it("Lanjut menutup menu dan mengirim command resume", async () => {
    await mainkan();
    const resume = vi.fn();
    const lepas = bus.onCommand("resume", resume);

    bukaJeda();
    fireEvent.click(screen.getByRole("button", { name: /^lanjut$/i }));

    expect(resume).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Jeda" }),
    ).not.toBeInTheDocument();
    lepas();
  });

  it("Esc membuka dan menutup menu jeda", async () => {
    await mainkan();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Jeda" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Jeda" }),
    ).not.toBeInTheDocument();
  });

  it("Esc diabaikan saat tantangan belum dijawab", async () => {
    await mainkan();
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
    await screen.findByLabelText("Tantangan");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Jeda" }),
    ).not.toBeInTheDocument();
  });

  it("Ulangi chapter mengirim command dan menutup menu", async () => {
    await mainkan();
    const restart = vi.fn();
    const lepas = bus.onCommand("restart_chapter", restart);

    bukaJeda();
    fireEvent.click(screen.getByRole("button", { name: /ulangi chapter/i }));

    expect(restart).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Jeda" }),
    ).not.toBeInTheDocument();
    lepas();
  });

  it("tombol suara mengirim command set_muted", async () => {
    await mainkan();
    const mute = vi.fn();
    const lepas = bus.onCommand("set_muted", mute);

    fireEvent.click(screen.getByRole("button", { name: /suara aktif/i }));

    expect(mute).toHaveBeenCalledWith({ type: "set_muted", muted: true });
    expect(
      screen.getByRole("button", { name: /suara nonaktif/i }),
    ).toBeInTheDocument();
    lepas();
  });

  it("menampilkan layar hasil saat event finished datang", async () => {
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu });

    expect(
      await screen.findByText(/Perjalanan ini sudah sampai ujung/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coba ulang bagian ini: Kondensasi"),
    ).toBeInTheDocument();
  });

  it("Main lagi menyembunyikan layar hasil", async () => {
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu });
    fireEvent.click(await screen.findByRole("button", { name: /main lagi/i }));

    expect(
      screen.queryByText(/Perjalanan ini sudah sampai ujung/i),
    ).not.toBeInTheDocument();
  });

  it("Main lagi me-remount Phaser untuk sesi baru", async () => {
    await mainkan();
    const panggilanAwal = mocks.createGame.mock.calls.length;

    bus.emit({ type: "finished", result: hasilPalsu });
    fireEvent.click(await screen.findByRole("button", { name: /main lagi/i }));

    await vi.waitFor(() =>
      expect(mocks.createGame.mock.calls.length).toBeGreaterThan(panggilanAwal),
    );
  });

  it("overlay tantangan muncul dari event challenge", async () => {
    await mainkan();

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

  it("event dialogue menampilkan teks dan klik mengirim command advance", async () => {
    await mainkan();
    const advance = vi.fn();
    const lepas = bus.onCommand("advance", advance);

    bus.emit({
      type: "dialogue",
      view: {
        visible: true,
        name: "Bu Ratna",
        text: "Air di bumi tidak pernah hilang.",
        waiting: true,
      },
    });

    fireEvent.click(await screen.findByText(/Air di bumi tidak pernah hilang/));

    expect(advance).toHaveBeenCalledTimes(1);
    lepas();
  });

  it("dialog tersembunyi saat view visible false", async () => {
    await mainkan();
    bus.emit({
      type: "dialogue",
      view: { visible: true, name: null, text: "Hujan turun.", waiting: true },
    });
    await screen.findByText("Hujan turun.");

    bus.emit({
      type: "dialogue",
      view: { visible: false, name: null, text: "", waiting: false },
    });

    await vi.waitFor(() =>
      expect(screen.queryByText("Hujan turun.")).not.toBeInTheDocument(),
    );
  });

  it("event prompt menampilkan chip Space dan null menyembunyikannya", async () => {
    await mainkan();

    bus.emit({ type: "prompt", hint: { text: "Space", x: 320, y: 180 } });
    expect(await screen.findByText("Space")).toBeInTheDocument();

    bus.emit({ type: "prompt", hint: null });
    await vi.waitFor(() =>
      expect(screen.queryByText("Space")).not.toBeInTheDocument(),
    );
  });

  it("dialog dan prompt disembunyikan selama menu jeda", async () => {
    await mainkan();
    bus.emit({
      type: "dialogue",
      view: { visible: true, name: null, text: "Hujan turun.", waiting: true },
    });
    bus.emit({ type: "prompt", hint: { text: "Space", x: 320, y: 180 } });
    await screen.findByText("Hujan turun.");

    bukaJeda();

    await vi.waitFor(() =>
      expect(screen.queryByText("Hujan turun.")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
  });
});
