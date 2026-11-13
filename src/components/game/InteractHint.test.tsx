import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InteractHint } from "./InteractHint";
import { PENANDA, cqw, persenTinggi, persenLebar } from "@/game/layout";

afterEach(cleanup);

describe("InteractHint", () => {
  it("menampilkan teks tombol interaksi", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );

    expect(screen.getByText("Space")).toBeInTheDocument();
  });

  it("memusatkan kotak di atas NPC", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 90, menempel: true }} />,
    );

    const kotak = screen.getByText("Space").parentElement;
    expect(kotak).not.toBeNull();
    expect(kotak?.style.left).toBe(persenLebar(320));
    expect(kotak?.style.top).toBe(persenTinggi(90));
    // Titik jangkar adalah sudut kiri-bawah: kotak naik ke atas titik itu dan
    // digeser setengah lebar supaya center, sejajar papan nama di bawahnya.
    expect(kotak?.className).toContain("-translate-y-full");
    expect(kotak?.className).toContain("-translate-x-1/2");
  });

  it("tidak menangkap klik supaya canvas tetap menerima input", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );

    expect(screen.getByText("Space").parentElement?.className).toContain(
      "pointer-events-none",
    );
  });

  it("ukuran huruf mengikuti skala canvas", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );

    // Ukuran memakai satuan internal; nilainya diturunkan dari lebar dunia
    // aktual (`--gw`), jadi yang diuji cukup bahwa rumusnya dipakai.
    const ukuran = screen.getByText("Space").style.fontSize;
    expect(ukuran).toContain("cqw");
    expect(ukuran).toContain("var(--gw");
    expect(cqw(11)).toContain("var(--gw");
  });

  it("menyamakan kotak dengan penanda quest `!`", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );

    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("border-[#E8A87C]/80");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#E8A87C]");
    // Tinggi disamakan dengan kotak `!` supaya dasar keduanya sejajar.
    expect(kotak.style.height).toBe(cqw(PENANDA.kotak));
  });

  it("pemberi quest: kotak meluncur keluar dari penanda `!`", () => {
    render(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );

    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("animate-quest-slide-in");
    expect(kotak.className).toContain("origin-left");
    expect(kotak.className).not.toContain("animate-quest-pop");
    expect(screen.getByText("Space").parentElement).toHaveAttribute(
      "data-prompt",
      "quest",
    );
  });

  it("NPC obrolan singkat: kotak muncul sebagai pop-up, bukan meluncur", () => {
    render(
      <InteractHint
        hint={{ text: "Space", x: 320, y: 180, menempel: false }}
      />,
    );

    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("animate-quest-pop");
    expect(kotak.className).not.toContain("animate-quest-slide-in");
    expect(kotak.className).not.toContain("origin-left");
    expect(screen.getByText("Space").parentElement).toHaveAttribute(
      "data-prompt",
      "obrolan",
    );
  });

  it("selalu dipusatkan di atas nama, termasuk saat penanda jadi beacon", () => {
    const { rerender } = render(
      <InteractHint
        hint={{ text: "Space", x: 320, y: 180, menempel: false }}
      />,
    );

    // Jangkar di tengah NPC, lalu digeser setengah lebar supaya center —
    // sejajar papan nama di bawahnya.
    expect(screen.getByText("Space").parentElement?.className).toContain(
      "-translate-x-1/2",
    );

    // Kotak quest yang tampil sendiri (penanda sedang jadi beacon tepi) juga
    // dipusatkan, bukan digeser ke kanan seperti saat menempel pada `!`.
    rerender(
      <InteractHint hint={{ text: "Space", x: 320, y: 180, menempel: true }} />,
    );
    expect(screen.getByText("Space").parentElement?.className).toContain(
      "-translate-x-1/2",
    );
  });

  it("obrolan singkat: kotak memudar keluar dengan animasi pop-out", () => {
    render(
      <InteractHint
        hint={{ text: "Space", x: 320, y: 180, menempel: false }}
        keluar
      />,
    );

    const kelas = screen.getByText("Space").className.split(/\s+/);
    expect(kelas).toContain("animate-quest-pop-out");
    expect(kelas).not.toContain("animate-quest-pop");
    expect(kelas).not.toContain("animate-quest-slide-out");
  });

  it("kotak quest yang tampil sendiri meluncur masuk kembali ke `!`", () => {
    render(
      <InteractHint
        hint={{ text: "Space", x: 320, y: 180, menempel: true }}
        keluar
      />,
    );

    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("animate-quest-slide-out");
    expect(kotak.className).toContain("origin-left");
    expect(kotak.className).not.toContain("animate-quest-slide-in");
  });
});
