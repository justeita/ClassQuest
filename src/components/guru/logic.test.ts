// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { StoryListItem } from "@/server/contracts";

import {
  EMPTY_STORY_FILTER,
  STORY_STATUS_META,
  checkPdfFile,
  defaultTitleFromFilename,
  filterStories,
  formatBytes,
  formatUpdatedAt,
  storyStatusLabel,
} from "./logic";

/**
 * Logika murni Portal Guru: penyaringan daftar cerita, label status, format
 * tampilan, dan validasi berkas unggahan. Semua perilaku di sini terlihat
 * langsung oleh guru di dashboard/daftar materi.
 */

const story = (
  overrides: Partial<StoryListItem> & Pick<StoryListItem, "id">,
): StoryListItem => ({
  id: overrides.id,
  title: overrides.title ?? "Siklus Air",
  subject: overrides.subject ?? "IPA",
  gradeLevel: overrides.gradeLevel ?? "SMP 7",
  language: overrides.language ?? "id",
  status: overrides.status ?? "draft",
  updatedAt: overrides.updatedAt ?? "2026-11-12T03:00:00.000Z",
  usedFallback: overrides.usedFallback ?? false,
  versionCount: overrides.versionCount ?? 1,
});

const STORIES: StoryListItem[] = [
  story({ id: "st_1", title: "Ekosistem Karang", subject: "Biologi" }),
  story({
    id: "st_2",
    title: "Aljabar Linier",
    subject: "Matematika",
    status: "published",
  }),
  story({
    id: "st_3",
    title: "Algoritma Python",
    subject: "Informatika",
    status: "processing",
    versionCount: 0,
  }),
];

describe("filterStories", () => {
  it("mengembalikan semua cerita bila filter kosong", () => {
    expect(filterStories(STORIES, EMPTY_STORY_FILTER)).toHaveLength(
      STORIES.length,
    );
  });

  it("mencocokkan judul tanpa peduli huruf besar/kecil dan spasi", () => {
    const hasil = filterStories(STORIES, {
      ...EMPTY_STORY_FILTER,
      query: "  PYTHON ",
    });

    expect(hasil.map((item) => item.id)).toEqual(["st_3"]);
  });

  it("mencocokkan mata pelajaran, bukan hanya judul", () => {
    expect(
      filterStories(STORIES, {
        ...EMPTY_STORY_FILTER,
        query: "biologi",
      }).map((item) => item.id),
    ).toEqual(["st_1"]);
  });

  it("menggabungkan filter mata pelajaran dan status", () => {
    expect(
      filterStories(STORIES, {
        ...EMPTY_STORY_FILTER,
        subject: "Matematika",
        status: "published",
      }).map((item) => item.id),
    ).toEqual(["st_2"]);

    expect(
      filterStories(STORIES, {
        ...EMPTY_STORY_FILTER,
        subject: "Matematika",
        status: "draft",
      }),
    ).toEqual([]);
  });

  it("mempertahankan urutan masukan (terbaru dulu dari server)", () => {
    expect(filterStories(STORIES, EMPTY_STORY_FILTER).map((i) => i.id)).toEqual(
      ["st_1", "st_2", "st_3"],
    );
  });
});

describe("label status", () => {
  it("memakai label dari tabel teacher-dashboard", () => {
    expect(storyStatusLabel("processing")).toBe("Sedang dibuat…");
    expect(storyStatusLabel("draft")).toBe("Perlu direview");
    expect(storyStatusLabel("published")).toBe("Sudah dibagikan");
    expect(storyStatusLabel("failed")).toBe("Gagal dibuat");
    expect(storyStatusLabel("archived")).toBe("Diarsipkan");
  });

  it("setiap status punya kelas lencana", () => {
    for (const meta of Object.values(STORY_STATUS_META)) {
      expect(meta.badge).not.toBe("");
    }
  });
});

describe("formatBytes", () => {
  it("memakai koma desimal seperti pesan error di docs", () => {
    expect(formatBytes(4.5 * 1024 * 1024)).toBe("4,5 MB");
    expect(formatBytes(4 * 1024 * 1024)).toBe("4,0 MB");
  });

  it("menampilkan KB untuk berkas di bawah 1 MB", () => {
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(0)).toBe("1 KB");
  });

  it("aman untuk nilai tidak masuk akal", () => {
    expect(formatBytes(Number.NaN)).toBe("-");
    expect(formatBytes(-1)).toBe("-");
  });
});

describe("formatUpdatedAt", () => {
  it("memakai nama bulan Indonesia dan bagian UTC", () => {
    expect(formatUpdatedAt("2026-11-12T23:30:00.000Z")).toBe("12 Nov 2026");
    expect(formatUpdatedAt("2026-01-02T00:00:00.000Z")).toBe("2 Jan 2026");
  });

  it("mengembalikan strip untuk tanggal rusak", () => {
    expect(formatUpdatedAt("bukan tanggal")).toBe("-");
  });
});

describe("defaultTitleFromFilename", () => {
  it("membuang ekstensi dan mengubah garis bawah menjadi spasi", () => {
    expect(defaultTitleFromFilename("Modul_Ekosistem_Karang.pdf")).toBe(
      "Modul Ekosistem Karang",
    );
  });

  it("mempertahankan nama tanpa ekstensi", () => {
    expect(defaultTitleFromFilename("materi")).toBe("materi");
  });
});

describe("checkPdfFile", () => {
  const MAX = 4 * 1024 * 1024;

  it("menerima PDF berdasarkan MIME", () => {
    expect(
      checkPdfFile(
        { name: "materi", type: "application/pdf", size: 1024 },
        MAX,
      ),
    ).toEqual({ ok: true });
  });

  it("menerima PDF berdasarkan ekstensi walau MIME kosong", () => {
    expect(
      checkPdfFile({ name: "materi.PDF", type: "", size: 1024 }, MAX),
    ).toEqual({ ok: true });
  });

  it("menolak berkas yang bukan PDF dengan bahasa manusia", () => {
    expect(
      checkPdfFile(
        { name: "materi.docx", type: "application/msword", size: 10 },
        MAX,
      ),
    ).toEqual({
      ok: false,
      message: "File ini bukan PDF. Pilih file .pdf ya.",
    });
  });

  it("menolak berkas melebihi batas dan menyebut kedua ukurannya", () => {
    const hasil = checkPdfFile(
      { name: "materi.pdf", type: "application/pdf", size: 4.5 * 1024 * 1024 },
      MAX,
    );

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(hasil.message).toContain("4,5 MB");
      expect(hasil.message).toContain("4,0 MB");
    }
  });

  it("menerima berkas tepat di batas", () => {
    expect(
      checkPdfFile(
        { name: "materi.pdf", type: "application/pdf", size: MAX },
        MAX,
      ),
    ).toEqual({ ok: true });
  });
});
