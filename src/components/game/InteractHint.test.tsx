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

  it("menaruh chip di titik tengah koordinat internal", () => {
    render(<InteractHint hint={{ text: "Space", x: 320, y: 90 }} />);

    const chip = screen.getByText("Space").parentElement;
    expect(chip).not.toBeNull();
    expect(chip?.style.left).toBe(persenLebar(320));
    expect(chip?.style.top).toBe(persenTinggi(90));
    // Chip digeser ke atas dan ke tengah supaya menunjuk NPC, bukan menutupinya.
    expect(chip?.className).toContain("-translate-x-1/2");
    expect(chip?.className).toContain("-translate-y-full");
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
});
