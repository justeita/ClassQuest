// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * `getClassroomAnalytics` — agregat hasil main per kelas dan game.
 *
 * Database libSQL in-memory dengan migrasi asli. Baris `play_results` disisipkan
 * langsung supaya urutan waktu, `weak_concepts`, dan `student_id` bisa diatur
 * persis; yang diuji adalah agregasinya, bukan penyimpanannya (lihat
 * `play-results/save.test.ts`).
 */

import { applyMigrations } from "@/server/db/migrations";

import { getClassroomAnalytics } from "./index";

const TEACHER_ID = "teacher_analytics";
const OTHER_TEACHER_ID = "teacher_analytics_lain";
const CLASSROOM_ID = "cls_analytics";
const OTHER_CLASSROOM_ID = "cls_lain";
const STORY_ID = "st_analytics";

let db: Client;

async function seedClassroom(options: {
  id?: string;
  teacherId?: string;
  code?: string;
  students?: { id: string; name: string; nis: string | null }[];
}): Promise<void> {
  const id = options.id ?? CLASSROOM_ID;
  await db.execute({
    sql: `insert into classrooms
            (id, teacher_id, name, subject, grade_level, code, academic_year)
          values (?, ?, 'Kelas 5A', 'IPA', 'Kelas 5', ?, '2026/2027')`,
    args: [id, options.teacherId ?? TEACHER_ID, options.code ?? "QST-ANLT"],
  });

  for (const student of options.students ?? []) {
    await db.execute({
      sql: `insert into students (id, teacher_id, classroom_id, nis, display_name)
            values (?, ?, ?, ?, ?)`,
      args: [
        student.id,
        options.teacherId ?? TEACHER_ID,
        id,
        student.nis,
        student.name,
      ],
    });
  }
}

async function seedStory(options: {
  id?: string;
  teacherId?: string;
  title?: string;
}): Promise<void> {
  const id = options.id ?? STORY_ID;
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, ?, 'IPA', 'Kelas 5', 'id', 'published', 1, 'materi.pdf')`,
    args: [id, options.teacherId ?? TEACHER_ID, options.title ?? "Siklus Air"],
  });
}

async function seedResult(options: {
  classroomId?: string | null;
  storyId?: string;
  studentId?: string | null;
  nickname?: string | null;
  earnedPoints: number;
  correctCount?: number;
  totalCount?: number;
  totalPoints?: number;
  weakConcepts?: string[];
  createdAt: string;
}): Promise<void> {
  await db.execute({
    sql: `insert into play_results
            (id, story_id, story_version, classroom_id, student_id, nickname,
             correct_count, total_count, total_points, earned_points,
             weak_concepts, created_at)
          values (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      options.storyId ?? STORY_ID,
      options.classroomId === undefined ? CLASSROOM_ID : options.classroomId,
      options.studentId ?? null,
      options.nickname ?? null,
      options.correctCount ?? 0,
      options.totalCount ?? 5,
      options.totalPoints ?? 50,
      options.earnedPoints,
      JSON.stringify(options.weakConcepts ?? []),
      options.createdAt,
    ],
  });
}

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);

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
});

describe("getClassroomAnalytics", () => {
  it("menggabungkan percobaan siswa: poin terbaik, percobaan terakhir, konsep lemah", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi", nis: "1001" }],
    });
    await seedStory({});

    await seedResult({
      studentId: "stu_andi",
      nickname: "Andi",
      earnedPoints: 20,
      correctCount: 2,
      weakConcepts: ["Penguapan", "Kondensasi"],
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      studentId: "stu_andi",
      nickname: "Andi",
      earnedPoints: 40,
      correctCount: 4,
      weakConcepts: ["Presipitasi"],
      createdAt: "2026-11-11T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics).not.toBeNull();
    expect(analytics?.studentsTotal).toBe(1);
    expect(analytics?.studentsPlayed).toBe(1);
    expect(analytics?.totalAttempts).toBe(2);
    expect(analytics?.averageBestPoints).toBe(40);

    const row = analytics?.rows[0];
    expect(row).toMatchObject({
      key: `${CLASSROOM_ID}|${STORY_ID}|student:stu_andi`,
      studentId: "stu_andi",
      name: "Andi",
      nis: "1001",
      attempts: 2,
      bestPoints: 40,
      latestPoints: 40,
      latestCorrectCount: 4,
      totalCount: 5,
      lastPlayedAt: "2026-11-11T08:00:00.000Z",
    });
    // Konsep dari kedua percobaan digabung, paling sering lebih dulu.
    expect(row?.weakConcepts).toEqual([
      "Kondensasi",
      "Penguapan",
      "Presipitasi",
    ]);
  });

  it("siswa yang belum bermain tidak masuk rows, tetapi dihitung studentsTotal", async () => {
    await seedClassroom({
      students: [
        { id: "stu_andi", name: "Andi", nis: "1001" },
        { id: "stu_siti", name: "Siti", nis: "1002" },
      ],
    });
    await seedStory({});
    await seedResult({
      studentId: "stu_andi",
      nickname: "Andi",
      earnedPoints: 30,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.studentsTotal).toBe(2);
    expect(analytics?.studentsPlayed).toBe(1);
    expect(analytics?.rows.map((row) => row.name)).toEqual(["Andi"]);
  });

  it("nama bebas dikelompokkan tanpa peduli huruf besar/kecil", async () => {
    await seedClassroom({});
    await seedStory({});

    await seedResult({
      studentId: null,
      nickname: "Budi",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      studentId: null,
      nickname: "BUDI",
      earnedPoints: 25,
      createdAt: "2026-11-11T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.rows).toHaveLength(1);
    expect(analytics?.rows[0]).toMatchObject({
      key: `${CLASSROOM_ID}|${STORY_ID}|nickname:budi`,
      studentId: null,
      attempts: 2,
      bestPoints: 25,
      latestPoints: 25,
    });
  });

  it("siswa yang sudah dihapus tetap tampil dengan nama salinan di play_results", async () => {
    await seedClassroom({
      students: [{ id: "stu_hilang", name: "Nama Terakhir", nis: "9" }],
    });
    await seedStory({});
    await seedResult({
      studentId: "stu_hilang",
      nickname: "Nama Terakhir",
      earnedPoints: 15,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    // Menghapus siswa tidak menghapus riwayat: `student_id` menjadi null
    // (on delete set null) dan nama salinan di `play_results` yang dipakai.
    await db.execute({
      sql: "delete from students where id = ?",
      args: ["stu_hilang"],
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.studentsTotal).toBe(0);
    expect(analytics?.rows[0]).toMatchObject({
      key: `${CLASSROOM_ID}|${STORY_ID}|nickname:nama terakhir`,
      studentId: null,
      name: "Nama Terakhir",
      nis: null,
      bestPoints: 15,
    });
  });

  it("mengurutkan baris dari poin terbaik, lalu nama", async () => {
    await seedClassroom({
      students: [
        { id: "stu_a", name: "Zaki", nis: "1" },
        { id: "stu_b", name: "Ani", nis: "2" },
      ],
    });
    await seedStory({});
    await seedResult({
      studentId: "stu_a",
      nickname: "Zaki",
      earnedPoints: 20,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      studentId: "stu_b",
      nickname: "Ani",
      earnedPoints: 20,
      createdAt: "2026-11-10T09:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.rows.map((row) => row.name)).toEqual(["Ani", "Zaki"]);
  });

  it("hanya membaca hasil kelas dan game yang diminta", async () => {
    await seedClassroom({});
    await seedClassroom({
      id: OTHER_CLASSROOM_ID,
      code: "QST-LAIN",
    });
    await seedStory({});
    await seedStory({ id: "st_lain", title: "Game Lain" });

    await seedResult({
      studentId: null,
      nickname: "Kelas Ini",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      classroomId: OTHER_CLASSROOM_ID,
      studentId: null,
      nickname: "Kelas Lain",
      earnedPoints: 99,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      storyId: "st_lain",
      studentId: null,
      nickname: "Game Lain",
      earnedPoints: 88,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.rows.map((row) => row.name)).toEqual(["Kelas Ini"]);
    expect(analytics?.totalAttempts).toBe(1);
  });

  it("kelas atau cerita milik guru lain / tidak ada → null", async () => {
    await seedClassroom({});
    await seedStory({});

    await expect(
      getClassroomAnalytics(db, {
        teacherId: OTHER_TEACHER_ID,
        classroomId: CLASSROOM_ID,
        storyId: STORY_ID,
      }),
    ).resolves.toBeNull();

    await expect(
      getClassroomAnalytics(db, {
        teacherId: TEACHER_ID,
        classroomId: "tidak_ada",
        storyId: STORY_ID,
      }),
    ).resolves.toBeNull();

    await expect(
      getClassroomAnalytics(db, {
        teacherId: TEACHER_ID,
        classroomId: CLASSROOM_ID,
        storyId: "tidak_ada",
      }),
    ).resolves.toBeNull();

    // Id kosong berarti "tidak difilter", bukan id tidak valid.
    const semua = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: "",
      storyId: "  ",
    });
    expect(semua?.classrooms.map((item) => item.id)).toEqual([CLASSROOM_ID]);
    expect(semua?.selectedClassroomId).toBeNull();
  });

  it("kelas tanpa hasil main mengembalikan baris kosong dan rata-rata 0", async () => {
    await seedClassroom({
      students: [{ id: "stu_andi", name: "Andi", nis: "1001" }],
    });
    await seedStory({});

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: STORY_ID,
    });

    expect(analytics?.rows).toEqual([]);
    expect(analytics?.studentsPlayed).toBe(0);
    expect(analytics?.totalAttempts).toBe(0);
    expect(analytics?.averageBestPoints).toBe(0);
  });

  it("tanpa filter sama sekali: agregat semua kelas × semua game terbit", async () => {
    await seedClassroom({});
    await seedClassroom({ id: OTHER_CLASSROOM_ID, code: "QST-LAIN" });
    await seedStory({});
    await seedStory({ id: "st_lain", title: "Game Lain" });

    await seedResult({
      studentId: null,
      nickname: "Andi",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      classroomId: OTHER_CLASSROOM_ID,
      studentId: null,
      nickname: "Budi",
      earnedPoints: 30,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      storyId: "st_lain",
      studentId: null,
      nickname: "Citra",
      earnedPoints: 20,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: null,
      storyId: null,
    });

    expect(analytics?.selectedClassroomId).toBeNull();
    expect(analytics?.selectedStoryId).toBeNull();
    expect(analytics?.classrooms.map((item) => item.id).sort()).toEqual(
      [CLASSROOM_ID, OTHER_CLASSROOM_ID].sort(),
    );
    expect(analytics?.stories.map((item) => item.id).sort()).toEqual(
      [STORY_ID, "st_lain"].sort(),
    );
    expect(analytics?.totalAttempts).toBe(3);
    expect(analytics?.rows.map((row) => row.name)).toEqual([
      "Budi",
      "Citra",
      "Andi",
    ]);
    // Setiap baris membawa asal kelas dan game-nya.
    expect(analytics?.rows[0]).toMatchObject({
      classroomId: OTHER_CLASSROOM_ID,
      classroomName: "Kelas 5A",
      storyId: STORY_ID,
      storyTitle: "Siklus Air",
    });
    expect(analytics?.rows[1]).toMatchObject({ storyId: "st_lain" });
  });

  it("hanya kelas yang difilter: satu game terpilih tetap dibatasi ke kelas itu", async () => {
    await seedClassroom({});
    await seedClassroom({ id: OTHER_CLASSROOM_ID, code: "QST-LAIN" });
    await seedStory({});

    await seedResult({
      studentId: null,
      nickname: "Kelas Ini",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      classroomId: OTHER_CLASSROOM_ID,
      studentId: null,
      nickname: "Kelas Lain",
      earnedPoints: 30,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: CLASSROOM_ID,
      storyId: null,
    });

    expect(analytics?.classrooms.map((item) => item.id)).toEqual([
      CLASSROOM_ID,
    ]);
    expect(analytics?.stories.map((item) => item.id)).toEqual([STORY_ID]);
    expect(analytics?.rows.map((row) => row.name)).toEqual(["Kelas Ini"]);
  });

  it("hanya game yang difilter: semua kelas untuk game itu", async () => {
    await seedClassroom({});
    await seedClassroom({ id: OTHER_CLASSROOM_ID, code: "QST-LAIN" });
    await seedStory({});
    await seedStory({ id: "st_lain", title: "Game Lain" });

    await seedResult({
      studentId: null,
      nickname: "Di game ini",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      classroomId: OTHER_CLASSROOM_ID,
      studentId: null,
      nickname: "Juga di game ini",
      earnedPoints: 30,
      createdAt: "2026-11-10T08:00:00.000Z",
    });
    await seedResult({
      storyId: "st_lain",
      studentId: null,
      nickname: "Game lain",
      earnedPoints: 99,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: null,
      storyId: STORY_ID,
    });

    expect(analytics?.rows.map((row) => row.name)).toEqual([
      "Juga di game ini",
      "Di game ini",
    ]);
    expect(analytics?.studentsTotal).toBe(0);
  });

  it("game draf tidak ikut walau tanpa filter, dan id draf → null", async () => {
    await seedClassroom({});
    await seedStory({});
    await db.execute({
      sql: `insert into stories
              (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
            values ('st_draf', ?, 'Draf', 'IPA', 'Kelas 5', 'id', 'draft', 'materi.pdf')`,
      args: [TEACHER_ID],
    });
    await seedResult({
      storyId: "st_draf",
      studentId: null,
      nickname: "Tidak boleh tampil",
      earnedPoints: 10,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: null,
      storyId: null,
    });

    expect(analytics?.stories.map((item) => item.id)).toEqual([STORY_ID]);
    expect(analytics?.rows).toEqual([]);

    await expect(
      getClassroomAnalytics(db, {
        teacherId: TEACHER_ID,
        classroomId: null,
        storyId: "st_draf",
      }),
    ).resolves.toBeNull();
  });

  it("hasil main guru lain tidak bocor saat tanpa filter", async () => {
    await seedClassroom({});
    await seedStory({});
    await seedClassroom({
      id: "cls_lain_lagi",
      teacherId: OTHER_TEACHER_ID,
      code: "QST-ASING",
    });
    await seedStory({
      id: "st_asing",
      teacherId: OTHER_TEACHER_ID,
      title: "Punyanya Guru Lain",
    });
    await seedResult({
      classroomId: "cls_lain_lagi",
      storyId: "st_asing",
      studentId: null,
      nickname: "Siswa guru lain",
      earnedPoints: 100,
      createdAt: "2026-11-10T08:00:00.000Z",
    });

    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: null,
      storyId: null,
    });

    expect(analytics?.rows).toEqual([]);
    expect(analytics?.classrooms.map((item) => item.id)).toEqual([
      CLASSROOM_ID,
    ]);
    expect(analytics?.stories.map((item) => item.id)).toEqual([STORY_ID]);
  });

  it("guru tanpa kelas/game terbit mendapat daftar kosong, bukan null", async () => {
    const analytics = await getClassroomAnalytics(db, {
      teacherId: TEACHER_ID,
      classroomId: null,
      storyId: null,
    });

    expect(analytics).toEqual({
      classrooms: [],
      stories: [],
      selectedClassroomId: null,
      selectedStoryId: null,
      studentsTotal: 0,
      studentsPlayed: 0,
      totalAttempts: 0,
      averageBestPoints: 0,
      rows: [],
    });
  });
});
