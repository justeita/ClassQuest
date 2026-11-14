// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * `savePlayResult` — simpan hasil bermain tanpa login (task 22).
 *
 * Database libSQL in-memory dengan migrasi asli; cerita memakai
 * `buildFallbackStory` (sempat valid). Skor tidak pernah diterima dari klien:
 * semua test memastikan skor dihitung ulang server dari cerita tersimpan.
 */

import { applyMigrations } from "@/server/db/migrations";
import { savePlayResult } from "./save";

import { buildFallbackStory } from "@/story/fallback";
import { scoreStory } from "@/story/scoring";
import type { Story } from "@/story/schema";

const STORY_ID = "st_published_play";
let db: Client;

/** Cerita tersimpan; jawaban benar diturunkan dari cerita itu sendiri. */
let story: Story;

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);

  await db.execute({
    sql: "insert into teachers (id, display_name) values ('teacher_demo', 'Guru Demo')",
  });
  story = buildFallbackStory();
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, 'teacher_demo', 'Siklus Air', 'IPA', 'Kelas 5', 'id', 'published', 1, 'materi.pdf')`,
    args: [STORY_ID],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [STORY_ID, JSON.stringify(story)],
  });
});

/** Jawaban benar untuk satu tantangan, diturunkan dari cerita. */
const correctAnswerFor = (index: number) => {
  const challenge = story.challenges[index];
  switch (challenge.type) {
    case "multiple_choice":
      return {
        type: "multiple_choice" as const,
        challengeId: challenge.id,
        selectedId: challenge.correctOptionId,
      };
    default:
      throw new Error("fixture hanya memakai multiple_choice");
  }
};

const allCorrectAnswers = () =>
  story.challenges.map((_, index) => correctAnswerFor(index));

const storedRow = async () => {
  const rows = await db.execute({
    sql: `select * from play_results where story_id = ?`,
    args: [STORY_ID],
  });
  return rows.rows[0] ?? null;
};

/**
 * Kelas + satu siswa untuk menguji identitas pemain. `code` tetap `QST-DEMO`
 * karena index-nya unik; kelas guru lain memakai kode berbeda.
 */
async function seedClassroom(input: {
  teacherId: string;
  studentId: string;
  classroomId?: string;
  code?: string;
}): Promise<void> {
  const classroomId = input.classroomId ?? "cls_demo";
  const code = input.code ?? "QST-DEMO";

  await db.execute({
    sql: `insert into classrooms
            (id, teacher_id, name, subject, grade_level, code, academic_year)
          values (?, ?, 'Kelas 5A', 'IPA', 'Kelas 5', ?, '2026/2027')`,
    args: [classroomId, input.teacherId, code],
  });
  await db.execute({
    sql: `insert into students (id, teacher_id, classroom_id, nis, display_name)
          values (?, ?, ?, '1001', 'Andi Pratama')`,
    args: [input.studentId, input.teacherId, classroomId],
  });
}

describe("savePlayResult", () => {
  it("menyimpan hasil dengan skor yang dihitung server", async () => {
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { nickname: "Sari", answers: allCorrectAnswers() },
    });

    expect(result).toEqual({ ok: true });

    const row = (
      await db.execute({
        sql: "select * from play_results where story_id = ?",
        args: [STORY_ID],
      })
    ).rows[0];
    expect(row).toBeTruthy();

    const expected = scoreStory(story, allCorrectAnswers());
    expect(Number(row?.correct_count)).toBe(expected.correctCount);
    expect(Number(row?.total_count)).toBe(expected.totalChallenges);
    expect(Number(row?.earned_points)).toBe(expected.earnedPoints);
    expect(Number(row?.story_version)).toBe(1);
    expect(JSON.parse(String(row?.weak_concepts))).toEqual([]);
    expect(row?.nickname).toBe("Sari");
    expect(Object.keys(row as object).sort()).toEqual([
      "classroom_id",
      "correct_count",
      "created_at",
      "earned_points",
      "id",
      "nickname",
      "story_id",
      "story_version",
      "student_id",
      "total_count",
      "total_points",
      "weak_concepts",
    ]);
  });

  it("klien tidak bisa menaikkan skor (field skor ditolak)", async () => {
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: {
        answers: allCorrectAnswers(),
        earnedPoints: 999_999,
        correctCount: 999,
      } as unknown as Record<string, unknown>,
    });

    expect(result).toEqual({ ok: false, reason: "invalid" });
    const rows = await db.execute({
      sql: "select count(*) as total from play_results where story_id = ?",
      args: [STORY_ID],
    });
    expect(Number(rows.rows[0]?.total)).toBe(0);
  });

  it("jawaban salah menghasilkan skor rendah dan weak_concepts terisi", async () => {
    const wrong = story.challenges.map((challenge) => ({
      type: "multiple_choice" as const,
      challengeId: challenge.id,
      // Pilih opsi yang bukan jawaban benar.
      selectedId:
        challenge.type === "multiple_choice"
          ? (challenge.options.find(
              (option) => option.id !== challenge.correctOptionId,
            )?.id ?? challenge.correctOptionId)
          : "opt_x",
    }));

    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers: wrong },
    });

    expect(result).toEqual({ ok: true });
    const row = await storedRow();
    expect(Number(row?.correct_count)).toBe(0);
    expect(JSON.parse(String(row?.weak_concepts))).toEqual(
      scoreStory(story, wrong).weakConcepts,
    );
    expect(row?.nickname).toBeNull();
  });

  it("cerita belum terbit / tidak ada 404-logika not_found", async () => {
    await db.execute({
      sql: "update stories set status = 'draft', published_version = null where id = ?",
      args: [STORY_ID],
    });

    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers: allCorrectAnswers() },
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("id tantangan atau opsi tidak dikenal ditolak", async () => {
    const unknownChallenge = {
      ...correctAnswerFor(0),
      challengeId: "chl_tidak_ada",
    };
    const unknownOption = {
      ...correctAnswerFor(0),
      selectedId: "opt_tidak_ada",
    };

    expect(
      await savePlayResult(db, {
        storyId: STORY_ID,
        result: { answers: [unknownChallenge] },
      }),
    ).toEqual({ ok: false, reason: "invalid" });

    expect(
      await savePlayResult(db, {
        storyId: STORY_ID,
        result: { answers: [unknownOption] },
      }),
    ).toEqual({ ok: false, reason: "invalid" });

    const rows = await db.execute({
      sql: "select count(*) as total from play_results where story_id = ?",
      args: [STORY_ID],
    });
    expect(Number(rows.rows[0]?.total)).toBe(0);
  });

  it("jawaban berlebih (lebih banyak dari tantangan) ditolak", async () => {
    const answers = [...allCorrectAnswers(), correctAnswerFor(0)];
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers },
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("jawaban ganda untuk tantangan yang sama ditolak", async () => {
    const answer = correctAnswerFor(0);
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers: [answer, answer] },
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("body bukan JSON / bentuk aneh ditolak sebagai invalid", async () => {
    expect(
      await savePlayResult(db, { storyId: STORY_ID, result: "bukan objek" }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await savePlayResult(db, {
        storyId: STORY_ID,
        result: { answers: "bukan array" },
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await savePlayResult(db, {
        storyId: STORY_ID,
        result: {
          answers: [{ type: "true_false", challengeId: "x", answer: "ya" }],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("body terlalu besar ditolak sebagai too_large", async () => {
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { nickname: "x".repeat(70_000), answers: [] },
    });
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("baris tersimpan tidak memuat data siswa selain nickname opsional", async () => {
    await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers: allCorrectAnswers() },
    });

    const row = await storedRow();
    expect(row?.nickname).toBeNull();
    // Tidak ada kolom jawaban per-opsi, IP, atau user agent.
    expect(Object.keys(row as object).sort()).toEqual([
      "classroom_id",
      "correct_count",
      "created_at",
      "earned_points",
      "id",
      "nickname",
      "story_id",
      "story_version",
      "student_id",
      "total_count",
      "total_points",
      "weak_concepts",
    ]);
  });

  it("nickname dibersihkan dan dipotong", async () => {
    await savePlayResult(db, {
      storyId: STORY_ID,
      result: { nickname: "  \u0007 Ri a\u0000n  ", answers: [] },
    });
    const row = await storedRow();
    expect(row?.nickname).toBe("Ri a n");
  });

  /* ---------------------------------------------------------------------- */
  /* Identitas pemain dari daftar kelas (layar masuk)                        */
  /* ---------------------------------------------------------------------- */

  it("studentId mengisi student_id, classroom_id, dan nama dari baris students", async () => {
    await seedClassroom({ teacherId: "teacher_demo", studentId: "stu_andi" });

    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      // Nickname dari klien tidak boleh menang atas nama di daftar kelas.
      result: {
        studentId: "stu_andi",
        nickname: "Nama Palsu",
        answers: allCorrectAnswers(),
      },
    });

    expect(result).toEqual({ ok: true });
    const row = await storedRow();
    expect(row?.student_id).toBe("stu_andi");
    expect(row?.classroom_id).toBe("cls_demo");
    expect(row?.nickname).toBe("Andi Pratama");
    expect(Number(row?.total_points)).toBe(
      scoreStory(story, allCorrectAnswers()).totalPoints,
    );
  });

  it("studentId milik guru lain ditolak sebagai invalid", async () => {
    await db.execute(
      "insert into teachers (id, display_name) values ('teacher_lain', 'Guru Lain')",
    );
    await seedClassroom({
      teacherId: "teacher_lain",
      studentId: "stu_orang_lain",
    });

    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { studentId: "stu_orang_lain", answers: allCorrectAnswers() },
    });

    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(await storedRow()).toBeNull();
  });

  it("studentId yang tidak ada ditolak sebagai invalid", async () => {
    const result = await savePlayResult(db, {
      storyId: STORY_ID,
      result: { studentId: "stu_tidak_ada", answers: allCorrectAnswers() },
    });

    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(await storedRow()).toBeNull();
  });

  it("tanpa identitas tetap tersimpan, classroom_id dan student_id kosong", async () => {
    await savePlayResult(db, {
      storyId: STORY_ID,
      result: { answers: allCorrectAnswers() },
    });

    const row = await storedRow();
    expect(row?.student_id).toBeNull();
    expect(row?.classroom_id).toBeNull();
  });
});
