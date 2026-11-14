import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassroomDetail } from "@/server/contracts";

import { ShareGameDialog } from "./ShareGameDialog";

/**
 * Dialog bagikan game per kelas.
 *
 * Yang dijaga: tautan yang disalin benar-benar membawa kode kelas
 * (`?kelas=QST-XXXX`), tautan ikut berubah saat kelas diganti, dan guru tanpa
 * kelas diarahkan membuat kelas dulu alih-alih menerima tautan tanpa kelas.
 */

const CLASSES: ClassroomDetail[] = [
  {
    id: "cls_5a",
    name: "Kelas 5A",
    subject: "IPA",
    grade: "Kelas 5",
    code: "QST-7K3M",
    year: "2026/2027",
    students: [],
    createdAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "cls_5b",
    name: "Kelas 5B",
    subject: "IPA",
    grade: "Kelas 5",
    code: "QST-9Z2P",
    year: "2026/2027",
    students: [],
    createdAt: "2026-11-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.stubGlobal("location", { origin: "https://classquest.test" });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderDialog = (classes: ClassroomDetail[] = CLASSES) =>
  render(
    <ShareGameDialog
      open
      onClose={() => {}}
      storyId="st_air"
      storyTitle="Siklus Air"
      classes={classes}
    />,
  );

describe("ShareGameDialog", () => {
  it("membuat tautan kelas pertama secara default", () => {
    renderDialog();

    expect(screen.getByLabelText(/tautan siswa/i)).toHaveValue(
      "https://classquest.test/play/st_air?kelas=QST-7K3M",
    );
  });

  it("mengganti kelas mengganti tautan", () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText("Kelas"));
    fireEvent.click(screen.getByRole("option", { name: /Kelas 5B/ }));

    expect(screen.getByLabelText(/tautan siswa/i)).toHaveValue(
      "https://classquest.test/play/st_air?kelas=QST-9Z2P",
    );
  });

  it("tanpa kelas, dialog meminta guru membuat kelas dulu", () => {
    renderDialog([]);

    expect(screen.getByText(/Belum ada kelas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/tautan siswa/i)).not.toBeInTheDocument();
  });
});
