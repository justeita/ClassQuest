// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `next/headers` dan database di-mock supaya test ini fokus pada logika auth.
 * Cookie store palsu meniru `cookies()` async di Next 16.
 */
const { cookieStore, cookiesMock, executeMock, getReadyDbMock } = vi.hoisted(
  () => {
    const cookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    const executeMock = vi.fn(
      async (statement: { sql: string; args: unknown[] }) => {
        void statement;
        return { rows: [] };
      },
    );
    const getReadyDbMock = vi.fn(async () => ({ execute: executeMock }));

    return {
      cookieStore,
      cookiesMock: vi.fn(async () => cookieStore),
      executeMock,
      getReadyDbMock,
    };
  },
);

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("./db", () => ({ getReadyDb: getReadyDbMock }));

import {
  AUTH_ERROR_STATUS,
  AuthError,
  createSessionToken,
  ensureTeacherRow,
  loginTeacher,
  logoutTeacher,
  requireTeacher,
  TEACHER_DISPLAY_NAME,
  TEACHER_ID,
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_TTL_MS,
  TEACHER_SESSION_TTL_SECONDS,
  verifyAccessCode,
  verifySessionToken,
} from "./auth";

const ACCESS_CODE = "kode-demo-rahasia-4c1e";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const OTHER_SECRET = "secret-lain-yang-juga-panjang-77aa";
const NOW = Date.UTC(2026, 0, 1, 10, 0, 0);

beforeEach(() => {
  vi.stubEnv("TEACHER_ACCESS_CODE", ACCESS_CODE);
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("NODE_ENV", "test");

  cookiesMock.mockClear();
  getReadyDbMock.mockClear();
  executeMock.mockClear();
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyAccessCode", () => {
  it("menerima kode yang benar", () => {
    expect(verifyAccessCode(ACCESS_CODE)).toBe(true);
  });

  it("menolak kode yang salah", () => {
    expect(verifyAccessCode("kode-yang-salah")).toBe(false);
  });

  it("menolak kode kosong", () => {
    expect(verifyAccessCode("")).toBe(false);
  });

  it("menolak kode dengan panjang berbeda", () => {
    expect(verifyAccessCode(ACCESS_CODE.slice(0, -1))).toBe(false);
    expect(verifyAccessCode(`${ACCESS_CODE}xtra`)).toBe(false);
  });

  it("menolak semua kode saat TEACHER_ACCESS_CODE kosong", () => {
    vi.stubEnv("TEACHER_ACCESS_CODE", "");

    expect(verifyAccessCode("")).toBe(false);
    expect(verifyAccessCode(ACCESS_CODE)).toBe(false);
    expect(verifyAccessCode("apa-saja")).toBe(false);
  });
});

describe("token sesi", () => {
  it("membuat token yang bisa diverifikasi dan memuat teacherId + exp", () => {
    const token = createSessionToken(TEACHER_ID, NOW);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifySessionToken(token, NOW)).toEqual({
      teacherId: TEACHER_ID,
      exp: NOW + TEACHER_SESSION_TTL_MS,
    });
  });

  it("menerima token sampai tepat sebelum kedaluwarsa", () => {
    const token = createSessionToken(TEACHER_ID, NOW);

    expect(
      verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS - 1),
    ).not.toBe(null);
    expect(verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS)).toBeNull();
    expect(
      verifySessionToken(token, NOW + TEACHER_SESSION_TTL_MS + 1),
    ).toBeNull();
  });

  it("menolak token yang diubah satu karakter", () => {
    const token = createSessionToken(TEACHER_ID, NOW);
    const last = token.at(-1);
    const replacement = last === "A" ? "B" : "A";
    const tampered = `${token.slice(0, -1)}${replacement}`;

    expect(verifySessionToken(tampered, NOW)).toBeNull();
  });

  it("menolak payload yang diubah walau tanda tangannya tetap", () => {
    const token = createSessionToken(TEACHER_ID, NOW);
    const [payload, signature] = token.split(".");
    const last = payload.at(-1);
    const replacement = last === "A" ? "B" : "A";
    const tampered = `${payload.slice(0, -1)}${replacement}.${signature}`;

    expect(verifySessionToken(tampered, NOW)).toBeNull();
  });

  it("menolak token yang ditandatangani secret lain", () => {
    const token = createSessionToken(TEACHER_ID, NOW);
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
    const token = createSessionToken(TEACHER_ID, NOW);
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    expect(verifySessionToken(token, NOW)).toBeNull();
    expect(() => createSessionToken(TEACHER_ID, NOW)).toThrow(AuthError);
  });

  it("menolak teacherId kosong saat membuat token", () => {
    expect(() => createSessionToken("", NOW)).toThrow(AuthError);
  });
});

describe("loginTeacher — fail closed", () => {
  it("gagal saat kedua env kosong dan tidak menyetel cookie", async () => {
    vi.stubEnv("TEACHER_ACCESS_CODE", "");
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    await expect(loginTeacher(ACCESS_CODE)).rejects.toBeInstanceOf(AuthError);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(getReadyDbMock).not.toHaveBeenCalled();
  });

  it("gagal saat TEACHER_ACCESS_CODE kosong", async () => {
    vi.stubEnv("TEACHER_ACCESS_CODE", "");

    await expect(loginTeacher("")).rejects.toBeInstanceOf(AuthError);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("gagal saat TEACHER_SESSION_SECRET kosong walau kode benar", async () => {
    vi.stubEnv("TEACHER_SESSION_SECRET", "");

    await expect(loginTeacher(ACCESS_CODE)).rejects.toBeInstanceOf(AuthError);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(getReadyDbMock).not.toHaveBeenCalled();
  });

  it("tidak menyentuh database saat kode salah", async () => {
    await expect(loginTeacher("kode-salah")).rejects.toBeInstanceOf(AuthError);
    expect(getReadyDbMock).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("loginTeacher — sesi", () => {
  it("menyetel cookie httpOnly dengan atribut sesuai kontrak", async () => {
    await loginTeacher(ACCESS_CODE);

    expect(getReadyDbMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({
      sql: expect.stringContaining("insert into teachers"),
      args: [TEACHER_ID, TEACHER_DISPLAY_NAME],
    });
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
    expect(verifySessionToken(token)).toEqual({
      teacherId: TEACHER_ID,
      exp: expect.any(Number),
    });
  });

  it("memakai cookie secure di production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await loginTeacher(ACCESS_CODE);

    expect(cookieStore.set.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it("tidak menyimpan kode akses mentah di kolom access_code", async () => {
    await loginTeacher(ACCESS_CODE);

    const { sql, args } = executeMock.mock.calls[0][0];
    expect(sql).not.toContain("access_code");
    expect(args).not.toContain(ACCESS_CODE);
    expect(JSON.stringify(args)).not.toContain(ACCESS_CODE);
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
    const token = createSessionToken(TEACHER_ID, NOW);
    vi.stubEnv("TEACHER_SESSION_SECRET", OTHER_SECRET);
    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: token,
    });

    await expect(requireTeacher()).rejects.toBeInstanceOf(AuthError);
  });

  it("mengembalikan teacherId untuk cookie yang sah", async () => {
    const token = createSessionToken(TEACHER_ID);
    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: token,
    });

    await expect(requireTeacher()).resolves.toEqual({
      teacherId: TEACHER_ID,
    });
    expect(cookieStore.get).toHaveBeenCalledWith(TEACHER_SESSION_COOKIE);
  });
});

describe("ensureTeacherRow", () => {
  it("insert idempoten tanpa kode akses", async () => {
    await expect(ensureTeacherRow()).resolves.toBe(TEACHER_ID);
    await expect(ensureTeacherRow()).resolves.toBe(TEACHER_ID);

    expect(executeMock).toHaveBeenCalledTimes(2);
    for (const [statement] of executeMock.mock.calls) {
      expect(statement.sql).toContain("on conflict(id) do nothing");
      expect(statement.sql).not.toContain("access_code");
      expect(statement.args).toEqual([TEACHER_ID, TEACHER_DISPLAY_NAME]);
    }
  });
});

describe("pesan error", () => {
  it("tidak memuat kode akses, token, atau secret", async () => {
    const token = createSessionToken(TEACHER_ID);
    const errors: AuthError[] = [];

    await loginTeacher("kode-salah").catch((error: AuthError) => {
      errors.push(error);
    });

    cookieStore.get.mockReturnValue({
      name: TEACHER_SESSION_COOKIE,
      value: `${token}x`,
    });
    await requireTeacher().catch((error: AuthError) => {
      errors.push(error);
    });

    expect(errors).toHaveLength(2);
    for (const error of errors) {
      expect(error.message).not.toContain(ACCESS_CODE);
      expect(error.message).not.toContain(SESSION_SECRET);
      expect(error.message).not.toContain(token);
      expect(error.message).not.toContain("kode-salah");
    }
  });
});
