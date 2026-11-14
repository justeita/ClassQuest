// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getPlayEntry` — data layar masuk `/play/[storyId]?kelas=QST-XXXX`.
 *
 * Yang di-mock hanya `@/server/db`; database tetap libSQL in-memory dengan
 * migrasi asli (pola `stories/playable.test.ts`). Yang dijaga: kode kelas sah
 * hanya dipakai bila kelasnya milik guru pemilik cerita, kode salah tidak
 * membuat halaman 404, dan data yang dikirim ke client tidak lebih dari
 * id/nama/NIS siswa.
 */

const { dbRef, getReadyDbMock } = vi.hoisted(() => {
  const dbRef: { current: Client | null } = { current: null };
  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });
  return { dbRef, getReadyDbMock };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { DEMO_STORY, DEMO_STORY_ID } from "@/game/demoStory";
import { applyMigrations } from "@/server/db/migrations";
import { buildFallbackStory } from "@/story/fallback";
import type { Story } from "@/story/schema";

import { getPlayEntry } from "./entry";

let db: Client;

const STORY_ID = "st_entry";
const TEACHER_ID = "teacher_entry";
const OTHER_TEACHER_ID = "teacher_entry_lain";
const CLASS_CODE = "QST-7K3M";
const OTHER_CLASS_CODE = "QST-9Z2P";

const storyFor = (id: string, title: string): Story => {
  const story = buildFallbackStory();
  return { ...story, meta: { ...story.meta, id, title } };
};

async function seedStory(options: {
  storyId?: string;
  status?: string;
  publishedVersion?: number | null;
  title?: string;
}): Promise<void> {
  const storyId = options.storyId ?? STORY_ID;
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', ?, ?, 'materi.pdf')`,
    args: [
      storyId,
      TEACHER_ID,
      options.status ?? "published",
      options.publishedVersion ?? 1,
    ],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [
      storyId,
      JSON.stringify(storyFor(storyId, options.title ?? "Siklus Air")),
    ],
  });
}

async function seedClassroom(options: {
  id: string;
  teacherId: string;
  code: string;
  students?: { id: string; name: string; nis: string | null }[];
}): Promise<void> {
  await db.execute({
    sql: `insert into classrooms
            (id, teacher_id, name, subject, grade_level, code, academic_year)
          values (?, ?, 'Kelas 5A', 'IPA', 'Kelas 5', ?, '2026/2027')`,
    args: [options.id, options.teacherId, options.code],
  });

  for (const student of options.students ?? []) {
    await db.execute({
      sql: `insert into students (id, teacher_id, classroom_id, nis, display_name)
            values (?, ?, ?, ?, ?)`,
      args: [
        student.id,
        options.teacherId,
        options.id,
        student.nis,
        student.name,
      ],
    });
  }
}

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  getReadyDbMock.mockClear();

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru')",
    args: [TEACHER_ID],
  });
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Lain')",
    args: [OTHER_TEACHER_ID],
  });
});

afterEach(() => {
  db.close();
  dbRef.current = null;
});

describe("getPlayEntry", () => {
  it("tanpa kelas mengembalikan cerita dan classLinkInvalid=false", async () => {
    await seedStory({ title: "Siklus Air" });

    const entry = await getPlayEntry(STORY_ID, null);

    expect(entry).not.toBeNull();
    expect(entry?.story.meta.title).toBe("Siklus Air");
    expect(entry?.classroom).toBeNull();
    expect(entry?.students).toEqual([]);
    expect(entry?.classLinkInvalid).toBe(false);
  });

  it("kode kelas sah milik guru cerita mengirim kelas + daftar siswa", async () => {
    await seedStory({});
    await seedClassroom({
      id: "cls_5a",
      teacherId: TEACHER_ID,
      code: CLASS_CODE,
      students: [
        { id: "stu_andi", name: "Andi", nis: "1001" },
        { id: "stu_siti", name: "Siti", nis: null },
      ],
    });

    const entry = await getPlayEntry(STORY_ID, CLASS_CODE);

    expect(entry?.classroom).toEqual({
      id: "cls_5a",
      name: "Kelas 5A",
      code: CLASS_CODE,
    });
    expect(entry?.students).toEqual([
      { id: "stu_andi", name: "Andi", nis: "1001" },
      { id: "stu_siti", name: "Siti", nis: null },
    ]);
    expect(entry?.classLinkInvalid).toBe(false);
  });

  it("kode kelas tidak peka huruf besar/kecil dan spasi tepi", async () => {
    await seedStory({});
    await seedClassroom({
      id: "cls_5a",
      teacherId: TEACHER_ID,
      code: CLASS_CODE,
    });

    const entry = await getPlayEntry(
      STORY_ID,
      `  ${CLASS_CODE.toLowerCase()} `,
    );

    expect(entry?.classroom?.id).toBe("cls_5a");
  });

  it("kode kelas tidak dikenal tetap membuka cerita, tanpa kelas", async () => {
    await seedStory({});

    const entry = await getPlayEntry(STORY_ID, "QST-AAAA");

    expect(entry).not.toBeNull();
    expect(entry?.classroom).toBeNull();
    expect(entry?.students).toEqual([]);
    expect(entry?.classLinkInvalid).toBe(true);
  });

  it("kode kelas salah bentuk juga classLinkInvalid", async () => {
    await seedStory({});

    const entry = await getPlayEntry(STORY_ID, "bukan-kode");

    expect(entry?.classLinkInvalid).toBe(true);
    expect(entry?.classroom).toBeNull();
  });

  it("kelas milik guru lain diperlakukan seperti kode salah", async () => {
    await seedStory({});
    await seedClassroom({
      id: "cls_lain",
      teacherId: OTHER_TEACHER_ID,
      code: OTHER_CLASS_CODE,
      students: [{ id: "stu_lain", name: "Bukan Siswa Kita", nis: "9" }],
    });

    const entry = await getPlayEntry(STORY_ID, OTHER_CLASS_CODE);

    expect(entry?.classroom).toBeNull();
    expect(entry?.students).toEqual([]);
    expect(entry?.classLinkInvalid).toBe(true);
  });

  it("cerita tidak terbit, tidak ada, atau id tidak sah → null", async () => {
    await seedStory({
      storyId: "st_draft",
      status: "draft",
      publishedVersion: null,
    });

    await expect(getPlayEntry("st_draft", null)).resolves.toBeNull();
    await expect(getPlayEntry("st_tidak_ada", null)).resolves.toBeNull();
    await expect(getPlayEntry("", null)).resolves.toBeNull();
    await expect(getPlayEntry("a".repeat(201), null)).resolves.toBeNull();
  });

  it("cerita demo tidak membuka database dan tidak punya kelas", async () => {
    dbRef.current = null;

    const entry = await getPlayEntry(DEMO_STORY_ID, null);

    expect(entry?.story).toBe(DEMO_STORY);
    expect(entry?.classroom).toBeNull();
    expect(getReadyDbMock).not.toHaveBeenCalled();
  });
});
