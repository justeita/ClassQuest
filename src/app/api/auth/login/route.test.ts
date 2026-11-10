// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Handler POST dipanggil langsung dengan `Request` asli; database memakai libSQL
 * in-memory. Yang di-mock:
 *
 * - `next/headers` untuk cookie sesi (cookie store palsu meniru `cookies()`
 *   async di Next 16, sama seperti `auth.test.ts`).
 * - `@/server/db` supaya `ensureTeacherRow()` memakai client in-memory.
 *
 * Tidak ada kode akses atau secret asli di file ini; nilai di bawah hanya
 * dipakai selama test berjalan.
 */
const { cookieStore, cookiesMock, dbRef, getReadyDbMock } = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const dbRef: { current: unknown | null } = { current: null };
  const getReadyDbMock = vi.fn(async () => {
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

import { applyMigrations } from "@/server/db/migrations";
import {
  TEACHER_ID,
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_TTL_SECONDS,
  verifyAccessCode,
  verifySessionToken,
} from "@/server/auth";

import { POST } from "./route";

const ACCESS_CODE = "kode-demo-rahasia-4c1e";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const WRONG_CODE = "kode-yang-salah-sama-sekali-00ff";

function loginRequest(body: string | null, contentType = "application/json") {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": contentType },
    ...(body === null ? {} : { body }),
  });
}

const teacherCount = async (db: Client): Promise<number> => {
  const result = await db.execute("select count(*) as total from teachers");
  return Number(result.rows[0].total);
};

const setCookieArgs = () => {
  const call = cookieStore.set.mock.calls[0] as
    [string, string, Record<string, unknown>] | undefined;
  return call;
};

let db: Client;

beforeEach(async () => {
  vi.stubEnv("TEACHER_ACCESS_CODE", ACCESS_CODE);
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;

  cookiesMock.mockClear();
  getReadyDbMock.mockClear();
  cookieStore.set.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  db.close();
  dbRef.current = null;
});

describe("POST /api/auth/login — sukses", () => {
  it("menjawab 200 { ok: true } dengan Cache-Control no-store", async () => {
    const response = await POST(
      loginRequest(JSON.stringify({ code: ACCESS_CODE })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("men-set cookie sesi dengan atribut yang benar", async () => {
    await POST(loginRequest(JSON.stringify({ code: ACCESS_CODE })));

    const call = setCookieArgs();
    expect(call).toBeDefined();
    const [name, token, options] = call!;

    expect(name).toBe(TEACHER_SESSION_COOKIE);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: TEACHER_SESSION_TTL_SECONDS,
    });

    const session = verifySessionToken(token);
    expect(session?.teacherId).toBe(TEACHER_ID);
  });

  it("memastikan baris teachers ada setelah login", async () => {
    expect(await teacherCount(db)).toBe(0);

    await POST(loginRequest(JSON.stringify({ code: ACCESS_CODE })));

    expect(await teacherCount(db)).toBe(1);
    const row = await db.execute({
      sql: "select id, access_code from teachers where id = ?",
      args: [TEACHER_ID],
    });
    expect(row.rows[0]).toMatchObject({ id: TEACHER_ID, access_code: null });
  });

  it("tidak mengembalikan kode akses, token, atau secret di respons", async () => {
    const response = await POST(
      loginRequest(JSON.stringify({ code: ACCESS_CODE })),
    );
    const text = await response.text();

    expect(text).not.toContain(ACCESS_CODE);
    expect(text).not.toContain(SESSION_SECRET);
    const [, token] = setCookieArgs()!;
    expect(text).not.toContain(token);
  });
});

describe("POST /api/auth/login — gagal", () => {
  it("kode salah dan kode kosong dijawab 401 dengan pesan identik", async () => {
    const wrong = await POST(
      loginRequest(JSON.stringify({ code: WRONG_CODE })),
    );
    const empty = await POST(loginRequest(JSON.stringify({ code: "" })));

    expect(wrong.status).toBe(401);
    expect(empty.status).toBe(401);

    const wrongBody = await wrong.text();
    expect(wrongBody).toBe(await empty.text());
    expect(JSON.parse(wrongBody)).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(await teacherCount(db)).toBe(0);
  });

  it("env kosong (fail closed) dijawab 401 dengan pesan yang sama", async () => {
    const normal = await POST(
      loginRequest(JSON.stringify({ code: WRONG_CODE })),
    );
    const normalBody = await normal.text();

    vi.stubEnv("TEACHER_ACCESS_CODE", "");
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    const unconfigured = await POST(
      loginRequest(JSON.stringify({ code: ACCESS_CODE })),
    );

    expect(unconfigured.status).toBe(401);
    expect(await unconfigured.text()).toBe(normalBody);
    expect(verifyAccessCode(ACCESS_CODE)).toBe(false);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("body bukan JSON dijawab 400 INVALID_INPUT", async () => {
    const response = await POST(loginRequest("bukan json {", "text/plain"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("body tanpa code atau code bukan string dijawab 400 INVALID_INPUT", async () => {
    for (const body of ["{}", '{"kode":"x"}', '{"code":123}', "null", "[]"]) {
      const response = await POST(loginRequest(body));
      expect(response.status, body).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "INVALID_INPUT" },
      });
    }

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("respons 401 tidak membocorkan nilai env ataupun kode yang dikirim", async () => {
    const response = await POST(
      loginRequest(JSON.stringify({ code: WRONG_CODE })),
    );
    const text = await response.text();

    expect(text).not.toContain(WRONG_CODE);
    expect(text).not.toContain(ACCESS_CODE);
    expect(text).not.toContain(SESSION_SECRET);
  });
});
