// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test Server Action `savePlayResult` (task 22).
 *
 * Menguji integrasi action publik tanpa sesi: normalisasi input, pemanggilan
 * core logic, penanganan cerita terbit vs tidak terbit, dan rate limit
 * (task 24: 120 per 10 menit per IP, fail open saat limiter gagal).
 *
 * `next/headers` di-mock untuk header IP.
 */

const { dbRef, getReadyDbMock, headersMock } = vi.hoisted(() => {
  const dbRef: { current: unknown | null } = {
    current: null,
  };

  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });

  return {
    dbRef,
    getReadyDbMock,
    headersMock: vi.fn(),
  };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));
vi.mock("next/headers", () => ({ headers: headersMock, cookies: vi.fn() }));

import { applyMigrations } from "@/server/db/migrations";
import { PLAY_RESULT_RATE_LIMIT } from "@/server/rate-limit/limits";
import { buildFallbackStory } from "@/story/fallback";
import { savePlayResult } from "./actions";

const STORY_ID = "st_published_for_play_action";
/** IP palsu (dokumen contoh RFC 5737); hanya untuk test. */
const CLIENT_IP = "203.0.113.70";

const useClientIp = (ip: string = CLIENT_IP): void => {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === "x-real-ip" ? ip : null),
  });
};
let db: Client;

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  useClientIp();
  vi.stubEnv("TEACHER_SESSION_SECRET", "secret-uji-hasil-main-51c0");

  await db.execute({
    sql: "insert into teachers (id, display_name) values ('teacher_demo', 'Guru Demo')",
  });

  const story = buildFallbackStory();
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, 'teacher_demo', 'Siklus Air', 'IPA', 'Kelas 5', 'id', 'published', 1, 'materi.pdf')`,
    args: [STORY_ID],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [STORY_ID, JSON.stringify(story)],
  });
});

describe("savePlayResult action", () => {
  it("berhasil menyimpan tanpa login/sesi untuk cerita terbit", async () => {
    const story = buildFallbackStory();
    const challenge = story.challenges[0];
    if (challenge.type !== "multiple_choice") {
      throw new Error("fixture diharapkan memiliki challenge multiple_choice");
    }
    const answers = [
      {
        type: "multiple_choice" as const,
        challengeId: challenge.id,
        selectedId: challenge.correctOptionId,
      },
    ];

    const outcome = await savePlayResult({
      storyId: STORY_ID,
      result: { nickname: "Budi", answers },
    });

    expect(outcome).toEqual({ ok: true });
  });

  it("menolak input null atau bukan objek", async () => {
    expect(await savePlayResult(null)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await savePlayResult("bukan objek")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("menolak storyId kosong atau terlalu panjang", async () => {
    expect(await savePlayResult({ storyId: "", result: {} })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      await savePlayResult({ storyId: "x".repeat(201), result: {} }),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("menolak cerita yang tidak ada atau belum terbit", async () => {
    expect(
      await savePlayResult({
        storyId: "st_tidak_ada",
        result: { answers: [] },
      }),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("savePlayResult — rate limit", () => {
  /** Jawaban valid untuk satu tantangan pilihan ganda. */
  const validAnswers = () => {
    const story = buildFallbackStory();
    const challenge = story.challenges[0];
    if (challenge.type !== "multiple_choice") {
      throw new Error("fixture diharapkan memiliki challenge multiple_choice");
    }
    return [
      {
        type: "multiple_choice" as const,
        challengeId: challenge.id,
        selectedId: challenge.correctOptionId,
      },
    ];
  };

  it("melebihi batas menghasilkan reason rate_limited", async () => {
    const answers = validAnswers();

    for (let i = 0; i < PLAY_RESULT_RATE_LIMIT.limit; i += 1) {
      const outcome = await savePlayResult({
        storyId: STORY_ID,
        result: { answers },
      });
      expect(outcome, `simpan ${i + 1}`).toEqual({ ok: true });
    }

    const blocked = await savePlayResult({
      storyId: STORY_ID,
      result: { answers },
    });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });

    // Payload penolakan tidak memuat IP/hash.
    expect(JSON.stringify(blocked)).not.toContain(CLIENT_IP);
    expect(JSON.stringify(blocked)).not.toMatch(/[0-9a-f]{64}/);

    const rows = await db.execute("select count(*) as total from play_results");
    expect(Number(rows.rows[0].total)).toBe(PLAY_RESULT_RATE_LIMIT.limit);
  });

  it("IP lain tidak ikut kena batas", async () => {
    const answers = validAnswers();
    for (let i = 0; i < PLAY_RESULT_RATE_LIMIT.limit; i += 1) {
      await savePlayResult({ storyId: STORY_ID, result: { answers } });
    }

    useClientIp("203.0.113.71");
    await expect(
      savePlayResult({ storyId: STORY_ID, result: { answers } }),
    ).resolves.toEqual({ ok: true });
  });

  it("kegagalan database pada limiter tetap diproses (fail open)", async () => {
    // Limiter dan penyimpanan memakai client yang sama; kegagalan di sini
    // membuat penghitung gagal, dan hasil main tetap harus disimpan.
    const failingForLimiter = {
      execute: async (query: unknown) => {
        const sql =
          typeof query === "string" ? query : (query as { sql: string }).sql;
        if (sql.trim().toLowerCase().startsWith("insert into rate_limits")) {
          throw new Error("database limiter gagal");
        }
        return (original as Client).execute(query as never);
      },
    };

    const original = dbRef.current;
    dbRef.current = failingForLimiter;

    const outcome = await savePlayResult({
      storyId: STORY_ID,
      result: { answers: validAnswers() },
    });

    expect(outcome).toEqual({ ok: true });

    dbRef.current = original;
    const rows = await db.execute("select count(*) as total from play_results");
    expect(Number(rows.rows[0].total)).toBe(1);
  });
});
