// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test Server Action `savePlayResult` (task 22).
 *
 * Menguji integrasi action publik tanpa sesi: normalisasi input, pemanggilan
 * core logic, penanganan cerita terbit vs tidak terbit.
 */

const { dbRef, getReadyDbMock } = vi.hoisted(() => {
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
  };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { applyMigrations } from "@/server/db/migrations";
import { buildFallbackStory } from "@/story/fallback";
import { savePlayResult } from "./actions";

const STORY_ID = "st_published_for_play_action";
let db: Client;

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;

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
