/**
 * Analytics kelas untuk guru (`/guru/analitik`).
 *
 * Sumber data satu-satunya: tabel `play_results` yang sudah dihubungkan ke
 * `classrooms`/`students` oleh `savePlayResult`. Tidak ada tabel analytics
 * terpisah dan tidak ada perhitungan skor ulang di sini — poin dan konsep lemah
 * sudah dihitung server saat hasil disimpan.
 *
 * Aturan:
 *
 * - **Kepemilikan.** Kelas dan cerita sama-sama difilter `teacher_id`; kelas
 *   atau cerita milik guru lain dan yang tidak ada sama-sama `null`.
 * - **Agregat per siswa.** Satu baris = satu `student_id` (atau satu nama bebas
 *   bila siswa sudah dihapus / bermain tanpa memilih daftar). Poin terbaik,
 *   percobaan terakhir, dan gabungan `weakConcepts` ditampilkan bersama.
 * - **Tanpa jawaban per opsi.** Sesuai `docs/06-backend/persistence.md`, yang
 *   tersimpan hanya `weak_concepts`; halaman ini tidak mengarang detail jawaban.
 */

import "server-only";

import type { Client } from "@libsql/client";

import type {
  AnalyticsStudentRow,
  ClassroomAnalytics,
} from "@/server/contracts";

/** Batas baris yang dibaca; cukup untuk satu kelas dalam satu semester. */
export const MAX_ANALYTICS_ROWS = 5000;

/** Batas panjang id yang diterima (sama dengan modul lain). */
const MAX_ID_LENGTH = 100;

export type GetClassroomAnalyticsInput = {
  teacherId: string;
  classroomId: string;
  storyId: string;
};

const toText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const toNullableText = (value: unknown): string | null =>
  value === null || value === undefined || String(value) === ""
    ? null
    : String(value);

const toNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/** `weak_concepts` disimpan sebagai JSON array; nilai rusak dianggap kosong. */
const parseWeakConcepts = (value: unknown): string[] => {
  try {
    const parsed: unknown = JSON.parse(toText(value) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

type PlayRow = {
  studentId: string | null;
  nickname: string | null;
  nis: string | null;
  earnedPoints: number;
  correctCount: number;
  totalCount: number;
  totalPoints: number;
  weakConcepts: string[];
  createdAt: string;
};

/**
 * Gabungkan percobaan satu siswa. Baris masukan sudah urut terbaru lebih dulu,
 * jadi kemunculan pertama adalah percobaan terakhir.
 */
function aggregate(rows: PlayRow[]): AnalyticsStudentRow[] {
  const groups = new Map<
    string,
    {
      studentId: string | null;
      name: string;
      nis: string | null;
      attempts: number;
      bestPoints: number;
      latest: PlayRow;
      conceptCounts: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const key =
      row.studentId !== null
        ? `student:${row.studentId}`
        : row.nickname !== null
          ? `nickname:${row.nickname.toLowerCase()}`
          : "anon";

    const existing = groups.get(key);
    if (existing === undefined) {
      const conceptCounts = new Map<string, number>();
      for (const concept of row.weakConcepts) {
        conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
      }
      groups.set(key, {
        studentId: row.studentId,
        name: row.nickname ?? "Tanpa nama",
        nis: row.nis,
        attempts: 1,
        bestPoints: row.earnedPoints,
        latest: row,
        conceptCounts,
      });
      continue;
    }

    existing.attempts += 1;
    existing.bestPoints = Math.max(existing.bestPoints, row.earnedPoints);
    if (existing.nis === null && row.nis !== null) existing.nis = row.nis;
    for (const concept of row.weakConcepts) {
      existing.conceptCounts.set(
        concept,
        (existing.conceptCounts.get(concept) ?? 0) + 1,
      );
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      studentId: group.studentId,
      name: group.name,
      nis: group.nis,
      attempts: group.attempts,
      bestPoints: group.bestPoints,
      latestPoints: group.latest.earnedPoints,
      latestCorrectCount: group.latest.correctCount,
      totalCount: group.latest.totalCount,
      totalPoints: group.latest.totalPoints,
      weakConcepts: [...group.conceptCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([concept]) => concept),
      lastPlayedAt: group.latest.createdAt,
    }))
    .sort(
      (a, b) => b.bestPoints - a.bestPoints || a.name.localeCompare(b.name),
    );
}

/**
 * Ringkasan satu kelas untuk satu game, atau `null` bila kelas/cerita bukan
 * milik guru.
 */
export async function getClassroomAnalytics(
  db: Client,
  input: GetClassroomAnalyticsInput,
): Promise<ClassroomAnalytics | null> {
  const { teacherId, classroomId, storyId } = input;
  if (
    typeof classroomId !== "string" ||
    classroomId === "" ||
    classroomId.length > MAX_ID_LENGTH ||
    typeof storyId !== "string" ||
    storyId === "" ||
    storyId.length > MAX_ID_LENGTH
  ) {
    return null;
  }

  const classroomResult = await db.execute({
    sql: `select id, name, code
          from classrooms
          where id = ? and teacher_id = ?
          limit 1`,
    args: [classroomId, teacherId],
  });
  const classroomRow = classroomResult.rows[0];
  if (classroomRow === undefined) return null;

  const storyResult = await db.execute({
    sql: `select id, title
          from stories
          where id = ? and teacher_id = ?
          limit 1`,
    args: [storyId, teacherId],
  });
  const storyRow = storyResult.rows[0];
  if (storyRow === undefined) return null;

  const studentsResult = await db.execute({
    sql: `select count(*) as total
          from students
          where classroom_id = ? and teacher_id = ?`,
    args: [classroomId, teacherId],
  });
  const studentsTotal = toNumber(studentsResult.rows[0]?.total);

  // Nama dan NIS siswa yang masih ada diambil terpisah: `play_results` hanya
  // menyimpan id + salinan nama, jadi siswa yang sudah dihapus tetap tampil
  // dengan nama terakhirnya.
  const playersResult = await db.execute({
    sql: `select pr.student_id, pr.nickname, pr.earned_points, pr.correct_count,
                 pr.total_count, pr.total_points, pr.weak_concepts, pr.created_at,
                 s.display_name, s.nis
          from play_results pr
          left join students s on s.id = pr.student_id
          where pr.classroom_id = ? and pr.story_id = ?
          order by pr.created_at desc
          limit ?`,
    args: [classroomId, storyId, MAX_ANALYTICS_ROWS],
  });

  const rows: PlayRow[] = playersResult.rows.map((row) => ({
    studentId: toNullableText(row.student_id),
    nickname: toNullableText(row.display_name) ?? toNullableText(row.nickname),
    nis: toNullableText(row.nis),
    earnedPoints: toNumber(row.earned_points),
    correctCount: toNumber(row.correct_count),
    totalCount: toNumber(row.total_count),
    totalPoints: toNumber(row.total_points),
    weakConcepts: parseWeakConcepts(row.weak_concepts),
    createdAt: toText(row.created_at),
  }));

  const aggregated = aggregate(rows);
  const totalAttempts = rows.length;
  const totalPoints = rows.reduce(
    (max, row) => Math.max(max, row.totalPoints),
    0,
  );

  return {
    classroom: {
      id: toText(classroomRow.id),
      name: toText(classroomRow.name),
      code: toText(classroomRow.code),
    },
    storyId: toText(storyRow.id),
    storyTitle: toText(storyRow.title),
    studentsTotal,
    studentsPlayed: aggregated.length,
    totalAttempts,
    averageBestPoints:
      aggregated.length === 0
        ? 0
        : Math.round(
            aggregated.reduce((sum, row) => sum + row.bestPoints, 0) /
              aggregated.length,
          ),
    totalPoints,
    rows: aggregated,
  };
}
