// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gerbang rate limit per endpoint (`guard*`) dan bentuk respons 429.
 *
 * - `next/headers` di-mock untuk header IP dan cookie sesi.
 * - `@/server/db` di-mock untuk client libSQL in-memory dan untuk memaksakan
 *   kegagalan limiter (fail closed vs fail open).
 */

const { headersMock, cookieStore, cookiesMock, dbRef } = vi.hoisted(() => {
  const headersMock = vi.fn();
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  const dbRef: { current: unknown | null; failWith: Error | null } = {
    current: null,
    failWith: null,
  };
  return { headersMock, cookieStore, cookiesMock: vi.fn(), dbRef };
});

vi.mock("next/headers", () => ({ headers: headersMock, cookies: cookiesMock }));

vi.mock("@/server/db", () => ({
  getReadyDb: async () => {
    if (dbRef.failWith !== null) throw dbRef.failWith;
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  },
}));

import { createClient, type Client } from "@libsql/client";

import { applyMigrations } from "@/server/db/migrations";
import {
  guardClassroomWrite,
  guardLogin,
  guardPlayResult,
  guardPublicStoryRead,
  guardUploadGlobal,
  guardUploadIp,
  guardUploadTeacher,
} from "./index";
import { RATE_LIMITED_MESSAGE, rateLimitedResponse } from "./response";
import {
  CLASSROOM_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  PLAY_RESULT_RATE_LIMIT,
  PUBLIC_STORY_RATE_LIMIT,
  UPLOAD_GLOBAL_RATE_LIMIT,
  UPLOAD_IP_RATE_LIMIT,
  UPLOAD_TEACHER_RATE_LIMIT,
} from "./limits";
import { memoryRateLimits } from "./memory";

const IP = "203.0.113.20";

const setIp = (ip: string) => {
  headersMock.mockResolvedValue({
    get: (name: string) =>
      name.toLowerCase() === "x-real-ip"
        ? ip
        : name.toLowerCase() === "x-forwarded-for"
          ? null
          : null,
  });
};

const IPV4 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

let db: Client;

const drain = async (
  guard: () => Promise<{ response: Response | null }>,
  times: number,
) => {
  for (let i = 0; i < times; i += 1) {
    const gate = await guard();
    expect(gate.response).toBeNull();
  }
};

beforeEach(async () => {
  vi.stubEnv("TEACHER_SESSION_SECRET", "secret-uji-gerbang-2f9a");
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  dbRef.failWith = null;
  setIp(IP);
  memoryRateLimits.clear();
  cookiesMock.mockResolvedValue(cookieStore);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  try {
    db.close();
  } catch {
    // In-memory.
  }
});

/**
 * `minRetryAfter` bawaan 1 detik, bukan nilai jendela: `retryAfter` adalah
 * **sisa** jendela berjalan, jadi nilainya menyusut sampai 1 detik tepat sebelum
 * jendela berganti. Yang diuji di sini: ada angka nyata, tidak melebihi panjang
 * jendela, dan konsisten dengan `details`.
 */
const expect429 = async (
  response: Response,
  minRetryAfter = 1,
  maxRetryAfter = 24 * 60 * 60,
) => {
  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toBe("no-store");

  const retryAfter = Number(response.headers.get("Retry-After"));
  expect(Number.isInteger(retryAfter)).toBe(true);
  expect(retryAfter).toBeGreaterThanOrEqual(minRetryAfter);
  expect(retryAfter).toBeLessThanOrEqual(maxRetryAfter);

  const body = (await response.json()) as {
    error: { code: string; message: string; details?: Record<string, unknown> };
  };
  expect(body.error.code).toBe("RATE_LIMITED");
  expect(body.error.message).toBe(RATE_LIMITED_MESSAGE);
  expect(body.error.details?.retryAfterSeconds).toBe(retryAfter);

  const text = JSON.stringify(body);
  expect(text).not.toContain(IP);
  expect(text).not.toMatch(IPV4);
  expect(text).not.toContain("secret-uji-gerbang");
  // Tidak ada hash (64 hex) di pesan.
  expect(text).not.toMatch(/[0-9a-f]{64}/);
};

describe("guardLogin", () => {
  it(`menolak percobaan ke-${LOGIN_RATE_LIMIT.limit + 1} dengan 429 dan Retry-After`, async () => {
    await drain(guardLogin, LOGIN_RATE_LIMIT.limit);

    const gate = await guardLogin();
    expect(gate.response).not.toBeNull();
    await expect429(gate.response as Response);
  });

  it("IP lain tidak terpengaruh batas IP pertama", async () => {
    await drain(guardLogin, LOGIN_RATE_LIMIT.limit);
    expect((await guardLogin()).response).not.toBeNull();

    setIp("203.0.113.21");
    expect((await guardLogin()).response).toBeNull();
  });
});

describe("guardUpload*", () => {
  it("menolak setelah batas per IP", async () => {
    await drain(guardUploadIp, UPLOAD_IP_RATE_LIMIT.limit);

    const gate = await guardUploadIp();
    await expect429(
      gate.response as Response,
      1,
      UPLOAD_IP_RATE_LIMIT.windowSeconds,
    );
  });

  it("menolak setelah batas per guru terlewati, apa pun IP-nya", async () => {
    await drain(
      () => guardUploadTeacher("teacher_demo"),
      UPLOAD_TEACHER_RATE_LIMIT.limit,
    );
    setIp("203.0.113.99");
    const gate = await guardUploadTeacher("teacher_demo");
    await expect429(
      gate.response as Response,
      1,
      UPLOAD_TEACHER_RATE_LIMIT.windowSeconds,
    );
  });

  it("menolak guru yang melewati batas per guru", async () => {
    await drain(
      () => guardUploadTeacher("teacher_demo"),
      UPLOAD_TEACHER_RATE_LIMIT.limit,
    );

    const gate = await guardUploadTeacher("teacher_demo");
    await expect429(
      gate.response as Response,
      1,
      UPLOAD_TEACHER_RATE_LIMIT.windowSeconds,
    );

    // Guru lain masih boleh.
    expect((await guardUploadTeacher("teacher_lain")).response).toBeNull();
  });

  it("batas global menolak guru mana pun", async () => {
    await drain(guardUploadGlobal, UPLOAD_GLOBAL_RATE_LIMIT.limit);

    await expect429(
      (await guardUploadGlobal()).response as Response,
      1,
      UPLOAD_GLOBAL_RATE_LIMIT.windowSeconds,
    );
  });

  it("limiter gagal → 500 generik (fail closed) tanpa detail", async () => {
    dbRef.failWith = new Error("SQLITE_BUSY: pesan driver rahasia");

    for (const guard of [guardLogin, guardUploadIp]) {
      const gate = await guard();
      const response = gate.response as Response | null;
      expect(response).not.toBeNull();
      expect((response as Response).status).toBe(500);

      const body = (await (response as Response).json()) as {
        error: Record<string, unknown>;
      };
      expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
      expect(body.error.code).toBe("INTERNAL");
      expect(JSON.stringify(body)).not.toContain("SQLITE_BUSY");
      expect(JSON.stringify(body)).not.toContain("rahasia");
    }
  });

  it("limiter gagal dengan sesi sah → batas guru dan global juga fail closed", async () => {
    dbRef.failWith = new Error("koneksi putus");

    expect((await guardUploadTeacher("teacher_demo")).response?.status).toBe(
      500,
    );
    expect((await guardUploadGlobal()).response?.status).toBe(500);
  });
});

describe("guardPlayResult", () => {
  it("menolak setelah batas per IP", async () => {
    await drain(guardPlayResult, PLAY_RESULT_RATE_LIMIT.limit);

    const gate = await guardPlayResult();
    expect(gate.response).not.toBeNull();
    expect(gate.result?.allowed).toBe(false);
    await expect429(gate.response as Response);
  });

  it("limiter gagal → diizinkan (fail open, tanpa respons)", async () => {
    dbRef.failWith = new Error("database mati");

    const gate = await guardPlayResult();
    expect(gate.response).toBeNull();
    expect(gate.result).toBeNull();
  });
});

describe("guardClassroomWrite", () => {
  it("menolak setelah batas per guru, guru lain tidak terpengaruh", async () => {
    for (let index = 0; index < CLASSROOM_RATE_LIMIT.limit; index += 1) {
      expect((await guardClassroomWrite("teacher_demo")).response).toBeNull();
    }

    await expect429(
      (await guardClassroomWrite("teacher_demo")).response as Response,
    );

    // Hitungan per guru, bukan global: guru lain masih bisa menyimpan.
    expect((await guardClassroomWrite("teacher_lain")).response).toBeNull();
  });

  it("limiter gagal → diizinkan (fail open, tanpa respons)", async () => {
    dbRef.failWith = new Error("database mati");

    const gate = await guardClassroomWrite("teacher_demo");
    expect(gate.response).toBeNull();
    expect(gate.result).toBeNull();
  });
});

describe("guardPublicStoryRead", () => {
  it("memakai in-memory: batas berlaku lalu jendela berganti", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-11T09:00:00.000Z"));

      await drain(guardPublicStoryRead, PUBLIC_STORY_RATE_LIMIT.limit);
      await expect429((await guardPublicStoryRead()).response as Response);

      vi.setSystemTime(new Date("2026-11-11T09:01:00.000Z"));
      expect((await guardPublicStoryRead()).response).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tidak menulis ke database", async () => {
    const before = await db.execute(
      "select count(*) as total from rate_limits",
    );

    for (let i = 0; i <= PUBLIC_STORY_RATE_LIMIT.limit; i += 1) {
      // Melewati batas pun tidak boleh menulis apa pun.
      await guardPublicStoryRead();
    }

    const after = await db.execute("select count(*) as total from rate_limits");
    expect(Number(after.rows[0].total)).toBe(Number(before.rows[0].total));
  });

  it("database error tidak memengaruhi baca publik (fail open)", async () => {
    dbRef.failWith = new Error("database mati");
    expect((await guardPublicStoryRead()).response).toBeNull();
  });
});

describe("rateLimitedResponse", () => {
  it("membulatkan Retry-After ke atas dan minimal satu detik", async () => {
    expect(rateLimitedResponse(0).headers.get("Retry-After")).toBe("1");
    expect(rateLimitedResponse(12.2).headers.get("Retry-After")).toBe("13");
  });
});
