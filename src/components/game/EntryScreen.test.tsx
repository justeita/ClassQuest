import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import type { PlayClassroom, PlayStudent } from "@/server/contracts";

import { EntryScreen } from "./EntryScreen";

/**
 * Layar masuk siswa: memilih nama dari daftar kelas, atau mengetik nama bebas
 * bila tidak ada di daftar. Yang dijaga: identitas yang dikirim ke `GameShell`
 * (`studentId` vs `nickname`), tombol masuk tidak aktif sebelum ada pilihan,
 * dan tautan kelas yang salah dijelaskan apa adanya.
 */

const CLASSROOM: PlayClassroom = {
  id: "cls_5a",
  name: "Kelas 5A",
  code: "QST-7K3M",
};

const STUDENTS: PlayStudent[] = [
  { id: "stu_andi", name: "Andi Pratama", nis: "1001" },
  { id: "stu_siti", name: "Siti Aminah", nis: null },
];

afterEach(cleanup);

const renderEntry = (props: {
  classroom?: PlayClassroom | null;
  students?: PlayStudent[];
  classLinkInvalid?: boolean;
  onMasuk?: (pemain: { studentId: string | null; name: string }) => void;
}) =>
  render(
    <EntryScreen
      story={DEMO_STORY}
      classroom={props.classroom ?? null}
      students={props.students ?? []}
      classLinkInvalid={props.classLinkInvalid ?? false}
      onMasuk={props.onMasuk ?? (() => {})}
    />,
  );

describe("EntryScreen", () => {
  it("menampilkan kelas dan daftar siswa dari tautan", () => {
    renderEntry({ classroom: CLASSROOM, students: STUDENTS });

    expect(screen.getByText(/Kelas 5A · QST-7K3M/)).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Andi Pratama/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Siti Aminah/ }),
    ).toBeInTheDocument();
  });

  it("tombol masuk mati sampai siswa memilih nama", () => {
    renderEntry({ classroom: CLASSROOM, students: STUDENTS });

    const tombol = screen.getByRole("button", { name: /masuk ke cerita/i });
    expect(tombol).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /Andi Pratama/ }));
    expect(tombol).toBeEnabled();
  });

  it("memilih nama mengirim studentId, bukan nama bebas", () => {
    const onMasuk = vi.fn();
    renderEntry({ classroom: CLASSROOM, students: STUDENTS, onMasuk });

    fireEvent.click(screen.getByRole("radio", { name: /Siti Aminah/ }));
    fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));

    expect(onMasuk).toHaveBeenCalledWith({
      studentId: "stu_siti",
      name: "Siti Aminah",
    });
  });

  it("pencarian menyaring daftar berdasarkan nama atau NIS", () => {
    renderEntry({ classroom: CLASSROOM, students: STUDENTS });

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "1001" },
    });

    expect(
      screen.getByRole("radio", { name: /Andi Pratama/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /Siti Aminah/ }),
    ).not.toBeInTheDocument();
  });

  it("nama yang tidak ada di daftar bisa diketik dan dikirim sebagai nickname", () => {
    const onMasuk = vi.fn();
    renderEntry({ classroom: CLASSROOM, students: STUDENTS, onMasuk });

    fireEvent.click(
      screen.getByRole("button", { name: /nama saya tidak ada di daftar/i }),
    );
    fireEvent.change(screen.getByLabelText(/nama atau username/i), {
      target: { value: "  Budi   Santoso " },
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));

    expect(onMasuk).toHaveBeenCalledWith({
      studentId: null,
      name: "Budi Santoso",
    });
  });

  it("tanpa kelas langsung meminta nama bebas", () => {
    const onMasuk = vi.fn();
    renderEntry({ onMasuk });

    fireEvent.change(screen.getByLabelText(/nama atau username/i), {
      target: { value: "Rina" },
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));

    expect(onMasuk).toHaveBeenCalledWith({ studentId: null, name: "Rina" });
  });

  it("tautan kelas yang salah dijelaskan tanpa memblokir permainan", () => {
    renderEntry({ classLinkInvalid: true, onMasuk: vi.fn() });

    expect(screen.getByRole("status")).toHaveTextContent(
      /hasil main tidak masuk ke analytics kelas/i,
    );
    expect(
      screen.getByRole("button", { name: /masuk ke cerita/i }),
    ).toBeInTheDocument();
  });
});
