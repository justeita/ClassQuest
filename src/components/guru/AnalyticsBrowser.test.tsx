import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ClassroomAnalytics,
  ClassroomDetail,
  StoryListItem,
} from "@/server/contracts";

import { AnalyticsBrowser } from "./AnalyticsBrowser";

/**
 * Halaman Analytics guru.
 *
 * Yang dijaga: pilihan kelas/game ditulis ke query string (bukan state lokal),
 * siswa yang belum bermain tetap tampil, dan kolom poin/kesalahan berasal dari
 * agregat server apa adanya.
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
        nis: "1001",
        username: null,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "stu_siti",
        classroomId: "cls_5a",
        name: "Siti Aminah",
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

const ANALYTICS: ClassroomAnalytics = {
  classroom: { id: "cls_5a", name: "Kelas 5A", code: "QST-7K3M" },
  storyId: "st_air",
  storyTitle: "Siklus Air",
  studentsTotal: 2,
  studentsPlayed: 1,
  totalAttempts: 2,
  averageBestPoints: 40,
  totalPoints: 50,
  rows: [
    {
      key: "student:stu_andi",
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
    },
  ],
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

  it("memilih kelas menulis ?kelas= dan mengosongkan game", () => {
    render(
      <AnalyticsBrowser
        classes={CLASSES}
        stories={STORIES}
        selectedClassroomId={null}
        selectedStoryId="st_air"
        analytics={null}
      />,
    );

    fireEvent.click(screen.getByLabelText("Kelas"));
    fireEvent.click(screen.getByRole("option", { name: /Kelas 5A/ }));

    expect(replace).toHaveBeenCalledWith(
      "/guru/analitik?kelas=cls_5a&storyId=",
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
