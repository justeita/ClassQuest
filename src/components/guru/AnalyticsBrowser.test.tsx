import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AnalyticsStudentRow,
  ClassroomAnalytics,
  ClassroomDetail,
  StoryListItem,
} from "@/server/contracts";

import { AnalyticsBrowser } from "./AnalyticsBrowser";

/**
 * Halaman Analytics guru.
 *
 * Yang dijaga: pilihan kelas/game ditulis ke query string (bukan state lokal),
 * filter kosong berarti "semua" sehingga data langsung tampil, siswa yang belum
 * bermain tetap tampil saat satu kelas + satu game dipilih, dan kolom
 * poin/kesalahan berasal dari agregat server apa adanya.
 */

const replace = vi.fn();
let searchParamsValue = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

const CLASSES: ClassroomDetail[] = [
  {
    id: "cls_5a",
    name: "Kelas 5A",
    subject: "IPA",
    grade: "Kelas 5",
    code: "QST-7K3M",
    year: "2026/2027",
    students: [
      {
        id: "stu_andi",
        classroomId: "cls_5a",
        name: "Andi Pratama",
        nisn: "0091234567",
        nis: "1001",
        username: null,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "stu_siti",
        classroomId: "cls_5a",
        name: "Siti Aminah",
        nisn: null,
        nis: null,
        username: null,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-11-01T00:00:00.000Z",
  },
];

const STORIES: StoryListItem[] = [
  {
    id: "st_air",
    title: "Siklus Air",
    subject: "IPA",
    gradeLevel: "Kelas 5",
    language: "id",
    status: "published",
    updatedAt: "2026-11-10T00:00:00.000Z",
    usedFallback: false,
    versionCount: 1,
  },
  {
    id: "st_draft",
    title: "Draf Belum Terbit",
    subject: "IPA",
    gradeLevel: "Kelas 5",
    language: "id",
    status: "draft",
    updatedAt: "2026-11-10T00:00:00.000Z",
    usedFallback: false,
    versionCount: 1,
  },
];

const ANDI: AnalyticsStudentRow = {
  key: "cls_5a|st_air|student:stu_andi",
  studentId: "stu_andi",
  name: "Andi Pratama",
  nis: "1001",
  attempts: 2,
  bestPoints: 40,
  latestPoints: 40,
  latestCorrectCount: 4,
  totalCount: 5,
  totalPoints: 50,
  weakConcepts: ["Kondensasi", "Penguapan"],
  lastPlayedAt: "2026-11-11T08:00:00.000Z",
  classroomId: "cls_5a",
  classroomName: "Kelas 5A",
  storyId: "st_air",
  storyTitle: "Siklus Air",
};

const CLASSROOM = { id: "cls_5a", name: "Kelas 5A", code: "QST-7K3M" };
const STORY = { id: "st_air", title: "Siklus Air" };

/** Satu kelas + satu game: baris siswa yang belum bermain ikut ditambahkan. */
const ANALYTICS: ClassroomAnalytics = {
  classrooms: [CLASSROOM],
  stories: [STORY],
  selectedClassroomId: "cls_5a",
  selectedStoryId: "st_air",
  studentsTotal: 2,
  studentsPlayed: 1,
  totalAttempts: 2,
  averageBestPoints: 40,
  rows: [ANDI],
};

/** Tanpa filter: agregat semua kelas × semua game terbit. */
const ANALYTICS_SEMUA: ClassroomAnalytics = {
  classrooms: [CLASSROOM],
  stories: [STORY],
  selectedClassroomId: null,
  selectedStoryId: null,
  studentsTotal: 2,
  studentsPlayed: 1,
  totalAttempts: 2,
  averageBestPoints: 40,
  rows: [ANDI],
};

beforeEach(() => {
  replace.mockClear();
  searchParamsValue = "";
});

afterEach(cleanup);

describe("AnalyticsBrowser", () => {
  it("meminta guru membuat kelas dulu bila belum ada kelas", () => {
    render(
      <AnalyticsBrowser
        classes={[]}
        stories={STORIES}
        selectedClassroomId={null}
        selectedStoryId={null}
        analytics={null}
      />,
    );

    expect(screen.getByText("Belum ada kelas")).toBeInTheDocument();
  });

  it("menampilkan ringkasan dan baris siswa beserta poin dan konsep lemah", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId="cls_5a"
        selectedStoryId="st_air"
        analytics={ANALYTICS}
      />,
    );

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("40 / 50")).toBeInTheDocument();
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    expect(screen.getByText("Kondensasi")).toBeInTheDocument();
    expect(screen.getByText("Penguapan")).toBeInTheDocument();
    // Siswa yang belum bermain tetap muncul agar guru tahu siapa yang tertinggal.
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.getByText("Belum main")).toBeInTheDocument();
  });

  it("hanya menawarkan game terbit di pilihan game", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId="cls_5a"
        selectedStoryId={null}
        analytics={null}
      />,
    );

    fireEvent.click(screen.getByLabelText("Game"));

    expect(
      screen.getByRole("option", { name: /Siklus Air/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Draf Belum Terbit/ }),
    ).not.toBeInTheDocument();
  });

  it("tanpa filter apa pun langsung menampilkan data semua kelas dan game", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId={null}
        selectedStoryId={null}
        analytics={ANALYTICS_SEMUA}
      />,
    );

    // Tidak ada layar "pilih kelas dan game" yang menghalangi data.
    expect(screen.queryByText("Pilih kelas dan game")).not.toBeInTheDocument();
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    // Saat lintas game, kartu rata-rata tidak membandingkan dengan satu
    // `totalPoints` karena tiap game punya poin maksimum sendiri.
    expect(screen.getByText("Siswa bermain")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    // Kolom asal baris muncul karena hasilnya gabungan lintas kelas/game.
    expect(
      screen.getByRole("columnheader", { name: "Kelas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Game" }),
    ).toBeInTheDocument();
  });

  it("tanpa filter tidak menawarkan siswa yang belum bermain (tidak ada acuan kelas tunggal)", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId={null}
        selectedStoryId={null}
        analytics={ANALYTICS_SEMUA}
      />,
    );

    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    expect(screen.queryByText("Siti Aminah")).not.toBeInTheDocument();
  });

  it("hanya kelas yang difilter: kolom Game tetap ada, Kelas tidak", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId="cls_5a"
        selectedStoryId={null}
        analytics={{
          ...ANALYTICS_SEMUA,
          selectedClassroomId: "cls_5a",
        }}
      />,
    );

    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Kelas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Game" }),
    ).toBeInTheDocument();
  });

  it("memilih kelas menulis ?kelas= tanpa menyentuh pilihan game", () => {
    searchParamsValue = "storyId=st_air";

    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId={null}
        selectedStoryId="st_air"
        analytics={ANALYTICS_SEMUA}
      />,
    );

    fireEvent.click(screen.getByLabelText("Kelas"));
    fireEvent.click(screen.getByRole("option", { name: /Kelas 5A/ }));

    expect(replace).toHaveBeenCalledWith(
      "/guru/analitik?storyId=st_air&kelas=cls_5a",
    );
  });

  it("memilih game mempertahankan kelas di query string", () => {
    searchParamsValue = "kelas=cls_5a";

    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId="cls_5a"
        selectedStoryId={null}
        analytics={null}
      />,
    );

    fireEvent.click(screen.getByLabelText("Game"));
    fireEvent.click(screen.getByRole("option", { name: /Siklus Air/ }));

    expect(replace).toHaveBeenCalledWith(
      "/guru/analitik?kelas=cls_5a&storyId=st_air",
    );
  });
});
