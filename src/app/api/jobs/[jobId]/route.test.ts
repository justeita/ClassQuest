// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Handler GET dipanggil langsung dengan `Request` asli dan `params` berupa
 * Promise (Next 16). Database memakai libSQL in-memory tanpa jaringan.
 *
 * Yang di-mock hanya `next/headers` untuk cookie sesi guru (sama seperti
 * `auth.test.ts`) dan `@/server/db` supaya `getReadyDb()` memakai client
 * in-memory. Jam tidak di-mock: test basi menggeser `started_at` di baris
 * database, jadi hasilnya tidak bergantung pada jam asli.
 */
const { cookieStore, cookiesMock, dbRef, getReadyDbMock } = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const dbRef: { current: unknown | null; failWith: Error | null } = {
    current: null,
    failWith: null,
  };

  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.failWith) throw dbRef.failWith;
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });

  return {
    cookieStore,
    cookiesMock: vi.fn(async () => cookieStore),
    dbRef,
    getReadyDbMock,
  };
});

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { JOB_ERROR_MESSAGES } from "@/server/jobs/run";
import { JOB_STALE_AFTER_SECONDS } from "@/server/jobs/limits";
import { applyMigrations } from "@/server/db/migrations";
import {
  createSessionToken,
  TEACHER_ID,
  TEACHER_SESSION_COOKIE,
} from "@/server/auth";

import { GET } from "./route";

const ACCESS_CODE = "kode-demo-rahasia-4c1e";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";

const OTHER_TEACHER_ID = "teacher_lain";
const OTHER_STORY_ID = "st_milik_guru_lain";
const OTHER_JOB_ID = "job_milik_guru_lain";

const STORY_ID = "st_polling";
const JOB_ID = "job_polling";

const SECOND = 1000;

function useSession(token: string | null | undefined): void {
  if (token === null || token === undefined) {
    cookieStore.get.mockReturnValue(undefined);
    return;
  }
  cookieStore.get.mockImplementation((name: string) =>
    name === TEACHER_SESSION_COOKIE ? { name, value: token } : undefined,
  );
}

/** Panggil handler dengan `params` Promise seperti Next 16. */
function poll(jobId: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/jobs/${jobId}`), {
    params: Promise.resolve({ jobId }),
  });
}

let db: Client;

const jobRow = async (jobId: string = JOB_ID) => {
  const result = await db.execute({
    sql: "select * from jobs where id = ?",
    args: [jobId],
  });
  return result.rows[0] as Record<string, unknown>;
};

const storyStatus = async (storyId: string = STORY_ID) => {
  const result = await db.execute({
    sql: "select status, updated_at from stories where id = ?",
    args: [storyId],
  });
  return result.rows[0] as Record<string, unknown>;
};

/** Update baris job langsung, untuk menyiapkan tiap status. */
async function setJob(
  fields: {
    stage?: string;
    progress?: number;
    message?: string | null;
    error_code?: string | null;
    started_at?: string;
    finished_at?: string | null;
  },
  jobId: string = JOB_ID,
): Promise<void> {
  for (const [column, value] of Object.entries(fields)) {
    await db.execute({
      sql: `update jobs set ${column} = ? where id = ?`,
      args: [value as string | number | null, jobId],
    });
  }
}

const iso = (ms: number) => new Date(ms).toISOString();

beforeEach(async () => {
  vi.stubEnv("TEACHER_ACCESS_CODE", ACCESS_CODE);
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  dbRef.failWith = null;

  cookieStore.get.mockReset();
  getReadyDbMock.mockClear();
  useSession(createSessionToken(TEACHER_ID, Date.now()));

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Demo')",
    args: [TEACHER_ID],
  });
  // Guru kedua dibuat langsung di database (satu kode akses untuk demo).
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru Lain')",
    args: [OTHER_TEACHER_ID],
  });

  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', 'processing', 'materi.pdf')`,
    args: [STORY_ID, TEACHER_ID],
  });
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
          values (?, ?, 'Cerita Guru Lain', 'IPS', 'Kelas 6', 'id', 'draft', 'lain.pdf')`,
    args: [OTHER_STORY_ID, OTHER_TEACHER_ID],
  });

  await db.execute({
    sql: "insert into jobs (id, story_id, stage, progress) values (?, ?, 'queued', 5)",
    args: [JOB_ID, STORY_ID],
  });
  await db.execute({
    sql: "insert into jobs (id, story_id, stage, progress) values (?, ?, 'done', 100)",
    args: [OTHER_JOB_ID, OTHER_STORY_ID],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  db.close();
  dbRef.current = null;
});

describe("GET /api/jobs/[jobId] — otorisasi dan kepemilikan", () => {
  it("menolak tanpa sesi dengan 401 UNAUTHORIZED", async () => {
    useSession(null);

    const response = await poll(JOB_ID);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("menolak cookie rusak dengan 401", async () => {
    useSession("payload-yang-rusak.bukan-ttd");

    const response = await poll(JOB_ID);

    expect(response.status).toBe(401);
  });

  it("menjawab 404 untuk job yang tidak ada", async () => {
    const response = await poll("job_tidak_ada");

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: Record<string, unknown> };
    expect(body.error).toMatchObject({ code: "NOT_FOUND" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("menjawab 404 identik untuk job milik guru lain", async () => {
    const missing = await poll("job_yang_tidak_ada");
    const foreign = await poll(OTHER_JOB_ID);

    expect(foreign.status).toBe(404);
    expect(foreign.status).toBe(missing.status);
    await expect(foreign.json()).resolves.toEqual(await missing.json());
    // Keberadaan job guru lain tidak bocor lewat header apa pun.
    expect(foreign.headers.get("cache-control")).toBe(
      missing.headers.get("cache-control"),
    );
  });

  it("memperlakukan jobId tidak valid sebagai tidak ditemukan", async () => {
    const empty = await poll("");
    // 201 karakter: di atas batas wajar id job.
    const tooLong = await poll("j".repeat(201));

    expect(empty.status).toBe(404);
    expect(tooLong.status).toBe(404);
    await expect(empty.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND" },
    });
    await expect(tooLong.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("GET /api/jobs/[jobId] — bentuk respons", () => {
  it("job queued: stage queued, progress 5, tanpa isi cerita", async () => {
    const response = await poll(JOB_ID);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: JOB_ID,
      storyId: STORY_ID,
      stage: "queued",
      progress: 5,
      finishedAt: null,
    });
    // Hanya field kontrak; tidak ada JSON cerita, jawaban, atau data guru.
    expect(Object.keys(body).sort()).toEqual([
      "finishedAt",
      "id",
      "progress",
      "stage",
      "startedAt",
      "storyId",
    ]);
    expect(JSON.stringify(body)).not.toContain("teacher");
  });

  it("job running: stage dan progress dari baris jobs", async () => {
    await setJob({
      stage: "generating",
      progress: 55,
      started_at: iso(Date.now()),
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({ stage: "generating", progress: 55 });
  });

  it("job done: menyertakan version dan usedFallback false", async () => {
    const finishedAt = iso(Date.now());
    await setJob({
      stage: "done",
      progress: 100,
      started_at: finishedAt,
      finished_at: finishedAt,
    });
    await db.execute({
      sql: `insert into story_versions (story_id, version, story, created_by, used_fallback)
            values (?, 1, '{"meta":{}}', 'system', 0)`,
      args: [STORY_ID],
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      stage: "done",
      progress: 100,
      version: 1,
      usedFallback: false,
    });
    // Isi cerita tidak pernah dikirim ke UI polling.
    expect(JSON.stringify(body)).not.toContain("meta");
  });

  it("job done dengan fallback: usedFallback true dan versi terbaru", async () => {
    const finishedAt = iso(Date.now());
    await setJob({
      stage: "done",
      progress: 100,
      finished_at: finishedAt,
    });
    await db.execute({
      sql: `insert into story_versions (story_id, version, story, created_by, used_fallback)
            values (?, 1, '{}', 'system', 0)`,
      args: [STORY_ID],
    });
    await db.execute({
      sql: `insert into story_versions (story_id, version, story, created_by, used_fallback)
            values (?, 2, '{}', 'system', 1)`,
      args: [STORY_ID],
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({ version: 2, usedFallback: true });
  });

  for (const code of [
    "NO_TEXT_LAYER",
    "PDF_UNREADABLE",
    "TOO_MANY_PAGES",
    "INTERNAL",
  ] as const) {
    it(`job failed: error ${code} memakai pesan statis dari kontrak`, async () => {
      const finishedAt = iso(Date.now());
      await setJob({
        stage: "failed",
        progress: 100,
        error_code: code,
        finished_at: finishedAt,
      });

      const response = await poll(JOB_ID);
      const body = (await response.json()) as {
        stage: string;
        error?: { code: string; message: string };
        finishedAt: string | null;
      };

      expect(body.stage).toBe("failed");
      expect(body.error).toEqual({ code, message: JOB_ERROR_MESSAGES[code] });
      expect(body.finishedAt).toBe(finishedAt);
    });
  }

  it("error_code asing tidak diteruskan mentah ke klien", async () => {
    await setJob({
      stage: "failed",
      progress: 100,
      error_code: "SESUATU_BARU",
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as {
      error?: { code: string; message: string };
    };

    expect(body.error?.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("SESUATU_BARU");
  });

  it("menjawab 500 generik saat database tidak bisa diakses", async () => {
    dbRef.failWith = new Error("SQLITE_BUSY: pesan driver yang rahasia");

    const response = await poll(JOB_ID);

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: Record<string, unknown> };
    expect(body.error).toMatchObject({ code: "INTERNAL" });
    expect(JSON.stringify(body)).not.toContain("SQLITE_BUSY");
    expect(JSON.stringify(body)).not.toContain("rahasia");
  });
});

describe("GET /api/jobs/[jobId] — job basi", () => {
  const staleIso = () =>
    iso(Date.now() - (JOB_STALE_AFTER_SECONDS + 10) * SECOND);

  it("running yang lewat batas dianggap gagal dan kegagalannya TERSIMPAN", async () => {
    await setJob({
      stage: "generating",
      progress: 55,
      started_at: staleIso(),
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as {
      stage: string;
      progress: number;
      error?: { code: string; message: string };
      finishedAt: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.stage).toBe("failed");
    expect(body.progress).toBe(100);
    expect(body.error?.code).toBe("INTERNAL");
    expect(body.finishedAt).not.toBeNull();

    const job = await jobRow();
    expect(job.stage).toBe("failed");
    expect(Number(job.progress)).toBe(100);
    expect(job.error_code).toBe("INTERNAL");
    expect(job.finished_at).toBe(body.finishedAt);

    const story = await storyStatus();
    expect(story.status).toBe("failed");
  });

  it("queued yang lewat batas dianggap gagal", async () => {
    await setJob({ stage: "queued", progress: 5, started_at: staleIso() });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as { stage: string };

    expect(body.stage).toBe("failed");
    expect((await jobRow()).stage).toBe("failed");
    expect((await storyStatus()).status).toBe("failed");
  });

  it("running yang belum lewat batas tetap running dan tidak menulis apa pun", async () => {
    const startedAt = iso(Date.now() - (JOB_STALE_AFTER_SECONDS - 30) * SECOND);
    await setJob({ stage: "generating", progress: 55, started_at: startedAt });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as { stage: string };

    expect(body.stage).toBe("generating");
    const job = await jobRow();
    expect(job.stage).toBe("generating");
    expect(job.finished_at).toBeNull();
    expect((await storyStatus()).status).toBe("processing");
  });

  it("job done tidak berubah walau dibuat lama", async () => {
    const old = staleIso();
    await setJob({
      stage: "done",
      progress: 100,
      started_at: old,
      finished_at: old,
    });

    const response = await poll(JOB_ID);
    const body = (await response.json()) as { stage: string };

    expect(body.stage).toBe("done");
    const job = await jobRow();
    expect(job.stage).toBe("done");
    expect(job.finished_at).toBe(old);
  });

  it("guard WHERE: job yang selesai di antara baca dan tulis tidak tertimpa", async () => {
    await setJob({ stage: "queued", progress: 5, started_at: staleIso() });

    // Saat handler membaca database, job masih queued; tepat sesudahnya job
    // "selesai" (meniru runner yang baru menyelesaikan job). Guard
    // `where stage in ('queued','running')` harus menolak penulisan.
    const original = db.execute.bind(db);
    const selectSpy = vi.spyOn(db, "execute").mockImplementation((async (
      statement: Parameters<Client["execute"]>[0],
    ) => {
      const result = await original(statement);
      const record = statement as unknown as { sql?: string };
      if (record.sql?.includes("from jobs j")) {
        selectSpy.mockRestore();
        await setJob({
          stage: "done",
          progress: 100,
          finished_at: iso(Date.now()),
        });
      }
      return result;
    }) as Client["execute"]);

    const response = await poll(JOB_ID);
    selectSpy.mockRestore();

    const body = (await response.json()) as { stage: string };
    expect(body.stage).toBe("done");
    expect((await jobRow()).stage).toBe("done");
    expect((await storyStatus()).status).not.toBe("failed");
  });

  it("polling kedua setelah basi tidak menulis ulang apa pun", async () => {
    await setJob({ stage: "generating", progress: 55, started_at: staleIso() });

    const first = (await (await poll(JOB_ID)).json()) as {
      finishedAt: string;
    };
    const jobAfterFirst = await jobRow();

    // `finished_at` tetap sama walau waktu terus berjalan.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = (await (await poll(JOB_ID)).json()) as {
      stage: string;
      finishedAt: string;
    };
    const jobAfterSecond = await jobRow();

    expect(second.stage).toBe("failed");
    expect(second.finishedAt).toBe(first.finishedAt);
    expect(jobAfterSecond.finished_at).toBe(jobAfterFirst.finished_at);
    expect(jobAfterSecond.message).toBe(jobAfterFirst.message);
  });
});
