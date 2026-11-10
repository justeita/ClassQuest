// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Test logika inti manajemen cerita guru (task 20).
 *
 * Database memakai libSQL in-memory dengan migrasi asli; dua guru dibuat
 * langsung di database untuk uji kepemilikan. Tidak ada mock `next/headers`
 * di sini karena modul inti menerima client yang diinjeksi — auth guru dites
 * terpisah di `actions.test.ts`.
 */

import { applyMigrations } from "@/server/db/migrations";
import {
  archiveStory,
  deleteStory,
  getStoryDetail,
  listStories,
  publishStory,
  saveStoryVersion,
  StoryNotFoundError,
  StoryTooLargeError,
} from "./core";

import { buildFallbackStory } from "@/story/fallback";
import { validateStory } from "@/story/validate";
import { toAssetManifest } from "@/assets/manifest";

const TEACHER_A = "teacher_a";
const TEACHER_B = "teacher_b";
const STORY_ID = "st_test_story_1";

let db: Client;

const insertStory = async (options: {
  storyId: string;
  teacherId: string;
  status?: string;
  publishedVersion?: number | null;
}): Promise<void> => {
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', ?, ?, 'materi.pdf')`,
    args: [
      options.storyId,
      options.teacherId,
      options.status ?? "draft",
      options.publishedVersion ?? null,
    ],
  });
};

/** Simpan satu baris versi; cerita dari `buildFallbackStory` selalu valid. */
const insertVersion = async (options: {
  storyId: string;
  version: number;
  usedFallback?: boolean;
  story?: unknown;
  createdBy?: string;
}): Promise<void> => {
  const story = options.story ?? buildFallbackStory();
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, ?, ?, ?, 'story-v1', ?)`,
    args: [
      options.storyId,
      options.version,
      JSON.stringify(story),
      options.createdBy ?? "system",
      options.usedFallback ? 1 : 0,
    ],
  });
};

const validStory = (): ReturnType<typeof buildFallbackStory> =>
  buildFallbackStory();

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru A')",
    args: [TEACHER_A],
  });
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru B')",
    args: [TEACHER_B],
  });
});

describe("listStories", () => {
  it("hanya mengembalikan cerita milik guru sendiri, urut terbaru", async () => {
    const now = Date.now();
    await insertStory({ storyId: "st_a1", teacherId: TEACHER_A });
    await insertVersion({ storyId: "st_a1", version: 1 });
    await db.execute({
      sql: "update stories set updated_at = ? where id = ?",
      args: [new Date(now).toISOString(), "st_a1"],
    });

    await insertStory({ storyId: "st_a2", teacherId: TEACHER_A });
    await insertVersion({ storyId: "st_a2", version: 1 });
    await db.execute({
      sql: "update stories set updated_at = ? where id = ?",
      args: [new Date(now + 1000).toISOString(), "st_a2"],
    });

    await insertStory({ storyId: "st_b1", teacherId: TEACHER_B });
    await insertVersion({ storyId: "st_b1", version: 1 });

    const mine = await listStories(db, { teacherId: TEACHER_A });
    expect(mine.map((item) => item.id)).toEqual(["st_a2", "st_a1"]);
    expect(mine[0]).toMatchObject({
      title: "Siklus Air",
      subject: "IPA",
      gradeLevel: "Kelas 5",
      language: "id",
      status: "draft",
      versionCount: 1,
      usedFallback: false,
    });

    const theirs = await listStories(db, { teacherId: TEACHER_B });
    expect(theirs.map((item) => item.id)).toEqual(["st_b1"]);
  });

  it("melaporkan usedFallback dari versi terbaru dan mematuhi limit/offset", async () => {
    const now = Date.now();

    await insertStory({ storyId: "st_a1", teacherId: TEACHER_A });
    await insertVersion({ storyId: "st_a1", version: 1, usedFallback: true });
    await insertVersion({ storyId: "st_a1", version: 2, usedFallback: false });
    // st_a1 lebih lama → akan muncul di offset 1
    await db.execute({
      sql: "update stories set updated_at = ? where id = ?",
      args: [new Date(now).toISOString(), "st_a1"],
    });

    await insertStory({ storyId: "st_a2", teacherId: TEACHER_A });
    await insertVersion({ storyId: "st_a2", version: 1 });
    // st_a2 lebih baru → akan muncul di offset 0
    await db.execute({
      sql: "update stories set updated_at = ? where id = ?",
      args: [new Date(now + 1000).toISOString(), "st_a2"],
    });

    const page = await listStories(db, {
      teacherId: TEACHER_A,
      limit: 1,
      offset: 1,
    });
    expect(page).toHaveLength(1);
    expect(page[0]?.id).toBe("st_a1");
    expect(page[0]?.usedFallback).toBe(false);
    expect(page[0]?.versionCount).toBe(2);
  });
});

describe("getStoryDetail", () => {
  it("mengembalikan versi terbaru, usedFallback, dan status", async () => {
    await insertStory({
      storyId: STORY_ID,
      teacherId: TEACHER_A,
      status: "draft",
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });
    await insertVersion({ storyId: STORY_ID, version: 2, usedFallback: true });

    const detail = await getStoryDetail(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
    });
    expect(detail).not.toBeNull();
    expect(detail?.version).toBe(2);
    expect(detail?.usedFallback).toBe(true);
    expect(detail?.status).toBe("draft");
    expect(detail?.story?.meta.title).toBeTruthy();
  });

  it("cerita milik guru lain dan yang tidak ada sama-sama null", async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    expect(
      await getStoryDetail(db, { teacherId: TEACHER_B, storyId: STORY_ID }),
    ).toBeNull();
    expect(
      await getStoryDetail(db, { teacherId: TEACHER_A, storyId: "st_ tidak" }),
    ).toBeNull();
  });
});

describe("saveStoryVersion", () => {
  const base = (story: unknown, expectedVersion: number) => ({
    teacherId: TEACHER_A,
    storyId: STORY_ID,
    story,
    expectedVersion,
  });

  beforeEach(async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });
    await insertVersion({ storyId: STORY_ID, version: 1 });
  });

  it("menaikkan version dan mengubah updated_at tanpa menimpa versi lama", async () => {
    const before = await db.execute({
      sql: "select updated_at from stories where id = ?",
      args: [STORY_ID],
    });
    const oldUpdatedAt = String(before.rows[0]?.updated_at);

    const result = await saveStoryVersion(db, base(validStory(), 1), () =>
      Date.parse("2026-11-10T10:00:00.000Z"),
    );

    expect(result).toEqual({
      ok: true,
      version: 2,
      warnings: expect.any(Array),
    });

    const versions = await db.execute({
      sql: "select version, created_by, prompt_version, used_fallback from story_versions where story_id = ? order by version",
      args: [STORY_ID],
    });
    expect(versions.rows).toHaveLength(2);
    expect(Number(versions.rows[1]?.version)).toBe(2);
    expect(String(versions.rows[1]?.created_by)).toBe(TEACHER_A);
    expect(String(versions.rows[1]?.prompt_version)).toBe("story-v1");
    expect(Number(versions.rows[1]?.used_fallback)).toBe(0);

    const after = await db.execute({
      sql: "select updated_at from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(after.rows[0]?.updated_at)).not.toBe(oldUpdatedAt);
    expect(String(after.rows[0]?.updated_at)).toBe("2026-11-10T10:00:00.000Z");
  });

  it("menolak cerita tidak valid tanpa menulis baris baru", async () => {
    const broken = { ...validStory(), chapters: [] };

    const result = await saveStoryVersion(db, base(broken, 1));

    expect(result.ok).toBe(false);
    if (!result.ok && !("conflict" in result)) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeLessThanOrEqual(50);
    }
    const count = await db.execute({
      sql: "select count(*) as total from story_versions where story_id = ?",
      args: [STORY_ID],
    });
    expect(Number(count.rows[0]?.total)).toBe(1);
  });

  it("expectedVersion basi menghasilkan konflik tanpa tulisan", async () => {
    const result = await saveStoryVersion(db, base(validStory(), 5));

    expect(result).toEqual({ ok: false, conflict: true, latestVersion: 1 });
    const count = await db.execute({
      sql: "select count(*) as total from story_versions where story_id = ?",
      args: [STORY_ID],
    });
    expect(Number(count.rows[0]?.total)).toBe(1);
  });

  it("cerita guru lain dan tidak ada dilempar sebagai StoryNotFoundError", async () => {
    await expect(
      saveStoryVersion(db, { ...base(validStory(), 1), teacherId: TEACHER_B }),
    ).rejects.toBeInstanceOf(StoryNotFoundError);
    await expect(
      saveStoryVersion(db, {
        ...base(validStory(), 1),
        storyId: "st_tidak_ada",
      }),
    ).rejects.toBeInstanceOf(StoryNotFoundError);
  });

  it("menolak cerita yang melebihi batas ukuran", async () => {
    const huge = validStory();
    await expect(
      saveStoryVersion(
        db,
        base(
          { ...huge, meta: { ...huge.meta, synopsis: "x".repeat(600_000) } },
          1,
        ),
      ),
    ).rejects.toBeInstanceOf(StoryTooLargeError);

    const count = await db.execute({
      sql: "select count(*) as total from story_versions where story_id = ?",
      args: [STORY_ID],
    });
    expect(Number(count.rows[0]?.total)).toBe(1);
  });
});

describe("publishStory", () => {
  beforeEach(async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });
    await insertVersion({ storyId: STORY_ID, version: 1 });
  });

  it("terbitkan dari draft menetapkan published_version", async () => {
    const result = await publishStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
      expectedVersion: 1,
    });

    expect(result).toEqual({ ok: true });
    const row = await db.execute({
      sql: "select status, published_version from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(row.rows[0]?.status)).toBe("published");
    expect(Number(row.rows[0]?.published_version)).toBe(1);
  });

  it("terbitkan ulang dari published menaikkan published_version", async () => {
    await publishStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
      expectedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 2 });

    const result = await publishStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
      expectedVersion: 2,
    });

    expect(result).toEqual({ ok: true });
    const row = await db.execute({
      sql: "select published_version from stories where id = ?",
      args: [STORY_ID],
    });
    expect(Number(row.rows[0]?.published_version)).toBe(2);
  });

  it.each(["processing", "failed"] as const)(
    "status %s ditolak tanpa mengubah apa pun",
    async (status) => {
      await db.execute({
        sql: "update stories set status = ? where id = ?",
        args: [status, STORY_ID],
      });

      const result = await publishStory(db, {
        teacherId: TEACHER_A,
        storyId: STORY_ID,
        expectedVersion: 1,
      });

      expect(result.ok).toBe(false);
      const row = await db.execute({
        sql: "select status, published_version from stories where id = ?",
        args: [STORY_ID],
      });
      expect(String(row.rows[0]?.status)).toBe(status);
      expect(row.rows[0]?.published_version).toBeNull();
    },
  );

  it("versi tidak valid ditolak (validasi ulang di server)", async () => {
    // Timpa versi 1 dengan cerita rusak — status jangan dipercaya.
    await db.execute({
      sql: "update story_versions set story = ? where story_id = ? and version = 1",
      args: [JSON.stringify({ schemaVersion: "9.9" }), STORY_ID],
    });

    const result = await publishStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
      expectedVersion: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !("conflict" in result)) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
    const row = await db.execute({
      sql: "select status from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(row.rows[0]?.status)).toBe("draft");
  });

  it("versi basi menghasilkan konflik", async () => {
    const result = await publishStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
      expectedVersion: 3,
    });
    expect(result).toEqual({ ok: false, conflict: true, latestVersion: 1 });
  });

  it("cerita guru lain dilempar sebagai StoryNotFoundError", async () => {
    await expect(
      publishStory(db, {
        teacherId: TEACHER_B,
        storyId: STORY_ID,
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(StoryNotFoundError);
  });
});

describe("archiveStory", () => {
  it("published kembali ke draft dan published_version dikosongkan", async () => {
    await insertStory({
      storyId: STORY_ID,
      teacherId: TEACHER_A,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    const result = await archiveStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
    });

    expect(result).toEqual({ ok: true });
    const row = await db.execute({
      sql: "select status, published_version from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(row.rows[0]?.status)).toBe("draft");
    expect(row.rows[0]?.published_version).toBeNull();
  });

  it("draft menjadi archived", async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    const result = await archiveStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
    });

    expect(result).toEqual({ ok: true });
    const row = await db.execute({
      sql: "select status from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(row.rows[0]?.status)).toBe("archived");
  });

  it("processing ditolak", async () => {
    await insertStory({
      storyId: STORY_ID,
      teacherId: TEACHER_A,
      status: "processing",
    });

    const result = await archiveStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
    });

    expect(result).toEqual({ ok: false });
    const row = await db.execute({
      sql: "select status from stories where id = ?",
      args: [STORY_ID],
    });
    expect(String(row.rows[0]?.status)).toBe("processing");
  });

  it("cerita guru lain dilempar sebagai StoryNotFoundError", async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });

    await expect(
      archiveStory(db, { teacherId: TEACHER_B, storyId: STORY_ID }),
    ).rejects.toBeInstanceOf(StoryNotFoundError);
  });
});

describe("deleteStory", () => {
  it("menghapus story, versi, job, dan hasil bermain dalam satu transaksi", async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });
    await insertVersion({ storyId: STORY_ID, version: 1 });
    await db.execute({
      sql: "insert into jobs (id, story_id, stage, progress) values ('job_1', ?, 'queued', 5)",
      args: [STORY_ID],
    });
    await db.execute({
      sql: `insert into play_results
              (id, story_id, story_version, correct_count, total_count, earned_points, weak_concepts)
            values ('pr_1', ?, 1, 2, 4, 20, '[]')`,
      args: [STORY_ID],
    });

    const result = await deleteStory(db, {
      teacherId: TEACHER_A,
      storyId: STORY_ID,
    });

    expect(result).toEqual({ ok: true });
    for (const table of ["stories", "story_versions", "jobs", "play_results"]) {
      const rows = await db.execute({
        sql: `select count(*) as total from ${table} where ${table === "stories" ? "id" : "story_id"} = ?`,
        args: [STORY_ID],
      });
      expect(Number(rows.rows[0]?.total)).toBe(0);
    }
  });

  it("published dan processing tidak bisa dihapus", async () => {
    await insertStory({
      storyId: STORY_ID,
      teacherId: TEACHER_A,
      status: "published",
      publishedVersion: 1,
    });
    await insertVersion({ storyId: STORY_ID, version: 1 });

    expect(
      await deleteStory(db, { teacherId: TEACHER_A, storyId: STORY_ID }),
    ).toEqual({ ok: false });

    const rows = await db.execute({
      sql: "select count(*) as total from stories where id = ?",
      args: [STORY_ID],
    });
    expect(Number(rows.rows[0]?.total)).toBe(1);
  });

  it("cerita guru lain dilempar sebagai StoryNotFoundError", async () => {
    await insertStory({ storyId: STORY_ID, teacherId: TEACHER_A });

    await expect(
      deleteStory(db, { teacherId: TEACHER_B, storyId: STORY_ID }),
    ).rejects.toBeInstanceOf(StoryNotFoundError);
  });
});

describe("regresi fixture", () => {
  it("cerita fallback lolos validateStory dengan manifest asli", () => {
    const check = validateStory(validStory(), { manifest: toAssetManifest() });
    expect(check.ok).toBe(true);
  });
});
