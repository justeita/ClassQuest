// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { beforeEach, describe, expect, it } from "vitest";

import { applyMigrations } from "@/server/db/migrations";

import { getLatestJobId } from "./status";

/**
 * Test pencarian job terbaru untuk halaman `/guru/materi/[storyId]`.
 *
 * Halaman detail hanya punya `storyId`, sedangkan polling memakai `jobId`.
 * Fungsi ini harus memilih job terbaru **milik guru yang sama** dan menjawab
 * `null` identik untuk cerita yang tidak ada maupun milik guru lain, supaya
 * keberadaan cerita tidak bocor.
 */

const TEACHER_ID = "teacher_demo";
const OTHER_TEACHER_ID = "teacher_lain";
const STORY_ID = "st_job_status";
const OTHER_STORY_ID = "st_job_status_lain";

let db: Client;

const insertStory = async (id: string, teacherId: string) => {
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'SMP 7', 'id', 'processing', 'materi.pdf')`,
    args: [id, teacherId],
  });
};

const insertJob = async (id: string, storyId: string, startedAt: string) => {
  await db.execute({
    sql: `insert into jobs (id, story_id, stage, progress, started_at)
          values (?, ?, 'extracting', 15, ?)`,
    args: [id, storyId, startedAt],
  });
};

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Demo')",
    args: [TEACHER_ID],
  });
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Lain')",
    args: [OTHER_TEACHER_ID],
  });

  await insertStory(STORY_ID, TEACHER_ID);
  await insertStory(OTHER_STORY_ID, OTHER_TEACHER_ID);

  await insertJob("job_lama", STORY_ID, "2026-11-12T01:00:00.000Z");
  await insertJob("job_baru", STORY_ID, "2026-11-12T02:00:00.000Z");
  await insertJob("job_lain", OTHER_STORY_ID, "2026-11-12T03:00:00.000Z");
});

describe("getLatestJobId", () => {
  it("mengembalikan job terbaru milik guru", async () => {
    await expect(
      getLatestJobId(db, { storyId: STORY_ID, teacherId: TEACHER_ID }),
    ).resolves.toBe("job_baru");
  });

  it("tidak membocorkan job milik guru lain", async () => {
    await expect(
      getLatestJobId(db, { storyId: OTHER_STORY_ID, teacherId: TEACHER_ID }),
    ).resolves.toBeNull();
  });

  it("mengembalikan null untuk cerita yang tidak ada", async () => {
    await expect(
      getLatestJobId(db, { storyId: "st_tidak_ada", teacherId: TEACHER_ID }),
    ).resolves.toBeNull();
  });

  it("mengembalikan null untuk storyId yang tidak valid", async () => {
    await expect(
      getLatestJobId(db, { storyId: "", teacherId: TEACHER_ID }),
    ).resolves.toBeNull();

    await expect(
      getLatestJobId(db, {
        storyId: "x".repeat(201),
        teacherId: TEACHER_ID,
      }),
    ).resolves.toBeNull();
  });
});
