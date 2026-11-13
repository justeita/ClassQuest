import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameBus } from "@/game/gameBus";
import { DEMO_STORY } from "@/game/demoStory";
import { persenLebar } from "@/game/layout";
import type { QuestState } from "@/game/questLog";
import type { Answer, PlayResult } from "@/story/scoring";

// Phaser tidak bisa hidup di jsdom. Yang diuji di sini hanya kontrak
// layar → bus → React: layar judul, HUD, menu jeda, overlay tantangan,
// layar hasil, dan "Main lagi".
const mocks = vi.hoisted(() => ({
  createGame: vi.fn(),
  savePlayResult: vi.fn(),
}));

vi.mock("@/game/createGame", () => ({ createGame: mocks.createGame }));
vi.mock("@/app/play/actions", () => ({
  savePlayResult: mocks.savePlayResult,
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

const { GameShell } = await import("./GameShell");

let bus: GameBus;

const hasilPalsu: PlayResult = {
  totalPoints: 60,
  earnedPoints: 40,
  correctCount: 4,
  totalChallenges: 6,
  weakConcepts: ["Kondensasi"],
};

const jawabanPalsu: Answer[] = [
  { challengeId: "chl_demo_1", type: "short_answer", text: "penguapan" },
];

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
  // Semua pembaruan state React di tes ini berasal dari `bus.emit`, yang
  // dipanggil di luar `act`. React lalu menunda flush efek pasif, sehingga
  // listener jendela (Tab/Esc) dan efek fokus kadang belum terpasang saat tes
  // menekan tombol atau memeriksa fokus — tes gagal acak begitu suite berjalan
  // paralel. Bungkus tiap emit dengan `act` supaya efek ikut tuntas sinkron.
  const emit = bus.emit.bind(bus);
  bus.emit = (event) => {
    act(() => {
      emit(event);
    });
  };
  mocks.createGame.mockReset();
  mocks.createGame.mockImplementation(() => ({ bus, destroy: () => {} }));
  mocks.savePlayResult.mockReset();
  mocks.savePlayResult.mockResolvedValue({ ok: true });
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
      markers: [{ npcId: "char_npc_10", x: 200, y: 120 }],
    });
    expect(await screen.findByText("!")).toBeInTheDocument();

    bus.emit({ type: "markers", markers: [] });
    await vi.waitFor(() =>
      expect(screen.queryByText("!")).not.toBeInTheDocument(),
    );
  });

  it("event nametags menampilkan nama NPC dan bisa dikosongkan", async () => {
    await mainkan();

    bus.emit({
      type: "nametags",
      plates: [{ npcId: "char_npc_5", nama: "Bu Sari", x: 210, y: 118 }],
    });
    expect(await screen.findByText("Bu Sari")).toBeInTheDocument();

    bus.emit({ type: "nametags", plates: [] });
    await vi.waitFor(() =>
      expect(screen.queryByText("Bu Sari")).not.toBeInTheDocument(),
    );
  });

  it("posisi penanda ikut berubah saat kamera bergeser", async () => {
    await mainkan();

    bus.emit({
      type: "markers",
      markers: [{ npcId: "char_npc_10", x: 200, y: 120 }],
    });
    await screen.findByText("!");
    const awal = document.querySelector<HTMLElement>('[data-tanda="dekat"]');
    expect(awal?.style.left).toBe(persenLebar(200));

    // Scene mengirim posisi baru tiap frame; penanda harus langsung mengikuti
    // tanpa menunggu render ulang overlay lain.
    bus.emit({
      type: "markers",
      markers: [{ npcId: "char_npc_10", x: 180, y: 112 }],
    });
    await vi.waitFor(() =>
      expect(
        document.querySelector<HTMLElement>('[data-tanda="dekat"]')?.style.left,
      ).toBe(persenLebar(180)),
    );
  });

  it("penanda quest, papan nama, dan chip Space tampil bersamaan", async () => {
    await mainkan();

    bus.emit({
      type: "markers",
      markers: [{ npcId: "char_npc_10", x: 200, y: 120 }],
    });
    bus.emit({
      type: "nametags",
      plates: [{ npcId: "char_npc_10", nama: "Pak Wira", x: 200, y: 126 }],
    });
    bus.emit({
      type: "prompt",
      hint: { text: "Space", x: 214, y: 126, menempel: true },
    });

    expect(await screen.findByText("!")).toBeInTheDocument();
    expect(screen.getByText("Pak Wira")).toBeInTheDocument();
    expect(screen.getByText("Space")).toBeInTheDocument();
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

  it("Esc saat buku quest terbuka hanya menutup buku dan tidak membuka menu jeda", async () => {
    await mainkan();
    bus.emit({
      type: "quest",
      view: {
        chapterNumber: 1,
        chapterTotal: 3,
        chapterTitle: "Siklus Air",
        sceneTitle: "Genangan yang Menghilang",
        activeQuestId: "qst_01",
        quests: [
          {
            id: "qst_01",
            title: "Amati genangan air",
            status: "aktif",
            tantangan: { total: 1, dijawab: 0 },
          },
        ],
      },
    });

    await screen.findByRole("button", { name: "Buka buku catatan quest" });

    // Buka buku quest dengan shortcut keyboard Q
    fireEvent.keyDown(window, { key: "q" });
    expect(
      screen.getByRole("dialog", { name: "Buku Catatan Quest" }),
    ).toBeInTheDocument();

    // Tekan Escape: buku quest harus tertutup, menu jeda TIDAK boleh terbuka
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Jeda" }),
    ).not.toBeInTheDocument();

    // Tekan Escape kedua kali setelah buku tertutup: sekarang menu jeda terbuka
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Jeda" })).toBeInTheDocument();
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

  it("tombol musik mengirim command set_audio hanya untuk musik", async () => {
    await mainkan();
    const audio = vi.fn();
    const lepas = bus.onCommand("set_audio", audio);

    fireEvent.click(screen.getByRole("button", { name: /musik nyala/i }));

    expect(audio).toHaveBeenCalledWith({ type: "set_audio", music: 0, sfx: 1 });
    expect(
      screen.getByRole("button", { name: /musik mati/i }),
    ).toBeInTheDocument();
    lepas();
  });

  it("buku log mencatat dialog dan jurnal konsep", async () => {
    await mainkan();

    bus.emit({
      type: "log",
      name: "Pak Bima",
      text: "Genangan air menguap karena panas matahari.",
      sceneJudul: "Pagi yang Menguap",
    });

    // Buka buku lewat tombol Log di HUD.
    fireEvent.click(screen.getByRole("button", { name: /^catatan$/i }));

    expect(
      await screen.findByRole("dialog", { name: "Buku catatan" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Genangan air menguap/i)).toBeInTheDocument();
    expect(screen.getByText("Pak Bima")).toBeInTheDocument();

    // Tab konsep kosong sebelum ada jawaban.
    fireEvent.click(screen.getByRole("tab", { name: /konsep/i }));
    expect(screen.getByText(/Belum ada konsep/i)).toBeInTheDocument();
  });

  it("jawaban soal mengisi jurnal konsep", async () => {
    await mainkan();

    bus.emit({
      type: "challenge",
      view: {
        id: "chl_01_01",
        type: "true_false",
        prompt: "Uap air lebih ringan.",
        conceptTag: "Evaporasi",
        statement: "Uap air lebih ringan daripada air cair.",
      },
    });
    bus.emit({
      type: "graded",
      challengeId: "chl_01_01",
      correct: true,
      explanation: "Uap air naik karena lebih ringan.",
    });

    fireEvent.click(screen.getByRole("button", { name: /^catatan$/i }));
    fireEvent.click(await screen.findByRole("tab", { name: /konsep/i }));

    expect(await screen.findByText("Evaporasi")).toBeInTheDocument();
    expect(screen.getByText("Tepat")).toBeInTheDocument();
    // Penjelasan muncul dua kali: panel tantangan dan buku catatan.
    expect(
      screen.getAllByText(/Uap air naik karena lebih ringan/),
    ).toHaveLength(2);
  });

  it("menampilkan layar hasil saat event finished datang", async () => {
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu, answers: jawabanPalsu });

    expect(
      await screen.findByText(/Perjalanan ini sudah sampai ujung/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coba ulang bagian ini: Kondensasi"),
    ).toBeInTheDocument();
  });

  it("menyimpan hasil main lewat server action tanpa mengirim skor", async () => {
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu, answers: jawabanPalsu });

    await vi.waitFor(() =>
      expect(mocks.savePlayResult).toHaveBeenCalledWith({
        storyId: DEMO_STORY.meta.id,
        result: { answers: jawabanPalsu },
      }),
    );
    expect(
      await screen.findByText("Hasil main tersimpan."),
    ).toBeInTheDocument();
  });

  it("kegagalan simpan tidak menghalangi layar hasil", async () => {
    mocks.savePlayResult.mockResolvedValue({
      ok: false,
      reason: "rate_limited",
    });
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu, answers: jawabanPalsu });

    expect(
      await screen.findByText("Hasil main belum tersimpan."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Perjalanan ini sudah sampai ujung/i),
    ).toBeInTheDocument();
  });

  it("Main lagi menyembunyikan layar hasil", async () => {
    await mainkan();

    bus.emit({ type: "finished", result: hasilPalsu, answers: jawabanPalsu });
    fireEvent.click(await screen.findByRole("button", { name: /main lagi/i }));

    expect(
      screen.queryByText(/Perjalanan ini sudah sampai ujung/i),
    ).not.toBeInTheDocument();
  });

  it("Main lagi me-remount Phaser untuk sesi baru", async () => {
    await mainkan();
    const panggilanAwal = mocks.createGame.mock.calls.length;

    bus.emit({ type: "finished", result: hasilPalsu, answers: jawabanPalsu });
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
        portrait: null,
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
      view: {
        visible: true,
        name: null,
        text: "Hujan turun.",
        waiting: true,
        portrait: null,
      },
    });
    await screen.findByText("Hujan turun.");

    bus.emit({
      type: "dialogue",
      view: {
        visible: false,
        name: null,
        text: "",
        waiting: false,
        portrait: null,
      },
    });

    await vi.waitFor(() =>
      expect(screen.queryByText("Hujan turun.")).not.toBeInTheDocument(),
    );
  });

  it("event prompt menampilkan chip Space dan null menyembunyikannya", async () => {
    await mainkan();

    bus.emit({
      type: "prompt",
      hint: { text: "Space", x: 320, y: 180, menempel: true },
    });
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
      view: {
        visible: true,
        name: null,
        text: "Hujan turun.",
        waiting: true,
        portrait: null,
      },
    });
    bus.emit({
      type: "prompt",
      hint: { text: "Space", x: 320, y: 180, menempel: true },
    });
    await screen.findByText("Hujan turun.");

    bukaJeda();

    await vi.waitFor(() =>
      expect(screen.queryByText("Hujan turun.")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Space")).not.toBeInTheDocument();
  });
});

describe("GameShell — tombol percepat", () => {
  const dialog = {
    visible: true,
    name: "Pak Bima",
    text: "Genangan itu tadi pagi masih penuh.",
    waiting: true,
    portrait: null,
  };

  const challenge = {
    id: "chl_01_01",
    type: "true_false" as const,
    prompt: "Uap air naik karena lebih ringan.",
    conceptTag: "Evaporasi",
    statement: "Uap air lebih ringan daripada air cair.",
  };

  it("menahan tombol Percepat mengirim skip_start lalu skip_stop saat dilepas", async () => {
    await mainkan();
    const mulai = vi.fn();
    const berhenti = vi.fn();
    const lepasMulai = bus.onCommand("skip_start", mulai);
    const lepasBerhenti = bus.onCommand("skip_stop", berhenti);

    expect(
      screen.queryByRole("button", { name: /percepat/i }),
    ).not.toBeInTheDocument();

    bus.emit({ type: "dialogue", view: dialog });
    const tombol = await screen.findByRole("button", { name: /percepat/i });

    // Ala Persona 3 Reload: tahan untuk mempercepat, lepas untuk berhenti.
    fireEvent.pointerDown(tombol);
    expect(mulai).toHaveBeenCalledTimes(1);
    expect(berhenti).not.toHaveBeenCalled();

    fireEvent.pointerUp(tombol);
    expect(berhenti).toHaveBeenCalledTimes(1);

    lepasMulai();
    lepasBerhenti();
  });

  it("tombol Percepat tidak tampil saat explore", async () => {
    await mainkan();
    bus.emit({ type: "dialogue", view: dialog });
    await screen.findByRole("button", { name: /percepat/i });

    bus.emit({
      type: "dialogue",
      view: {
        visible: false,
        name: null,
        text: "",
        waiting: false,
        portrait: null,
      },
    });

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /percepat/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("tombol Percepat hilang saat soal tampil: soal tidak bisa dilewati", async () => {
    await mainkan();
    bus.emit({ type: "dialogue", view: dialog });
    await screen.findByRole("button", { name: /percepat/i });

    bus.emit({ type: "challenge", view: challenge });
    await screen.findByLabelText("Tantangan");

    expect(
      screen.queryByRole("button", { name: /percepat/i }),
    ).not.toBeInTheDocument();
  });

  it("menahan Tab mengirim skip_start, melepas mengirim skip_stop", async () => {
    await mainkan();
    const mulai = vi.fn();
    const berhenti = vi.fn();
    const lepasMulai = bus.onCommand("skip_start", mulai);
    const lepasBerhenti = bus.onCommand("skip_stop", berhenti);

    // Belum ada dialog: Tab tidak diambil alih (fokus browser tetap jalan).
    fireEvent.keyDown(window, { key: "Tab" });
    expect(mulai).not.toHaveBeenCalled();

    bus.emit({ type: "dialogue", view: dialog });
    await screen.findByRole("button", { name: /percepat/i });

    // Auto-repeat keydown tidak boleh memicu skip_start ganda.
    fireEvent.keyDown(window, { key: "Tab" });
    fireEvent.keyDown(window, { key: "Tab", repeat: true });
    expect(mulai).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: "Tab" });
    expect(berhenti).toHaveBeenCalledTimes(1);

    bus.emit({ type: "challenge", view: challenge });
    await screen.findByLabelText("Tantangan");

    fireEvent.keyDown(window, { key: "Tab" });
    expect(mulai).toHaveBeenCalledTimes(1);
    lepasMulai();
    lepasBerhenti();
  });

  it("hint tahan Tab muncul selama dialog dan berganti status saat mempercepat", async () => {
    await mainkan();

    expect(
      screen.queryByText(/tahan untuk mempercepat/i),
    ).not.toBeInTheDocument();

    bus.emit({ type: "dialogue", view: dialog });
    expect(
      await screen.findByText(/tahan untuk mempercepat/i),
    ).toBeInTheDocument();

    bus.emit({ type: "skipping", aktif: true });
    expect(await screen.findByText(/mempercepat/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/tahan untuk mempercepat/i),
    ).not.toBeInTheDocument();

    bus.emit({ type: "skipping", aktif: false });
    expect(
      await screen.findByText(/tahan untuk mempercepat/i),
    ).toBeInTheDocument();
  });

  it("garis kecepatan memudar masuk saat mempercepat dan keluar saat berhenti", async () => {
    await mainkan();
    bus.emit({ type: "dialogue", view: dialog });
    await screen.findByText(/tahan untuk mempercepat/i);

    // Selama fase dialog garis tetap terpasang tapi tak terlihat, supaya
    // masuk/keluarnya memudar halus alih-alih muncul-hilang mendadak.
    const garis = screen.getByTestId("speed-lines");
    expect(garis).toHaveClass("opacity-0");
    expect(garis).not.toHaveClass("opacity-100");

    bus.emit({ type: "skipping", aktif: true });
    await vi.waitFor(() => expect(garis).toHaveClass("opacity-100"));

    bus.emit({ type: "skipping", aktif: false });
    await vi.waitFor(() => expect(garis).toHaveClass("opacity-0"));
  });

  it("hint disembunyikan saat soal tampil", async () => {
    await mainkan();
    bus.emit({ type: "dialogue", view: dialog });
    await screen.findByText(/tahan untuk mempercepat/i);

    bus.emit({ type: "challenge", view: challenge });
    await screen.findByLabelText("Tantangan");

    expect(
      screen.queryByText(/tahan untuk mempercepat/i),
    ).not.toBeInTheDocument();
  });

  it("tombol B membuka buku catatan meski data quest sudah terisi", async () => {
    await mainkan();

    // Regresi: guard lama memakai `quest` (data), yang selalu terisi setelah
    // event quest pertama — akibatnya B mati sepanjang permainan.
    bus.emit({
      type: "quest",
      view: {
        chapterNumber: 1,
        chapterTotal: 3,
        chapterTitle: "Pagi yang Menguap",
        sceneTitle: "Genangan yang Menghilang",
        activeQuestId: "sc_01_01",
        quests: [
          {
            id: "sc_01_01",
            title: "Genangan yang Menghilang",
            status: "aktif",
            tantangan: { total: 0, dijawab: 0 },
          },
        ],
      },
    });
    await screen.findByRole("button", { name: "Buka buku catatan quest" });

    fireEvent.keyDown(window, { key: "b" });

    expect(
      await screen.findByRole("dialog", { name: "Buku catatan" }),
    ).toBeInTheDocument();
  });
});

describe("GameShell — soal di atas dialog", () => {
  const challenge = {
    id: "chl_01_01",
    type: "true_false" as const,
    prompt: "Uap air naik karena lebih ringan.",
    conceptTag: "Evaporasi",
    statement: "Uap air lebih ringan daripada air cair.",
  };

  it("dialog tetap terlihat saat tantangan terbuka", async () => {
    await mainkan();
    bus.emit({
      type: "dialogue",
      view: {
        visible: true,
        name: "Bu Ratna",
        text: "Air di bumi tidak pernah hilang.",
        waiting: true,
        portrait: null,
      },
    });
    await screen.findByText("Air di bumi tidak pernah hilang.");

    bus.emit({ type: "challenge", view: challenge });
    await screen.findByLabelText("Tantangan");

    // Soal berada di dalam dialogue box, bukan elemen tambahan di atasnya
    expect(
      screen.getAllByText(/Uap air naik karena lebih ringan/).length,
    ).toBeGreaterThan(0);
    // Indikator "lanjut" disembunyikan selama soal, karena dialog dibekukan.
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("menyembunyikan potret selama soal dan menampilkannya lagi setelah dinilai", async () => {
    await mainkan();
    bus.emit({
      type: "dialogue",
      view: {
        visible: true,
        name: "Bu Ratna",
        text: "Air di bumi tidak pernah hilang.",
        waiting: true,
        portrait: {
          src: "/assets/portrait/npc_1/neutral.png",
          alt: "Potret Bu Ratna",
        },
      },
    });
    expect(await screen.findByAltText("Potret Bu Ratna")).toBeInTheDocument();

    bus.emit({ type: "challenge", view: challenge });
    await screen.findByLabelText("Tantangan");
    // Soal belum dijawab: potret disembunyikan supaya tidak menutupi pilihan.
    expect(screen.queryByAltText("Potret Bu Ratna")).not.toBeInTheDocument();

    bus.emit({
      type: "graded",
      challengeId: "chl_01_01",
      correct: true,
      explanation: "Benar.",
    });
    // Setelah dinilai, potret tampil lagi untuk umpan balik senang/marah.
    expect(await screen.findByAltText("Potret Bu Ratna")).toBeInTheDocument();
  });

  it("fokus kembali ke area game setelah tantangan ditutup", async () => {
    await mainkan();
    bus.emit({ type: "challenge", view: challenge });
    expect(await screen.findByLabelText("Tantangan")).toHaveFocus();

    bus.emit({
      type: "graded",
      challengeId: "chl_01_01",
      correct: true,
      explanation: "Benar.",
    });
    fireEvent.click(await screen.findByRole("button", { name: /^lanjut$/i }));

    await vi.waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Area permainan ClassQuest" }),
      ).toHaveFocus(),
    );
  });
});
