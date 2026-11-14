import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  STORY_SCHEMA_VERSION,
  beatSchema,
  challengeSchema,
  storySchema,
} from "./schema";
import { EXPRESSIONS } from "./expression";

/**
 * Fixture resmi dipakai apa adanya, tanpa salinan yang bisa menyimpang:
 * `docs/02-data-model/story.example.json` harus lolos `storySchema`.
 *
 * Drift guard di bagian bawah membandingkan `storySchema` dengan
 * `docs/02-data-model/story.schema.json` (dijalankan lewat Ajv). Kalau salah
 * satu berubah sendirian, tes ini gagal.
 */

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const documentedSchema: object = JSON.parse(
  read("../../docs/02-data-model/story.schema.json"),
);
const rawExample: unknown = JSON.parse(
  read("../../docs/02-data-model/story.example.json"),
);

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateDocumented = ajv.compile(documentedSchema);
const documentedAccepts = (value: unknown) =>
  validateDocumented(value) === true;

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord => value as JsonRecord;
const asRecords = (value: unknown): JsonRecord[] => value as JsonRecord[];

const meta = (story: JsonRecord) => asRecord(story.meta);
const source = (story: JsonRecord) => asRecord(story.source);
const cast = (story: JsonRecord) => asRecords(story.cast);
const chapters = (story: JsonRecord) => asRecords(story.chapters);
const challenges = (story: JsonRecord) => asRecords(story.challenges);
const assetUsage = (story: JsonRecord) => asRecord(story.assetUsage);
const scenesOf = (chapter: JsonRecord) => asRecords(chapter.scenes);
const beatsOf = (scene: JsonRecord) => asRecords(scene.beats);

const cloneExample = (): JsonRecord => asRecord(structuredClone(rawExample));

/** Salin fixture, ubah satu bagian, kembalikan sebagai dokumen utuh. */
const withExample = (mutate: (story: JsonRecord) => void): JsonRecord => {
  const story = cloneExample();
  mutate(story);
  return story;
};

const LONG_TITLE = "A".repeat(81);
const SHORT_SYNOPSIS = "A".repeat(39);

describe("storySchema menerima cerita contoh", () => {
  it("lolos tanpa error", () => {
    const result = storySchema.safeParse(rawExample);

    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("tidak menambah atau membuang field", () => {
    // Tanpa default dan tanpa transform: hasil parse sama persis dengan input.
    expect(storySchema.parse(rawExample)).toEqual(rawExample);
  });

  it("memakai versi yang sama dengan schema dokumen", () => {
    const properties = asRecord(asRecord(documentedSchema).properties);
    const documentedVersion = asRecord(properties.schemaVersion).const;

    expect(STORY_SCHEMA_VERSION).toBe(documentedVersion);
  });
});

describe("field opsional", () => {
  it("menerima cerita tanpa points, hints, gaps, override scene, deskripsi, dan obrolan", () => {
    const story = withExample((draft) => {
      for (const challenge of challenges(draft)) delete challenge.points;
      delete source(draft).gaps;
      for (const chapter of chapters(draft)) {
        for (const scene of scenesOf(chapter)) {
          delete scene.title;
          delete scene.backgroundId;
          delete scene.musicId;
        }
      }
      for (const character of cast(draft)) {
        delete character.description;
        delete character.smallTalk;
      }
    });

    expect(storySchema.safeParse(story).success).toBe(true);
  });

  it("menerima points 0 dan deskripsi kosong", () => {
    const story = withExample((draft) => {
      challenges(draft)[0].points = 0;
      cast(draft)[0].description = "";
    });

    expect(storySchema.safeParse(story).success).toBe(true);
  });

  it("menerima beat transition yang bukan beat terakhir", () => {
    // Aturan "transition tidak boleh terakhir" milik validator, bukan schema.
    const story = withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[0])[1] = {
        type: "transition",
        effect: "fade",
      };
    });

    expect(storySchema.safeParse(story).success).toBe(true);
  });

  it("menerima override background dan musik di scene", () => {
    const story = withExample((draft) => {
      const scene = scenesOf(chapters(draft)[0])[0];
      scene.backgroundId = "bg_default";
      scene.musicId = "bgm_default";
    });

    expect(storySchema.safeParse(story).success).toBe(true);
  });

  it("menerima flags, scoring, maxAttempts, onWrong, dan textVariants", () => {
    const story = withExample((draft) => {
      draft.flags = [{ id: "flg_salah_hitung", default: false }];
      draft.scoring = { basis: "firstAttempt" };

      beatsOf(scenesOf(chapters(draft)[0])[1])[1].maxAttempts = 2;
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].onWrong = {
        setFlags: { flg_salah_hitung: true },
        retryQuestions: [
          "Coba baca ulang resepnya. Kalau 3 bagian tepung menjadi 9 cangkir, berapa bagian gula?",
        ],
        detour: [{ type: "narration", text: "Kael mengulang hitungannya." }],
      };

      beatsOf(scenesOf(chapters(draft)[0])[1])[0].textVariants = [
        {
          when: { flag: "flg_salah_hitung", is: true },
          text: "Tidak apa-apa, kita coba sekali lagi.",
        },
      ];
    });

    expect(storySchema.safeParse(story).success).toBe(true);
    expect(documentedAccepts(story)).toBe(true);
  });
});

type InvalidCase = { name: string; story: JsonRecord };

const invalidCases: InvalidCase[] = [
  {
    name: "field wajib hilang",
    story: withExample((draft) => {
      delete meta(draft).tone;
    }),
  },
  {
    name: "schemaVersion tidak dikenal",
    story: withExample((draft) => {
      draft.schemaVersion = "2.0";
    }),
  },
  {
    name: "tipe tantangan belum didukung",
    story: withExample((draft) => {
      challenges(draft)[2].type = "matching";
    }),
  },
  {
    name: "tipe beat tidak dikenal",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[0])[0].type = "monologue";
    }),
  },
  {
    name: "effect transition tidak dikenal",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[0])[1] = {
        type: "transition",
        effect: "slide",
      };
    }),
  },
  {
    name: "judul terlalu pendek",
    story: withExample((draft) => {
      meta(draft).title = "Ab";
    }),
  },
  {
    name: "judul terlalu panjang",
    story: withExample((draft) => {
      meta(draft).title = LONG_TITLE;
    }),
  },
  {
    name: "sinopsis terlalu pendek",
    story: withExample((draft) => {
      meta(draft).synopsis = SHORT_SYNOPSIS;
    }),
  },
  {
    name: "ringkasan chapter terlalu pendek",
    story: withExample((draft) => {
      chapters(draft)[0].summary = "Pendek.";
    }),
  },
  {
    name: "prompt tantangan terlalu pendek",
    story: withExample((draft) => {
      challenges(draft)[0].prompt = "Apa?";
    }),
  },
  {
    name: "penjelasan terlalu pendek",
    story: withExample((draft) => {
      challenges(draft)[0].explanation = "Pendek.";
    }),
  },
  {
    name: "points negatif",
    story: withExample((draft) => {
      challenges(draft)[0].points = -1;
    }),
  },
  {
    name: "points bukan bilangan bulat",
    story: withExample((draft) => {
      challenges(draft)[0].points = 7.5;
    }),
  },
  {
    name: "difficulty di luar 1..3",
    story: withExample((draft) => {
      challenges(draft)[0].difficulty = 4;
    }),
  },
  {
    name: "estimatedMinutes di luar 3..30",
    story: withExample((draft) => {
      meta(draft).estimatedMinutes = 2;
    }),
  },
  {
    name: "pageCount di luar 1..40",
    story: withExample((draft) => {
      source(draft).pageCount = 41;
    }),
  },
  {
    name: "hints lebih dari 2",
    story: withExample((draft) => {
      challenges(draft)[0].hints = ["satu", "dua", "tiga"];
    }),
  },
  {
    name: "opsi lebih dari 5",
    story: withExample((draft) => {
      const options = asRecords(challenges(draft)[0].options);
      options.push(
        { id: "opt_d", text: "Pengecoh lain" },
        { id: "opt_e", text: "Pengecoh lain lagi" },
        { id: "opt_f", text: "Pengecoh terakhir" },
      );
    }),
  },
  {
    name: "opsi kurang dari 2",
    story: withExample((draft) => {
      challenges(draft)[0].options = [{ id: "opt_a", text: "Hanya satu" }];
    }),
  },
  {
    name: "acceptedAnswers kosong",
    story: withExample((draft) => {
      challenges(draft)[4].acceptedAnswers = [];
    }),
  },
  {
    name: "correctOrder kurang dari 2",
    story: withExample((draft) => {
      challenges(draft)[2].correctOrder = ["itm_naik"];
    }),
  },
  {
    name: "bahasa bukan pola BCP-47",
    story: withExample((draft) => {
      meta(draft).language = "indonesia";
    }),
  },
  {
    name: "id karakter tidak berpola",
    story: withExample((draft) => {
      cast(draft)[0].id = "chara_nara";
    }),
  },
  {
    name: "role tidak dikenal",
    story: withExample((draft) => {
      cast(draft)[0].role = "hero";
    }),
  },
  {
    name: "field tambahan di tingkat atas",
    story: withExample((draft) => {
      draft.extra = true;
    }),
  },
  {
    name: "field tambahan di dalam meta",
    story: withExample((draft) => {
      meta(draft).extra = true;
    }),
  },
  {
    name: "konsep duplikat",
    story: withExample((draft) => {
      source(draft).concepts = ["Evaporasi", "Evaporasi"];
    }),
  },
  {
    name: "aset duplikat di assetUsage",
    story: withExample((draft) => {
      assetUsage(draft).music = ["bgm_default", "bgm_default"];
    }),
  },
  {
    name: "judul scene kosong",
    story: withExample((draft) => {
      scenesOf(chapters(draft)[0])[0].title = "";
    }),
  },
  {
    name: "cast lebih dari 10",
    story: withExample((draft) => {
      const characters = cast(draft);
      while (characters.length <= 10) {
        characters.push({
          ...characters[0],
          id: `char_tambahan_${characters.length}`,
        });
      }
    }),
  },
  {
    name: "chapter kurang dari 3",
    story: withExample((draft) => {
      draft.chapters = chapters(draft).slice(0, 2);
    }),
  },
  {
    name: "beat kurang dari 3",
    story: withExample((draft) => {
      const scene = scenesOf(chapters(draft)[0])[0];
      scene.beats = beatsOf(scene).slice(0, 2);
    }),
  },
  {
    name: "nama file kosong",
    story: withExample((draft) => {
      source(draft).fileName = "";
    }),
  },
  {
    name: "deskripsi karakter lebih dari 160",
    story: withExample((draft) => {
      cast(draft)[0].description = "A".repeat(161);
    }),
  },
  {
    name: "maxAttempts di luar 1..3",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].maxAttempts = 4;
    }),
  },
  {
    name: "maxAttempts nol",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].maxAttempts = 0;
    }),
  },
  {
    name: "retryQuestions lebih dari dua",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].onWrong = {
        retryQuestions: [
          "Soal ulang pertama yang cukup panjang.",
          "Soal ulang kedua yang cukup panjang.",
          "Soal ulang ketiga yang cukup panjang.",
        ],
      };
    }),
  },
  {
    name: "teks retry terlalu pendek",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].onWrong = {
        retryQuestions: ["Apa?"],
      };
    }),
  },
  {
    name: "flag dengan id tidak berpola",
    story: withExample((draft) => {
      draft.flags = [{ id: "salah_hitung", default: false }];
    }),
  },
  {
    name: "textVariant tanpa is",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[0].textVariants = [
        { when: { flag: "flg_salah_hitung" }, text: "Halo." },
      ];
    }),
  },
  {
    name: "textVariants kosong",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[0].textVariants = [];
    }),
  },
  {
    name: "detour berisi challenge",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].onWrong = {
        detour: [{ type: "challenge", challengeId: "chl_01_01" }],
      };
    }),
  },
  {
    name: "field tambahan di onWrong",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[1])[1].onWrong = {
        detourNext: "chl_01_01",
      };
    }),
  },
  {
    name: "basis scoring tidak dikenal",
    story: withExample((draft) => {
      draft.scoring = { basis: "lastAttempt" };
    }),
  },
  {
    name: "narration memakai expression tanpa speakerId",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[0])[1] = {
        type: "narration",
        text: "Angin berhenti sejenak.",
        expression: "happy",
      };
    }),
  },
  {
    name: "ekspresi potret tidak dikenal",
    story: withExample((draft) => {
      beatsOf(scenesOf(chapters(draft)[0])[0])[1] = {
        type: "dialogue",
        speakerId: "char_npc_1",
        text: "Halo, Nara!",
        expression: "excited",
      };
    }),
  },
];

describe("kasus tidak valid ditolak", () => {
  it.each(invalidCases)("$name ditolak storySchema", ({ story }) => {
    expect(storySchema.safeParse(story).success).toBe(false);
  });

  it.each(invalidCases)("$name juga ditolak story.schema.json", ({ story }) => {
    expect(documentedAccepts(story)).toBe(false);
  });
});

describe("tipe turunan", () => {
  it("menolak tipe tantangan di luar empat tipe MVP", () => {
    const challenge = {
      ...asRecord(asRecords(asRecord(rawExample).challenges)[2]),
      type: "matching",
    };

    expect(challengeSchema.safeParse(challenge).success).toBe(false);
  });

  it("menolak beat yang tidak dikenal", () => {
    expect(beatSchema.safeParse({ type: "monologue" }).success).toBe(false);
  });
});

describe("batas panjang dihitung per code point", () => {
  const title = (value: string) =>
    withExample((draft) => {
      meta(draft).title = value;
    });

  it("judul 3 emoji diterima, sama seperti JSON Schema", () => {
    const story = title("🌊🌊🌊");

    expect(storySchema.safeParse(story).success).toBe(true);
    expect(documentedAccepts(story)).toBe(true);
  });

  it("judul 81 emoji ditolak, sama seperti JSON Schema", () => {
    const story = title("🌊".repeat(81));

    expect(storySchema.safeParse(story).success).toBe(false);
    expect(documentedAccepts(story)).toBe(false);
  });
});

/**
 * Keunikan id objek (`E_DUPLICATE_ID`) milik validator semantik, bukan schema.
 * Tes ini mengunci pembagian itu: kalau suatu saat schema ikut menolak, tes
 * gagal dan pemiliknya harus pindah secara sadar.
 */
describe("keunikan id objek bukan urusan schema", () => {
  it("schema menerima id ganda, validator yang menolaknya", () => {
    const story = withExample((draft) => {
      cast(draft)[1].id = cast(draft)[0].id;
      chapters(draft)[1].id = chapters(draft)[0].id;
      challenges(draft)[1].id = challenges(draft)[0].id;
    });

    expect(storySchema.safeParse(story).success).toBe(true);
    expect(documentedAccepts(story)).toBe(true);
  });
});

describe("drift guard: storySchema vs story.schema.json", () => {
  const validCases: InvalidCase[] = [
    { name: "cerita contoh", story: cloneExample() },
    {
      name: "tanpa field opsional",
      story: withExample((draft) => {
        for (const challenge of challenges(draft)) delete challenge.points;
        delete source(draft).gaps;
      }),
    },
    ...invalidCases,
  ];

  it.each(validCases)("$name: keputusan kedua schema sama", ({ story }) => {
    expect(storySchema.safeParse(story).success).toBe(documentedAccepts(story));
  });
});

describe("drift guard: daftar ekspresi potret", () => {
  it("$defs.expression sama dengan EXPRESSIONS di kode", () => {
    const defs = asRecord(asRecord(documentedSchema).$defs);
    expect(asRecord(defs.expression).enum).toEqual([...EXPRESSIONS]);
  });
});
