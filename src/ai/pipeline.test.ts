import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toAssetManifest } from "../assets/manifest";
import type { Story } from "../story/schema";
import { validateStory } from "../story/validate";
import { MockProvider, type MockProviderStep } from "./mock-provider";
import {
  assemble,
  generateStory,
  MAX_LLM_CALLS_PER_STORY,
  MAX_REPAIRS_PER_STORY,
  STAGE_PROGRESS,
  type GenerateStoryResult,
  type PipelineMeta,
  type ProgressEvent,
} from "./pipeline";
import type { LlmProvider, LlmResponse } from "./provider";

/**
 * Kontrak pipeline: `docs/03-ai-pipeline/pipeline.md`,
 * `validation-and-repair.md`, `docs/06-backend/jobs-and-limits.md`, dan
 * `provider-setup.md`.
 *
 * Tidak ada jaringan: `fetch` digagalkan di setiap test. Provider mock membaca
 * fixture dari `src/ai/__fixtures__/outputs/`.
 */

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "outputs",
);

const fixture = (path: string): string =>
  readFileSync(join(FIXTURES, path), "utf8");

const json = <T>(path: string): T => JSON.parse(fixture(path)) as T;

const MANIFEST = toAssetManifest();

const PAGES = [
  "Halaman satu menjelaskan fotosintesis dan daun hijau di depan kelas.",
  "Halaman dua menjelaskan klorofil yang menangkap cahaya matahari.",
  "Halaman tiga menjelaskan glukosa sebagai hasil fotosintesis.",
];

const META: PipelineMeta = {
  id: "st_test_pipeline",
  fileName: "materi.pdf",
  pageCount: 3,
  title: "Rahasia Daun Hijau",
  subject: "IPA",
  gradeLevel: "7",
  language: "id",
  tone: "hangat dan penasaran",
};

const mock = (...steps: MockProviderStep[]) =>
  new MockProvider({ sequence: steps });

type CountingProvider = LlmProvider & { readonly calls: number };

/** Provider skrip untuk kasus batas yang tidak bisa diwakili fixture statis. */
const scripted = (respond: (call: number) => string): CountingProvider => {
  let calls = 0;

  return {
    get calls() {
      return calls;
    },
    async complete(): Promise<LlmResponse> {
      calls += 1;
      return {
        text: respond(calls),
        usage: { input: 0, output: 0 },
        model: "mock",
      };
    },
  };
};

const run = (
  provider: LlmProvider,
  overrides: Partial<Parameters<typeof generateStory>[0]> = {},
) =>
  generateStory({
    provider,
    pages: PAGES,
    manifest: MANIFEST,
    meta: META,
    clock: () => 0,
    ...overrides,
  });

/** Provider yang merekam `user` tiap panggilan, untuk memeriksa isi prompt. */
const capturing = (): LlmProvider & { readonly prompts: string[] } => {
  const prompts: string[] = [];
  const responses = [
    fixture("outline/valid.json"),
    fixture("chapter/valid.json"),
    fixture("chapter/ch_02.json"),
    fixture("chapter/ch_03.json"),
  ];
  let call = 0;

  return {
    get prompts() {
      return prompts;
    },
    async complete(request): Promise<LlmResponse> {
      prompts.push(request.user);
      const text = responses[call] ?? responses[responses.length - 1];
      call += 1;
      return { text, usage: { input: 0, output: 0 }, model: "mock" };
    },
  };
};

const expectValid = (result: GenerateStoryResult) => {
  const check = validateStory(result.story, {
    manifest: MANIFEST,
    pageCount: META.pageCount,
  });

  expect(check.errors).toEqual([]);
  expect(check.ok).toBe(true);
};

beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Pipeline tidak boleh memanggil jaringan.");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------------- */
/* Jalur bahagia                                                              */
/* -------------------------------------------------------------------------- */

describe("jalur bahagia", () => {
  const happy = () =>
    mock(
      { fixture: "outline/valid.json" },
      { fixture: "chapter/valid.json" },
      { fixture: "chapter/ch_02.json" },
      { fixture: "chapter/ch_03.json" },
    );

  it("menghasilkan cerita valid tanpa fallback", async () => {
    const result = await run(happy());

    expect(result.usedFallback).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.stats).toEqual({ llmCalls: 4, repairs: 0, durationMs: 0 });
    expect(result.gaps).toEqual([]);
    expect(result.story.chapters.map((chapter) => chapter.id)).toEqual([
      "ch_01",
      "ch_02",
      "ch_03",
    ]);
    expect(result.story.meta.id).toBe(META.id);
    expect(result.story.schemaVersion).toBe("1.0");
    expectValid(result);
  });

  it("mock bawaan menghasilkan cerita valid untuk outline tiga chapter", async () => {
    const result = await run(new MockProvider());

    expect(result.usedFallback).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.story.chapters.map((chapter) => chapter.id)).toEqual([
      "ch_01",
      "ch_02",
      "ch_03",
    ]);
    expectValid(result);
  });

  it("membawa percabangan fixture ke Story tanpa jatuh ke fallback", async () => {
    const result = await run(happy());

    expect(result.usedFallback).toBe(false);
    expectValid(result);

    // `assemble` menurunkan deklarasi flag dari pemakaian nyata di chapter,
    // karena draft chapter tidak boleh mendeklarasikan `flags` sendiri.
    expect(result.story.flags?.map((flag) => flag.id)).toEqual([
      "flg_salah_daun",
      "flg_salah_hijau",
    ]);

    const onWrong = result.story.chapters
      .flatMap((chapter) => chapter.scenes)
      .flatMap((scene) => scene.beats)
      .filter(
        (beat) => beat.type === "challenge" && beat.onWrong !== undefined,
      );

    expect(onWrong.length).toBeGreaterThanOrEqual(1);
  });

  it("menghitung assetUsage di kode, urut dan tanpa duplikat", async () => {
    const result = await run(happy());

    expect(result.story.assetUsage).toEqual({
      backgrounds: ["bg_default"],
      music: ["bgm_default"],
      sprites: ["char_mc", "char_npc_1", "char_npc_10"],
    });

    for (const list of Object.values(result.story.assetUsage)) {
      expect(list).toEqual([...new Set(list)].sort());
    }
  });

  it("deterministik untuk input yang sama", async () => {
    const first = await run(happy());
    const second = await run(happy());

    expect(first).toEqual(second);
  });
});

/* -------------------------------------------------------------------------- */
/* Percabangan (AI_BRANCHING)                                                 */
/* -------------------------------------------------------------------------- */

describe("percabangan", () => {
  it("tidak menambah blok BRANCHING saat toggle mati", async () => {
    const provider = capturing();
    const result = await run(provider, { branching: false });

    expect(result.usedFallback).toBe(false);
    expect(
      provider.prompts.some((prompt) => prompt.includes("BRANCHING")),
    ).toBe(false);
  });

  it("mengirim blok BRANCHING dan mewariskan flag antar chapter", async () => {
    const provider = capturing();
    const result = await run(provider, { branching: true });

    expect(result.usedFallback).toBe(false);
    expectValid(result);

    const chapterPrompts = provider.prompts.filter((prompt) =>
      prompt.includes("SCHEMA CHAPTER"),
    );
    expect(chapterPrompts).toHaveLength(3);
    expect(chapterPrompts[0]).toContain("BRANCHING");
    // `chapter/valid.json` men-set flg_salah_daun; chapter berikutnya harus
    // diberi tahu id itu supaya konsisten lintas chapter.
    expect(chapterPrompts[1]).toContain("flg_salah_daun");
    expect(chapterPrompts[2]).toContain("flg_salah_daun");
  });
});

/* -------------------------------------------------------------------------- */
/* Repair                                                                     */
/* -------------------------------------------------------------------------- */

describe("repair", () => {
  it("memperbaiki chapter rusak dalam batas repair", async () => {
    const result = await run(
      mock(
        { fixture: "outline/valid.json" },
        { fixture: "chapter/unknown-asset.json" },
        { fixture: "repair/valid.json" },
        { fixture: "chapter/ch_02.json" },
        { fixture: "chapter/ch_03.json" },
      ),
    );

    expect(result.usedFallback).toBe(false);
    expect(result.stats).toEqual({ llmCalls: 5, repairs: 1, durationMs: 0 });
    expect(result.story.chapters).toHaveLength(3);
    expectValid(result);
  });

  it("berhenti setelah 2 repair lalu memakai fallback", async () => {
    const result = await run(
      mock(
        { fixture: "outline/valid.json" },
        { fixture: "chapter/unknown-asset.json" },
        { fixture: "chapter/unknown-asset.json" },
        { fixture: "chapter/unknown-asset.json" },
      ),
    );

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("chapter-invalid");
    expect(result.stats.repairs).toBe(MAX_REPAIRS_PER_STORY);
    expect(result.stats.llmCalls).toBe(4);
    expect(result.story).not.toHaveProperty("usedFallback");
    expectValid(result);
  });

  it("memperbaiki cerita yang gagal validasi akhir", async () => {
    const chapter = json<{
      chapter: { scenes: { id: string }[] };
      challenges: unknown[];
      continuity: unknown;
    }>("chapter/ch_03.json");

    // Scene id bertabrakan dengan chapter pertama: lolos per chapter, gagal di
    // validasi tingkat cerita.
    chapter.chapter.scenes[0].id = "sc_01_01";
    chapter.chapter.scenes[1].id = "sc_01_02";

    const responses = [
      fixture("outline/valid.json"),
      fixture("chapter/valid.json"),
      fixture("chapter/ch_02.json"),
      JSON.stringify(chapter),
      fixture("story/valid.json"),
    ];

    const provider = scripted((call) => responses[call - 1]);
    const result = await run(provider);

    expect(result.usedFallback).toBe(false);
    expect(result.stats.repairs).toBe(1);
    expect(result.story.meta.id).toBe(META.id);
    expectValid(result);
  });
});

/* -------------------------------------------------------------------------- */
/* Provider gagal, timeout, abort                                             */
/* -------------------------------------------------------------------------- */

describe("kegagalan provider", () => {
  it("timeout provider berakhir di fallback setelah satu retry", async () => {
    const result = await run(
      new MockProvider({
        stages: { outline: "valid", chapter: "timeout" },
        timeoutMs: 0,
      }),
    );

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("provider-timeout");
    expect(result.stats.llmCalls).toBe(3);
    expectValid(result);
  });

  it("abort sebelum panggilan pertama langsung memakai fallback", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await run(
      scripted(() => {
        throw new Error("provider tidak boleh dipanggil");
      }),
      { signal: controller.signal },
    );

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("aborted");
    expect(result.stats.llmCalls).toBe(0);
    expectValid(result);
  });

  it("abort di tengah jalan tidak di-retry", async () => {
    const controller = new AbortController();
    let calls = 0;

    const provider: LlmProvider = {
      async complete() {
        calls += 1;
        if (calls === 1) {
          return {
            text: fixture("outline/valid.json"),
            usage: { input: 0, output: 0 },
            model: "mock",
          };
        }

        controller.abort();
        const error = new Error("dibatalkan");
        error.name = "AbortError";
        throw error;
      },
    };

    const result = await run(provider, { signal: controller.signal });

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("aborted");
    expect(calls).toBe(2);
    expectValid(result);
  });
});

/* -------------------------------------------------------------------------- */
/* Anggaran                                                                   */
/* -------------------------------------------------------------------------- */

describe("anggaran", () => {
  it("memakai fallback saat sisa waktu < 30 detik", async () => {
    let now = 0;
    const inner = mock(
      { fixture: "outline/valid.json" },
      { fixture: "chapter/valid.json" },
    );

    const provider: LlmProvider = {
      async complete(request, signal) {
        const response = await inner.complete(request, signal);
        now = 100_000;
        return response;
      },
    };

    const result = await run(provider, { clock: () => now });

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("budget-exhausted");
    expect(result.stats.llmCalls).toBe(1);
    expect(result.stats.durationMs).toBe(100_000);
    expectValid(result);
  });

  it("menegakkan batas 12 panggilan LLM dengan tepat", async () => {
    const outline = json<{ chapters: unknown[] }>("outline/valid.json");
    const template = outline.chapters[0] as Record<string, unknown>;
    outline.chapters = [1, 2, 3, 4, 5, 6].map((number) => ({
      ...template,
      id: `ch_0${number}`,
    }));

    const outlineText = JSON.stringify(outline);
    const chapterText = fixture("chapter/valid.json");

    // Tiap chapter butuh generate + generate ulang (JSON rusak), sehingga
    // chapter keenam meminta panggilan ke-13 dan harus ditolak.
    const provider = scripted((call) => {
      if (call === 1) return outlineText;
      return (call - 2) % 2 === 0 ? "{ rusak" : chapterText;
    });

    const result = await generateStory({
      provider,
      pages: PAGES,
      manifest: MANIFEST,
      meta: META,
      clock: () => 0,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.reason).toBe("call-limit");
    expect(result.stats.llmCalls).toBe(MAX_LLM_CALLS_PER_STORY);
    expect(provider.calls).toBe(MAX_LLM_CALLS_PER_STORY);
    expectValid(result);
  });
});

/* -------------------------------------------------------------------------- */
/* Gap: pemotongan materi dan sourcePages di luar rentang                      */
/* -------------------------------------------------------------------------- */

describe("gap", () => {
  it("mencatat pemotongan materi prompt ke source.gaps", async () => {
    const pages = Array.from(
      { length: 20 },
      (_, index) => `Halaman ${index + 1}. ${"x".repeat(1_990)}`,
    );

    const responses = [
      fixture("outline/valid.json"),
      fixture("chapter/valid.json"),
      fixture("chapter/ch_02.json"),
      fixture("chapter/ch_03.json"),
    ];

    const result = await run(
      scripted((call) => responses[call - 1]),
      {
        pages,
        meta: { ...META, pageCount: 20 },
      },
    );

    expect(result.usedFallback).toBe(false);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps.some((gap) => gap.includes("tidak dikirim"))).toBe(true);
    expect(result.gaps.some((gap) => gap.includes("dipotong"))).toBe(true);
    expect(result.story.source.gaps).toEqual(result.gaps);

    const check = validateStory(result.story, {
      manifest: MANIFEST,
      pageCount: 20,
    });
    expect(check.ok).toBe(true);
  });

  it("membuang sourcePages di luar rentang dan mencatat gap", async () => {
    const outline = json<{ chapters: { sourcePages: number[] }[] }>(
      "outline/valid.json",
    );
    outline.chapters[2].sourcePages = [1, 99];

    const responses = [
      JSON.stringify(outline),
      fixture("chapter/valid.json"),
      fixture("chapter/ch_02.json"),
      fixture("chapter/ch_03.json"),
    ];

    const result = await run(scripted((call) => responses[call - 1]));

    expect(result.usedFallback).toBe(false);
    expect(result.gaps.some((gap) => gap.includes("99"))).toBe(true);
    expect(result.gaps.some((gap) => gap.includes("di luar rentang"))).toBe(
      true,
    );
    expect(result.story.source.gaps).toEqual(result.gaps);
    expectValid(result);
  });
});

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

describe("progress", () => {
  const documented = new Set<number>(Object.values(STAGE_PROGRESS));

  it("hanya memancarkan stage dan progress yang didokumentasikan, berurutan", async () => {
    const events: ProgressEvent[] = [];

    const result = await run(
      mock(
        { fixture: "outline/valid.json" },
        { fixture: "chapter/valid.json" },
        { fixture: "chapter/ch_02.json" },
        { fixture: "chapter/ch_03.json" },
      ),
      { onProgress: (event) => events.push(event) },
    );

    expect(result.usedFallback).toBe(false);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(documented.has(event.progress)).toBe(true);
      expect(STAGE_PROGRESS[event.stage]).toBe(event.progress);
      expect([
        "outlining",
        "generating",
        "validating",
        "repairing",
        "saving",
        "done",
      ]).toContain(event.stage);
    }

    const progress = events.map((event) => event.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(events.at(-1)).toEqual({ stage: "done", progress: 100 });
    expect(events.some((event) => event.stage === "repairing")).toBe(false);
  });

  it("memancarkan repairing saat repair dipakai, tanpa menurunkan progress", async () => {
    const events: ProgressEvent[] = [];

    await run(
      mock(
        { fixture: "outline/valid.json" },
        { fixture: "chapter/unknown-asset.json" },
        { fixture: "repair/valid.json" },
        { fixture: "chapter/ch_02.json" },
        { fixture: "chapter/ch_03.json" },
      ),
      { onProgress: (event) => events.push(event) },
    );

    expect(events.some((event) => event.stage === "repairing")).toBe(true);

    const progress = events.map((event) => event.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });
});

/* -------------------------------------------------------------------------- */
/* assemble                                                                   */
/* -------------------------------------------------------------------------- */

describe("assemble", () => {
  it("menggabungkan chapter dan merapikan gap", () => {
    const outline = json<Parameters<typeof assemble>[0]>("outline/valid.json");
    const payloads = [
      "chapter/valid.json",
      "chapter/ch_02.json",
      "chapter/ch_03.json",
    ].map((path) =>
      json<{
        chapter: Story["chapters"][number];
        challenges: Story["challenges"];
      }>(path),
    );

    const story = assemble(
      outline,
      {
        chapters: payloads.map((payload) => payload.chapter),
        challenges: payloads.flatMap((payload) => payload.challenges),
      },
      { meta: META, gaps: ["gap yang sama", "gap yang sama", "gap lain"] },
    );

    expect(story.source.gaps).toEqual(["gap yang sama", "gap lain"]);
    expect(story.source.pageCount).toBe(META.pageCount);
    expect(story.source.concepts).toEqual(outline.concepts);
    expect(story.meta.id).toBe(META.id);
    expect(story.chapters).toHaveLength(3);
  });

  it("menurunkan flags dari percabangan chapter, urut kemunculan pertama", () => {
    const outline = json<Parameters<typeof assemble>[0]>("outline/valid.json");
    const payloads = ["chapter/valid.json", "chapter/ch_02.json"].map((path) =>
      json<{
        chapter: Story["chapters"][number];
        challenges: Story["challenges"];
      }>(path),
    );

    const story = assemble(
      outline,
      {
        chapters: payloads.map((payload) => payload.chapter),
        challenges: payloads.flatMap((payload) => payload.challenges),
      },
      { meta: META },
    );

    expect(story.flags).toEqual([
      { id: "flg_salah_daun", default: false },
      { id: "flg_salah_hijau", default: false },
    ]);
  });

  it("tidak menambah flags bila tidak ada percabangan sama sekali", () => {
    const outline = json<Parameters<typeof assemble>[0]>("outline/valid.json");
    const payload = json<{
      chapter: Story["chapters"][number];
      challenges: Story["challenges"];
    }>("chapter/ch_03.json");

    const story = assemble(
      outline,
      { chapters: [payload.chapter], challenges: payload.challenges },
      { meta: META },
    );

    // Cerita biasa (tanpa onWrong/textVariants) berbentuk sama persis seperti
    // sebelum fitur bercabang ada.
    expect("flags" in story).toBe(false);
  });
});
