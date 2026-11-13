// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyMigrations } from "@/server/db/migrations";

import {
  ACADEMIC_YEAR_INVALID_MESSAGE,
  addStudent,
  CLASSROOM_NAME_INVALID_MESSAGE,
  CLASSROOM_NOT_FOUND_MESSAGE,
  cleanNis,
  cleanText,
  createClassroom,
  generateClassCode,
  getClassroom,
  listClassrooms,
  STUDENT_NAME_INVALID_MESSAGE,
  STUDENT_NIS_DUPLICATE_MESSAGE,
  STUDENT_NIS_INVALID_MESSAGE,
} from "./index";

/**
 * Tes integrasi tabel `classrooms`/`students` dengan database libSQL
 * in-memory: query yang sebenarnya ikut dijalankan, bukan di-mock.
 *
 * Yang dijaga: daftar awal kosong, kepemilikan per guru, normalisasi input,
 * NIS otomatis/duplikat, dan nama hanya (tanpa akun login siswa).
 */

const TEACHER_ID = "teacher_demo";
const OTHER_TEACHER_ID = "teacher_lain";

let db: Client;

async function seedTeacher(id: string, name = "Guru"): Promise<void> {
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, ?)",
    args: [id, name],
  });
}

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  await seedTeacher(TEACHER_ID, "Guru Demo");
  await seedTeacher(OTHER_TEACHER_ID, "Guru Lain");
});

afterEach(() => {
  db.close();
});

describe("cleanText / cleanNis / generateClassCode", () => {
  it("merapikan spasi dan memotong nilai bukan string", () => {
    expect(cleanText("  Kelas   10A ", 80)).toBe("Kelas 10A");
    expect(cleanText("a\u0000b", 80)).toBe("a b");
    expect(cleanText("abcdef", 3)).toBe("abc");
    expect(cleanText(42, 80)).toBe("");
    expect(cleanText(null, 80)).toBe("");
  });

  it("membuang karakter tak terlihat dan penanda arah", () => {
    // Zero-width space, RTL override, word joiner, BOM.
    expect(cleanText("Kelas\u200b10A", 80)).toBe("Kelas10A");
    expect(cleanText("\u202eKelas 10A", 80)).toBe("Kelas 10A");
    expect(cleanText("An\u2060di", 80)).toBe("Andi");
    expect(cleanText("\ufeffSiti", 80)).toBe("Siti");
    expect(cleanText("\u200b\u200b", 80)).toBe("");
  });

  it("NIS opsional dan dinormalisasi ke huruf besar", () => {
    expect(cleanNis("")).toBeNull();
    expect(cleanNis("  ")).toBeNull();
    expect(cleanNis("1001")).toBe("1001");
    expect(cleanNis("a-102")).toBe("A-102");
    expect(cleanNis("2026.001")).toBe("2026.001");
    expect(cleanNis("12 34")).toBeNull();
    expect(cleanNis("x".repeat(21))).toBeNull();
  });

  it("kode kelas berawalan QST- dan deterministik untuk random tetap", () => {
    expect(generateClassCode(() => 0)).toBe("QST-AAAA");
    expect(generateClassCode(() => 0)).not.toMatch(/[IO01]/);
    expect(generateClassCode()).toMatch(/^QST-[A-Z2-9]{4}$/);
  });
});

describe("listClassrooms", () => {
  it("kosong untuk guru yang belum punya kelas", async () => {
    expect(await listClassrooms(db, TEACHER_ID)).toEqual([]);
  });

  it("hanya mengembalikan kelas milik guru itu", async () => {
    await createClassroom(db, {
      teacherId: OTHER_TEACHER_ID,
      name: "Kelas Guru Lain",
      subject: "IPA",
      grade: "SMA Grade 10",
      year: "2026/2027",
    });

    expect(await listClassrooms(db, TEACHER_ID)).toEqual([]);
    expect(await listClassrooms(db, OTHER_TEACHER_ID)).toHaveLength(1);
  });
});

describe("createClassroom — tahun ajaran", () => {
  const buat = (year: unknown) =>
    createClassroom(db, {
      teacherId: TEACHER_ID,
      name: "Fisika 11",
      subject: "Fisika",
      grade: "SMA Grade 11",
      year,
    });

  it("menerima bentuk baku YYYY/YYYY", async () => {
    const result = await buat("2026/2027");
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.classroom.year).toBe("2026/2027");
  });

  it("menolak teks tidak baku, bukan memotongnya", async () => {
    const ditolak = [
      "",
      "2026/2027 ",
      " 2026/2027",
      "2026-2027",
      "2026 / 2027",
      "26/27",
      "2026/2028", // tahun kedua bukan +1
      "1999/2000", // sebelum batas
      "2026/2027/2028",
      "abc",
      "2026\u200b/2027", // zero-width space
      "2026/2027\u0000",
      "２０２６/２０２７", // digit full-width
      "2026/2027\n<script>",
      20262027, // bukan string
      null,
      undefined,
    ];

    for (const year of ditolak) {
      expect(await buat(year)).toEqual({
        ok: false,
        message: ACADEMIC_YEAR_INVALID_MESSAGE,
      });
    }

    expect(await listClassrooms(db, TEACHER_ID)).toEqual([]);
  });
});

describe("createClassroom", () => {
  it("membuat kelas dengan daftar siswa kosong dan kode unik", async () => {
    const result = await createClassroom(db, {
      teacherId: TEACHER_ID,
      name: "  Matematika  10 B ",
      subject: " Matematika ",
      grade: "SMA Grade 10",
      year: "2026/2027",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.classroom).toMatchObject({
      name: "Matematika 10 B",
      subject: "Matematika",
      grade: "SMA Grade 10",
      year: "2026/2027",
      students: [],
    });
    expect(result.classroom.code).toMatch(/^QST-[A-Z2-9]{4}$/);

    const listed = await listClassrooms(db, TEACHER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.students).toEqual([]);
  });

  it("menolak nama kosong", async () => {
    const result = await createClassroom(db, {
      teacherId: TEACHER_ID,
      name: "   ",
      subject: "",
      grade: "",
      year: "2026/2027",
    });

    expect(result).toEqual({
      ok: false,
      message: CLASSROOM_NAME_INVALID_MESSAGE,
    });
    expect(await listClassrooms(db, TEACHER_ID)).toEqual([]);
  });

  it("memotong nama yang terlalu panjang", async () => {
    const result = await createClassroom(db, {
      teacherId: TEACHER_ID,
      name: "A".repeat(200),
      subject: "",
      grade: "",
      year: "2026/2027",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.classroom.name).toHaveLength(80);
  });
});

describe("addStudent", () => {
  async function buatKelas(): Promise<string> {
    const result = await createClassroom(db, {
      teacherId: TEACHER_ID,
      name: "Fisika 11",
      subject: "Fisika",
      grade: "SMA Grade 11",
      year: "2026/2027",
    });
    if (!result.ok) throw new Error("kelas gagal dibuat");
    return result.classroom.id;
  }

  it("menambah siswa dengan NIS otomatis berurutan", async () => {
    const classroomId = await buatKelas();

    const pertama = await addStudent(db, {
      teacherId: TEACHER_ID,
      classroomId,
      name: "Andi Pratama",
      nis: "",
    });
    const kedua = await addStudent(db, {
      teacherId: TEACHER_ID,
      classroomId,
      name: "Siti Rahma",
      nis: "   ",
    });

    expect(pertama).toMatchObject({ ok: true });
    expect(kedua).toMatchObject({ ok: true });
    if (!pertama.ok || !kedua.ok) return;

    expect(pertama.student).toMatchObject({
      name: "Andi Pratama",
      nis: "1001",
      classroomId,
      username: null,
    });
    expect(kedua.student.nis).toBe("1002");

    const kelas = await getClassroom(db, {
      teacherId: TEACHER_ID,
      classroomId,
    });
    expect(kelas?.students.map((student) => student.name)).toEqual([
      "Andi Pratama",
      "Siti Rahma",
    ]);
  });

  it("memakai NIS yang diketik guru (huruf besar) dan menolak duplikat", async () => {
    const classroomId = await buatKelas();

    const sukses = await addStudent(db, {
      teacherId: TEACHER_ID,
      classroomId,
      name: "Budi",
      nis: "ab-09",
    });
    expect(sukses).toMatchObject({ ok: true });
    if (!sukses.ok) return;
    expect(sukses.student.nis).toBe("AB-09");

    const duplikat = await addStudent(db, {
      teacherId: TEACHER_ID,
      classroomId,
      name: "Theo",
      nis: "AB-09",
    });
    expect(duplikat).toEqual({
      ok: false,
      message: STUDENT_NIS_DUPLICATE_MESSAGE,
    });
  });

  it("menolak nama kosong dan NIS tidak sah", async () => {
    const classroomId = await buatKelas();

    expect(
      await addStudent(db, {
        teacherId: TEACHER_ID,
        classroomId,
        name: "  ",
        nis: "",
      }),
    ).toEqual({ ok: false, message: STUDENT_NAME_INVALID_MESSAGE });

    expect(
      await addStudent(db, {
        teacherId: TEACHER_ID,
        classroomId,
        name: "Citra",
        nis: "12 34",
      }),
    ).toEqual({ ok: false, message: STUDENT_NIS_INVALID_MESSAGE });
  });

  it("tidak bisa menambah siswa ke kelas guru lain", async () => {
    const classroomId = await buatKelas();

    await expect(
      addStudent(db, {
        teacherId: OTHER_TEACHER_ID,
        classroomId,
        name: "Penyusup",
        nis: "",
      }),
    ).rejects.toMatchObject({
      name: "ClassroomNotFoundError",
      message: CLASSROOM_NOT_FOUND_MESSAGE,
    });
  });
});

describe("getClassroom", () => {
  it("mengembalikan null untuk id kosong, tidak ada, atau milik guru lain", async () => {
    expect(
      await getClassroom(db, { teacherId: TEACHER_ID, classroomId: "" }),
    ).toBeNull();
    expect(
      await getClassroom(db, {
        teacherId: TEACHER_ID,
        classroomId: "tidak_ada",
      }),
    ).toBeNull();

    const created = await createClassroom(db, {
      teacherId: OTHER_TEACHER_ID,
      name: "Kelas Lain",
      subject: "",
      grade: "",
      year: "2026/2027",
    });
    if (!created.ok) throw new Error("kelas gagal dibuat");

    expect(
      await getClassroom(db, {
        teacherId: TEACHER_ID,
        classroomId: created.classroom.id,
      }),
    ).toBeNull();
  });
});
