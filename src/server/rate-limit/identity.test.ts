// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Identitas klien untuk rate limit: sumber IP, hash HMAC, dan bentuk key.
 *
 * `next/headers` di-mock karena modul membaca `headers()` (async di Next 16).
 * Tidak ada IP atau secret asli di file ini; nilainya hanya untuk test.
 */

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));

import {
  clientIpFromHeaders,
  getClientIp,
  hashRateLimitIdentity,
  RATE_LIMIT_HASH_FALLBACK_SECRET,
  rateLimitKey,
  UNKNOWN_CLIENT_IP,
} from "./identity";

const SESSION_SECRET = "secret-uji-rate-limit-7e31";

const headerStore = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

beforeEach(() => {
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);
  headersMock.mockResolvedValue(headerStore({}));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("clientIpFromHeaders", () => {
  it("memakai x-real-ip lebih dulu", () => {
    const read = (name: string) =>
      name === "x-real-ip"
        ? "203.0.113.10"
        : name === "x-forwarded-for"
          ? "198.51.100.4, 198.51.100.5"
          : null;

    expect(clientIpFromHeaders(read)).toBe("203.0.113.10");
  });

  it("jatuh ke entri pertama x-forwarded-for", () => {
    const read = (name: string) =>
      name === "x-forwarded-for" ? " 198.51.100.4 , 198.51.100.5" : null;

    expect(clientIpFromHeaders(read)).toBe("198.51.100.4");
  });

  it('memakai "unknown" bila tidak ada header IP', () => {
    expect(clientIpFromHeaders(() => null)).toBe(UNKNOWN_CLIENT_IP);
    expect(
      clientIpFromHeaders((name) => (name === "x-real-ip" ? "  " : null)),
    ).toBe(UNKNOWN_CLIENT_IP);
  });
});

describe("getClientIp", () => {
  it('mengembalikan "unknown" bila header tidak tersedia (di luar request)', async () => {
    headersMock.mockRejectedValue(new Error("tidak ada request"));
    await expect(getClientIp()).resolves.toBe(UNKNOWN_CLIENT_IP);
  });

  it("membaca header request yang sedang berjalan", async () => {
    headersMock.mockResolvedValue(
      headerStore({ "x-forwarded-for": "198.51.100.7,10.0.0.1" }),
    );
    await expect(getClientIp()).resolves.toBe("198.51.100.7");
  });
});

describe("hashRateLimitIdentity", () => {
  it("menghasilkan hash heksadesimal 64 karakter yang stabil", () => {
    const first = hashRateLimitIdentity("ip:203.0.113.10");
    const second = hashRateLimitIdentity("ip:203.0.113.10");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain("203.0.113.10");
  });

  it("identitas berbeda menghasilkan hash berbeda", () => {
    expect(hashRateLimitIdentity("ip:203.0.113.10")).not.toBe(
      hashRateLimitIdentity("ip:203.0.113.11"),
    );
  });

  it("memakai secret tetap bila TEACHER_SESSION_SECRET kosong", () => {
    vi.stubEnv("TEACHER_SESSION_SECRET", "");
    const withEmpty = hashRateLimitIdentity("ip:203.0.113.10");

    vi.stubEnv("TEACHER_SESSION_SECRET", RATE_LIMIT_HASH_FALLBACK_SECRET);
    const withFallback = hashRateLimitIdentity("ip:203.0.113.10");

    expect(withEmpty).toBe(withFallback);
  });
});

describe("rateLimitKey", () => {
  it('berbentuk "<nama-limit>:<hash>" tanpa nilai mentah', () => {
    const key = rateLimitKey("login", "ip:203.0.113.10");

    expect(key.startsWith("login:")).toBe(true);
    expect(key).toBe(`login:${hashRateLimitIdentity("ip:203.0.113.10")}`);
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain(SESSION_SECRET);
  });
});
