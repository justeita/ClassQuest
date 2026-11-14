/**
 * Simpan hasil bermain siswa (task 22).
 *
 * Kontrak: `docs/06-backend/api-contract.md` bagian "Server Actions"
 * (`savePlayResult({ storyId, result })`, **tanpa** `requireTeacher`) dan
 * `docs/06-backend/persistence.md` (kolom `play_results`; "jangan menyimpan
 * jawaban siswa per opsi di MVP — cukup agregat").
 *
 * Aturan yang dipegang:
 *
 * - **Server yang menghitung.** Skor tidak pernah diterima dari klien:
 *   `scoreStory()` dari `src/story/scoring.ts` dijalankan ulang terhadap
 *   cerita versi terbit yang tersimpan. Field skor di input ditolak
 *   (`z.strictObject`).
 * - **Cerita harus terbit.** Hanya `status = 'published'` dengan
 *   `published_version` yang bisa mengumpulkan hasil; kondisi lain →
 *   `not_found` (identik dengan "tidak ada").
 * - **Tolak jawaban asal.** `challengeId` tidak dikenal, tipe tidak cocok,
 *   id opsi/item tidak dikenal, jawaban ganda, atau jumlah jawaban melebihi
 *   jumlah tantangan → `invalid`.
 * - **Minimal data.** Yang tersimpan hanya kolom `play_results`; tidak ada
 *   IP, user agent, jawaban per-opsi, atau identitas. Nama diambil dari baris
 *   `students` bila `studentId` dikirim (bukan dari klien), atau dibersihkan
 *   dari `nickname` bebas. `classroom_id` diturunkan dari siswa, jadi kelas
 *   tidak pernah dipercaya dari input.
 * - Body tidak pernah di-log.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { Client } from "@libsql/client";

import type { Story } from "@/story/schema";
import { scoreStory, type Answer } from "@/story/scoring";

import { getPublishedStory } from "@/server/stories";

/** Batas ukuran input hasil bermain; body play result memang kecil. */
export const MAX_PLAY_RESULT_JSON_BYTES = 64 * 1024;

/** Batas panjang nickname (opsional; tanpa identitas asli). */
export const MAX_NICKNAME_LENGTH = 40;

/** Alasan kegagalan yang bisa dibedakan klien. */
export type SavePlayResultFailureReason = "not_found" | "invalid" | "too_large";

/* -------------------------------------------------------------------------- */
/* Skema input                                                                */
/* -------------------------------------------------------------------------- */

const idField = z.string().min(1).max(100);

/** Jawaban per tipe, mengikuti `Answer` di `src/story/scoring.ts`. */
const answerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple_choice"),
    challengeId: idField,
    selectedId: idField,
    usedHint: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("true_false"),
    challengeId: idField,
    answer: z.boolean(),
    usedHint: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("ordering"),
    challengeId: idField,
    order: z.array(idField).max(50),
    usedHint: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("short_answer"),
    challengeId: idField,
    text: z.string().max(500),
    usedHint: z.boolean().optional(),
  }),
]);

const playResultSchema = z.strictObject({
  studentId: idField.optional(),
  nickname: z.string().max(MAX_NICKNAME_LENGTH).optional(),
  answers: z.array(answerSchema).max(200),
});

const inputSchema = z.strictObject({
  storyId: z.string().min(1).max(200),
  result: playResultSchema,
});

/* -------------------------------------------------------------------------- */
/* Validasi jawaban terhadap cerita                                           */
/* -------------------------------------------------------------------------- */

/**
 * Periksa jawaban terhadap tantangan yang benar-benar ada di cerita.
 * `scoreStory` diam-diam mengabaikan id tak dikenal; di sini itu **ditolak**
 * supaya data sampah tidak tersimpan.
 */
const answersAreKnown = (story: Story, answers: Answer[]): boolean => {
  const challengesById = new Map(
    story.challenges.map((challenge) => [challenge.id, challenge]),
  );

  // Jumlah jawaban tidak boleh melebihi jumlah tantangan, dan tidak boleh
  // ada jawaban ganda untuk id yang sama.
  if (answers.length > story.challenges.length) return false;
  const seen = new Set<string>();
  for (const answer of answers) {
    if (seen.has(answer.challengeId)) return false;
    seen.add(answer.challengeId);
  }

  for (const answer of answers) {
    const challenge = challengesById.get(answer.challengeId);
    if (challenge === undefined) return false;

    switch (challenge.type) {
      case "multiple_choice":
        if (
          answer.type !== "multiple_choice" ||
          !challenge.options.some((option) => option.id === answer.selectedId)
        ) {
          return false;
        }
        break;
      case "true_false":
        if (answer.type !== "true_false") return false;
        break;
      case "ordering": {
        if (answer.type !== "ordering") return false;
        const itemIds = new Set(challenge.items.map((item) => item.id));
        if (answer.order.length > challenge.items.length) return false;
        if (!answer.order.every((itemId: string) => itemIds.has(itemId)))
          return false;
        break;
      }
      case "short_answer":
        if (answer.type !== "short_answer") return false;
        break;
    }
  }

  return true;
};

/** Buang karakter kontrol, rapikan spasi, trim; kosong → `null`. */
const cleanNickname = (value: string | undefined): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
  return cleaned === "" ? null : cleaned;
};

const isoOf = (ms: number): string => new Date(ms).toISOString();

/**
 * Siswa yang dipilih di layar masuk, atau `null` bila `studentId` tidak
 * dikirim / tidak ada / milik guru lain.
 *
 * Query memfilter `students.teacher_id` = pemilik cerita: siswa kelas guru lain
 * tidak boleh bisa dicatat sebagai pemain cerita ini, walaupun id-nya ditebak.
 */
async function readPlayerStudent(
  db: Pick<Client, "execute">,
  input: { studentId: string; teacherId: string },
): Promise<{ id: string; name: string; classroomId: string | null } | null> {
  const result = await db.execute({
    sql: `select id, display_name, classroom_id
          from students
          where id = ? and teacher_id = ?
          limit 1`,
    args: [input.studentId, input.teacherId],
  });

  const row = result.rows[0];
  if (row === undefined) return null;

  const id = typeof row.id === "string" ? row.id : "";
  const name = typeof row.display_name === "string" ? row.display_name : "";
  if (id === "" || name === "") return null;

  return {
    id,
    name,
    classroomId: typeof row.classroom_id === "string" ? row.classroom_id : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Simpan                                                                     */
/* -------------------------------------------------------------------------- */

export type SavePlayResultInput = {
  storyId: string;
  /** Isi `result` dari klien; bentuknya `PlayResultInput` tanpa skor. */
  result: unknown;
};

export type SavePlayResultCoreResult =
  { ok: true } | { ok: false; reason: SavePlayResultFailureReason };

/**
 * Validasi dan simpan satu kali main. Fungsi menerima client yang bisa
 * diinjeksi supaya mudah dites; tidak mengembalikan detail error per field.
 */
export async function savePlayResult(
  db: Client,
  input: SavePlayResultInput,
  now: () => number = Date.now,
): Promise<SavePlayResultCoreResult> {
  const serialized = JSON.stringify(input ?? null);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PLAY_RESULT_JSON_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { storyId, result } = parsed.data;

  const published = await getPublishedStory(db, { storyId });
  if (published === null || published.story === null) {
    return { ok: false, reason: "not_found" };
  }

  const answers = result.answers as Answer[];
  if (!answersAreKnown(published.story, answers)) {
    return { ok: false, reason: "invalid" };
  }

  // Identitas pemain: baris `students` menang atas nama bebas. Id siswa yang
  // tidak ada / milik guru lain ditolak, bukan disimpan sebagai nama kosong.
  let studentId: string | null = null;
  let classroomId: string | null = null;
  let nickname = cleanNickname(result.nickname);

  if (result.studentId !== undefined) {
    const student = await readPlayerStudent(db, {
      studentId: result.studentId,
      teacherId: published.teacherId,
    });
    if (student === null) return { ok: false, reason: "invalid" };

    studentId = student.id;
    classroomId = student.classroomId;
    nickname = student.name;
  }

  // Skor selalu dihitung ulang di server dari cerita yang tersimpan.
  const score = scoreStory(published.story, answers);

  await db.execute({
    sql: `insert into play_results
            (id, story_id, story_version, classroom_id, student_id, nickname,
             correct_count, total_count, total_points, earned_points,
             weak_concepts, created_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      published.storyId,
      published.version,
      classroomId,
      studentId,
      nickname,
      score.correctCount,
      score.totalChallenges,
      score.totalPoints,
      score.earnedPoints,
      JSON.stringify(score.weakConcepts),
      isoOf(now()),
    ],
  });

  return { ok: true };
}
