// @vitest-environment node

import { createHmac } from "node:crypto";

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `next/headers` dan database di-mock supaya test ini fokus pada logika auth.
 * Cookie store palsu meniru `cookies()` async di Next 16; database memakai
 * libSQL in-memory supaya query `teachers` yang sebenarnya ikut diuji.
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
vi.mock("./db", () => ({ getReadyDb: getReadyDbMock }));

import { applyMigrations } from "./db/migrations";
import {
  AUTH_ERROR_STATUS,
  AuthError,
  createSessionToken,
  loginTeacher,
  logoutTeacher,
  normalizeUsername,
  requireTeacher,
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_TTL_MS,
  TEACHER_SESSION_TTL_SECONDS,
  verifySessionToken,
} from "./auth";
import { hashPassword } from "./password";

const TEACHER_ID = "teacher_uji";
const DISPLAY_NAME = "Guru Uji";
const USERNAME = "guru_uji";
const PASSWORD = "sandi-uji-4c1e";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const OTHER_SECRET = "secret-lain-yang-juga-panjang-77aa";
const NOW = Date.UTC(2026, 0, 1, 10, 0, 0);

let db: Client;

beforeEach(async () => {
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;

  cookiesMock.mockClear();
  getReadyDbMock.mockClear();
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  db.close();
  dbRef.current = null;
});

async function seedTeacher(
  options: {
    id?: string;
    username?: string;
    password?: string;
    displayName?: string;
    withHash?: boolean;
  } = {},
): Promise<void> {
  const withHash = options.withHash ?? true;
  await db.execute({
    sql: "insert into teachers (id, display_name, username, password_hash) values (?, ?, ?, ?)",
    args: [
      options.id ?? TEACHER_ID,
      options.displayName ?? DISPLAY_NAME,
      options.username ?? USERNAME,
      withHash ? await hashPassword(options.password ?? PASSWORD) : null,
    ],
  });
}

describe("normalizeUsername", () => {
  it("memangkas spasi dan menurunkan huruf", () => {
    expect(normalizeUsername("  Guru_Budi ")).toBe("guru_budi");
    expect(normalizeUsername("")).toBe("");
  });
});

describe("token sesi", () => {
  it("membuat token yang bisa diverifikasi dan memuat identitas + exp", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifySessionToken(token, NOW)).toEqual({
      teacherId: TEACHER_ID,
      displayName: DISPLAY_NAME,
      exp: NOW + TEACHER_SESSION_TTL_MS,
    });
  });

  it("menerima token sampai tepat sebelum kedaluwarsa", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );

    expect(
      verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS - 1),
    ).not.toBe(null);
    expect(verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS)).toBeNull();
    expect(
      verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS + 1),
    ).toBeNull();
  });

  it("token lama tanpa displayName tetap diterima dengan nama netral", () => {
    const payload = Buffer.from(
      JSON.stringify({ teacherId: TEACHER_ID, exp: NOW + 1000 }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", SESSION_SECRET)
      .update(payload, "utf8")
      .digest("base64url");

    expect(verifySessionToken(`${payload}.${signature}`, NOW)).toEqual({
      teacherId: TEACHER_ID,
      displayName: "Guru",
      exp: NOW + 1000,
    });
  });

  it("menolak token yang diubah satu karakter", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );
    const last = token.at(-1);
    const replacement = last === "A" ? "B" : "A";
    const tampered = `${token.slice(0, -1)}${replacement}`;

    expect(verifySessionToken(tampered, NOW)).toBeNull();
  });

  it("menolak payload yang diubah walau tanda tangannya tetap", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );
    const [payload, signature] = token.split(".");
    const last = payload.at(-1);
    const replacement = last === "A" ? "B" : "A";
    const tampered = `${payload.slice(0, -1)}${replacement}.${signature}`;

    expect(verifySessionToken(tampered, NOW)).toBeNull();
  });

  it("menolak token yang ditandatangani secret lain", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );
    vi.stubEnv("TEACHER_SESSION_SECRET", OTHER_SECRET);

    expect(verifySessionToken(token, NOW)).toBeNull();
  });

  it("menolak token dengan format rusak", () => {
    const malformed = [
      "",
      "abc",
      "abc.def",
      "abc.def.ghi",
      "....",
      "!!!.???",
      "e30.",
      ".e30",
      "a".repeat(3000),
    ];

    for (const token of malformed) {
      expect(verifySessionToken(token, NOW)).toBeNull();
    }
  });

  it("menolak token bila TEACHER_SESSION_SECRET kosong", () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    expect(verifySessionToken(token, NOW)).toBeNull();
    expect(() =>
      createSessionToken({ teacherId: TEACHER_ID, displayName: DISPLAY_NAME }),
    ).toThrow(AuthError);
  });

  it("menolak identitas kosong saat membuat token", () => {
    expect(() =>
      createSessionToken({ teacherId: "", displayName: DISPLAY_NAME }, NOW),
    ).toThrow(AuthError);
    expect(() =>
      createSessionToken({ teacherId: TEACHER_ID, displayName: "" }, NOW),
    ).toThrow(AuthError);
  });
});

describe("loginTeacher — fail closed", () => {
  it("gagal saat TEACHER_SESSION_SECRET kosong dan tidak menyentuh database", async () => {
    await seedTeacher();
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    await expect(
      loginTeacher({ username: USERNAME, password: PASSWORD }),
    ).rejects.toBeInstanceOf(AuthError);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(getReadyDbMock).not.toHaveBeenCalled();
  });

  it("username atau password kosong ditolak tanpa query", async () => {
    await expect(
      loginTeacher({ username: "   ", password: PASSWORD }),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      loginTeacher({ username: USERNAME, password: "" }),
    ).rejects.toBeInstanceOf(AuthError);
    expect(getReadyDbMock).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("loginTeacher — kredensial", () => {
  it("menerima username + password yang benar lalu menyetel cookie", async () => {
    await seedTeacher();

    await loginTeacher({ username: USERNAME, password: PASSWORD });

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe(TEACHER_SESSION_COOKIE);
    expect(typeof token).toBe("string");
    expect(options).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: TEACHER_SESSION_TTL_SECONDS,
    });
    expect(verifySessionToken(token, Date.now())).toMatchObject({
      teacherId: TEACHER_ID,
      displayName: DISPLAY_NAME,
    });
  });

  it("memakai cookie secure di production", async () => {
    await seedTeacher();
    vi.stubEnv("NODE_ENV", "production");

    await loginTeacher({ username: USERNAME, password: PASSWORD });

    expect(cookieStore.set.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it("menerima username huruf besar dan spasi tepi", async () => {
    await seedTeacher();

    await loginTeacher({ username: "  GURU_UJI  ", password: PASSWORD });

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
  });

  it("menolak password salah, username tidak dikenal, dan akun tanpa hash", async () => {
    await seedTeacher();
    await seedTeacher({
      id: "teacher_tanpa_hash",
      username: "guru_lama",
      withHash: false,
    });

    const failures = [
      { username: USERNAME, password: "sandi-salah" },
      { username: "tidak_ada", password: PASSWORD },
      { username: "guru_lama", password: "" },
    ];

    for (const credentials of failures) {
      await expect(loginTeacher(credentials)).rejects.toMatchObject({
        name: "AuthError",
        code: "UNAUTHORIZED",
        status: AUTH_ERROR_STATUS.UNAUTHORIZED,
      });
    }

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("tidak menyimpan password mentah saat login", async () => {
    await seedTeacher();

    await loginTeacher({ username: USERNAME, password: PASSWORD });

    const row = await db.execute({
      sql: "select password_hash from teachers where id = ?",
      args: [TEACHER_ID],
    });
    const stored = String(row.rows[0]?.password_hash);
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain(PASSWORD);
  });
});

describe("logoutTeacher", () => {
  it("menghapus cookie sesi dengan path yang sama", async () => {
    await logoutTeacher();

    expect(cookieStore.delete).toHaveBeenCalledWith({
      name: TEACHER_SESSION_COOKIE,
      path: "/",
    });
  });
});

describe("requireTeacher", () => {
  it("menolak request tanpa cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(requireTeacher()).rejects.toMatchObject({
      name: "AuthError",
      code: "UNAUTHORIZED",
      status: AUTH_ERROR_STATUS.UNAUTHORIZED,
    });
  });

  it("menolak cookie rusak", async () => {
    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: "token-rusak",
    });

    await expect(requireTeacher()).rejects.toBeInstanceOf(AuthError);
  });

  it("menolak cookie yang ditandatangani secret lain", async () => {
    const token = createSessionToken(
      { teacherId: TEACHER_ID, displayName: DISPLAY_NAME },
      NOW,
    );
    vi.stubEnv("TEACHER_SESSION_SECRET", OTHER_SECRET);
    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: token,
    });

    await expect(requireTeacher()).rejects.toBeInstanceOf(AuthError);
  });

  it("mengembalikan identitas untuk cookie yang sah", async () => {
    const token = createSessionToken({
      teacherId: TEACHER_ID,
      displayName: DISPLAY_NAME,
    });
    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: token,
    });

    await expect(requireTeacher()).resolves.toEqual({
      teacherId: TEACHER_ID,
      displayName: DISPLAY_NAME,
    });
    expect(cookieStore.get).toHaveBeenCalledWith(TEACHER_SESSION_COOKIE);
  });
});

describe("pesan error", () => {
  it("tidak memuat username, password, token, atau secret", async () => {
    await seedTeacher();
    const token = createSessionToken({
      teacherId: TEACHER_ID,
      displayName: DISPLAY_NAME,
    });
    const errors: AuthError[] = [];

    await loginTeacher({ username: USERNAME, password: "sandi-salah" }).catch(
      (error: AuthError) => {
        errors.push(error);
      },
    );

    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: `${token}x`,
    });
    await requireTeacher().catch((error: AuthError) => {
      errors.push(error);
    });

    expect(errors).toHaveLength(2);
    for (const error of errors) {
      expect(error.message).not.toContain(PASSWORD);
      expect(error.message).not.toContain("sandi-salah");
      expect(error.message).not.toContain(SESSION_SECRET);
      expect(error.message).not.toContain(token);
    }
  });
});
