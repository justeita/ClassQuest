import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InteractHint } from "./InteractHint";
import { cqw, persenTinggi, persenLebar } from "@/game/layout";

afterEach(cleanup);

describe("InteractHint", () => {
  it("menampilkan teks tombol interaksi", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 180 }} />);

    expect(screen.getByText("Space")).toBeInTheDocument();
  });

  it("menaruh chip di kanan-bawah koordinat internal", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 90 }} />);

    const chip = screen.getByText("Space").parentElement;
    expect(chip).not.toBeNull();
    expect(chip?.style.left).toBe(persenLebar(320));
    expect(chip?.style.top).toBe(persenTinggi(90));
    // Titik jangkar adalah sudut kiri-bawah: chip naik ke atas titik itu dan
    // tidak lagi digeser ke tengah, karena duduk di samping penanda "!".
    expect(chip?.className).toContain("-translate-y-full");
    expect(chip?.className).not.toContain("-translate-x-1/2");
  });

  it("tidak menangkap klik supaya canvas tetap menerima input", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 180 }} />);

    expect(screen.getByText("Space").parentElement?.className).toContain(
      "pointer-events-none",
    );
  });

  it("ukuran huruf mengikuti skala canvas", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 180 }} />);

    // Ukuran memakai satuan internal; nilainya diturunkan dari lebar dunia
    // aktual (`--gw`), jadi yang diuji cukup bahwa rumusnya dipakai.
    const ukuran = screen.getByText("Space").style.fontSize;
    expect(ukuran).toContain("cqw");
    expect(ukuran).toContain("var(--gw");
    expect(cqw(11)).toContain("var(--gw");
  });

  it("menampilkan Space di dalam kotak bergaya HUD", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 180 }} />);

    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("border-2");
    expect(kotak.className).toContain("bg-[#0b120e]/90");
    expect(kotak.className).toContain("text-[#F7F4EC]");
  });

  it("menyembul ke kanan dari penanda quest lewat animasi slider", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 180 }} />);

    // Animasi duduk di kotak itu sendiri dan tumbuh dari tepi kiri, jadi
    // kotak tampak meluncur keluar dari penanda `!` di sebelah kiri.
    const kotak = screen.getByText("Space");
    expect(kotak.className).toContain("animate-quest-slide-in");
    expect(kotak.className).toContain("origin-left");
  });
});
