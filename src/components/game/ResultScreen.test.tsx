import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultScreen } from "./ResultScreen";
import type { PlayResult } from "@/story/scoring";

// `globals` tidak aktif di vitest.config.mjs, jadi RTL tidak membersihkan DOM
// sendiri di antara tes. Tanpa ini setiap render menumpuk dan query ganda.
afterEach(cleanup);

const adaKonsepLemah: PlayResult = {
  totalPoints: 60,
  earnedPoints: 40,
  correctCount: 4,
  totalChallenges: 6,
  weakConcepts: ["Kondensasi", "Infiltrasi"],
};

const semuaBenar: PlayResult = {
  totalPoints: 60,
  earnedPoints: 60,
  correctCount: 6,
  totalChallenges: 6,
  weakConcepts: [],
};

/** Baca nilai `<dd>` yang berpasangan dengan `<dt>` berlabel tertentu. */
function nilai(label: string): string {
  const istilah = screen.getByText(label);
  const dd = istilah.parentElement?.querySelector("dd");
  return (dd?.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("ResultScreen", () => {
  it("menampilkan skor dari poin yang didapat dan total poin", () => {
    render(<ResultScreen result={adaKonsepLemah} onMainLagi={() => {}} />);

    expect(nilai("Skor")).toBe("40 / 60");
  });

  it("menampilkan jumlah jawaban tepat dari total tantangan", () => {
    render(<ResultScreen result={adaKonsepLemah} onMainLagi={() => {}} />);

    expect(nilai("Jawaban tepat")).toBe("4 / 6");
  });

  it("menulis satu kalimat per konsep yang perlu diulang", () => {
    render(<ResultScreen result={adaKonsepLemah} onMainLagi={() => {}} />);

    expect(
      screen.getByText("Coba ulang bagian ini: Kondensasi"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coba ulang bagian ini: Infiltrasi"),
    ).toBeInTheDocument();
  });

  it("memberi pujian saat semua tantangan tepat", () => {
    render(<ResultScreen result={semuaBenar} onMainLagi={() => {}} />);

    expect(screen.queryByText(/Coba ulang bagian ini/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Semua tantangan kamu jawab tepat/i),
    ).toBeInTheDocument();
  });

  it("tidak menampilkan ranking atau perbandingan siswa lain", () => {
    const { container } = render(
      <ResultScreen result={adaKonsepLemah} onMainLagi={() => {}} />,
    );

    const teks = container.textContent ?? "";
    expect(teks).not.toMatch(/ranking|peringkat|siswa lain/i);
  });

  it("tombol Main lagi memanggil onMainLagi", () => {
    const onMainLagi = vi.fn();
    render(<ResultScreen result={adaKonsepLemah} onMainLagi={onMainLagi} />);

    fireEvent.click(screen.getByRole("button", { name: /main lagi/i }));

    expect(onMainLagi).toHaveBeenCalledTimes(1);
  });

  it("menyediakan jalan kembali ke halaman awal", () => {
    render(<ResultScreen result={adaKonsepLemah} onMainLagi={() => {}} />);

    expect(
      screen.getByRole("link", { name: /kembali ke awal/i }),
    ).toHaveAttribute("href", "/");
  });
});
