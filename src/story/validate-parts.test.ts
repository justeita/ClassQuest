import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { toAssetManifest } from "../assets/manifest";
import type { ValidationIssue } from "./validate";
import {
  type ChapterValidationOptions,
  type PartsValidationResult,
  validateChapter,
  validateOutline,
} from "./validate-parts";

/**
 * Kontrak `validateOutline` dan `validateChapter`:
 * `docs/03-ai-pipeline/pipeline.md` (outline pass, generate pass, pseudocode)
 * dan `docs/02-data-model/validation-rules.md`.
 *
 * Fixture yang dipakai adalah keluaran mock asli di
 * `src/ai/__fixtures__/outputs/`. Setiap kasus rusak dibuat dari fixture valid
 * dengan satu cacat, supaya kode error dan path yang diuji tidak tertukar.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(REPO, path), "utf8")) as unknown;

const OUTLINE = readJson("src/ai/__fixtures__/outputs/outline/valid.json");
const CHAPTER = readJson("src/ai/__fixtures__/outputs/chapter/valid.json");
const REPAIR = readJson("src/ai/__fixtures__/outputs/repair/valid.json");

const MANIFEST = toAssetManifest();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Deep-freeze: input yang dibekukan tidak boleh membuat validator melempar. */
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

// Fixture sengaja diubah bebas per kasus uji; bentuknya sudah dijamin schema.
type Mutable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

const chapterContext = (
  overrides: Partial<ChapterValidationOptions> = {},
): ChapterValidationOptions => {
  const outline = OUTLINE as Mutable;

  return {
    outline: { concepts: outline.concepts, cast: outline.cast },
    planned: outline.chapters[0],
    manifest: MANIFEST,
    ...overrides,
  };
};

const brokenChapter = (mutate: (draft: Mutable) => void): unknown => {
  const draft = clone(CHAPTER) as Mutable;
  mutate(draft);
  return draft;
};

const brokenOutline = (mutate: (outline: Mutable) => void): unknown => {
  const outline = clone(OUTLINE) as Mutable;
  mutate(outline);
  return outline;
};

const codes = (issues: readonly ValidationIssue[]) =>
  issues.map((issue) => issue.code);

const expectIssue = (
  result: PartsValidationResult,
  code: string,
  path: string,
) => {
  expect(result.ok).toBe(false);
  expect(result.errors).toContainEqual(
    expect.objectContaining({ code, path, severity: "error" }),
  );
};

/* -------------------------------------------------------------------------- */
/* Fixture valid                                                              */
/* -------------------------------------------------------------------------- */

describe("fixture valid", () => {
  it("menerima outline yang valid", () => {
    const result = validateOutline(OUTLINE, { manifest: MANIFEST });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.skippedChecks).toEqual([]);
    expect(result.truncatedErrorCount).toBe(0);
  });

  it("menerima payload chapter yang valid", () => {
    const result = validateChapter(CHAPTER, chapterContext());

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("menerima payload repair yang valid", () => {
    const result = validateChapter(REPAIR, chapterContext());

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("menerima input berupa string JSON", () => {
    expect(validateOutline(JSON.stringify(OUTLINE)).ok).toBe(true);
    expect(validateChapter(JSON.stringify(CHAPTER), chapterContext()).ok).toBe(
      true,
    );
  });

  it("melewati pemeriksaan aset bila manifest tidak diberikan", () => {
    const draft = brokenChapter((value) => {
      value.chapter.backgroundId = "bg_lab";
    });

    const result = validateChapter(
      draft,
      chapterContext({ manifest: undefined }),
    );

    expect(result.ok).toBe(true);
    expect(result.skippedChecks).toEqual(["asset-existence"]);
  });
});

/* -------------------------------------------------------------------------- */
/* Kode error chapter                                                         */
/* -------------------------------------------------------------------------- */

describe("validateChapter — kode error", () => {
  const cases: [string, string, (draft: Mutable) => void][] = [
    [
      "E_MISSING_FIELD",
      "chapter.title",
      (draft) => {
        delete draft.chapter.title;
      },
    ],
    [
      "E_SCHEMA",
      "chapter.extra",
      (draft) => {
        draft.chapter.extra = true;
      },
    ],
    [
      "E_TEXT_TOO_LONG",
      "chapter.scenes[0].beats[0].text",
      (draft) => {
        draft.chapter.scenes[0].beats[0].text = "x".repeat(241);
      },
    ],
    [
      "E_TEXT_EMPTY",
      "chapter.scenes[0].beats[0].text",
      (draft) => {
        draft.chapter.scenes[0].beats[0].text = "";
      },
    ],
    [
      "E_SCENE_COUNT",
      "chapter.scenes",
      (draft) => {
        draft.chapter.scenes = [draft.chapter.scenes[0]];
      },
    ],
    [
      "E_BEAT_COUNT",
      "chapter.scenes[0].beats",
      (draft) => {
        draft.chapter.scenes[0].beats = draft.chapter.scenes[0].beats.slice(
          0,
          2,
        );
      },
    ],
    [
      "E_CHAPTER_NO_CHALLENGE",
      "chapter",
      (draft) => {
        draft.chapter.scenes[0].beats[2] = {
          type: "narration",
          text: "Kael mengangguk pelan.",
        };
        draft.challenges = [];
      },
    ],
    [
      "E_ORPHAN_CHALLENGE",
      "challenges[1].id",
      (draft) => {
        draft.challenges.push({
          ...draft.challenges[0],
          id: "chl_01_99",
        });
      },
    ],
    [
      "E_DANGLING_CHALLENGE",
      "chapter.scenes[0].beats[2].challengeId",
      (draft) => {
        draft.chapter.scenes[0].beats[2].challengeId = "chl_tidak_ada";
      },
    ],
    [
      "E_DUPLICATE_CHALLENGE_REF",
      "chapter.scenes[1].beats[3].challengeId",
      (draft) => {
        draft.chapter.scenes[1].beats.push({
          type: "challenge",
          challengeId: "chl_01_01",
        });
      },
    ],
    [
      "E_TRANSITION_LAST",
      "chapter.scenes[1].beats[3]",
      (draft) => {
        draft.chapter.scenes[1].beats.push({
          type: "transition",
          effect: "fade",
        });
      },
    ],
    [
      "E_UNKNOWN_ASSET",
      "chapter.backgroundId",
      (draft) => {
        draft.chapter.backgroundId = "bg_lab";
      },
    ],
    [
      "E_UNKNOWN_SPEAKER",
      "chapter.scenes[0].beats[1].speakerId",
      (draft) => {
        draft.chapter.scenes[0].beats[1].speakerId = "char_hantu";
      },
    ],
    [
      "E_UNKNOWN_CONCEPT",
      "challenges[0].conceptTag",
      (draft) => {
        draft.challenges[0].conceptTag = "Fotosintesis Palsu";
      },
    ],
    [
      "E_DUPLICATE_ID",
      "chapter.scenes[1].id",
      (draft) => {
        draft.chapter.scenes[1].id = "sc_01_01";
      },
    ],
    [
      "E_CORRECT_OPTION",
      "challenges[0].correctOptionId",
      (draft) => {
        draft.challenges[0].correctOptionId = "opt_z";
      },
    ],
    [
      "E_OPTION_COUNT",
      "challenges[0].options",
      (draft) => {
        draft.challenges[0].options = [{ id: "opt_a", text: "Cahaya" }];
      },
    ],
    [
      "E_ORDER_PERMUTATION",
      "challenges[0].correctOrder",
      (draft) => {
        draft.challenges[0] = {
          id: "chl_01_01",
          type: "ordering",
          prompt: "Urutkan proses fotosintesis.",
          conceptTag: "Fotosintesis",
          difficulty: 2,
          explanation: "Urutan ini mengikuti proses yang benar.",
          items: [
            { id: "itm_a", text: "Cahaya ditangkap" },
            { id: "itm_b", text: "Glukosa dibuat" },
          ],
          correctOrder: ["itm_a"],
        };
      },
    ],
    [
      "E_EMPTY_ANSWERS",
      "challenges[0].acceptedAnswers",
      (draft) => {
        draft.challenges[0] = {
          id: "chl_01_01",
          type: "short_answer",
          prompt: "Sebutkan satu hal yang dibutuhkan daun.",
          conceptTag: "Fotosintesis",
          difficulty: 2,
          explanation: "Daun membutuhkan cahaya matahari.",
          acceptedAnswers: [],
        };
      },
    ],
    [
      "E_ONWRONG_WITHOUT_ATTEMPTS",
      "chapter.scenes[0].beats[2].maxAttempts",
      (draft) => {
        delete draft.chapter.scenes[0].beats[2].maxAttempts;
        delete draft.chapter.scenes[0].beats[2].onWrong.retryQuestions;
      },
    ],
    [
      "E_RETRY_COUNT",
      "chapter.scenes[0].beats[2].onWrong.retryQuestions",
      (draft) => {
        draft.chapter.scenes[0].beats[2].onWrong.retryQuestions.push(
          "Coba sekali lagi: apa yang membantu daun memasak makanan?",
        );
      },
    ],
    [
      "E_DETOUR_TOO_LONG",
      "chapter.scenes[0].beats[2].onWrong.detour",
      (draft) => {
        draft.chapter.scenes[0].beats[2].onWrong.detour.push(
          { type: "narration", text: "Kael membaca ulang catatannya." },
          { type: "narration", text: "Pak Bima menunggu dengan sabar." },
        );
      },
    ],
  ];

  it.each(cases)("melaporkan %s pada %s", (code, path, mutate) => {
    const result = validateChapter(brokenChapter(mutate), chapterContext());

    expectIssue(result, code, path);
  });

  it("melaporkan E_JSON_PARSE untuk string yang bukan JSON", () => {
    const result = validateChapter("{ bukan json", chapterContext());

    expectIssue(result, "E_JSON_PARSE", "");
    expect(result.errors).toHaveLength(1);
  });

  it("menolak format id flag yang salah sebagai E_SCHEMA", () => {
    // Pola id flag dijaga schema, bukan diulang di lapis semantik. Kesalahan
    // bentuk tetap error yang memicu repair di level chapter.
    const draft = brokenChapter((value) => {
      value.chapter.scenes[0].beats[2].onWrong.setFlags = { flg_Salah: true };
    });

    const result = validateChapter(draft, chapterContext());

    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toContain("E_SCHEMA");
  });
});

/* -------------------------------------------------------------------------- */
/* Kode error outline                                                         */
/* -------------------------------------------------------------------------- */

describe("validateOutline — kode error", () => {
  const cases: [string, string, (outline: Mutable) => void][] = [
    [
      "E_MISSING_FIELD",
      "gaps",
      (outline) => {
        delete outline.gaps;
      },
    ],
    [
      "E_SCHEMA",
      "concepts",
      (outline) => {
        outline.concepts = ["Fotosintesis", "Fotosintesis"];
      },
    ],
    [
      "E_TEXT_TOO_LONG",
      "title",
      (outline) => {
        outline.title = "x".repeat(81);
      },
    ],
    [
      "E_CHAPTER_COUNT",
      "chapters",
      (outline) => {
        outline.chapters = outline.chapters.slice(0, 2);
      },
    ],
    [
      "E_CAST_COUNT",
      "cast",
      (outline) => {
        outline.cast = [outline.cast[0]];
      },
    ],
    [
      "E_PLAYER_COUNT",
      "cast",
      (outline) => {
        outline.cast[2].role = "player";
      },
    ],
    [
      "E_NO_MENTOR",
      "cast",
      (outline) => {
        outline.cast[1].role = "npc";
      },
    ],
    [
      "E_UNKNOWN_CONCEPT",
      "chapters[0].concept",
      (outline) => {
        outline.chapters[0].concept = "Konsep Palsu";
      },
    ],
    [
      "E_DUPLICATE_ID",
      "cast[1].id",
      (outline) => {
        outline.cast[1].id = "char_mc";
      },
    ],
    [
      "E_UNKNOWN_ASSET",
      "cast[0].spriteId",
      (outline) => {
        outline.cast[0].spriteId = "char_hantu";
      },
    ],
  ];

  it.each(cases)("melaporkan %s pada %s", (code, path, mutate) => {
    const result = validateOutline(brokenOutline(mutate), {
      manifest: MANIFEST,
    });

    expectIssue(result, code, path);
  });

  it("melaporkan E_JSON_PARSE untuk string yang bukan JSON", () => {
    const result = validateOutline("bukan json");

    expectIssue(result, "E_JSON_PARSE", "");
  });

  it("mencatat gap sebagai warning tanpa memblokir", () => {
    const result = validateOutline(
      brokenOutline((outline) => {
        outline.gaps = ["Materi tidak menyebut contoh penerapan."];
      }),
      { manifest: MANIFEST },
    );

    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).toEqual(["W_GAP_RECORDED"]);
    expect(result.warnings[0].path).toBe("gaps");
  });
});

/* -------------------------------------------------------------------------- */
/* Warning dan bentuk hasil                                                   */
/* -------------------------------------------------------------------------- */

describe("warning", () => {
  it("warning tidak membuat ok false", () => {
    const result = validateChapter(CHAPTER, chapterContext());

    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).toContain("W_NO_CHALLENGE_IN_SCENE");
    expect(codes(result.warnings)).toContain("W_DIFFICULTY_SKEW");
  });

  const warningCases: [string, (draft: Mutable) => void][] = [
    [
      "W_CONCEPT_NOT_IN_CHAPTER",
      (draft) => {
        draft.challenges[0].conceptTag = "Klorofil";
      },
    ],
    [
      "W_SHORT_ANSWER_ONLY",
      (draft) => {
        draft.challenges[0] = {
          id: "chl_01_01",
          type: "short_answer",
          prompt: "Sebutkan satu hal yang dibutuhkan daun.",
          conceptTag: "Fotosintesis",
          difficulty: 2,
          explanation: "Daun membutuhkan cahaya matahari.",
          acceptedAnswers: ["cahaya matahari"],
        };
      },
    ],
    [
      "W_TRUE_FALSE_BIAS",
      (draft) => {
        draft.challenges[0] = {
          id: "chl_01_01",
          type: "true_false",
          prompt: "Daun membuat makanan sendiri.",
          conceptTag: "Fotosintesis",
          difficulty: 2,
          explanation: "Daun berfotosintesis dengan bantuan cahaya.",
          statement: "Daun membuat makanan sendiri.",
          correctAnswer: true,
        };
      },
    ],
    [
      "W_LONG_DIALOGUE_RUN",
      (draft) => {
        for (let index = 0; index < 7; index += 1) {
          draft.chapter.scenes[0].beats.push({
            type: "narration",
            text: `Kael mencatat pengamatan ke-${index + 1}.`,
          });
        }
      },
    ],
    [
      "W_TEXT_VARIANT_FLAG_UNSET",
      (draft) => {
        draft.chapter.scenes[1].beats[1].textVariants[0].when.flag =
          "flg_belum_diset";
      },
    ],
  ];

  it.each(warningCases)("melaporkan %s", (code, mutate) => {
    const result = validateChapter(brokenChapter(mutate), chapterContext());

    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).toContain(code);
  });

  it("menerima flag textVariants yang sudah di-set chapter sebelumnya", () => {
    const draft = brokenChapter((value) => {
      value.chapter.scenes[1].beats[1].textVariants[0].when.flag =
        "flg_dari_chapter_lalu";
    });

    const result = validateChapter(
      draft,
      chapterContext({ priorFlags: ["flg_dari_chapter_lalu"] }),
    );

    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).not.toContain("W_TEXT_VARIANT_FLAG_UNSET");
  });

  it("memperingatkan flag textVariants di dalam detour yang belum di-set", () => {
    const draft = brokenChapter((value) => {
      value.chapter.scenes[0].beats[2].onWrong.detour[1].textVariants = [
        {
          when: { flag: "flg_belum_diset", is: true },
          text: "Pak Bima memberi petunjuk singkat tanpa menyebut jawaban.",
        },
      ];
    });

    const result = validateChapter(draft, chapterContext());

    expect(result.ok).toBe(true);
    expect(codes(result.warnings)).toContain("W_TEXT_VARIANT_FLAG_UNSET");
  });

  it("tidak mengumpulkan warning saat ada error", () => {
    const result = validateChapter(
      brokenChapter((draft) => {
        draft.chapter.backgroundId = "bg_lab";
      }),
      chapterContext(),
    );

    expect(result.ok).toBe(false);
    expect(result.warnings).toEqual([]);
  });
});

describe("bentuk hasil", () => {
  it("membatasi 20 error dan mencatat sisanya", () => {
    const draft = brokenChapter((value) => {
      const scene = value.chapter.scenes[0];
      value.chapter.scenes = [0, 1, 2].map((index) => ({
        id: `sc_01_0${index + 1}`,
        beats: Array.from({ length: 10 }, (_, beat) => ({
          type: "narration",
          text: `${index}-${beat}-${"x".repeat(240)}`,
        })),
      }));
      value.challenges = [];
      return scene;
    });

    const result = validateChapter(draft, chapterContext());

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(20);
    expect(result.truncatedErrorCount).toBeGreaterThan(0);
  });

  it("mengembalikan hasil yang sama untuk input yang sama", () => {
    const first = validateChapter(CHAPTER, chapterContext());
    const second = validateChapter(CHAPTER, chapterContext());

    expect(first).toEqual(second);
    expect(validateOutline(OUTLINE, { manifest: MANIFEST })).toEqual(
      validateOutline(OUTLINE, { manifest: MANIFEST }),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Kemurnian                                                                  */
/* -------------------------------------------------------------------------- */

describe("input tidak diubah", () => {
  it("tidak mengubah input yang dibekukan", () => {
    const outline = deepFreeze(clone(OUTLINE));
    const chapter = deepFreeze(clone(CHAPTER));
    const context = deepFreeze(chapterContext());

    expect(() =>
      validateOutline(outline, { manifest: MANIFEST }),
    ).not.toThrow();
    expect(() => validateChapter(chapter, context)).not.toThrow();

    expect(outline).toEqual(OUTLINE);
    expect(chapter).toEqual(CHAPTER);
  });

  it("tidak mengubah input meskipun ada error", () => {
    const draft = brokenChapter((value) => {
      value.chapter.backgroundId = "bg_lab";
      value.challenges[0].correctOptionId = "opt_z";
    });
    const before = JSON.stringify(draft);

    validateChapter(draft, chapterContext());

    expect(JSON.stringify(draft)).toBe(before);
  });
});

/* -------------------------------------------------------------------------- */
/* Input rusak tidak melempar                                                 */
/* -------------------------------------------------------------------------- */

describe("input rusak", () => {
  const nasty: unknown[] = [
    undefined,
    null,
    0,
    "",
    "[]",
    "null",
    [],
    {},
    { chapter: null, challenges: [], continuity: null },
    { chapter: {}, challenges: {}, continuity: {} },
    { chapters: "bukan larik", cast: 3 },
  ];

  it.each(nasty.map((value, index) => [index, value] as const))(
    "validateOutline tidak melempar untuk input #%i",
    (_index, value) => {
      expect(() => validateOutline(value)).not.toThrow();
      expect(validateOutline(value).ok).toBe(false);
    },
  );

  it.each(nasty.map((value, index) => [index, value] as const))(
    "validateChapter tidak melempar untuk input #%i",
    (_index, value) => {
      expect(() => validateChapter(value, chapterContext())).not.toThrow();
      expect(validateChapter(value, chapterContext()).ok).toBe(false);
    },
  );
});
