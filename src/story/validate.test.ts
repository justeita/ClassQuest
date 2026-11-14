import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { toAssetManifest } from "../assets/manifest";
import type { Story } from "./schema";
import {
  ERROR_CODES,
  WARNING_CODES,
  type AssetManifest,
  type ValidationIssue,
  validateStory,
} from "./validate";

/**
 * Kontrak validator: `docs/02-data-model/validation-rules.md`.
 *
 * Fixture rusak ada di `src/story/__fixtures__/`, satu berkas per kode error,
 * dan masing-masing hanya berbeda satu cacat dari `story.example.json`.
 */

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const EXAMPLE_PATH = "../../docs/02-data-model/story.example.json";

const exampleJson = read(EXAMPLE_PATH);
const example: Story = JSON.parse(exampleJson);
const demoStory: unknown = JSON.parse(read("../game/fixture/demo-story.json"));

/**
 * Manifest asli dari `src/assets/manifest.ts` (sumber kebenaran id aset).
 * Validator hanya butuh `id` dan `kind`, jadi `toAssetManifest()` cukup.
 */
const manifest: AssetManifest = toAssetManifest();
const PAGE_COUNT = 6;

const options = { manifest, pageCount: PAGE_COUNT };

const readFixture = (name: string) => read(`./__fixtures__/${name}.json`);

const codes = (issues: readonly ValidationIssue[]) =>
  issues.map((issue) => issue.code);

const pathsOf = (issues: readonly ValidationIssue[], code: string) =>
  issues.filter((issue) => issue.code === code).map((issue) => issue.path);

const clone = <T>(value: T): T => structuredClone(value);

/** Salin contoh, ubah satu bagian, lalu validasi. */
const validateVariant = (mutate: (story: Story) => void) => {
  const story = clone(example);
  mutate(story);
  return validateStory(story, options);
};

/**
 * Variasi yang hanya valid setelah schema lolos: cacatnya tidak bisa ditaruh
 * di fixture JSON karena akan ditolak lapis struktural lebih dulu, sehingga
 * dirakit di sini dari cerita contoh.
 */
describe("aturan yang dirakit dari cerita contoh", () => {
  it("menolak dua karakter bermain sebagai player", () => {
    const result = validateVariant((story) => {
      story.cast[2].role = "player";
    });

    expect(codes(result.errors)).toEqual(["E_PLAYER_COUNT"]);
    expect(result.errors[0].path).toBe("cast");
  });

  it("menolak id opsi yang berulang di dalam satu tantangan", () => {
    const result = validateVariant((story) => {
      const challenge = story.challenges[0];
      if (challenge.type !== "multiple_choice") throw new Error("fixture");
      challenge.options[1].id = challenge.options[0].id;
    });

    expect(codes(result.errors)).toEqual(["E_DUPLICATE_ID"]);
    expect(result.errors[0].path).toBe("challenges[0].options[1].id");
  });

  it("menolak id item yang berulang di dalam satu tantangan", () => {
    const result = validateVariant((story) => {
      const challenge = story.challenges[2];
      if (challenge.type !== "ordering") throw new Error("fixture");
      challenge.items[1].id = challenge.items[0].id;
    });

    expect(pathsOf(result.errors, "E_DUPLICATE_ID")).toEqual([
      "challenges[2].items[1].id",
    ]);
  });

  it("menolak conceptTag yang tidak ada di source.concepts", () => {
    const result = validateVariant((story) => {
      story.challenges[0].conceptTag = "Presipitasi";
    });

    expect(codes(result.errors)).toEqual(["E_UNKNOWN_CONCEPT"]);
    expect(result.errors[0].path).toBe("challenges[0].conceptTag");
  });

  it("menolak aset karangan di spriteId, musicId, dan assetUsage", () => {
    const result = validateVariant((story) => {
      story.cast[0].spriteId = "char_hantu";
      story.chapters[0].musicId = "bgm_hantu";
      story.chapters[0].scenes[0].backgroundId = "bg_tidak_ada";
    });

    expect(pathsOf(result.errors, "E_UNKNOWN_ASSET")).toEqual([
      "chapters[0].musicId",
      "chapters[0].scenes[0].backgroundId",
      "cast[0].spriteId",
    ]);
    expect(result.ok).toBe(false);
  });

  it("menerima setiap id aset yang ada di manifest", () => {
    // Validator hanya memeriksa background, music, dan sprite karakter;
    // `sfx`/`ui` tidak dirujuk `Story`.
    const referenced = manifest.filter(
      (asset) => asset.kind !== "sfx" && asset.kind !== "ui",
    );

    for (const asset of referenced) {
      const result = validateVariant((story) => {
        if (asset.kind === "background") {
          story.chapters[0].scenes[0].backgroundId = asset.id;
        } else if (asset.kind === "music") {
          story.chapters[0].musicId = asset.id;
        } else {
          story.cast[0].spriteId = asset.id;
        }
      });

      expect(codes(result.errors), asset.id).not.toContain("E_UNKNOWN_ASSET");
    }
  });

  it("menolak flag textVariants yang tidak dideklarasikan", () => {
    const result = validateVariant((story) => {
      const beat = story.chapters[0].scenes[1].beats[2];
      if (beat.type !== "dialogue") throw new Error("fixture");
      beat.textVariants = [
        {
          when: { flag: "flg_tak_ada", is: true },
          text: "Teks alternatif yang cukup panjang.",
        },
      ];
    });

    expect(codes(result.errors)).toEqual(["E_FLAG_UNDECLARED"]);
    expect(result.errors[0].path).toBe(
      "chapters[0].scenes[1].beats[2].textVariants[0].when.flag",
    );
  });

  it("menolak {{jawaban}} sebelum tantangan pertama", () => {
    const result = validateVariant((story) => {
      const beat = story.chapters[0].scenes[0].beats[0];
      if (beat.type !== "narration") throw new Error("fixture");
      beat.text = "Kael masih ingat jawabannya tadi: {{jawaban}}.";
    });

    expect(codes(result.errors)).toEqual(["E_JAWABAN_WITHOUT_CHALLENGE"]);
    expect(result.errors[0].path).toBe("chapters[0].scenes[0].beats[0].text");
    expect(result.errors[0].hint).toContain("{{jawaban}}");
  });

  it("menerima {{jawaban}} pada dialog setelah tantangan", () => {
    const result = validateVariant((story) => {
      const beat = story.chapters[0].scenes[1].beats[2];
      if (beat.type !== "dialogue") throw new Error("fixture");
      beat.text = "Kau menjawab {{jawaban}}. Coba hitung sekali lagi.";
    });

    expect(codes(result.errors)).not.toContain("E_JAWABAN_WITHOUT_CHALLENGE");
    expect(result.ok).toBe(true);
  });

  it("menolak speaker detour yang tidak ada di cast", () => {
    const result = validateVariant((story) => {
      const beat = story.chapters[0].scenes[1].beats[1];
      if (beat.type !== "challenge") throw new Error("fixture");
      beat.onWrong = {
        detour: [
          {
            type: "dialogue",
            speakerId: "char_hantu",
            text: "Aku tidak ada di daftar cast.",
          },
        ],
      };
    });

    expect(codes(result.errors)).toEqual(["E_UNKNOWN_SPEAKER"]);
    expect(result.errors[0].path).toBe(
      "chapters[0].scenes[1].beats[1].onWrong.detour[0].speakerId",
    );
  });
});

/**
 * `challenges[]` adalah `oneOf` empat tipe tantangan. Ajv melaporkan error dari
 * keempat cabang sekaligus; validator harus meringkasnya jadi satu error yang
 * menunjuk akar masalahnya supaya guru tidak melihat empat pesan untuk satu
 * cacat.
 */
describe("error tantangan tidak dilaporkan empat kali", () => {
  it("unknown type hanya menghasilkan satu error di challenges[0].type", () => {
    const result = validateVariant((story) => {
      (story.challenges[0] as { type: string }).type = "esai_bebas";
    });

    expect(codes(result.errors)).toEqual(["E_SCHEMA"]);
    expect(result.errors[0].path).toBe("challenges[0].type");
  });

  it("type yang hilang hanya menghasilkan satu E_MISSING_FIELD", () => {
    const result = validateVariant((story) => {
      delete (story.challenges[0] as { type?: string }).type;
    });

    expect(codes(result.errors)).toEqual(["E_MISSING_FIELD"]);
    expect(result.errors[0].path).toBe("challenges[0].type");
  });

  it("field asing di dalam tipe yang cocok hanya dilaporkan sekali", () => {
    const result = validateVariant((story) => {
      const challenge = story.challenges[0] as Record<string, unknown>;
      challenge.isCorrect = true;
    });

    expect(codes(result.errors)).toEqual(["E_SCHEMA"]);
    expect(result.errors[0].path).toBe("challenges[0].isCorrect");
  });

  it("tantangan yang bukan objek hanya menghasilkan satu error", () => {
    const result = validateVariant((story) => {
      (story.challenges as unknown[])[0] = "halo";
    });

    expect(codes(result.errors)).toEqual(["E_SCHEMA"]);
    expect(result.errors[0].path).toBe("challenges[0]");
  });
});

describe("manifest dan pageCount opsional", () => {
  it("melewati pemeriksaan aset bila manifest tidak diberikan", () => {
    const result = validateStory(example, { pageCount: PAGE_COUNT });

    expect(result.ok).toBe(true);
    expect(result.skippedChecks).toEqual(["asset-existence"]);
  });

  it("melewati pemeriksaan pageCount bila pageCount tidak diberikan", () => {
    const result = validateStory(example, { manifest });

    expect(result.ok).toBe(true);
    expect(result.skippedChecks).toEqual(["page-count"]);
  });

  it("tidak punya pemeriksaan yang dilewati bila keduanya diberikan", () => {
    const result = validateStory(example, options);

    expect(result.skippedChecks).toEqual([]);
  });

  it("menolak source.pageCount yang berbeda dengan jumlah halaman asli", () => {
    const result = validateStory(example, { ...options, pageCount: 9 });

    expect(codes(result.errors)).toEqual(["E_PAGE_COUNT_MISMATCH"]);
    expect(result.errors[0].path).toBe("source.pageCount");
  });
});

describe("bentuk input", () => {
  it("menerima string JSON", () => {
    const fromString = validateStory(exampleJson, options);
    const fromObject = validateStory(example, options);

    expect(fromString).toEqual(fromObject);
  });

  it("menolak string yang bukan JSON dengan E_JSON_PARSE", () => {
    const result = validateStory("tentu saja ini bukan json", options);

    expect(codes(result.errors)).toEqual(["E_JSON_PARSE"]);
    expect(result.story).toBeNull();
  });

  it("menolak JSON valid yang bukan objek cerita", () => {
    const result = validateStory("[]", options);

    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toEqual(["E_SCHEMA"]);
  });
});

describe("cerita contoh", () => {
  it("lolos tanpa error dan tanpa pemeriksaan yang dilewati", () => {
    const result = validateStory(example, options);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.skippedChecks).toEqual([]);
    expect(result.truncatedErrorCount).toBe(0);
  });

  it("memberi warning, dan warning itu tidak memblokir", () => {
    const result = validateStory(example, options);

    expect(result.warnings.length).toBeGreaterThan(0);
    for (const warning of result.warnings) {
      expect(warning.severity).toBe("warning");
      expect(warning.code.startsWith("W_")).toBe(true);
      expect(WARNING_CODES).toContain(warning.code);
    }
    expect(result.ok).toBe(true);
  });

  it("mengembalikan cerita ternormalisasi yang sama dengan contoh", () => {
    const result = validateStory(example, options);

    // Satu-satunya perbedaan yang diizinkan: `assetUsage` diurutkan, dan
    // `points` yang hilang diisi 10 (contoh sudah mengisinya).
    expect(result.story).toEqual({
      ...example,
      assetUsage: {
        backgrounds: [...example.assetUsage.backgrounds].sort(),
        music: [...example.assetUsage.music].sort(),
        sprites: [...example.assetUsage.sprites].sort(),
      },
    });
    expect(result.story).not.toBe(example);
  });

  it("tidak mengubah input sama sekali", () => {
    const story = clone(example);
    deepFreeze(story);

    const result = validateStory(story, options);

    expect(result.ok).toBe(true);
    expect(story).toEqual(example);
  });
});

describe("fixture percabangan valid", () => {
  it("lolos dan mempertahankan field percabangan", () => {
    const result = validateStory(readFixture("branching"), options);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);

    const story = result.story;
    expect(story?.flags).toEqual([
      { id: "flg_salah_hitung", default: false },
      { id: "flg_sudah_dibantu", default: false },
    ]);
    expect(story?.scoring).toEqual({ basis: "firstAttempt" });

    const challenge = story?.chapters[0].scenes[1].beats[1];
    expect(challenge?.type).toBe("challenge");
    if (challenge?.type !== "challenge") throw new Error("fixture");
    expect(challenge.maxAttempts).toBe(2);
    expect(challenge.onWrong?.setFlags).toEqual({
      flg_salah_hitung: true,
      flg_sudah_dibantu: true,
    });
    expect(challenge.onWrong?.retryQuestions).toHaveLength(1);
    expect(challenge.onWrong?.detour).toHaveLength(2);

    const dialogue = story?.chapters[0].scenes[1].beats[2];
    expect(dialogue?.type).toBe("dialogue");
    if (dialogue?.type !== "dialogue") throw new Error("fixture");
    expect(dialogue.textVariants).toHaveLength(2);
  });
});

describe("normalisasi", () => {
  it("merapikan spasi dan membuang karakter kontrol", () => {
    const padded = clone(example);
    padded.chapters[0].scenes[0].beats[0] = {
      type: "narration",
      text: "  Bel  berbunyi.\tDi depan kelas.  ",
    };

    const result = validateStory(padded, options);
    const beat = result.story?.chapters[0].scenes[0].beats[0];

    expect(beat).toEqual({
      type: "narration",
      text: "Bel berbunyi. Di depan kelas.",
    });
  });

  it("mengisi points yang hilang dengan 10", () => {
    const withoutPoints = clone(example);
    delete withoutPoints.challenges[0].points;

    const result = validateStory(withoutPoints, options);

    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.story?.challenges[0].points).toBe(10);
  });

  it("mengurutkan assetUsage", () => {
    const unsorted = clone(example);
    unsorted.assetUsage.sprites = [...example.assetUsage.sprites].reverse();

    const result = validateStory(unsorted, options);

    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.story?.assetUsage.sprites).toEqual(
      [...example.assetUsage.sprites].sort(),
    );
  });

  /**
   * Dokumen bilang duplikat `assetUsage` boleh dibuang saat normalisasi, tetapi
   * `story.schema.json` memasang `uniqueItems`, dan lapis struktural berjalan
   * lebih dulu. Test ini mengunci perilaku schema sampai docs diselaraskan.
   */
  it("menolak duplikat assetUsage di lapis struktural, bukan mendiamkannya", () => {
    const duplicated = clone(example);
    duplicated.assetUsage.music = ["bgm_default", "bgm_default"];

    const result = validateStory(duplicated, options);

    expect(result.ok).toBe(false);
    expect(codes(result.errors)).toEqual(["E_SCHEMA"]);
    expect(result.errors[0].path).toBe("assetUsage.music");
  });

  it("tidak memberi cerita ternormalisasi saat masih ada error", () => {
    const result = validateStory({ schemaVersion: "1.0" }, options);

    expect(result.ok).toBe(false);
    expect(result.story).toBeNull();
  });
});

describe("batas dan pemotongan error", () => {
  it("maksimal 20 error, sisanya dihitung di truncatedErrorCount", () => {
    const messy = clone(example);
    messy.meta.title = "";
    messy.meta.subject = "";
    messy.meta.gradeLevel = "";
    messy.meta.tone = "";
    messy.meta.synopsis = "";
    messy.source.fileName = "";
    messy.source.concepts = [""];
    for (const character of messy.cast) character.name = "";
    for (const chapter of messy.chapters) {
      chapter.title = "";
      chapter.summary = "";
      for (const scene of chapter.scenes) {
        scene.title = "";
        for (const beat of scene.beats) {
          if (beat.type === "narration" || beat.type === "dialogue") {
            beat.text = "";
          }
        }
      }
    }

    const result = validateStory(messy, options);

    expect(result.errors.length).toBe(20);
    expect(result.truncatedErrorCount).toBeGreaterThan(0);
  });

  it("melaporkan banyak error sekaligus, bukan berhenti di yang pertama", () => {
    const result = validateVariant((story) => {
      story.chapters[0].concept = "Presipitasi";
      story.cast[1].role = "npc";
    });

    expect(codes(result.errors).sort()).toEqual([
      "E_NO_MENTOR",
      "E_UNKNOWN_CONCEPT",
    ]);
  });
});

describe("setiap kode E_* punya fixture", () => {
  const fixtureCases: {
    fixture: string;
    code: string;
    path: string;
  }[] = [
    { fixture: "json-parse", code: "E_JSON_PARSE", path: "" },
    { fixture: "schema", code: "E_SCHEMA", path: "meta.estimatedMinutes" },
    {
      fixture: "schema-version",
      code: "E_SCHEMA_VERSION",
      path: "schemaVersion",
    },
    {
      fixture: "missing-field",
      code: "E_MISSING_FIELD",
      path: "source.fileName",
    },
    { fixture: "text-too-long", code: "E_TEXT_TOO_LONG", path: "meta.title" },
    { fixture: "text-empty", code: "E_TEXT_EMPTY", path: "meta.tone" },
    { fixture: "cast-count", code: "E_CAST_COUNT", path: "cast" },
    { fixture: "chapter-count", code: "E_CHAPTER_COUNT", path: "chapters" },
    {
      fixture: "scene-count",
      code: "E_SCENE_COUNT",
      path: "chapters[0].scenes",
    },
    {
      fixture: "beat-count",
      code: "E_BEAT_COUNT",
      path: "chapters[0].scenes[0].beats",
    },
    {
      fixture: "option-count",
      code: "E_OPTION_COUNT",
      path: "challenges[0].options",
    },
    {
      fixture: "empty-answers",
      code: "E_EMPTY_ANSWERS",
      path: "challenges[4].acceptedAnswers",
    },
    {
      fixture: "duplicate-id",
      code: "E_DUPLICATE_ID",
      path: "chapters[1].scenes[0].id",
    },
    {
      fixture: "chapter-no-challenge",
      code: "E_CHAPTER_NO_CHALLENGE",
      path: "chapters[0]",
    },
    {
      fixture: "orphan-challenge",
      code: "E_ORPHAN_CHALLENGE",
      path: "challenges[1].id",
    },
    {
      fixture: "dangling-challenge",
      code: "E_DANGLING_CHALLENGE",
      path: "chapters[2].scenes[2].beats[0].challengeId",
    },
    {
      fixture: "transition-last",
      code: "E_TRANSITION_LAST",
      path: "chapters[0].scenes[0].beats[3]",
    },
    {
      fixture: "unknown-asset",
      code: "E_UNKNOWN_ASSET",
      path: "chapters[0].backgroundId",
    },
    {
      fixture: "unknown-speaker",
      code: "E_UNKNOWN_SPEAKER",
      path: "chapters[0].scenes[0].beats[1].speakerId",
    },
    {
      fixture: "unknown-concept",
      code: "E_UNKNOWN_CONCEPT",
      path: "chapters[0].concept",
    },
    {
      fixture: "asset-usage-mismatch",
      code: "E_ASSET_USAGE_MISMATCH",
      path: "assetUsage.backgrounds",
    },
    { fixture: "player-count", code: "E_PLAYER_COUNT", path: "cast" },
    { fixture: "no-mentor", code: "E_NO_MENTOR", path: "cast" },
    {
      fixture: "correct-option",
      code: "E_CORRECT_OPTION",
      path: "challenges[0].correctOptionId",
    },
    {
      fixture: "order-permutation",
      code: "E_ORDER_PERMUTATION",
      path: "challenges[2].correctOrder",
    },
    {
      fixture: "duplicate-challenge-ref",
      code: "E_DUPLICATE_CHALLENGE_REF",
      path: "chapters[0].scenes[1].beats[1].challengeId",
    },
    {
      fixture: "retry-count",
      code: "E_RETRY_COUNT",
      path: "chapters[0].scenes[1].beats[1].onWrong.retryQuestions",
    },
    {
      fixture: "flag-undeclared",
      code: "E_FLAG_UNDECLARED",
      path: "chapters[0].scenes[1].beats[1].onWrong.setFlags.flg_belum_dideklarasikan",
    },
    {
      fixture: "detour-too-long",
      code: "E_DETOUR_TOO_LONG",
      path: "chapters[0].scenes[1].beats[1].onWrong.detour",
    },
  ];

  it.each(
    fixtureCases.map(
      (testCase) => [testCase.fixture, testCase.code, testCase.path] as const,
    ),
  )("%s.json ditolak dengan %s di %s", (fixture, code, path) => {
    const result = validateStory(readFixture(fixture), options);

    expect([...new Set(codes(result.errors))]).toEqual([code]);
    expect(result.errors[0].path).toBe(path);
    expect(result.errors[0].severity).toBe("error");
    expect(result.story).toBeNull();
  });

  it("setiap kode E_* yang diekspor validator punya fixture atau test", () => {
    const covered = new Set(fixtureCases.map((testCase) => testCase.code));
    // E_PAGE_COUNT_MISMATCH tidak bisa jadi cacat fixture: ia hanya muncul
    // ketika opsi `pageCount` diberikan. Test-nya ada di bagian manifest/pageCount.
    covered.add("E_PAGE_COUNT_MISMATCH");
    // E_ONWRONG_WITHOUT_ATTEMPTS hanya muncul dari `validateChapter`
    // (validate-parts.test.ts): `retryQuestions` tanpa `maxAttempts` 2/3.
    // Cerita penuh tidak memeriksanya lagi karena chapter sudah disaring lebih
    // dulu.
    covered.add("E_ONWRONG_WITHOUT_ATTEMPTS");
    // E_JAWABAN_WITHOUT_CHALLENGE diuji lewat mutasi cerita contoh di atas,
    // bukan fixture tersendiri.
    covered.add("E_JAWABAN_WITHOUT_CHALLENGE");

    expect(ERROR_CODES.filter((code) => !covered.has(code))).toEqual([]);
  });
});

describe("isi pesan", () => {
  const allIssues = () => {
    const issues: ValidationIssue[] = [];
    for (const testCase of [
      "schema.json",
      "missing-field.json",
      "text-too-long.json",
      "unknown-asset.json",
      "unknown-speaker.json",
      "chapter-no-challenge.json",
      "dangling-challenge.json",
      "duplicate-id.json",
      "correct-option.json",
      "order-permutation.json",
      "schema-version.json",
      "json-parse.json",
      "warnings.json",
    ]) {
      const result = validateStory(
        readFixture(testCase.replace(".json", "")),
        options,
      );
      issues.push(...result.errors, ...result.warnings);
    }
    return issues;
  };

  it("memakai bahasa Indonesia tanpa istilah kode", () => {
    for (const issue of allIssues()) {
      expect(issue.message).not.toMatch(/^E_|^W_/);
      expect(issue.message).toMatch(/[a-z]/);
    }
  });

  it("punya path dan pesan untuk setiap error", () => {
    for (const issue of allIssues()) {
      expect(issue.path).toBeTypeOf("string");
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });

  it("error semantik selalu punya hint untuk repair", () => {
    const result = validateStory(readFixture("unknown-asset"), options);

    for (const error of result.errors) {
      expect(error.hint).toBeTypeOf("string");
      expect(error.hint?.length).toBeGreaterThan(0);
    }
  });
});

describe("warning", () => {
  it("fixture warning valid, hanya berisi warning yang diharapkan", () => {
    const result = validateStory(readFixture("warnings"), options);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect([...new Set(codes(result.warnings))].sort()).toEqual([
      "W_CONCEPT_NOT_IN_CHAPTER",
      "W_DIALOGUE_NO_EXPRESSION",
      "W_DIFFICULTY_SKEW",
      "W_GAP_RECORDED",
      "W_LONG_DIALOGUE_RUN",
      "W_NO_CHALLENGE_IN_SCENE",
      "W_SHORT_ANSWER_ONLY",
      "W_TRUE_FALSE_BIAS",
    ]);
  });

  it("menunjuk path yang berguna untuk tiap warning", () => {
    const result = validateStory(readFixture("warnings"), options);

    expect(pathsOf(result.warnings, "W_CONCEPT_NOT_IN_CHAPTER")).toEqual([
      "challenges[2].conceptTag",
    ]);
    expect(pathsOf(result.warnings, "W_GAP_RECORDED")).toEqual(["source.gaps"]);
    expect(pathsOf(result.warnings, "W_SHORT_ANSWER_ONLY")).toEqual([
      "chapters[2]",
    ]);
    expect(pathsOf(result.warnings, "W_DIFFICULTY_SKEW")).toEqual([
      "challenges",
    ]);
    expect(pathsOf(result.warnings, "W_TRUE_FALSE_BIAS")).toEqual([
      "challenges",
    ]);
    expect(pathsOf(result.warnings, "W_NO_CHALLENGE_IN_SCENE")).toContain(
      "chapters[0].scenes[0]",
    );
    expect(pathsOf(result.warnings, "W_LONG_DIALOGUE_RUN")).toEqual([
      "chapters[0].scenes[0].beats[6]",
      "chapters[1].scenes[2].beats[3]",
      "chapters[2].scenes[2].beats[3]",
    ]);
    expect(pathsOf(result.warnings, "W_DIALOGUE_NO_EXPRESSION")).toEqual([
      "chapters[0]",
      "chapters[1]",
      "chapters[2]",
    ]);
  });

  it("tidak melaporkan warning saat cerita masih punya error", () => {
    const result = validateStory(readFixture("unknown-asset"), options);

    expect(result.warnings).toEqual([]);
  });

  it("semua kode W_* diekspor dan terpakai di suatu tempat", () => {
    const fromFixture = new Set(
      codes(validateStory(readFixture("warnings"), options).warnings),
    );

    // W_TEXT_VARIANT_FLAG_UNSET hanya muncul dari `validateChapter`
    // (validate-parts.test.ts), bukan dari validator cerita penuh.
    const chapterOnly = new Set(["W_TEXT_VARIANT_FLAG_UNSET"]);

    expect(
      WARNING_CODES.filter(
        (code) => !fromFixture.has(code) && !chapterOnly.has(code),
      ),
    ).toEqual([]);
  });
});

describe("fixture demo game", () => {
  it("hasil validator untuk src/game/fixture/demo-story.json dicatat", () => {
    const result = validateStory(demoStory, options);

    // Berkas ini tidak diubah oleh tugas validator; test hanya menjaga hasilnya
    // tidak berubah diam-diam.
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    // Tiga `W_LONG_DIALOGUE_RUN` berasal dari isi fixture (adegan pesta panen
    // punya lebih dari 6 beat dialog/narasi berturut-turut), bukan dari
    // validator. Kalau fixture dirapikan, daftar ini ikut menyusut.
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "W_NO_CHALLENGE_IN_SCENE",
      "W_LONG_DIALOGUE_RUN",
      "W_LONG_DIALOGUE_RUN",
      "W_LONG_DIALOGUE_RUN",
    ]);
  });
});

/** Bekukan objek secara mendalam supaya mutasi gagal keras di mode strict. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}
