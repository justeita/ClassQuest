// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Handler POST dipanggil langsung dengan `Request` asli; database memakai libSQL
 * in-memory. Yang di-mock:
 *
 * - `next/headers` untuk cookie sesi (cookie store palsu meniru `cookies()`
 *   async di Next 16, sama seperti `auth.test.ts`) dan untuk header IP yang
 *   dipakai rate limit.
 * - `@/server/db` supaya pencarian akun dan penghitung rate limit
 *   (`rate_limits`) memakai client in-memory.
 *
 * Rate limit memakai `Date.now()` sungguhan, jadi test-nya tidak mengandalkan
 * pergantian jendela waktu; "jendela berikutnya" disimulasikan dengan
 * menggeser baris `rate_limits` dan header IP.
 *
 * Akun dibuat lewat `seedAccount()` (helper di bawah) dengan password uji yang
 * hanya hidup selama test. Tidak ada password atau secret asli di file ini.
 */
const { cookieStore, cookiesMock, headersMock, dbRef, getReadyDbMock } =
  vi.hoisted(() => {
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
      headersMock: vi.fn(),
      dbRef,
      getReadyDbMock,
    };
  });

vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: headersMock }));
vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));

import { applyMigrations } from "@/server/db/migrations";
import { LOGIN_RATE_LIMIT } from "@/server/rate-limit/limits";
import {
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@/server/auth";
import { hashPassword } from "@/server/password";

import { POST } from "./route";

const TEACHER_USERNAME = "guru_uji";
const TEACHER_PASSWORD = "sandi-uji-4c1e";
const TEACHER_DISPLAY_NAME = "Guru Uji";
/** IP palsu (dokumen contoh RFC 5737); hanya untuk test. */
const CLIENT_IP = "203.0.113.40";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const WRONG_PASSWORD = "sandi-yang-salah-00ff";

/** Header request untuk rate limit per IP. */
function useClientIp(ip: string = CLIENT_IP): void {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === "x-real-ip" ? ip : null),
  });
}

function loginRequest(body: string | null, contentType = "application/json") {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": contentType },
    ...(body === null ? {} : { body }),
  });
}

/** Body login yang sah; `overrides` untuk kasus salah. */
function credentials(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    username: TEACHER_USERNAME,
    password: TEACHER_PASSWORD,
    ...overrides,
  });
}

const teacherCount = async (db: Client): Promise<number> => {
  const result = await db.execute("select count(*) as total from teachers");
  return Number(result.rows[0]?.total ?? 0);
};

/** Argumen `cookies().set()` pertama, atau `undefined` bila tidak dipanggil. */
const setCookieArgs = (): [string, string, unknown] | undefined =>
  cookieStore.set.mock.calls[0] as [string, string, unknown] | undefined;

let db: Client;

beforeEach(async () => {
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;

  cookiesMock.mockClear();
  getReadyDbMock.mockClear();
  cookieStore.set.mockReset();
  useClientIp();
});

afterEach(() => {
  vi.unstubAllEnvs();
  db.close();
  dbRef.current = null;
});

/** Buat satu akun guru di database test. Mengembalikan id barisnya. */
async function seedAccount(
  options: {
    id?: string;
    username?: string;
    password?: string;
    displayName?: string;
  } = {},
): Promise<string> {
  const id = options.id ?? "teacher_uji";
  await db.execute({
    sql: "insert into teachers (id, display_name, username, password_hash) values (?, ?, ?, ?)",
    args: [
      id,
      options.displayName ?? TEACHER_DISPLAY_NAME,
      options.username ?? TEACHER_USERNAME,
      await hashPassword(options.password ?? TEACHER_PASSWORD),
    ],
  });
  return id;
}

describe("POST /api/auth/login — sukses", () => {
  it("menjawab 200 { ok: true } dengan Cache-Control no-store", async () => {
    await seedAccount();

    const response = await POST(loginRequest(credentials({})));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("men-set cookie sesi dengan atribut yang benar", async () => {
    const teacherId = await seedAccount();

    await POST(loginRequest(credentials({})));

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
    expect(session?.teacherId).toBe(teacherId);
    expect(session?.displayName).toBe(TEACHER_DISPLAY_NAME);
  });

  it("username tidak peka huruf besar-kecil dan spasi tepi", async () => {
    await seedAccount();

    const response = await POST(
      loginRequest(credentials({ username: `  GURU_Uji  ` })),
    );

    expect(response.status).toBe(200);
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
  });

  it("tidak membuat baris guru baru dan tidak menyimpan password mentah", async () => {
    await seedAccount();

    await POST(loginRequest(credentials({})));

    expect(await teacherCount(db)).toBe(1);
    const row = await db.execute({
      sql: "select username, password_hash from teachers where username = ?",
      args: [TEACHER_USERNAME],
    });
    const stored = String(row.rows[0]?.password_hash);
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain(TEACHER_PASSWORD);
  });

  it("tidak mengembalikan username, password, token, atau secret di respons", async () => {
    await seedAccount();

    const response = await POST(loginRequest(credentials({})));
    const text = await response.text();

    expect(text).not.toContain(TEACHER_PASSWORD);
    expect(text).not.toContain(SESSION_SECRET);
    const [, token] = setCookieArgs()!;
    expect(text).not.toContain(token);
  });
});

describe("POST /api/auth/login — gagal kredensial", () => {
  it("password salah, username tidak ada, dan password kosong dijawab 401 identik", async () => {
    await seedAccount();

    const wrong = await POST(
      loginRequest(credentials({ password: WRONG_PASSWORD })),
    );
    const unknown = await POST(
      loginRequest(credentials({ username: "tidak_ada" })),
    );
    const empty = await POST(loginRequest(credentials({ password: "" })));

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(empty.status).toBe(401);

    const wrongBody = await wrong.text();
    expect(await unknown.text()).toBe(wrongBody);
    expect(await empty.text()).toBe(wrongBody);
    expect(JSON.parse(wrongBody)).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("akun tanpa password_hash (baris lama) tidak bisa dilewati dengan password kosong", async () => {
    await db.execute({
      sql: "insert into teachers (id, display_name, username) values (?, ?, ?)",
      args: ["teacher_lama", "Guru Lama", "guru_lama"],
    });

    const response = await POST(
      loginRequest(credentials({ username: "guru_lama", password: "" })),
    );

    expect(response.status).toBe(401);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("secret sesi kosong (fail closed) dijawab 401 dengan pesan yang sama", async () => {
    await seedAccount();
    const normalBody = await POST(
      loginRequest(credentials({ password: WRONG_PASSWORD })),
    ).then((response) => response.text());

    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    const unconfigured = await POST(loginRequest(credentials({})));

    expect(unconfigured.status).toBe(401);
    expect(await unconfigured.text()).toBe(normalBody);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("respons 401 tidak membocorkan password yang dikirim maupun hash", async () => {
    await seedAccount();

    const response = await POST(
      loginRequest(credentials({ password: WRONG_PASSWORD })),
    );
    const text = await response.text();

    expect(text).not.toContain(WRONG_PASSWORD);
    expect(text).not.toContain(TEACHER_PASSWORD);
    expect(text).not.toContain(SESSION_SECRET);
    expect(text).not.toContain("scrypt$");
  });
});

describe("POST /api/auth/login — body", () => {
  it("body bukan JSON dijawab 400 INVALID_INPUT", async () => {
    const response = await POST(loginRequest("bukan json {", "text/plain"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("body tanpa username/password atau tipenya salah dijawab 400 INVALID_INPUT", async () => {
    const bodies = [
      "{}",
      '{"username":"guru"}',
      '{"password":"x"}',
      '{"username":123,"password":"x"}',
      '{"username":"guru","password":null}',
      "null",
      "[]",
      `{"username":"${"a".repeat(65)}","password":"x"}`,
      `{"username":"guru","password":"${"a".repeat(201)}"}`,
    ];

    for (const body of bodies) {
      const response = await POST(loginRequest(body));
      expect(response.status, body).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "INVALID_INPUT" },
      });
    }

    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login — rate limit", () => {
  const retryAfterOf = (response: Response): number =>
    Number(response.headers.get("retry-after"));

  it(`percobaan ke-${LOGIN_RATE_LIMIT.limit + 1} dijawab 429 dan tidak memverifikasi kredensial`, async () => {
    await seedAccount();

    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i += 1) {
      // Percobaan salah tetap dihitung; semuanya 401 selama belum lewat batas.
      const response = await POST(
        loginRequest(credentials({ password: WRONG_PASSWORD })),
      );
      expect(response.status, `percobaan ${i + 1}`).toBe(401);
    }

    const blocked = await POST(loginRequest(credentials({})));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    const retryAfter = retryAfterOf(blocked);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED" },
    });

    // Kredensial benar pun tidak diverifikasi: tidak ada cookie.
    expect(cookieStore.set).not.toHaveBeenCalled();

    const text = await POST(loginRequest(credentials({}))).then((response) =>
      response.text(),
    );
    expect(text).not.toContain(CLIENT_IP);
    expect(text).not.toContain(SESSION_SECRET);
    expect(text).not.toMatch(/[0-9a-f]{64}/);
  });

  it("jendela berikutnya diizinkan lagi", async () => {
    await seedAccount();

    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i += 1) {
      await POST(loginRequest(credentials({ password: WRONG_PASSWORD })));
    }
    expect((await POST(loginRequest(credentials({})))).status).toBe(429);

    // Jendela berikutnya = awal jendela + windowSeconds (baris baru).
    const windowSeconds = LOGIN_RATE_LIMIT.windowSeconds;
    const shifted = await db.execute({
      sql: "update rate_limits set window_start = window_start + ? where key like ?",
      args: [windowSeconds, `${LOGIN_RATE_LIMIT.name}:%`],
    });
    expect(shifted.rowsAffected).toBeGreaterThan(0);

    const allowed = await POST(loginRequest(credentials({})));
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toEqual({ ok: true });
  });

  it("batas dihitung per IP", async () => {
    await seedAccount();

    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i += 1) {
      await POST(loginRequest(credentials({ password: WRONG_PASSWORD })));
    }
    expect((await POST(loginRequest(credentials({})))).status).toBe(429);

    useClientIp("198.51.100.7");
    expect((await POST(loginRequest(credentials({})))).status).toBe(200);
  });

  it("tabel rate_limits tidak menyimpan IP mentah", async () => {
    await seedAccount();

    await POST(loginRequest(credentials({})));

    const rows = await db.execute("select key from rate_limits");
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) {
      expect(String(row.key).startsWith(`${LOGIN_RATE_LIMIT.name}:`)).toBe(
        true,
      );
      expect(String(row.key)).not.toContain(CLIENT_IP);
    }
  });

  it("penghitung database gagal → 500 generik tanpa detail (fail closed)", async () => {
    await seedAccount();
    dbRef.current = null;

    const response = await POST(loginRequest(credentials({})));

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: Record<string, unknown> };
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("database test belum siap");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
