// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test Server Actions guru (task 20).
 *
 * Menguji integrasi tipis action: requireTeacher() melempar AuthError saat
 * tidak ada sesi, normalisasi input, pemanggilan core logic, dan revalidatePath.
 */

const { cookieStore, cookiesMock, dbRef, getReadyDbMock, revalidatePathMock } =
  vi.hoisted(() => {
    const cookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const dbRef: { current: unknown | null } = {
      current: null,
    };

    const getReadyDbMock = vi.fn(async () => {
      if (dbRef.current === null) throw new Error("database test belum siap");
      return dbRef.current;
    });

    const revalidatePathMock = vi.fn();

    return {
      cookieStore,
      cookiesMock: vi.fn(async () => cookieStore),
      dbRef,
      getReadyDbMock,
      revalidatePathMock,
    };
  });

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { applyMigrations } from "@/server/db/migrations";
import {
  AuthError,
  createSessionToken,
  TEACHER_SESSION_COOKIE,
} from "@/server/auth";
import { buildFallbackStory } from "@/story/fallback";
import {
  archiveStory,
  deleteStory,
  publishStory,
  saveStoryDraft,
} from "./actions";
import { STORY_NOT_FOUND_ISSUE, STORY_TOO_LARGE_ISSUE } from "@/server/stories";

const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const TEACHER_ID = "teacher_demo";
const TEACHER_DISPLAY_NAME = "Guru Demo";

const OTHER_TEACHER_ID = "teacher_lain";
const STORY_ID = "st_guru_action_story";
const OTHER_STORY_ID = "st_guru_lain_story";

function useSession(token: string | null | undefined): void {
  if (token === null || token === undefined) {
    cookieStore.get.mockReturnValue(undefined);
    return;
  }
  cookieStore.get.mockImplementation((name: string) =>
    name === TEACHER_SESSION_COOKIE ? { name, value: token } : undefined,
  );
}

let db: Client;

beforeEach(async () => {
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;

  cookieStore.get.mockReset();
  getReadyDbMock.mockClear();
  revalidatePathMock.mockClear();

  useSession(
    createSessionToken({
      teacherId: TEACHER_ID,
      displayName: TEACHER_DISPLAY_NAME,
    }),
  );

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Demo')",
    args: [TEACHER_ID],
  });
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Lain')",
    args: [OTHER_TEACHER_ID],
  });

  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', 'draft', null, 'materi.pdf')`,
    args: [STORY_ID, TEACHER_ID],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [STORY_ID, JSON.stringify(buildFallbackStory())],
  });

  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Cerita Lain', 'IPS', 'Kelas 6', 'id', 'draft', null, 'lain.pdf')`,
    args: [OTHER_STORY_ID, OTHER_TEACHER_ID],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Server Actions Guru - Auth Guard", () => {
  it("tanpa sesi melempar AuthError (401 UNAUTHORIZED)", async () => {
    useSession(null);

    await expect(
      saveStoryDraft({
        storyId: STORY_ID,
        story: buildFallbackStory(),
        baseVersion: 1,
      }),
    ).rejects.toThrow(AuthError);

    await expect(
      publishStory({ storyId: STORY_ID, version: 1 }),
    ).rejects.toThrow(AuthError);

    await expect(archiveStory({ storyId: STORY_ID })).rejects.toThrow(
      AuthError,
    );

    await expect(deleteStory({ storyId: STORY_ID })).rejects.toThrow(AuthError);
  });
});

describe("Server Actions Guru - Input & Ownership", () => {
  it("input null atau tidak valid ditolak tanpa menyentuh db", async () => {
    expect(
      await saveStoryDraft(
        null as unknown as Parameters<typeof saveStoryDraft>[0],
      ),
    ).toEqual({
      ok: false,
      errors: [STORY_NOT_FOUND_ISSUE],
    });
    expect(
      await publishStory(null as unknown as Parameters<typeof publishStory>[0]),
    ).toEqual({
      ok: false,
      errors: [STORY_NOT_FOUND_ISSUE],
    });
    expect(
      await archiveStory(null as unknown as Parameters<typeof archiveStory>[0]),
    ).toEqual({ ok: false });
    expect(
      await deleteStory(null as unknown as Parameters<typeof deleteStory>[0]),
    ).toEqual({ ok: false });
  });

  it("cerita milik guru lain dijawab 404/not_found sintetis identik", async () => {
    expect(
      await saveStoryDraft({
        storyId: OTHER_STORY_ID,
        story: buildFallbackStory(),
        baseVersion: 1,
      }),
    ).toEqual({
      ok: false,
      errors: [STORY_NOT_FOUND_ISSUE],
    });

    expect(await publishStory({ storyId: OTHER_STORY_ID, version: 1 })).toEqual(
      {
        ok: false,
        errors: [STORY_NOT_FOUND_ISSUE],
      },
    );

    expect(await archiveStory({ storyId: OTHER_STORY_ID })).toEqual({
      ok: false,
    });
    expect(await deleteStory({ storyId: OTHER_STORY_ID })).toEqual({
      ok: false,
    });
  });
});

describe("Server Actions Guru - Mutasi & Revalidasi", () => {
  it("saveStoryDraft berhasil menaikkan version dan memicu revalidatePath", async () => {
    const result = await saveStoryDraft({
      storyId: STORY_ID,
      story: buildFallbackStory(),
      baseVersion: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.version).toBe(2);
    }

    expect(revalidatePathMock).toHaveBeenCalledWith("/guru");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/guru/materi/${STORY_ID}`);
  });

  it("saveStoryDraft dengan konflik tidak memicu revalidatePath", async () => {
    const result = await saveStoryDraft({
      storyId: STORY_ID,
      story: buildFallbackStory(),
      baseVersion: 99,
    });

    expect(result).toEqual({ ok: false, conflict: true, latestVersion: 1 });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("saveStoryDraft dengan ukuran terlalu besar menghasilkan issue STORY_TOO_LARGE_ISSUE", async () => {
    const largeStory = {
      ...buildFallbackStory(),
      title: "x".repeat(600_000),
    };

    const result = await saveStoryDraft({
      storyId: STORY_ID,
      story: largeStory,
      baseVersion: 1,
    });

    expect(result).toEqual({ ok: false, errors: [STORY_TOO_LARGE_ISSUE] });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("publishStory berhasil dan memicu revalidatePath", async () => {
    const result = await publishStory({ storyId: STORY_ID, version: 1 });
    expect(result).toEqual({ ok: true });

    expect(revalidatePathMock).toHaveBeenCalledWith("/guru");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/guru/materi/${STORY_ID}`);
  });

  it("archiveStory pada status published membatalkan terbit ke draft", async () => {
    await publishStory({ storyId: STORY_ID, version: 1 });
    revalidatePathMock.mockClear();

    const result = await archiveStory({ storyId: STORY_ID });
    expect(result).toEqual({ ok: true });

    expect(revalidatePathMock).toHaveBeenCalledWith("/guru");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/guru/materi/${STORY_ID}`);
  });

  it("deleteStory berhasil menghapus cerita draft dan memicu revalidatePath", async () => {
    const result = await deleteStory({ storyId: STORY_ID });
    expect(result).toEqual({ ok: true });

    expect(revalidatePathMock).toHaveBeenCalledWith("/guru");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/guru/materi/${STORY_ID}`);
  });
});
