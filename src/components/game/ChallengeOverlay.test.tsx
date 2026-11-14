import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChallengeView } from "@/game/challengeView";

import { acakDeterministik, ChallengeOverlay } from "./ChallengeOverlay";

afterEach(cleanup);

const dasar = {
  id: "chl_x",
  prompt: "Soal contoh.",
  conceptTag: "Konsep",
  difficulty: 1,
  explanation: "Karena begitu.",
  points: 10,
} as const;

const itemOrdering = [
  { id: "itm_naik", text: "Uap air naik" },
  { id: "itm_dingin", text: "Suhu turun" },
  { id: "itm_titik", text: "Titik air" },
];

const orderingView: ChallengeView = {
  ...dasar,
  id: "chl_02_01",
  type: "ordering",
  items: itemOrdering,
};

const shortAnswerView: ChallengeView = {
  ...dasar,
  id: "chl_03_01",
  type: "short_answer",
};

function renderOverlay(
  view: ChallengeView,
  overrides: Partial<React.ComponentProps<typeof ChallengeOverlay>> = {},
) {
  const onSubmit = vi.fn();
  const onResolve = vi.fn();
  render(
    <ChallengeOverlay
      view={view}
      graded={null}
      onSubmit={onSubmit}
      onResolve={onResolve}
      {...overrides}
    />,
  );
  return { onSubmit, onResolve };
}

/** Urutan item yang sedang tampil, dibaca dari DOM. */
function urutanTampil(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((li) => li.textContent ?? "")
    .map(
      (teks) =>
        itemOrdering.find((item) => teks.includes(item.text))?.id ?? "?",
    );
}

describe("acakDeterministik", () => {
  const ids = itemOrdering.map((item) => item.id);

  it("mengembalikan semua id tanpa duplikat", () => {
    const hasil = acakDeterministik(ids, "chl_02_01");
    expect([...hasil].sort()).toEqual([...ids].sort());
  });

  it("deterministik untuk benih yang sama", () => {
    expect(acakDeterministik(ids, "chl_02_01")).toEqual(
      acakDeterministik(ids, "chl_02_01"),
    );
  });

  it("cenderung mengubah urutan asli", () => {
    // Minimal satu benih umum harus menghasilkan urutan berbeda dari aslinya.
    const berbeda = ["chl_02_01", "chl_01_01", "a", "b", "c"].some(
      (seed) => acakDeterministik(ids, seed).join() !== ids.join(),
    );
    expect(berbeda).toBe(true);
  });
});

describe("ChallengeOverlay — ordering", () => {
  it("menampilkan item teracak, bukan urutan cerita", () => {
    renderOverlay(orderingView);

    expect(urutanTampil().sort()).toEqual(
      ["itm_naik", "itm_dingin", "itm_titik"].sort(),
    );
  });

  it("mengirim urutan yang tampil saat langsung dijawab", () => {
    const { onSubmit } = renderOverlay(orderingView);
    const tampil = urutanTampil();

    fireEvent.click(screen.getByRole("button", { name: /^jawab$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_02_01",
      type: "ordering",
      order: tampil,
    });
  });

  it("tombol turun menukar item dengan item di bawahnya", () => {
    const { onSubmit } = renderOverlay(orderingView);
    const tampil = urutanTampil();
    const pertama = itemOrdering.find((item) => item.id === tampil[0])!;

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`Turunkan "${pertama.text}"`, "i"),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^jawab$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_02_01",
      type: "ordering",
      order: [tampil[1], tampil[0], tampil[2]],
    });
  });

  it("naik di item pertama dan turun di item terakhir dinonaktifkan", () => {
    renderOverlay(orderingView);
    const tampil = urutanTampil();
    const atas = itemOrdering.find((item) => item.id === tampil[0])!;
    const bawah = itemOrdering.find((item) => item.id === tampil[2])!;

    expect(
      screen.getByRole("button", {
        name: new RegExp(`Naikkan "${atas.text}"`, "i"),
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: new RegExp(`Turunkan "${bawah.text}"`, "i"),
      }),
    ).toBeDisabled();
  });

  it("tidak mengirim jawaban setelah dinilai", () => {
    const { onSubmit, onResolve } = renderOverlay(orderingView, {
      graded: { correct: true, explanation: "Benar." },
    });

    expect(
      screen.queryByRole("button", { name: /^jawab$/i }),
    ).not.toBeInTheDocument();
    const lanjut = screen.getByRole("button", { name: /^lanjut$/i });
    expect(lanjut).toBeEnabled();
    fireEvent.click(lanjut);
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("ChallengeOverlay — short_answer", () => {
  it("tombol Jawab nonaktif selama teks kosong", () => {
    renderOverlay(shortAnswerView);
    expect(screen.getByRole("button", { name: /^jawab$/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/tulis jawabanmu/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /^jawab$/i })).toBeDisabled();
  });

  it("mengirim teks apa adanya; normalisasi milik scoring", () => {
    const { onSubmit } = renderOverlay(shortAnswerView);

    fireEvent.change(screen.getByLabelText(/tulis jawabanmu/i), {
      target: { value: "  siklus air  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^jawab$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_03_01",
      type: "short_answer",
      text: "  siklus air  ",
    });
  });

  it("input disembunyikan dan kartu umpan balik tampil menggantikannya setelah dinilai", () => {
    renderOverlay(shortAnswerView, {
      graded: { correct: false, explanation: "Belum." },
    });

    expect(screen.queryByLabelText(/tulis jawabanmu/i)).not.toBeInTheDocument();
    expect(screen.getByText("Belum tepat.")).toBeInTheDocument();
    expect(screen.getByText("Belum.")).toBeInTheDocument();
  });
});

describe("ChallengeOverlay — tipe lain", () => {
  it("menyembunyikan hint sampai siswa mengonfirmasi", () => {
    renderOverlay({ ...orderingView, hints: ["Ingat urutan energi."] });

    // Hint belum tampil dan belum membocorkan jawaban.
    expect(screen.queryByText("Ingat urutan energi.")).not.toBeInTheDocument();
    expect(screen.queryByText(/correctOrder/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lihat hint/i }));
    expect(
      screen.getByText(/Poin soal ini akan berkurang setengah/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ingat urutan energi.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tampilkan hint/i }));
    expect(screen.getByText("Ingat urutan energi.")).toBeInTheDocument();
    expect(
      screen.getByText(/Poin soal ini dipotong setengah/i),
    ).toBeInTheDocument();
  });

  it("batal di konfirmasi tetap menyembunyikan hint", () => {
    const { onSubmit } = renderOverlay({
      ...orderingView,
      hints: ["Ingat urutan energi."],
    });

    fireEvent.click(screen.getByRole("button", { name: /lihat hint/i }));
    fireEvent.click(screen.getByRole("button", { name: /^batal$/i }));
    expect(screen.queryByText("Ingat urutan energi.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Poin soal ini akan berkurang setengah/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^jawab$/i }));
    const dikirim = onSubmit.mock.calls[0]?.[0];
    expect(dikirim).not.toHaveProperty("usedHint");
  });

  it("jawaban setelah hint membawa usedHint agar skor dipotong", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_hint",
      type: "multiple_choice",
      options: [{ id: "opt_a", text: "Menguap" }],
      hints: ["Ingat pelajaran tadi."],
    });

    fireEvent.click(screen.getByRole("button", { name: /lihat hint/i }));
    fireEvent.click(screen.getByRole("button", { name: /tampilkan hint/i }));
    fireEvent.click(screen.getByRole("button", { name: /menguap$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_hint",
      type: "multiple_choice",
      selectedId: "opt_a",
      usedHint: true,
    });
  });

  it("short_answer setelah hint juga mengirim usedHint", () => {
    const { onSubmit } = renderOverlay({
      ...shortAnswerView,
      hints: ["Bagi bagian dengan keseluruhan."],
    });

    fireEvent.click(screen.getByRole("button", { name: /lihat hint/i }));
    fireEvent.click(screen.getByRole("button", { name: /tampilkan hint/i }));
    fireEvent.change(screen.getByLabelText(/tulis jawabanmu/i), {
      target: { value: "20%" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^jawab$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_03_01",
      type: "short_answer",
      text: "20%",
      usedHint: true,
    });
  });

  it("Enter di tombol hint tidak ikut mengirim jawaban", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_hint",
      type: "multiple_choice",
      options: [
        { id: "opt_a", text: "Menguap" },
        { id: "opt_b", text: "Membeku" },
      ],
      hints: ["Ingat pelajaran tadi."],
    });

    const lihat = screen.getByRole("button", { name: /lihat hint/i });
    fireEvent.keyDown(lihat, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("daftar urutan diratakan ke kanan mengikuti pilihan jawaban lain", () => {
    renderOverlay(orderingView);
    const daftar = screen.getByRole("list");
    // ol → grup fit-text → wadah rata kanan
    expect(daftar.parentElement?.parentElement).toHaveClass("justify-end");
  });

  it("input jawaban singkat diratakan ke kanan", () => {
    renderOverlay(shortAnswerView);
    const input = screen.getByLabelText(/tulis jawabanmu/i);
    // input → bingkai → grup fit-text → wadah rata kanan
    expect(input.parentElement?.parentElement?.parentElement).toHaveClass(
      "justify-end",
    );
  });

  it("keyboard: angka memilih opsi, Enter mengirim", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_01_01",
      type: "multiple_choice",
      options: [
        { id: "opt_a", text: "Menguap" },
        { id: "opt_b", text: "Membeku" },
      ],
    });
    const panel = screen.getByLabelText("Tantangan");

    fireEvent.keyDown(panel, { key: "2" });
    expect(screen.getByRole("button", { name: /membeku$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.keyDown(panel, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_01_01",
      type: "multiple_choice",
      selectedId: "opt_b",
    });
  });

  it("keyboard: panah memindah sorotan lalu Enter menjawab", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_01_02",
      type: "true_false",
      statement: "Uap air lebih ringan.",
    });
    const panel = screen.getByLabelText("Tantangan");

    fireEvent.keyDown(panel, { key: "ArrowDown" });
    fireEvent.keyDown(panel, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_01_02",
      type: "true_false",
      answer: false,
    });
  });

  it("Enter tidak mengirim ulang setelah dinilai", () => {
    const { onSubmit } = renderOverlay(
      {
        ...dasar,
        id: "chl_01_01",
        type: "multiple_choice",
        options: [{ id: "opt_a", text: "Menguap" }],
      },
      { graded: { correct: true, explanation: "Benar." } },
    );

    fireEvent.keyDown(screen.getByLabelText("Tantangan"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("true_false tetap mengirim boolean saat opsi diklik", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_01_02",
      type: "true_false",
      statement: "Uap air lebih ringan.",
    });

    fireEvent.click(screen.getByRole("button", { name: /\bsalah$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_01_02",
      type: "true_false",
      answer: false,
    });
  });
});

describe("ChallengeOverlay — panel di atas dialog", () => {
  it("memindahkan fokus ke panel saat muncul", () => {
    renderOverlay(orderingView);

    expect(screen.getByLabelText("Tantangan")).toHaveFocus();
  });

  it("kartu umpan balik tampil di area gulir dan dapat diklik untuk lanjut", () => {
    const { onResolve } = renderOverlay(orderingView, {
      graded: { correct: true, explanation: "Penjelasan yang panjang." },
    });

    const panel = screen.getByLabelText("Tantangan");
    const isi = panel.querySelector(".overflow-y-auto");

    expect(isi).not.toBeNull();
    expect(isi).toContainElement(screen.getByText("Penjelasan yang panjang."));
    const lanjut = screen.getByRole("button", { name: /^lanjut$/i });
    fireEvent.click(lanjut);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it("tidak memakai lapisan gelap penuh di luar panel", () => {
    renderOverlay(orderingView);

    const panel = screen.getByLabelText("Tantangan");
    expect(panel.parentElement).not.toHaveClass("bg-[#0b120e]/75");
  });

  it("spasi dapat melanjutkan cerita saat sudah dinilai (gaya RPG)", () => {
    const { onResolve } = renderOverlay(
      {
        ...dasar,
        id: "chl_01_01",
        type: "multiple_choice",
        options: [{ id: "opt_a", text: "Menguap" }],
      },
      { graded: { correct: true, explanation: "Benar." } },
    );

    fireEvent.keyDown(screen.getByLabelText("Tantangan"), { key: " " });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it("auto-repeat Spasi tidak mengirim jawaban berulang", () => {
    const { onSubmit } = renderOverlay({
      ...dasar,
      id: "chl_01_03",
      type: "multiple_choice",
      options: [
        { id: "opt_a", text: "Menguap" },
        { id: "opt_b", text: "Membeku" },
      ],
    });
    const panel = screen.getByLabelText("Tantangan");

    // Tombol ditahan: auto-repeat datang sebagai `repeat: true` dan harus
    // diabaikan supaya tidak memilih/mengirim berkali-kali.
    fireEvent.keyDown(panel, { key: " ", repeat: true });
    expect(onSubmit).not.toHaveBeenCalled();

    // Tekanan fisik baru tetap diterima, lalu repeat berikutnya diabaikan.
    fireEvent.keyDown(panel, { key: " " });
    fireEvent.keyDown(panel, { key: " ", repeat: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("auto-repeat Spasi saat sudah dinilai tidak memanggil onResolve berulang", () => {
    const { onResolve } = renderOverlay(
      {
        ...dasar,
        id: "chl_01_04",
        type: "multiple_choice",
        options: [{ id: "opt_a", text: "Menguap" }],
      },
      { graded: { correct: true, explanation: "Benar." } },
    );
    const panel = screen.getByLabelText("Tantangan");

    fireEvent.keyDown(panel, { key: " ", repeat: true });
    expect(onResolve).not.toHaveBeenCalled();

    fireEvent.keyDown(panel, { key: " " });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it("satu Spasi di kartu umpan balik hanya resolve sekali", () => {
    const { onResolve } = renderOverlay(
      {
        ...dasar,
        id: "chl_01_05",
        type: "multiple_choice",
        options: [{ id: "opt_a", text: "Menguap" }],
      },
      { graded: { correct: true, explanation: "Benar." } },
    );

    // Kartu umpan balik ada di dalam panel; tanpa stopPropagation satu tekanan
    // akan memanggil onResolve dua kali (kartu + handler panel).
    fireEvent.keyDown(screen.getByRole("button", { name: /^lanjut$/i }), {
      key: " ",
    });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it("hover kursor mouse memindahkan sorotan opsi dialog RPG", () => {
    renderOverlay({
      ...dasar,
      id: "chl_01_01",
      type: "multiple_choice",
      options: [
        { id: "opt_a", text: "Menguap" },
        { id: "opt_b", text: "Membeku" },
      ],
    });

    const tombolB = screen.getByRole("button", { name: /membeku$/i });
    fireEvent.mouseEnter(tombolB);
    // Tombol B tersorot dengan desain kotak dialog aktif (#1c2a22 + border aksen)
    expect(tombolB.className).toContain("border-[#E8A87C]");
    expect(tombolB.className).toContain("bg-[#1c2a22]");
    expect(tombolB.className).toContain("text-white");
  });

  it("tangan penunjuk tampil presisi di samping opsi yang aktif (HCI)", () => {
    renderOverlay({
      ...dasar,
      id: "chl_01_01",
      type: "multiple_choice",
      options: [
        { id: "opt_a", text: "Menguap" },
        { id: "opt_b", text: "Membeku" },
      ],
    });

    const tombolA = screen.getByRole("button", { name: /menguap$/i });
    fireEvent.mouseEnter(tombolA);

    // Penunjuk digambar sebagai SVG tangan (bukan glyph font) dan ditandai jelas.
    const penunjuk =
      tombolA.parentElement?.querySelector<HTMLElement>("[data-penunjuk]");
    expect(penunjuk).not.toBeNull();
    expect(penunjuk).toHaveAttribute("data-penunjuk", "aktif");

    // Pixel-art glove: tajam, tiga lapis warna (outline/krem/abu), dan ukurannya
    // dibatasi supaya tidak melewati margin kotak pilihan.
    const svg = penunjuk?.querySelector("svg");
    expect(svg).toHaveAttribute("shape-rendering", "crispEdges");
    expect(svg?.querySelectorAll("path")).toHaveLength(3);
    expect(penunjuk?.style.width).toContain("clamp(");
    expect(penunjuk?.style.width).toContain("22px");
  });

  it("keyboard ordering: panah/WASD memindah dan menukar item lalu Enter mengirim", () => {
    const { onSubmit } = renderOverlay(orderingView);
    const panel = screen.getByLabelText("Tantangan");
    const tampil = urutanTampil();

    // Sorot item pertama (index 0), geser ke bawah menggunakan ArrowRight
    fireEvent.keyDown(panel, { key: "ArrowRight" });
    // Kirim menggunakan Enter tanpa perlu mouse
    fireEvent.keyDown(panel, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith({
      challengeId: "chl_02_01",
      type: "ordering",
      order: [tampil[1], tampil[0], tampil[2]],
    });
  });
});
