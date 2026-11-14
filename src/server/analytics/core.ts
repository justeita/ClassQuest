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
 *   atau cerita milik guru lain dan yang tidak ada sama-sama diabaikan.
 * - **Filter opsional.** Kelas dan game boleh tidak dipilih: `null` berarti
 *   "semua". Tanpa filter sama sekali, hasilnya agregat semua kelas × semua
 *   game terbit milik guru.
 * - **Agregat per siswa, per kelas, per game.** Satu baris = satu siswa di satu
 *   kelas untuk satu game (atau satu nama bebas bila siswa sudah dihapus /
 *   bermain tanpa memilih daftar). Poin terbaik, percobaan terakhir, dan
 *   gabungan `weakConcepts` ditampilkan bersama.
 * - **Tanpa jawaban per opsi.** Sesuai `docs/06-backend/persistence.md`, yang
 *   tersimpan hanya `weak_concepts`; halaman ini tidak mengarang detail jawaban.
 */

import "server-only";

import type { Client } from "@libsql/client";

import type {
  AnalyticsClassroom,
  AnalyticsStory,
  ClassroomAnalytics,
} from "@/server/contracts";

/** Batas baris yang dibaca; cukup untuk satu kelas dalam satu semester. */
export const MAX_ANALYTICS_ROWS = 5000;

/** Batas panjang id yang diterima (sama dengan modul lain). */
const MAX_ID_LENGTH = 100;

export type GetClassroomAnalyticsInput = {
  teacherId: string;
  /** `null` = semua kelas milik guru. */
  classroomId: string | null;
  /** `null` = semua game terbit milik guru. */
  storyId: string | null;
};

/** Baris tabel: agregat satu siswa, plus asal kelas dan game-nya. */
export type AnalyticsRow = ClassroomAnalytics["rows"][number];

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

/** Id filter yang dikirim dari query string: `null`/kosong = tidak difilter. */
const normalizeFilter = (value: string | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_ID_LENGTH) return null;
  return trimmed;
};

type PlayRow = {
  classroomId: string | null;
  classroomName: string | null;
  storyId: string;
  storyTitle: string;
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

/** Kunci kelompok satu siswa di satu kelas untuk satu game. */
const groupKey = (row: PlayRow): string =>
  [
    row.classroomId ?? "-",
    row.storyId,
    row.studentId !== null
      ? `student:${row.studentId}`
      : row.nickname !== null
        ? `nickname:${row.nickname.toLowerCase()}`
        : "anon",
  ].join("|");

/**
 * Gabungkan percobaan satu siswa di satu kelas untuk satu game. Baris masukan
 * sudah urut terbaru lebih dulu, jadi kemunculan pertama adalah percobaan
 * terakhir.
 */
function aggregate(rows: PlayRow[]): AnalyticsRow[] {
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
    const key = groupKey(row);

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
      classroomId: group.latest.classroomId,
      classroomName: group.latest.classroomName,
      storyId: group.latest.storyId,
      storyTitle: group.latest.storyTitle,
    }))
    .sort(
      (a, b) =>
        b.bestPoints - a.bestPoints ||
        a.name.localeCompare(b.name) ||
        a.key.localeCompare(b.key),
    );
}

/**
 * Ringkasan hasil main untuk satu kelas dan satu game, atau untuk semua kelas /
 * semua game terbit bila filternya `null`.
 *
 * Kelas dan game yang diminta tetap diverifikasi kepemilikannya lebih dulu;
 * bila tidak ada atau milik guru lain, hasilnya `null` (bukan daftar kosong)
 * supaya halaman bisa membedakan "tidak ada data" dari "pilihan tidak valid".
 */
export async function getClassroomAnalytics(
  db: Client,
  input: GetClassroomAnalyticsInput,
): Promise<ClassroomAnalytics | null> {
  const { teacherId } = input;
  const classroomId = normalizeFilter(input.classroomId);
  const storyId = normalizeFilter(input.storyId);

  // Kelas yang ikut dalam agregat: satu kelas bila dipilih, semua bila tidak.
  const classroomsResult = await db.execute({
    sql: `select id, name, code
          from classrooms
          where teacher_id = ? ${classroomId === null ? "" : "and id = ?"}
          order by name collate nocase asc`,
    args: classroomId === null ? [teacherId] : [teacherId, classroomId],
  });
  if (classroomId !== null && classroomsResult.rows.length === 0) return null;

  const classrooms: AnalyticsClassroom[] = classroomsResult.rows.map((row) => ({
    id: toText(row.id),
    name: toText(row.name),
    code: toText(row.code),
  }));

  const classroomNameById = new Map(
    classrooms.map((item) => [item.id, item.name] as const),
  );

  // Hanya cerita terbit yang punya hasil main; draft tidak pernah dibagikan.
  const storiesResult = await db.execute({
    sql: `select id, title
          from stories
          where teacher_id = ? and status = 'published'
            ${storyId === null ? "" : "and id = ?"}
          order by title collate nocase asc`,
    args: storyId === null ? [teacherId] : [teacherId, storyId],
  });
  if (storyId !== null && storiesResult.rows.length === 0) return null;

  const stories: AnalyticsStory[] = storiesResult.rows.map((row) => ({
    id: toText(row.id),
    title: toText(row.title),
  }));

  const storyTitleById = new Map(
    stories.map((item) => [item.id, item.title] as const),
  );

  // Tanpa kelas atau tanpa game terbit tidak ada yang bisa diagregasi.
  if (classrooms.length === 0 || stories.length === 0) {
    return {
      classrooms,
      stories,
      selectedClassroomId: classroomId,
      selectedStoryId: storyId,
      studentsTotal: 0,
      studentsPlayed: 0,
      totalAttempts: 0,
      averageBestPoints: 0,
      rows: [],
    };
  }

  const studentsResult = await db.execute({
    sql: `select count(*) as total
          from students
          where teacher_id = ?
            and classroom_id in (${classrooms.map(() => "?").join(", ")})`,
    args: [teacherId, ...classrooms.map((item) => item.id)],
  });
  const studentsTotal = toNumber(studentsResult.rows[0]?.total);

  // Hanya hasil main dari kelas dan game yang masih ada dan milik guru. Kelas
  // yang sudah dihapus (`classroom_id` null) tidak bisa diatribusikan, jadi
  // dilewati — kecuali guru memang belum punya kelas sama sekali.
  const filterKelas = classroomId === null ? "" : "and pr.classroom_id = ?";
  const filterGame = storyId === null ? "" : "and pr.story_id = ?";
  const sql = `select pr.classroom_id, pr.story_id,
                      pr.student_id, pr.nickname, pr.earned_points,
                      pr.correct_count, pr.total_count, pr.total_points,
                      pr.weak_concepts, pr.created_at,
                      c.name as classroom_name,
                      s.display_name, s.nis
               from play_results pr
               left join classrooms c on c.id = pr.classroom_id
               left join students s on s.id = pr.student_id
               where c.teacher_id = ? and c.id is not null
                 ${
                   storyId === null
                     ? "and exists (select 1 from stories st where st.id = pr.story_id and st.teacher_id = ? and st.status = 'published')"
                     : ""
                 }
                 ${filterKelas}
                 ${filterGame}
               order by pr.created_at desc
               limit ?`;

  const playersResult = await db.execute({
    sql,
    args: [
      teacherId,
      ...(storyId === null ? [teacherId] : []),
      ...(classroomId === null ? [] : [classroomId]),
      ...(storyId === null ? [] : [storyId]),
      MAX_ANALYTICS_ROWS,
    ],
  });

  // Nama dan NIS siswa yang masih ada diambil lewat join: `play_results` hanya
  // menyimpan id + salinan nama, jadi siswa yang sudah dihapus tetap tampil
  // dengan nama terakhirnya.
  const rows: PlayRow[] = playersResult.rows.flatMap((row) => {
    const rowClassroomId = toNullableText(row.classroom_id);
    const rowStoryId = toText(row.story_id);
    const classroomName =
      rowClassroomId === null
        ? null
        : (classroomNameById.get(rowClassroomId) ??
          toNullableText(row.classroom_name));
    const storyTitle = storyTitleById.get(rowStoryId);
    if (classroomName === null || storyTitle === undefined) return [];

    return [
      {
        classroomId: rowClassroomId,
        classroomName,
        storyId: rowStoryId,
        storyTitle,
        studentId: toNullableText(row.student_id),
        nickname:
          toNullableText(row.display_name) ?? toNullableText(row.nickname),
        nis: toNullableText(row.nis),
        earnedPoints: toNumber(row.earned_points),
        correctCount: toNumber(row.correct_count),
        totalCount: toNumber(row.total_count),
        totalPoints: toNumber(row.total_points),
        weakConcepts: parseWeakConcepts(row.weak_concepts),
        createdAt: toText(row.created_at),
      },
    ];
  });

  const aggregated = aggregate(rows);

  return {
    classrooms,
    stories,
    selectedClassroomId: classroomId,
    selectedStoryId: storyId,
    studentsTotal,
    studentsPlayed: aggregated.length,
    totalAttempts: rows.length,
    averageBestPoints:
      aggregated.length === 0
        ? 0
        : Math.round(
            aggregated.reduce((sum, row) => sum + row.bestPoints, 0) /
              aggregated.length,
          ),
    rows: aggregated,
  };
}
