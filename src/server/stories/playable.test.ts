// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getPlayableStory` — sumber cerita halaman siswa.
 *
 * Yang di-mock hanya `@/server/db`; database tetap libSQL in-memory dengan
 * migrasi asli, mengikuti pola `api/stories/[storyId]/route.test.ts`.
 */

const { dbRef, getReadyDbMock } = vi.hoisted(() => {
  const dbRef: { current: Client | null } = { current: null };
  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });
  return { dbRef, getReadyDbMock };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { DEMO_STORY, DEMO_STORY_ID } from "@/game/demoStory";
import { applyMigrations } from "@/server/db/migrations";
import { buildFallbackStory } from "@/story/fallback";
import type { Story } from "@/story/schema";

import { getPlayableStory } from "./playable";

let db: Client;

const STORY_ID = "st_playable";
const TITLE = "Cerita Terbit";
const TEACHER_ID = "teacher_playable";

const storyFor = (id: string, title: string): Story => {
  const story = buildFallbackStory();
  return { ...story, meta: { ...story.meta, id, title } };
};

const insertStory = async (options: {
  storyId: string;
  status: string;
  publishedVersion?: number | null;
}): Promise<void> => {
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', ?, ?, 'materi.pdf')`,
    args: [
      options.storyId,
      TEACHER_ID,
      options.status,
      options.publishedVersion ?? null,
    ],
  });
};

const insertVersion = async (options: {
  storyId: string;
  version: number;
  story: Story;
}): Promise<void> => {
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, ?, ?, 'system', 'story-v1', 0)`,
    args: [options.storyId, options.version, JSON.stringify(options.story)],
  });
};

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  getReadyDbMock.mockClear();

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru')",
    args: [TEACHER_ID],
  });
});

afterEach(() => {
  db.close();
  dbRef.current = null;
});

describe("getPlayableStory", () => {
  it("mengembalikan cerita demo tanpa membuka database", async () => {
    dbRef.current = null;

    await expect(getPlayableStory(DEMO_STORY_ID)).resolves.toBe(DEMO_STORY);
    expect(getReadyDbMock).not.toHaveBeenCalled();
  });

  it("mengembalikan cerita published", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({
      storyId: STORY_ID,
      version: 1,
      story: storyFor(STORY_ID, TITLE),
    });

    const story = await getPlayableStory(STORY_ID);

    expect(story).not.toBeNull();
    expect(story?.meta.id).toBe(STORY_ID);
    expect(story?.meta.title).toBe(TITLE);
  });

  it.each(["draft", "processing", "failed", "archived"] as const)(
    "status %s tidak boleh dimainkan",
    async (status) => {
      await insertStory({ storyId: STORY_ID, status });
      await insertVersion({
        storyId: STORY_ID,
        version: 1,
        story: storyFor(STORY_ID, TITLE),
      });

      await expect(getPlayableStory(STORY_ID)).resolves.toBeNull();
    },
  );

  it("published tanpa published_version tidak boleh dimainkan", async () => {
    await insertStory({ storyId: STORY_ID, status: "published" });
    await insertVersion({
      storyId: STORY_ID,
      version: 1,
      story: storyFor(STORY_ID, TITLE),
    });

    await expect(getPlayableStory(STORY_ID)).resolves.toBeNull();
  });

  it("menyajikan versi terbit, bukan versi terbaru", async () => {
    await insertStory({
      storyId: STORY_ID,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({
      storyId: STORY_ID,
      version: 1,
      story: storyFor(STORY_ID, "Versi Terbit"),
    });
    await insertVersion({
      storyId: STORY_ID,
      version: 2,
      story: storyFor(STORY_ID, "Draft Terbaru"),
    });

    const story = await getPlayableStory(STORY_ID);

    expect(story?.meta.title).toBe("Versi Terbit");
  });

  it("id tidak dikenal atau tidak valid menghasilkan null", async () => {
    await expect(getPlayableStory("st_tidak_ada")).resolves.toBeNull();
    await expect(getPlayableStory("")).resolves.toBeNull();
    await expect(getPlayableStory("a".repeat(201))).resolves.toBeNull();
  });
});
