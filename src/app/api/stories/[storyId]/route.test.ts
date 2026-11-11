// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `GET /api/stories/[storyId]` — endpoint publik tanpa login (task 21).
 *
 * Yang di-mock hanya `@/server/db` (client libSQL in-memory dengan migrasi
 * asli) dan `next/headers` untuk header IP yang dipakai rate limit. Endpoint
 * tidak membaca cookie.
 *
 * Rate limit endpoint ini disimpan di memori proses, jadi setiap test
 * mengosongkannya di `beforeEach` dan memakai `Date.now()` sungguhan.
 */

const { dbRef, getReadyDbMock, headersMock } = vi.hoisted(() => {
  const dbRef: { current: Client | null } = { current: null };
  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });
  return { dbRef, getReadyDbMock, headersMock: vi.fn() };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { applyMigrations } from "@/server/db/migrations";
import { PUBLIC_STORY_RATE_LIMIT } from "@/server/rate-limit/limits";
import { memoryRateLimits } from "@/server/rate-limit/memory";
import { GET } from "./route";
import { buildFallbackStory } from "@/story/fallback";

let db: Client;

const STORY_ID = "st_published_demo";
/** IP palsu (dokumen contoh RFC 5737); hanya untuk test. */
const CLIENT_IP = "203.0.113.60";

const useClientIp = (ip: string = CLIENT_IP): void => {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === "x-real-ip" ? ip : null),
  });
};

const insertStory = async (options: {
  storyId: string;
  status: string;
  publishedVersion?: number | null;
}): Promise<void> => {
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, 'teacher_demo', 'Siklus Air', 'IPA', 'Kelas 5', 'id', ?, ?, 'materi.pdf')`,
    args: [options.storyId, options.status, options.publishedVersion ?? null],
  });
};

const insertVersion = async (options: {
  storyId: string;
  version: number;
  createdAt?: string;
}): Promise<void> => {
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback, created_at)
          values (?, ?, ?, 'system', 'story-v1', 0, ?)`,
    args: [
      options.storyId,
      options.version,
      JSON.stringify(buildFallbackStory()),
      options.createdAt ?? "2026-11-10T09:00:00.000Z",
    ],
  });
};

const call = async (storyId: string): Promise<Response> =>
  GET(new Request(`https://classquest.test/api/stories/${storyId}`), {
    params: Promise.resolve({ storyId }),
  });

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  memoryRateLimits.clear();
  useClientIp();

  await db.execute({
    sql: "insert into teachers (id, display_name) values ('teacher_demo', 'Guru Demo')",
  });
});

afterEach(() => {
  db.close();
  dbRef.current = null;
});

const NOT_FOUND_BODY = {
  error: { code: "NOT_FOUND", message: "Cerita tidak ditemukan." },
};

describe("GET /api/stories/[storyId]", () => {
  it("menyajikan cerita published tanpa login, persis bentuk kontrak", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    const response = await call(STORY_ID);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "publishedAt",
      "story",
      "storyId",
      "version",
    ]);
    expect(body.storyId).toBe(STORY_ID);
    expect(body.version).toBe(1);
    expect(body.publishedAt).toBe("2026-11-10T09:00:00.000Z");

    const story = body.story as Record<string, unknown>;
    expect(Object.keys(story).sort()).toEqual([
      "assetUsage",
      "cast",
      "challenges",
      "chapters",
      "meta",
      "schemaVersion",
      "source",
    ]);
  });

  it.each([
    ["draft", "draft"],
    ["processing", "processing"],
    ["failed", "failed"],
    ["archived", "archived"],
  ] as const)(
    "status %s dijawab 404 identik dengan cerita yang tidak ada",
    async (_, status) => {
      await insertStory({ storyId: STORY_ID, status });
      await insertVersion({ storyId: STORY_ID, version: 1 });

      const notFound = await call("st_tidak_ada");
      const actual = await call(STORY_ID);
      const notFoundBody = await notFound.json();

      expect(actual.status).toBe(404);
      expect(await actual.json()).toEqual(notFoundBody);
      expect(notFoundBody).toEqual(NOT_FOUND_BODY);
    },
  );

  it("published tanpa published_version dijawab 404 (bug guard)", async () => {
    await insertStory({ storyId: STORY_ID, status: "published" });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    const response = await call(STORY_ID);
    expect(response.status).toBe(404);
  });

  it("menyajikan versi terbit, bukan versi terbaru", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });
    await insertVersion({
      storyId: STORY_ID,
      version: 2,
      createdAt: "2026-11-10T11:00:00.000Z",
    });

    const body = (await (await call(STORY_ID)).json()) as {
      version: number;
      publishedAt: string;
    };
    expect(body.version).toBe(1);
    expect(body.publishedAt).toBe("2026-11-10T09:00:00.000Z");
  });

  it("id tidak valid (kosong/terlalu panjang) 404 identik", async () => {
    const tooLong = await call("a".repeat(201));
    expect(tooLong.status).toBe(404);
    expect(await tooLong.json()).toEqual(NOT_FOUND_BODY);
  });

  it("tidak membocorkan teacher_id, nama file sumber, atau data job", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    const text = await (await call(STORY_ID)).text();
    // `source.fileName` di dalam JSON cerita adalah bagian Story (docs
    // story-schema), bukan metadata penyimpanan — diperbolehkan.
    expect(text).not.toContain("teacher_demo");
    expect(text).not.toContain("source_file_name");
    expect(text).not.toContain("source_file_path");
    expect(text).not.toContain("created_by");
    expect(text).not.toContain("used_fallback");
    expect(text).not.toContain("prompt_version");
  });

  it("kegagalan database menghasilkan 500 generik", async () => {
    dbRef.current = null;
    const response = await call(STORY_ID);
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INTERNAL");
  });
});

describe("GET /api/stories/[storyId] — rate limit", () => {
  it(`menolak permintaan ke-${PUBLIC_STORY_RATE_LIMIT.limit + 1} dari IP yang sama`, async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    for (let i = 0; i < PUBLIC_STORY_RATE_LIMIT.limit; i += 1) {
      const response = await call(STORY_ID);
      expect(response.status, `permintaan ${i + 1}`).toBe(200);
    }

    const blocked = await call(STORY_ID);

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    const retryAfter = Number(blocked.headers.get("retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(JSON.stringify(body)).not.toContain(CLIENT_IP);

    // IP lain tetap dilayani.
    useClientIp("203.0.113.61");
    expect((await call(STORY_ID)).status).toBe(200);
  });

  it("jendela berikutnya dilayani lagi", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-11T09:00:00.000Z"));

      for (let i = 0; i < PUBLIC_STORY_RATE_LIMIT.limit; i += 1) {
        await call(STORY_ID);
      }
      expect((await call(STORY_ID)).status).toBe(429);

      vi.setSystemTime(new Date("2026-11-11T09:01:00.000Z"));
      expect((await call(STORY_ID)).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tidak menulis apa pun ke database", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    for (let i = 0; i <= PUBLIC_STORY_RATE_LIMIT.limit; i += 1) {
      await call(STORY_ID);
    }

    const rows = await db.execute("select count(*) as total from rate_limits");
    expect(Number(rows.rows[0].total)).toBe(0);
  });

  it("kegagalan database tidak menghalangi baca publik (fail open)", async () => {
    dbRef.current = null;

    // Limiter di memori tidak menyentuh database; 404 tetap dijawab apa adanya.
    const response = await call(STORY_ID);
    expect(response.status).not.toBe(429);
  });
});
