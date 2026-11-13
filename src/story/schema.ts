/**
 * Bentuk cerita ClassQuest versi TypeScript.
 *
 * `docs/02-data-model/story.schema.json` adalah definisi struktural yang
 * **mengikat**. File ini menyalinnya ke zod supaya kode mendapat tipe `Story`
 * dan parser runtime yang sama ketatnya. `src/story/schema.test.ts` (drift
 * guard) gagal kalau keduanya menyimpang, jadi ubah keduanya bersamaan.
 *
 * Yang ada di sini hanya bentuk: field, tipe, enum, pola id, jumlah, dan batas
 * panjang. Referensi antar-bagian (aset, speaker, konsep, challenge, urutan
 * jawaban) diperiksa validator semantik di `src/story/validate.ts`.
 *
 * Batas panjang dihitung per code point, sama seperti `minLength`/`maxLength`
 * di JSON Schema — bukan per unit UTF-16 seperti `String#length`.
 */

import { z } from "zod";

import { EXPRESSIONS } from "./expression";

export const STORY_SCHEMA_VERSION = "1.0" as const;

/** Teks dengan batas bawah dan atas, dihitung per code point. */
const boundedText = (min: number, max: number, label = "teks") =>
  z.string().superRefine((value, ctx) => {
    const length = [...value].length;

    if (length < min) {
      ctx.addIssue({
        code: "too_small",
        origin: "string",
        minimum: min,
        inclusive: true,
        message: `${label} minimal ${min} karakter (sekarang ${length}).`,
      });
    }

    if (length > max) {
      ctx.addIssue({
        code: "too_big",
        origin: "string",
        maximum: max,
        inclusive: true,
        message: `${label} maksimal ${max} karakter (sekarang ${length}).`,
      });
    }
  });

/** Larik string tanpa duplikat, setara `uniqueItems` di JSON Schema. */
const uniqueStrings = (inner: z.ZodString) =>
  z.array(inner).refine((values) => new Set(values).size === values.length, {
    message: "Nilai tidak boleh berulang.",
  });

const nonEmptyId = z.string().min(1);

export const schemaVersionSchema = z.literal(STORY_SCHEMA_VERSION);

/* -------------------------------------------------------------------------- */
/* meta                                                                       */
/* -------------------------------------------------------------------------- */

/** Pola BCP-47 sederhana yang dipakai kontrak, mis. `id` atau `en-US`. */
const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

export const storyMetaSchema = z.strictObject({
  id: nonEmptyId,
  title: boundedText(3, 80, "Judul"),
  subject: boundedText(1, 40, "Mata pelajaran"),
  gradeLevel: boundedText(1, 40, "Kelas"),
  language: z.string().regex(LANGUAGE_PATTERN, {
    message: 'Bahasa harus kode BCP-47 pendek, mis. "id" atau "en-US".',
  }),
  tone: boundedText(1, 60, "Nada cerita"),
  synopsis: boundedText(40, 400, "Sinopsis"),
  estimatedMinutes: z.number().int().min(3).max(30),
});

export type StoryMeta = z.infer<typeof storyMetaSchema>;

/* -------------------------------------------------------------------------- */
/* source                                                                     */
/* -------------------------------------------------------------------------- */

export const storySourceSchema = z.strictObject({
  fileName: boundedText(1, 200, "Nama file"),
  pageCount: z.number().int().min(1).max(40),
  concepts: uniqueStrings(boundedText(1, 60, "Konsep"))
    .min(1)
    .max(12),
  gaps: z.array(boundedText(1, 240, "Catatan kekurangan")).optional(),
});

export type StorySource = z.infer<typeof storySourceSchema>;

/* -------------------------------------------------------------------------- */
/* cast                                                                       */
/* -------------------------------------------------------------------------- */

export const characterRoleSchema = z.enum([
  "player",
  "mentor",
  "npc",
  "antagonist",
]);

export type CharacterRole = z.infer<typeof characterRoleSchema>;

export const characterSchema = z.strictObject({
  id: z.string().regex(/^char_[a-z0-9_]+$/, {
    message: 'Id karakter harus berpola "char_[a-z0-9_]+".',
  }),
  name: boundedText(1, 40, "Nama karakter"),
  role: characterRoleSchema,
  spriteId: nonEmptyId,
  description: boundedText(0, 160, "Deskripsi karakter").optional(),
  /**
   * Kalimat pendek yang diucapkan karakter saat diajak bicara **di luar**
   * perannya di scene aktif. Opsional: karakter tanpa baris ini tetap diam.
   */
  smallTalk: boundedText(1, 240, "Obrolan singkat karakter").optional(),
});

export type Character = z.infer<typeof characterSchema>;

/* -------------------------------------------------------------------------- */
/* beats                                                                      */
/* -------------------------------------------------------------------------- */

export const transitionEffectSchema = z.enum(["fade", "cut"]);

export type TransitionEffect = z.infer<typeof transitionEffectSchema>;

/** Ekspresi potret yang boleh dipakai beat dialog/narasi. */
export const expressionSchema = z.enum(EXPRESSIONS);

export type Expression = z.infer<typeof expressionSchema>;

/**
 * Narasi tanpa nama pembicara. `speakerId` opsional hanya untuk memunculkan
 * potret karakter **tanpa** menampilkan namanya; `expression` mengikuti
 * `speakerId` (lihat `dependentRequired` di `story.schema.json`, ditegakkan
 * pada `beatSchema` karena aturan itu melintasi dua field).
 */
export const narrationBeatSchema = z.strictObject({
  type: z.literal("narration"),
  text: boundedText(1, 240),
  speakerId: nonEmptyId.optional(),
  expression: expressionSchema.optional(),
});

export const dialogueBeatSchema = z.strictObject({
  type: z.literal("dialogue"),
  speakerId: nonEmptyId,
  text: boundedText(1, 240),
  expression: expressionSchema.optional(),
});

export const challengeBeatSchema = z.strictObject({
  type: z.literal("challenge"),
  challengeId: nonEmptyId,
});

export const transitionBeatSchema = z.strictObject({
  type: z.literal("transition"),
  effect: transitionEffectSchema,
  text: boundedText(1, 240).optional(),
});

export const beatSchema = z
  .discriminatedUnion("type", [
    narrationBeatSchema,
    dialogueBeatSchema,
    challengeBeatSchema,
    transitionBeatSchema,
  ])
  .superRefine((beat, ctx) => {
    // JSON Schema memakai `dependentRequired`; zod menegakkannya di sini
    // karena aturannya melintasi dua field pada beat narration.
    if (
      beat.type === "narration" &&
      beat.expression !== undefined &&
      beat.speakerId === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expression"],
        message:
          "Beat narration hanya boleh memakai expression bersama speakerId.",
      });
    }
  });

export type NarrationBeat = z.infer<typeof narrationBeatSchema>;
export type DialogueBeat = z.infer<typeof dialogueBeatSchema>;
export type ChallengeBeat = z.infer<typeof challengeBeatSchema>;
export type TransitionBeat = z.infer<typeof transitionBeatSchema>;
export type Beat = z.infer<typeof beatSchema>;

/* -------------------------------------------------------------------------- */
/* scenes dan chapters                                                        */
/* -------------------------------------------------------------------------- */

export const sceneSchema = z.strictObject({
  id: z.string().regex(/^sc_[a-z0-9_]+$/, {
    message: 'Id scene harus berpola "sc_[a-z0-9_]+".',
  }),
  title: boundedText(1, 60, "Judul scene").optional(),
  backgroundId: nonEmptyId.optional(),
  musicId: nonEmptyId.optional(),
  beats: z.array(beatSchema).min(3).max(10),
});

export const chapterSchema = z.strictObject({
  id: z.string().regex(/^ch_[a-z0-9_]+$/, {
    message: 'Id chapter harus berpola "ch_[a-z0-9_]+".',
  }),
  title: boundedText(3, 60, "Judul chapter"),
  concept: nonEmptyId,
  summary: boundedText(20, 240, "Ringkasan chapter"),
  backgroundId: nonEmptyId,
  musicId: nonEmptyId,
  scenes: z.array(sceneSchema).min(2).max(6),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Chapter = z.infer<typeof chapterSchema>;

/* -------------------------------------------------------------------------- */
/* challenges                                                                 */
/* -------------------------------------------------------------------------- */

export const challengeTypeSchema = z.enum([
  "multiple_choice",
  "true_false",
  "ordering",
  "short_answer",
]);

export type ChallengeType = z.infer<typeof challengeTypeSchema>;

export const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export type Difficulty = z.infer<typeof difficultySchema>;

/**
 * Cermin `$defs.challengeBase`. Dipakai untuk menurunkan tipe bersama dan
 * sebagai `shape` dasar keempat varian; bukan target validasi tersendiri.
 */
export const challengeBaseSchema = z.strictObject({
  id: z.string().regex(/^chl_[a-z0-9_]+$/, {
    message: 'Id tantangan harus berpola "chl_[a-z0-9_]+".',
  }),
  type: challengeTypeSchema,
  prompt: boundedText(5, 300, "Prompt tantangan"),
  conceptTag: nonEmptyId,
  difficulty: difficultySchema,
  explanation: boundedText(10, 400, "Penjelasan jawaban"),
  hints: z
    .array(boundedText(1, 140, "Petunjuk"))
    .max(2)
    .optional(),
  points: z.number().int().min(0).optional(),
});

export type ChallengeBase = z.infer<typeof challengeBaseSchema>;

export const challengeOptionSchema = z.strictObject({
  id: z.string().regex(/^opt_[a-z0-9_]+$/, {
    message: 'Id opsi harus berpola "opt_[a-z0-9_]+".',
  }),
  text: boundedText(1, 120, "Teks opsi"),
});

export const orderingItemSchema = z.strictObject({
  id: z.string().regex(/^itm_[a-z0-9_]+$/, {
    message: 'Id item harus berpola "itm_[a-z0-9_]+".',
  }),
  text: boundedText(1, 120, "Teks item"),
});

export type ChallengeOption = z.infer<typeof challengeOptionSchema>;
export type OrderingItem = z.infer<typeof orderingItemSchema>;

export const multipleChoiceChallengeSchema = z.strictObject({
  ...challengeBaseSchema.shape,
  type: z.literal("multiple_choice"),
  options: z.array(challengeOptionSchema).min(2).max(5),
  correctOptionId: nonEmptyId,
});

export const trueFalseChallengeSchema = z.strictObject({
  ...challengeBaseSchema.shape,
  type: z.literal("true_false"),
  statement: boundedText(5, 240, "Pernyataan"),
  correctAnswer: z.boolean(),
});

export const orderingChallengeSchema = z.strictObject({
  ...challengeBaseSchema.shape,
  type: z.literal("ordering"),
  items: z.array(orderingItemSchema).min(2).max(5),
  correctOrder: z.array(nonEmptyId).min(2).max(5),
});

export const shortAnswerChallengeSchema = z.strictObject({
  ...challengeBaseSchema.shape,
  type: z.literal("short_answer"),
  acceptedAnswers: z
    .array(boundedText(1, 60, "Jawaban diterima"))
    .min(1)
    .max(5),
  caseSensitive: z.boolean().optional(),
});

export type MultipleChoiceChallenge = z.infer<
  typeof multipleChoiceChallengeSchema
>;
export type TrueFalseChallenge = z.infer<typeof trueFalseChallengeSchema>;
export type OrderingChallenge = z.infer<typeof orderingChallengeSchema>;
export type ShortAnswerChallenge = z.infer<typeof shortAnswerChallengeSchema>;

export const challengeSchema = z.discriminatedUnion("type", [
  multipleChoiceChallengeSchema,
  trueFalseChallengeSchema,
  orderingChallengeSchema,
  shortAnswerChallengeSchema,
]);

export type Challenge = z.infer<typeof challengeSchema>;

/* -------------------------------------------------------------------------- */
/* assetUsage dan Story                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Daftar aset yang dipakai. Isinya harus sama dengan hasil pemindaian cerita;
 * kecocokan itu diperiksa validator (`E_ASSET_USAGE_MISMATCH`), bukan di sini.
 */
export const assetUsageSchema = z.strictObject({
  backgrounds: uniqueStrings(nonEmptyId),
  music: uniqueStrings(nonEmptyId),
  sprites: uniqueStrings(nonEmptyId),
});

export type AssetUsage = z.infer<typeof assetUsageSchema>;

export const storySchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  meta: storyMetaSchema,
  source: storySourceSchema,
  cast: z.array(characterSchema).min(2).max(10),
  chapters: z.array(chapterSchema).min(3).max(6),
  challenges: z.array(challengeSchema),
  assetUsage: assetUsageSchema,
});

export type Story = z.infer<typeof storySchema>;
