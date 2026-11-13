// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test job runner: libSQL in-memory, provider mock, tanpa jaringan.
 *
 * `extractPdfText` di-mock supaya test tidak bergantung pada parser PDF; jalur
 * ekstraksi nyata sudah dites di `src/server/pdf/extract-text.test.ts`.
 */

const { extractMock, fsSpies } = vi.hoisted(() => ({
  extractMock: vi.fn(),
  fsSpies: new Map<PropertyKey, ReturnType<typeof vi.fn>>(),
}));

vi.mock("@/server/pdf/extract-text", () => ({
  extractPdfText: extractMock,
  MAX_PDF_PAGES: 40,
  MIN_TEXT_LAYER_CHARS: 200,
}));

vi.mock("node:fs/promises", () => {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "constants") return {};
        if (!fsSpies.has(property)) fsSpies.set(property, vi.fn());
        return fsSpies.get(property);
      },
    },
  );
});

import { MockProvider } from "@/ai/mock-provider";
import { STAGE_PROGRESS } from "@/ai/pipeline";
import type { LlmProvider } from "@/ai/provider";
import { applyMigrations } from "@/server/db/migrations";
import { createPdfExtractError } from "@/server/pdf/errors";
import { validateStory } from "@/story/validate";
import { toAssetManifest } from "@/assets/manifest";

import { runJob, type RunJobInput } from "./run";

const STORY_ID = "st_job_test";
const JOB_ID = "job_test";

const PAGES = [
  "Halaman satu menjelaskan fotosintesis dan daun hijau di depan kelas.",
  "Halaman dua menjelaskan klorofil yang menangkap cahaya matahari.",
  "Halaman tiga menjelaskan glukosa sebagai hasil fotosintesis.",
];

const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.4\nRAHASIA-ISI-PDF-XYZ\n%%EOF\n",
);

const extraction = () => ({
  pageCount: PAGES.length,
  pages: PAGES.map((text, index) => ({ pageNumber: index + 1, text })),
  totalChars: PAGES.join("").length,
});

const happyProvider = () =>
  new MockProvider({
    sequence: [
      { fixture: "outline/valid.json" },
      { fixture: "chapter/valid.json" },
      { fixture: "chapter/ch_02.json" },
      { fixture: "chapter/ch_03.json" },
    ],
  });

const failingProvider = (): LlmProvider => ({
  async complete() {
    throw new Error("provider mati total");
  },
});

let db: Client;

const input = (overrides: Partial<RunJobInput> = {}): RunJobInput => ({
  jobId: JOB_ID,
  storyId: STORY_ID,
  pdf: {
    bytes: new Uint8Array(PDF_BYTES),
    filename: "materi.pdf",
    sizeBytes: PDF_BYTES.byteLength,
  },
  tone: "hangat dan penasaran",
  ...overrides,
});

const jobRow = async () => {
  const result = await db.execute({
    sql: "select * from jobs where id = ?",
    args: [JOB_ID],
  });
  return result.rows[0] as Record<string, unknown>;
};

const storyRow = async () => {
  const result = await db.execute({
    sql: "select * from stories where id = ?",
    args: [STORY_ID],
  });
  return result.rows[0] as Record<string, unknown>;
};

const versions = async () => {
  const result = await db.execute({
    sql: "select * from story_versions where story_id = ? order by version",
    args: [STORY_ID],
  });
  return result.rows as Record<string, unknown>[];
};

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);

  await db.execute({
    sql: `insert into teachers (id, display_name) values ('teacher_demo', 'Guru Demo')`,
  });
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
          values (?, 'teacher_demo', 'Rahasia Daun Hijau', 'IPA', 'Kelas 7', 'id', 'processing', 'materi.pdf')`,
    args: [STORY_ID],
  });
  await db.execute({
    sql: `insert into jobs (id, story_id, stage, progress) values (?, ?, 'queued', 5)`,
    args: [JOB_ID, STORY_ID],
  });

  extractMock.mockReset();
  extractMock.mockResolvedValue(extraction());
  fsSpies.clear();
});

afterEach(() => {
  db.close();
});

describe("runJob — jalur sukses", () => {
  it("menyimpan versi 1, menandai story draft, dan job done 100", async () => {
    const result = await runJob(input(), {
      db,
      provider: happyProvider(),
      now: () => Date.parse("2026-11-09T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "succeeded",
      usedFallback: false,
      version: 1,
    });

    const job = await jobRow();
    expect(job.stage).toBe("done");
    expect(Number(job.progress)).toBe(100);
    expect(job.error_code).toBeNull();
    expect(job.finished_at).toBe("2026-11-09T10:00:00.000Z");

    const story = await storyRow();
    expect(story.status).toBe("draft");
    expect(Number(story.source_page_count)).toBe(PAGES.length);

    const rows = await versions();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].version)).toBe(1);
    expect(Number(rows[0].used_fallback)).toBe(0);

    const check = validateStory(JSON.parse(String(rows[0].story)), {
      manifest: toAssetManifest(),
      pageCount: PAGES.length,
    });
    expect(check.errors).toEqual([]);
    expect(check.ok).toBe(true);
  });

  it("menulis stage dan progress sesuai tabel docs, berurutan", async () => {
    const seen: { stage: string; progress: number }[] = [];
    const original = db.execute.bind(db);

    // Rekam setiap update stage yang ditulis runner.
    const spy = vi.spyOn(db, "execute").mockImplementation((async (
      statement: Parameters<Client["execute"]>[0],
    ) => {
      const record = statement as unknown as { sql?: string; args?: unknown[] };
      if (record.sql?.includes("update jobs set stage")) {
        const args = record.args ?? [];
        seen.push({ stage: String(args[0]), progress: Number(args[1]) });
      }
      return original(statement);
    }) as Client["execute"]);

    await runJob(input(), { db, provider: happyProvider() });
    spy.mockRestore();

    expect(seen[0]).toEqual({ stage: "extracting", progress: 15 });
    expect(seen.at(-1)).toEqual({ stage: "done", progress: 100 });

    const progress = seen.map((event) => event.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    for (const event of seen) {
      expect(STAGE_PROGRESS[event.stage as keyof typeof STAGE_PROGRESS]).toBe(
        event.progress,
      );
    }
    expect(seen.some((event) => event.stage === "saving")).toBe(true);
  });

  it("meneruskan tone ke generateStory (masuk ke prompt dan meta cerita)", async () => {
    const prompts: string[] = [];
    const inner = happyProvider();
    const provider: LlmProvider = {
      async complete(request, signal) {
        prompts.push(request.user);
        return inner.complete(request, signal);
      },
    };

    await runJob(input({ tone: "tegang tapi ramah" }), { db, provider });

    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts[0]).toContain("tegang tapi ramah");

    const rows = await versions();
    const story = JSON.parse(String(rows[0].story)) as {
      meta: { tone: string };
    };
    expect(story.meta.tone).toBe("tegang tapi ramah");
  });

  it("tidak menulis file dan tidak menyimpan bytes PDF di baris mana pun", async () => {
    await runJob(input(), { db, provider: happyProvider() });

    expect(fsSpies.size).toBe(0);

    for (const table of ["stories", "jobs", "story_versions"]) {
      const rows = await db.execute(`select * from ${table}`);
      const serialized = JSON.stringify(rows.rows);
      expect(serialized).not.toContain("%PDF");
      expect(serialized).not.toContain("RAHASIA-ISI-PDF");
    }
  });
});

describe("runJob — kegagalan ekstraksi", () => {
  it.each(["NO_TEXT_LAYER", "TOO_MANY_PAGES", "PDF_UNREADABLE"] as const)(
    "menandai job failed dengan %s tanpa versi",
    async (code) => {
      extractMock.mockRejectedValue(createPdfExtractError(code));

      const result = await runJob(input(), { db, provider: happyProvider() });

      expect(result).toEqual({ status: "failed", errorCode: code });

      const job = await jobRow();
      expect(job.stage).toBe("failed");
      expect(Number(job.progress)).toBe(100);
      expect(job.error_code).toBe(code);
      expect(job.finished_at).not.toBeNull();

      expect((await storyRow()).status).toBe("failed");
      expect(await versions()).toHaveLength(0);
    },
  );
});

describe("runJob — fallback dan error tak terduga", () => {
  it("provider gagal total tetap succeeded dengan used_fallback true", async () => {
    const result = await runJob(input(), { db, provider: failingProvider() });

    expect(result).toEqual({
      status: "succeeded",
      usedFallback: true,
      version: 1,
    });

    const job = await jobRow();
    expect(job.stage).toBe("done");
    expect(Number(job.progress)).toBe(100);

    const log = JSON.parse(String(job.log)) as {
      promptVersion?: string;
      fallbackReason?: string | null;
      diagnostics?: unknown;
    };
    expect(log.promptVersion).toBe("story-v4");
    expect(log.fallbackReason).not.toBeNull();
    expect(Array.isArray(log.diagnostics)).toBe(true);

    const rows = await versions();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].used_fallback)).toBe(1);
    expect((await storyRow()).status).toBe("draft");
  });

  it("error database di tengah menjadi failed INTERNAL tanpa isi PDF", async () => {
    const broken = new Proxy(db, {
      get(target, property) {
        if (property === "transaction") {
          return async () => {
            throw new Error("SQLITE_BUSY RAHASIA-ISI-PDF-XYZ");
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Client;

    const result = await runJob(input(), {
      db: broken,
      provider: happyProvider(),
    });

    expect(result).toEqual({ status: "failed", errorCode: "INTERNAL" });

    const job = await jobRow();
    expect(job.stage).toBe("failed");
    expect(job.error_code).toBe("INTERNAL");
    expect(String(job.message)).not.toContain("RAHASIA-ISI-PDF");
    expect(String(job.message)).not.toContain("SQLITE_BUSY");
    expect((await storyRow()).status).toBe("failed");
    expect(await versions()).toHaveLength(0);
  });

  it("tidak melempar walau database tidak bisa dihubungi sama sekali", async () => {
    const broken = new Proxy({} as Client, {
      get() {
        return async () => {
          throw new Error("koneksi putus");
        };
      },
    });

    await expect(
      runJob(input(), { db: broken, provider: happyProvider() }),
    ).resolves.toEqual({ status: "failed", errorCode: "INTERNAL" });
  });
});
