import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DialogueBox } from "./DialogueBox";
import type { DialogueView } from "@/game/gameBus";

// `globals` tidak aktif di vitest.config.mjs, jadi RTL tidak membersihkan DOM
// sendiri di antara tes.
afterEach(cleanup);

const bicara: DialogueView = {
  visible: true,
  name: "Bu Ratna",
  text: "Air di bumi tidak pernah benar-benar hilang.",
  waiting: true,
};

describe("DialogueBox", () => {
  it("menampilkan nama dan teks dialog", () => {
    render(<DialogueBox view={bicara} onAdvance={() => {}} />);

    expect(screen.getByText("Bu Ratna")).toBeInTheDocument();
    expect(
      screen.getByText(/Air di bumi tidak pernah benar-benar hilang/),
    ).toBeInTheDocument();
  });

  it("tidak merender apa pun saat view disembunyikan", () => {
    render(
      <DialogueBox view={{ ...bicara, visible: false }} onAdvance={() => {}} />,
    );

    expect(screen.queryByText("Bu Ratna")).not.toBeInTheDocument();
  });

  it("klik panel mengirim satu langkah dialog", () => {
    const onAdvance = vi.fn();
    render(<DialogueBox view={bicara} onAdvance={onAdvance} />);

    fireEvent.click(screen.getByText(/Air di bumi/));

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("indikator lanjut hanya muncul saat menunggu", () => {
    const { rerender } = render(
      <DialogueBox view={bicara} onAdvance={() => {}} />,
    );
    expect(screen.getByText("▼")).toBeInTheDocument();

    rerender(
      <DialogueBox
        view={{ ...bicara, text: "Air di bumi", waiting: false }}
        onAdvance={() => {}}
      />,
    );
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("beat narasi tanpa nama hanya menampilkan teks", () => {
    render(
      <DialogueBox view={{ ...bicara, name: null }} onAdvance={() => {}} />,
    );

    expect(screen.queryByText("Bu Ratna")).not.toBeInTheDocument();
    expect(screen.getByText(/Air di bumi/)).toBeInTheDocument();
  });
});
