/**
 * Validasi bagian cerita: `Outline` dan payload satu chapter.
 *
 * Kontrak: `docs/03-ai-pipeline/pipeline.md` (bagian **4. Outline pass**,
 * **5. Generate pass**, dan **Pseudocode**), `docs/03-ai-pipeline/validation-and-repair.md`
 * (bagian **Alur keputusan**), serta `docs/02-data-model/validation-rules.md`.
 *
 * Dua fungsi di sini adalah padanan `validateStory` untuk tahap yang lebih
 * kecil, supaya pipeline tidak memvalidasi cerita yang belum lengkap:
 *
 * - `validateOutline` — sebelum generate, memeriksa `Outline`.
 * - `validateChapter` — setelah tiap panggilan chapter, memeriksa
 *   `{ chapter, challenges, continuity }` dengan konteks outline.
 *
 * Bentuk struktural tetap berasal dari satu sumber,
 * `docs/02-data-model/story.schema.json`, dijalankan dengan Ajv. Modul ini hanya
 * menyusun schema pembungkus yang menunjuk `$defs` yang sudah ada; ia tidak
 * menyalin bentuk field. `Outline` belum punya `$defs` sendiri, jadi schema-nya
 * dirakit dari potongan `$defs.meta`, `$defs.source`, `$defs.character`, dan
 * `$defs.chapter` — lihat laporan tugas untuk catatan dokumen.
 *
 * Sifat: murni, tanpa I/O, aman di browser, tidak pernah mengubah input, dan
 * tidak pernah melempar untuk input yang bentuknya salah.
 */

import Ajv2020 from "ajv/dist/2020.js";

import storyJsonSchema from "../../docs/02-data-model/story.schema.json";
import type { Challenge, Chapter } from "./schema";
import type {
  AjvIssue,
  AssetManifest,
  SkippedCheck,
  ValidationIssue,
} from "./validate";
import {
  checkAssetExists,
  errorIssue,
  issuesFromAjv,
  warningIssue,
} from "./validate";

/* -------------------------------------------------------------------------- */
/* Hasil                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Bentuk hasil yang sama dengan `ValidationResult` di `validate.ts`, tanpa
 * `story`: bagian yang divalidasi bukan `Story` utuh, jadi tidak ada cerita
 * ternormalisasi yang bisa dikembalikan.
 */
export type PartsValidationResult = {
  ok: boolean;
  /** Maksimal 20, sesuai batas repair di `validation-rules.md`. */
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  skippedChecks: SkippedCheck[];
  /** Jumlah error yang dipotong karena batas 20. */
  truncatedErrorCount: number;
};

/** Batas error yang dikirim ke repair (`validation-and-repair.md`). */
const MAX_ERRORS = 20;

const JSON_PARSE_ISSUE: ValidationIssue = {
  code: "E_JSON_PARSE",
  severity: "error",
  path: "",
  message: "Hasil AI tidak bisa dibaca. Coba buat ulang.",
  hint: "Kembalikan JSON lengkap yang valid, bukan teks lain atau diff.",
};

const uniqueIssues = (
  issues: readonly ValidationIssue[],
): ValidationIssue[] => {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}\u0000${issue.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const resultOf = (
  issues: readonly ValidationIssue[],
  warnings: readonly ValidationIssue[],
  skippedChecks: SkippedCheck[],
): PartsValidationResult => {
  const errors = uniqueIssues(issues);
  const ok = errors.length === 0;

  return {
    ok,
    errors: errors.slice(0, MAX_ERRORS),
    warnings: ok ? uniqueIssues(warnings) : [],
    skippedChecks,
    truncatedErrorCount: Math.max(0, errors.length - MAX_ERRORS),
  };
};

const parseInput = (
  input: unknown,
): { value: unknown; issue: ValidationIssue | null } => {
  if (typeof input !== "string") return { value: input, issue: null };

  try {
    return { value: JSON.parse(input) as unknown, issue: null };
  } catch {
    return { value: null, issue: JSON_PARSE_ISSUE };
  }
};

/* -------------------------------------------------------------------------- */
/* Schema pembungkus                                                          */
/* -------------------------------------------------------------------------- */

const SCHEMA_ID = (storyJsonSchema as { $id?: string }).$id ?? "";

const schemaRef = (pointer: string) => ({
  $ref: `${SCHEMA_ID}#/${pointer}`,
});

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(storyJsonSchema as object);

/**
 * `Outline` di `pipeline.md`. Tidak ada `$defs.outline` di schema cerita, jadi
 * setiap field meminjam definisi yang sudah ada:
 * `meta.title/synopsis/language`, `source.concepts/gaps`, `character`, dan
 * `chapter.id/title/concept/summary`. `sourcePages` hanya ada di outline.
 */
const outlineSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "synopsis",
    "language",
    "concepts",
    "cast",
    "chapters",
    "gaps",
  ],
  properties: {
    title: schemaRef("$defs/meta/properties/title"),
    synopsis: schemaRef("$defs/meta/properties/synopsis"),
    language: schemaRef("$defs/meta/properties/language"),
    concepts: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      uniqueItems: true,
      items: schemaRef("$defs/source/properties/concepts/items"),
    },
    cast: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      items: schemaRef("$defs/character"),
    },
    chapters: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "concept", "summary", "sourcePages"],
        properties: {
          id: schemaRef("$defs/chapter/properties/id"),
          title: schemaRef("$defs/chapter/properties/title"),
          concept: schemaRef("$defs/chapter/properties/concept"),
          summary: schemaRef("$defs/chapter/properties/summary"),
          sourcePages: {
            type: "array",
            minItems: 1,
            items: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    gaps: {
      type: "array",
      items: schemaRef("$defs/source/properties/gaps/items"),
    },
  },
};

/**
 * Payload chapter yang dijanjikan prompt (`src/ai/prompt.ts`) dan dipakai
 * `pipeline.md`: `{ chapter, challenges, continuity }`.
 *
 * `chapter` dan `challenges` memakai `$defs` yang sama dengan `Story`, jadi
 * batas scene/beat/teks dan aturan tiap tipe tantangan tidak ditulis ulang.
 * `continuity` tidak ada di schema cerita — ia hidup di luar `Story` — sehingga
 * bentuknya ditulis di sini sesuai `pipeline.md`.
 */
const chapterDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["chapter", "challenges", "continuity"],
  properties: {
    chapter: schemaRef("$defs/chapter"),
    challenges: {
      type: "array",
      items: {
        oneOf: [
          schemaRef("$defs/multipleChoice"),
          schemaRef("$defs/trueFalse"),
          schemaRef("$defs/ordering"),
          schemaRef("$defs/shortAnswer"),
        ],
      },
    },
    continuity: {
      type: "object",
      additionalProperties: false,
      required: ["previousChapterSummary", "characterStates", "openThreads"],
      properties: {
        previousChapterSummary: { type: "string" },
        characterStates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "location", "knows"],
            properties: {
              id: { type: "string", minLength: 1 },
              location: { type: "string" },
              knows: { type: "array", items: { type: "string" } },
            },
          },
        },
        openThreads: { type: "array", items: { type: "string" } },
      },
    },
  },
};

const outlineShape = ajv.compile(outlineSchema);
const chapterDraftShape = ajv.compile(chapterDraftSchema);

/* -------------------------------------------------------------------------- */
/* Bentuk yang sudah lolos schema                                             */
/* -------------------------------------------------------------------------- */

type OutlineCast = {
  id: string;
  name: string;
  role: string;
  spriteId: string;
};

type OutlineChapter = {
  id: string;
  title: string;
  concept: string;
  summary: string;
  sourcePages: number[];
};

type OutlineValue = {
  title: string;
  synopsis: string;
  language: string;
  concepts: string[];
  cast: OutlineCast[];
  chapters: OutlineChapter[];
  gaps: string[];
};

type ContinuityValue = {
  previousChapterSummary: string;
  characterStates: { id: string; location: string; knows: string[] }[];
  openThreads: string[];
};

type ChapterDraftValue = {
  chapter: Chapter;
  challenges: Challenge[];
  continuity: ContinuityValue;
};

/**
 * Konteks outline yang dibutuhkan `validateChapter`. Sengaja hanya field yang
 * dibaca, supaya `Outline` dari `src/ai/prompt.ts` bisa langsung diberikan.
 */
export type OutlineContext = {
  concepts: readonly string[];
  cast: readonly { id: string }[];
};

/** Chapter yang sedang ditulis, dari `outline.chapters`. */
export type PlannedChapterContext = {
  id: string;
  concept: string;
};

export type OutlineValidationOptions = {
  /** Bila kosong, pemeriksaan `spriteId` dilewati dan dicatat. */
  manifest?: AssetManifest;
};

export type ChapterValidationOptions = {
  outline: OutlineContext;
  planned: PlannedChapterContext;
  /** Bila kosong, pemeriksaan aset dilewati dan dicatat. */
  manifest?: AssetManifest;
};

/* -------------------------------------------------------------------------- */
/* Outline                                                                    */
/* -------------------------------------------------------------------------- */

type Collector = (issue: ValidationIssue) => void;

const claimId = (
  seen: Set<string>,
  id: string,
  path: string,
  report: Collector,
) => {
  if (seen.has(id)) {
    report(
      errorIssue(
        "E_DUPLICATE_ID",
        path,
        `Id "${id}" dipakai lebih dari sekali.`,
        `Id "${id}" dipakai lebih dari sekali; buat unik.`,
      ),
    );
    return;
  }
  seen.add(id);
};

const checkOutlineSemantics = (
  outline: OutlineValue,
  options: OutlineValidationOptions,
  report: Collector,
) => {
  const castIds = new Set<string>();

  outline.cast.forEach((character, index) => {
    claimId(castIds, character.id, `cast[${index}].id`, report);

    if (options.manifest) {
      checkAssetExists(
        options.manifest,
        "character",
        character.spriteId,
        `cast[${index}].spriteId`,
        report,
      );
    }
  });

  const chapterIds = new Set<string>();
  const concepts = new Set(outline.concepts);

  outline.chapters.forEach((chapter, index) => {
    claimId(chapterIds, chapter.id, `chapters[${index}].id`, report);

    if (!concepts.has(chapter.concept)) {
      report(
        errorIssue(
          "E_UNKNOWN_CONCEPT",
          `chapters[${index}].concept`,
          `Konsep "${chapter.concept}" tidak ada di daftar konsep materi.`,
          `"${chapter.concept}" tidak ada di concepts.`,
        ),
      );
    }
  });

  const players = outline.cast.filter(
    (character) => character.role === "player",
  );
  if (players.length !== 1) {
    report(
      errorIssue(
        "E_PLAYER_COUNT",
        "cast",
        "Outline harus punya tepat satu karakter pemain.",
        'Tandai tepat satu karakter sebagai role "player".',
      ),
    );
  }

  if (!outline.cast.some((character) => character.role === "mentor")) {
    report(
      errorIssue(
        "E_NO_MENTOR",
        "cast",
        "Outline harus punya minimal satu karakter mentor.",
        'Tambahkan satu karakter dengan role "mentor".',
      ),
    );
  }
};

const outlineWarnings = (outline: OutlineValue): ValidationIssue[] => {
  if (outline.gaps.length === 0) return [];

  return [
    warningIssue(
      "W_GAP_RECORDED",
      "gaps",
      `Outline mencatat ${outline.gaps.length} kekurangan yang perlu dicek.`,
    ),
  ];
};

/**
 * Validasi `Outline` sebelum generate.
 *
 * Menerima objek mentah atau string JSON. Tidak pernah mengubah input.
 */
export function validateOutline(
  input: unknown,
  options: OutlineValidationOptions = {},
): PartsValidationResult {
  const skippedChecks: SkippedCheck[] = options.manifest
    ? []
    : ["asset-existence"];

  const { value, issue } = parseInput(input);
  if (issue) return resultOf([issue], [], skippedChecks);

  if (!outlineShape(value)) {
    const errors = issuesFromAjv(
      value,
      (outlineShape.errors ?? []) as AjvIssue[],
    );
    return resultOf(errors, [], skippedChecks);
  }

  const outline = value as OutlineValue;
  const errors: ValidationIssue[] = [];
  checkOutlineSemantics(outline, options, (item) => errors.push(item));

  return resultOf(errors, outlineWarnings(outline), skippedChecks);
}

/* -------------------------------------------------------------------------- */
/* Chapter                                                                    */
/* -------------------------------------------------------------------------- */

const chapterConceptIssue = (concept: string, path: string): ValidationIssue =>
  errorIssue(
    "E_UNKNOWN_CONCEPT",
    path,
    `Konsep "${concept}" tidak ada di daftar konsep materi.`,
    `"${concept}" tidak ada di concepts outline.`,
  );

const checkChapterSemantics = (
  draft: ChapterDraftValue,
  options: ChapterValidationOptions,
  report: Collector,
) => {
  const { chapter, challenges } = draft;
  const concepts = new Set(options.outline.concepts);
  const castIds = new Set(options.outline.cast.map((member) => member.id));

  // Keunikan id, urutan mengikuti validation-rules.md.
  const seen = new Set<string>();
  claimId(seen, chapter.id, "chapter.id", report);
  chapter.scenes.forEach((scene, sceneIndex) => {
    claimId(seen, scene.id, `chapter.scenes[${sceneIndex}].id`, report);
  });

  challenges.forEach((challenge, index) => {
    claimId(seen, challenge.id, `challenges[${index}].id`, report);

    if (challenge.type === "multiple_choice") {
      const optionIds = new Set<string>();
      challenge.options.forEach((option, optionIndex) => {
        claimId(
          optionIds,
          option.id,
          `challenges[${index}].options[${optionIndex}].id`,
          report,
        );
      });
    }

    if (challenge.type === "ordering") {
      const itemIds = new Set<string>();
      challenge.items.forEach((item, itemIndex) => {
        claimId(
          itemIds,
          item.id,
          `challenges[${index}].items[${itemIndex}].id`,
          report,
        );
      });
    }
  });

  // Referensi konsep.
  if (!concepts.has(chapter.concept)) {
    report(chapterConceptIssue(chapter.concept, "chapter.concept"));
  }
  challenges.forEach((challenge, index) => {
    if (!concepts.has(challenge.conceptTag)) {
      report(
        chapterConceptIssue(
          challenge.conceptTag,
          `challenges[${index}].conceptTag`,
        ),
      );
    }
  });

  // Aset.
  if (options.manifest) {
    const manifest = options.manifest;

    checkAssetExists(
      manifest,
      "background",
      chapter.backgroundId,
      "chapter.backgroundId",
      report,
    );
    checkAssetExists(
      manifest,
      "music",
      chapter.musicId,
      "chapter.musicId",
      report,
    );

    chapter.scenes.forEach((scene, sceneIndex) => {
      const scenePath = `chapter.scenes[${sceneIndex}]`;
      if (scene.backgroundId) {
        checkAssetExists(
          manifest,
          "background",
          scene.backgroundId,
          `${scenePath}.backgroundId`,
          report,
        );
      }
      if (scene.musicId) {
        checkAssetExists(
          manifest,
          "music",
          scene.musicId,
          `${scenePath}.musicId`,
          report,
        );
      }
    });
  }

  // Speaker dan rujukan tantangan.
  const challengeIds = new Set(challenges.map((challenge) => challenge.id));
  const refsByChallenge = new Map<string, string[]>();
  let totalRefs = 0;

  chapter.scenes.forEach((scene, sceneIndex) => {
    scene.beats.forEach((beat, beatIndex) => {
      const beatPath = `chapter.scenes[${sceneIndex}].beats[${beatIndex}]`;

      if (beat.type === "dialogue" && !castIds.has(beat.speakerId)) {
        report(
          errorIssue(
            "E_UNKNOWN_SPEAKER",
            `${beatPath}.speakerId`,
            `Karakter "${beat.speakerId}" tidak ada di cast outline.`,
            `"${beat.speakerId}" tidak ada di cast.`,
          ),
        );
      }

      if (beat.type === "challenge") {
        totalRefs += 1;
        const bucket = refsByChallenge.get(beat.challengeId) ?? [];
        bucket.push(`${beatPath}.challengeId`);
        refsByChallenge.set(beat.challengeId, bucket);

        if (!challengeIds.has(beat.challengeId)) {
          report(
            errorIssue(
              "E_DANGLING_CHALLENGE",
              `${beatPath}.challengeId`,
              `Beat ini merujuk tantangan "${beat.challengeId}" yang tidak ada.`,
              `challengeId "${beat.challengeId}" tidak ada di daftar challenges.`,
            ),
          );
        }
      }
    });
  });

  if (totalRefs === 0) {
    report(
      errorIssue(
        "E_CHAPTER_NO_CHALLENGE",
        "chapter",
        `Chapter "${options.planned.id}" belum punya satu pun tantangan.`,
        `Tambahkan minimal satu beat challenge di chapter ${options.planned.id}.`,
      ),
    );
  }

  challenges.forEach((challenge, index) => {
    const refs = refsByChallenge.get(challenge.id) ?? [];

    if (refs.length === 0) {
      report(
        errorIssue(
          "E_ORPHAN_CHALLENGE",
          `challenges[${index}].id`,
          `Tantangan "${challenge.id}" dideklarasikan tetapi tidak dipakai.`,
          `Tantangan "${challenge.id}" tidak dipakai; rujuk dari sebuah beat atau hapus.`,
        ),
      );
    }

    for (const path of refs.slice(1)) {
      report(
        errorIssue(
          "E_DUPLICATE_CHALLENGE_REF",
          path,
          `Tantangan "${challenge.id}" dirujuk lebih dari sekali.`,
          `Rujuk tantangan "${challenge.id}" hanya sekali.`,
        ),
      );
    }
  });

  // Transisi tidak boleh menjadi beat terakhir.
  chapter.scenes.forEach((scene, sceneIndex) => {
    const lastBeat = scene.beats.at(-1);
    if (lastBeat?.type === "transition") {
      report(
        errorIssue(
          "E_TRANSITION_LAST",
          `chapter.scenes[${sceneIndex}].beats[${scene.beats.length - 1}]`,
          `Scene "${scene.id}" diakhiri transisi; transisi tidak boleh menjadi beat terakhir.`,
          `Hapus transition di akhir scene ${scene.id}.`,
        ),
      );
    }
  });

  // Aturan per tipe tantangan.
  challenges.forEach((challenge, index) => {
    if (challenge.type === "multiple_choice") {
      const optionIds = new Set(challenge.options.map((option) => option.id));
      if (!optionIds.has(challenge.correctOptionId)) {
        report(
          errorIssue(
            "E_CORRECT_OPTION",
            `challenges[${index}].correctOptionId`,
            `Jawaban benar tantangan "${challenge.id}" bukan salah satu opsi.`,
            "correctOptionId harus salah satu options[].id.",
          ),
        );
      }
    }

    if (challenge.type === "ordering") {
      const itemIds = challenge.items.map((item) => item.id);
      const expected = new Set(itemIds);
      const actual = new Set(challenge.correctOrder);
      const isPermutation =
        challenge.correctOrder.length === itemIds.length &&
        actual.size === expected.size &&
        [...expected].every((id) => actual.has(id));

      if (!isPermutation) {
        report(
          errorIssue(
            "E_ORDER_PERMUTATION",
            `challenges[${index}].correctOrder`,
            `Urutan jawaban tantangan "${challenge.id}" bukan permutasi lengkap dari item.`,
            "correctOrder harus memuat semua item tepat sekali.",
          ),
        );
      }
    }
  });
};

/**
 * Warning tingkat chapter. Kode dan ambangnya sama dengan `validateStory`,
 * hanya cakupannya satu chapter.
 */
const collectChapterWarnings = (
  draft: ChapterDraftValue,
): ValidationIssue[] => {
  const warnings: ValidationIssue[] = [];
  const { chapter, challenges } = draft;

  challenges.forEach((challenge, index) => {
    if (chapter.concept !== challenge.conceptTag) {
      warnings.push(
        warningIssue(
          "W_CONCEPT_NOT_IN_CHAPTER",
          `challenges[${index}].conceptTag`,
          `Tantangan "${challenge.id}" memakai konsep "${challenge.conceptTag}" di luar konsep chapter "${chapter.concept}".`,
        ),
      );
    }
  });

  chapter.scenes.forEach((scene, sceneIndex) => {
    if (!scene.beats.some((beat) => beat.type === "challenge")) {
      warnings.push(
        warningIssue(
          "W_NO_CHALLENGE_IN_SCENE",
          `chapter.scenes[${sceneIndex}]`,
          `Scene "${scene.id}" tidak punya tantangan.`,
        ),
      );
    }
  });

  if (challenges.length > 0) {
    const difficulties = new Set(
      challenges.map((challenge) => challenge.difficulty),
    );
    if (difficulties.size === 1) {
      const level = [...difficulties][0];
      if (level === 1 || level === 3) {
        warnings.push(
          warningIssue(
            "W_DIFFICULTY_SKEW",
            "challenges",
            `Semua tantangan memakai tingkat kesulitan ${level}.`,
          ),
        );
      }
    }

    if (challenges.every((challenge) => challenge.type === "short_answer")) {
      warnings.push(
        warningIssue(
          "W_SHORT_ANSWER_ONLY",
          "chapter",
          `Chapter "${chapter.id}" hanya berisi soal jawaban singkat.`,
        ),
      );
    }
  }

  const trueFalse = challenges.filter(
    (challenge) => challenge.type === "true_false",
  );
  if (trueFalse.length > 0) {
    const trueCount = trueFalse.filter(
      (challenge) => challenge.type === "true_false" && challenge.correctAnswer,
    ).length;
    const ratio = trueCount / trueFalse.length;
    if (ratio > 0.7 || 1 - ratio > 0.7) {
      warnings.push(
        warningIssue(
          "W_TRUE_FALSE_BIAS",
          "challenges",
          `Sebagian besar soal benar-salah memiliki jawaban ${ratio > 0.7 ? "benar" : "salah"}.`,
        ),
      );
    }
  }

  let dialogueRun = 0;
  let runReported = false;

  chapter.scenes.forEach((scene, sceneIndex) => {
    scene.beats.forEach((beat, beatIndex) => {
      if (beat.type === "narration" || beat.type === "dialogue") {
        dialogueRun += 1;
        if (dialogueRun > 6 && !runReported) {
          runReported = true;
          warnings.push(
            warningIssue(
              "W_LONG_DIALOGUE_RUN",
              `chapter.scenes[${sceneIndex}].beats[${beatIndex}]`,
              "Ada lebih dari 6 beat dialog/narasi berturut-turut tanpa interaksi.",
            ),
          );
        }
        return;
      }

      dialogueRun = 0;
      runReported = false;
    });
  });

  return warnings;
};

/**
 * Validasi satu chapter beserta tantangan dan continuity-nya.
 *
 * Menerima objek mentah atau string JSON. Tidak pernah mengubah input, dan
 * tidak memakai `validateStory` — cerita belum lengkap di tahap ini.
 */
export function validateChapter(
  input: unknown,
  options: ChapterValidationOptions,
): PartsValidationResult {
  // `options` adalah kontrak pemanggil, bukan input AI. Tetap dibaca defensif
  // supaya salah panggil tidak melempar.
  const context: ChapterValidationOptions = {
    outline: options?.outline ?? { concepts: [], cast: [] },
    planned: options?.planned ?? { id: "", concept: "" },
    manifest: options?.manifest,
  };

  const skippedChecks: SkippedCheck[] = context.manifest
    ? []
    : ["asset-existence"];

  const { value, issue } = parseInput(input);
  if (issue) return resultOf([issue], [], skippedChecks);

  if (!chapterDraftShape(value)) {
    const errors = issuesFromAjv(
      value,
      (chapterDraftShape.errors ?? []) as AjvIssue[],
    );
    return resultOf(errors, [], skippedChecks);
  }

  const draft = value as ChapterDraftValue;
  const errors: ValidationIssue[] = [];
  checkChapterSemantics(draft, context, (item) => errors.push(item));

  return resultOf(errors, collectChapterWarnings(draft), skippedChecks);
}
