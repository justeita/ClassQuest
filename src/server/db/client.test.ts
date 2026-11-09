// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { getDb, resetDbForTests } from "./client";
import { DatabaseConnectionError, DatabaseQueryError } from "./errors";

const FAKE_TOKEN = "token-palsu-untuk-test-7c1e";
const INVALID_URL = "bukan-url-database";

afterEach(() => {
  resetDbForTests();
  vi.unstubAllEnvs();
});

describe("getDb", () => {
  it("mengembalikan instance yang sama pada pemanggilan berulang", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);

    const result = await first.execute("select 1 as nilai");
    expect(result.rows[0].nilai).toBe(1);
  });

  it("membuat instance baru setelah reset", () => {
    vi.stubEnv("DATABASE_URL", ":memory:");

    const first = getDb();
    resetDbForTests();
    const second = getDb();

    expect(second).not.toBe(first);
    expect(first.closed).toBe(true);
  });

  it("membungkus error query tanpa membocorkan SQL mentah", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    const db = getDb();

    try {
      await db.execute("ini bukan sql yang sah");
      expect.unreachable("query rusak harus gagal");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseQueryError);
      expect((error as Error).message).not.toContain("ini bukan sql yang sah");
    }
  });

  it("membungkus kegagalan membuat client tanpa membocorkan URL/token", () => {
    vi.stubEnv("DATABASE_URL", INVALID_URL);
    vi.stubEnv("DATABASE_AUTH_TOKEN", FAKE_TOKEN);

    try {
      getDb();
      expect.unreachable("URL tidak sah harus gagal");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseConnectionError);
      const message = (error as Error).message;
      expect(message).not.toContain(FAKE_TOKEN);
      expect(message).not.toContain(INVALID_URL);
    }
  });
});
