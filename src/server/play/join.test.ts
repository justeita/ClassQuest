// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gerbang kode kelas `/play` (`src/server/play/join.ts`).
 *
 * Yang dijaga: kode → kelas → **game terbit milik guru kelas itu** saja, satu
 * game langsung dibuka, beberapa game harus dipilih, dan **NIS** yang diketik
 * hanya diterima bila terdaftar sebagai murid guru itu (ADR 0044). Database
 * tetap libSQL in-memory dengan migrasi asli; hanya `@/server/db` yang
 * di-mock karena `getPlayEntry` membuka koneksi sendiri.
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

import { applyMigrations } from "@/server/db/migrations";
import { buildFallbackStory } from "@/story/fallback";
import type { Story } from "@/story/schema";

import {
  cleanPlayerNis,
  findStudentByNis,
  normalizeForCompare,
  resolveClassCode,
  startJoin,
} from "./join";

let db: Client;

const TEACHER_ID = "teacher_join";
const OTHER_TEACHER_ID = "teacher_join_lain";
const CLASS_CODE = "QST-7K3M";
const STORY_A = "st_join_a";
const STORY_B = "st_join_b";
const STORY_OTHER = "st_join_other";

const storyFor = (id: string): Story => {
  const story = buildFallbackStory();
  return { ...story, meta: { ...story.meta, id } };
};

async function seedStory(options: {
  storyId: string;
  teacherId?: string;
  status?: string;
  publishedVersion?: number | null;
}): Promise<void> {
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, ?, 'IPA', 'Kelas 5', 'id', ?, ?, 'materi.pdf')`,
    args: [
      options.storyId,
      options.teacherId ?? TEACHER_ID,
      `Game ${options.storyId}`,
      options.status ?? "published",
      options.publishedVersion ?? 1,
    ],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [options.storyId, JSON.stringify(storyFor(options.storyId))],
  });
}

async function seedClassroom(options: {
  teacherId?: string;
  code?: string;
  students?: { id: string; name: string; nis?: string }[];
}): Promise<void> {
  const teacherId = options.teacherId ?? TEACHER_ID;
  const code = options.code ?? CLASS_CODE;

  await db.execute({
    sql: `insert into classrooms
            (id, teacher_id, name, subject, grade_level, code, academic_year)
          values (?, ?, 'Kelas 5A', 'IPA', 'Kelas 5', ?, '2026/2027')`,
    args: [`cls_${code}`, teacherId, code],
  });

  for (const student of options.students ?? []) {
    await db.execute({
      sql: `insert into students (id, teacher_id, classroom_id, display_name, nis)
            values (?, ?, ?, ?, ?)`,
      args: [
        student.id,
        teacherId,
        `cls_${code}`,
        student.name,
        student.nis ?? null,
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

describe("resolveClassCode", () => {
  it("menolak bentuk kode yang tidak sah", async () => {
    expect(await resolveClassCode(db, "QST-12")).toEqual({
      ok: false,
      reason: "invalid_code",
    });
    expect(await resolveClassCode(db, "")).toEqual({
      ok: false,
      reason: "invalid_code",
    });
    expect(await resolveClassCode(db, null)).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("membedakan kode tidak ada dari bentuk yang salah", async () => {
    expect(await resolveClassCode(db, "QST-9Z9Z")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("mengembalikan kelas dan game terbit gurunya saja", async () => {
    await seedClassroom({});
    await seedStory({ storyId: STORY_A });
    await seedStory({
      storyId: STORY_B,
      status: "draft",
      publishedVersion: null,
    });
    await seedStory({ storyId: STORY_OTHER, teacherId: OTHER_TEACHER_ID });

    const hasil = await resolveClassCode(db, "qst-7k3m");

    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.classroom).toEqual({
      id: "cls_QST-7K3M",
      name: "Kelas 5A",
      code: CLASS_CODE,
    });
    expect(hasil.games.map((game) => game.storyId)).toEqual([STORY_A]);
    // Guru pemilik kelas hanya dipakai di server, tidak ikut ke client.
    expect(hasil.teacherId).toBe(TEACHER_ID);
  });
});

describe("startJoin", () => {
  it("NIS terdaftar langsung membuka satu game terbit, nama dari daftar", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
    });
    await seedStory({ storyId: STORY_A });

    const hasil = await startJoin(db, { code: CLASS_CODE, nis: "1001" });

    expect(hasil.ok).toBe(true);
    if (!hasil.ok || hasil.jenis !== "main") throw new Error("harus main");
    expect(hasil.story.meta.id).toBe(STORY_A);
    expect(hasil.classroom.code).toBe(CLASS_CODE);
    // Nama lengkap diambil dari baris `students`, bukan dari input siswa.
    expect(hasil.pemain).toEqual({
      studentId: "stu_andi",
      name: "Andi Pratama",
    });
  });

  it("NIS dicocokkan tanpa memandang huruf besar/kecil", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "A-102" }],
    });
    await seedStory({ storyId: STORY_A });

    const hasil = await startJoin(db, { code: CLASS_CODE, nis: "a-102" });

    if (!hasil.ok || hasil.jenis !== "main") throw new Error("harus main");
    expect(hasil.pemain.studentId).toBe("stu_andi");
  });

  it("NIS yang tidak ada di daftar guru ditolak", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
    });
    await seedStory({ storyId: STORY_A });

    expect(await startJoin(db, { code: CLASS_CODE, nis: "9999" })).toEqual({
      ok: false,
      reason: "nis_not_found",
    });
  });

  it("murid tanpa NIS tidak bisa masuk, juga dengan NIS kosong", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama" }],
    });
    await seedStory({ storyId: STORY_A });

    expect(await startJoin(db, { code: CLASS_CODE, nis: "1001" })).toEqual({
      ok: false,
      reason: "nis_not_found",
    });
    expect(await startJoin(db, { code: CLASS_CODE, nis: "   " })).toEqual({
      ok: false,
      reason: "invalid_nis",
    });
    expect(await startJoin(db, { code: CLASS_CODE, nis: "12 34" })).toEqual({
      ok: false,
      reason: "invalid_nis",
    });
  });

  it("NIS murid kelas lain milik guru yang sama tetap dikenali", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
    });
    await seedClassroom({
      code: "QST-BBBB",
      students: [{ id: "stu_siti", name: "Siti Aminah", nis: "1002" }],
    });
    await seedStory({ storyId: STORY_A });

    // NIS unik per guru, jadi siswa yang salah ketik kode kelas tetap dikenali
    // dan tidak terjebak sebagai "NIS tidak ada".
    const hasil = await startJoin(db, { code: CLASS_CODE, nis: "1002" });

    if (!hasil.ok || hasil.jenis !== "main") throw new Error("harus main");
    expect(hasil.pemain).toEqual({
      studentId: "stu_siti",
      name: "Siti Aminah",
    });
    expect(hasil.classroom.code).toBe(CLASS_CODE);
  });

  it("NIS milik guru lain tidak membuka kelas ini", async () => {
    await seedClassroom({ code: "QST-CCCC", teacherId: OTHER_TEACHER_ID });
    await db.execute({
      sql: `insert into students (id, teacher_id, classroom_id, display_name, nis)
            values ('stu_other', ?, 'cls_QST-CCCC', 'Murid Lain', '1001')`,
      args: [OTHER_TEACHER_ID],
    });
    await seedClassroom({});
    await seedStory({ storyId: STORY_A });

    expect(await startJoin(db, { code: CLASS_CODE, nis: "1001" })).toEqual({
      ok: false,
      reason: "nis_not_found",
    });
  });

  it("NIS yang mirip setelah titik/strip dibuang tidak ditebak", async () => {
    await seedClassroom({
      students: [
        { id: "stu_a", name: "Andi Pratama", nis: "2026.001" },
        { id: "stu_b", name: "Andi Pratama Dua", nis: "2026001" },
      ],
    });
    await seedStory({ storyId: STORY_A });

    const hasil = await startJoin(db, { code: CLASS_CODE, nis: "2026-001" });

    expect(hasil).toEqual({
      ok: false,
      reason: "nis_ambiguous",
      candidates: [
        { studentId: "stu_a", name: "Andi Pratama", nis: "2026.001" },
        { studentId: "stu_b", name: "Andi Pratama Dua", nis: "2026001" },
      ],
    });
  });

  it("lebih dari satu game meminta siswa memilih, tetapi NIS harus sah dulu", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
    });
    await seedStory({ storyId: STORY_A });
    await seedStory({ storyId: STORY_B });

    expect(await startJoin(db, { code: CLASS_CODE, nis: "9999" })).toEqual({
      ok: false,
      reason: "nis_not_found",
    });

    const hasil = await startJoin(db, { code: CLASS_CODE, nis: "1001" });

    expect(hasil).toMatchObject({ ok: true, jenis: "pilih" });
    if (!hasil.ok || hasil.jenis !== "pilih") return;
    expect(hasil.games.map((game) => game.storyId).sort()).toEqual([
      STORY_A,
      STORY_B,
    ]);
  });

  it("game pilihan siswa harus milik guru kelas itu", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
    });
    await seedStory({ storyId: STORY_A });
    await seedStory({ storyId: STORY_OTHER, teacherId: OTHER_TEACHER_ID });

    expect(
      await startJoin(db, {
        code: CLASS_CODE,
        nis: "1001",
        storyId: STORY_OTHER,
      }),
    ).toEqual({ ok: false, reason: "story_not_found" });

    const hasil = await startJoin(db, {
      code: CLASS_CODE,
      nis: "1001",
      storyId: STORY_A,
    });
    expect(hasil.ok).toBe(true);
    if (hasil.ok && hasil.jenis === "main") {
      expect(hasil.story.meta.id).toBe(STORY_A);
    }
  });

  it("kelas tanpa game terbit ditolak dengan no_games", async () => {
    await seedClassroom({});
    await seedStory({
      storyId: STORY_A,
      status: "draft",
      publishedVersion: null,
    });

    expect(await startJoin(db, { code: CLASS_CODE, nis: "1001" })).toEqual({
      ok: false,
      reason: "no_games",
    });
  });

  it("kode salah tidak membuka game apa pun", async () => {
    await seedClassroom({});
    await seedStory({ storyId: STORY_A });

    expect(await startJoin(db, { code: "QST-0000", nis: "1001" })).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("findStudentByNis", () => {
  const students = [
    {
      id: "stu_1",
      name: "Andi Pratama",
      nis: "1001",
      classroomId: "cls_1",
    },
    { id: "stu_2", name: "Siti Aminah", nis: null, classroomId: "cls_1" },
    { id: "stu_3", name: "Budi", nis: "2026.001", classroomId: "cls_2" },
  ];

  it("memilih murid dari NIS tanpa memandang huruf besar/kecil", () => {
    expect(findStudentByNis(students, "1001")).toEqual({
      status: "ok",
      student: { studentId: "stu_1", name: "Andi Pratama", nis: "1001" },
    });
  });

  it("mengabaikan titik dan strip saat membandingkan", () => {
    expect(findStudentByNis(students, "2026001")).toEqual({
      status: "ok",
      student: { studentId: "stu_3", name: "Budi", nis: "2026.001" },
    });
  });

  it("NIS tidak dikenal dan NIS kosong dibedakan", () => {
    expect(findStudentByNis(students, "7777")).toEqual({ status: "none" });
    expect(findStudentByNis(students, "")).toEqual({ status: "invalid" });
    expect(findStudentByNis(students, null)).toEqual({ status: "invalid" });
  });

  it("murid tanpa NIS tidak pernah ikut cocok", () => {
    // `stu_2` tidak punya NIS; NIS kosong tidak boleh mengarah ke sana.
    expect(findStudentByNis(students, "  ")).toEqual({ status: "invalid" });
  });
});

describe("cleanPlayerNis / normalizeForCompare", () => {
  it("merapikan NIS: huruf besar, spasi tepi dibuang", () => {
    expect(cleanPlayerNis("  a-102 ")).toBe("A-102");
  });

  it("NIS kosong atau tidak sah jadi string kosong", () => {
    expect(cleanPlayerNis("   ")).toBe("");
    expect(cleanPlayerNis("12 34")).toBe("");
    expect(cleanPlayerNis(null)).toBe("");
  });

  it("pembanding membuang titik dan strip", () => {
    expect(normalizeForCompare("2026.001")).toBe("2026001");
    expect(normalizeForCompare("A-102")).toBe("a102");
  });
});
