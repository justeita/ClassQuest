// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

/**
 * Penghitung rate limit di memori (tanpa database) untuk endpoint baca publik.
 *
 * `now` diinjeksi supaya perpindahan jendela bisa dites tanpa menunggu.
 */

import {
  createMemoryRateLimitStore,
  MEMORY_RATE_LIMIT_MAX_ENTRIES,
} from "./memory";

const T0 = Date.parse("2026-11-11T09:00:00.000Z");

let store: ReturnType<typeof createMemoryRateLimitStore>;

beforeEach(() => {
  store = createMemoryRateLimitStore();
});

const check = (options: {
  key?: string;
  limit?: number;
  windowSeconds?: number;
  now?: number;
}) =>
  store.check({
    key: options.key ?? "story-read:abc",
    limit: options.limit ?? 3,
    windowSeconds: options.windowSeconds ?? 60,
    now: options.now ?? T0,
  });

describe("memory rate limit", () => {
  it("mengizinkan sampai batas lalu menolak dengan retryAfterSeconds", () => {
    expect(check({})).toMatchObject({ allowed: true, remaining: 2 });
    expect(check({})).toMatchObject({ allowed: true, remaining: 1 });
    expect(check({})).toMatchObject({ allowed: true, remaining: 0 });

    expect(check({})).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });

    expect(check({ now: T0 + 20_000 }).retryAfterSeconds).toBe(40);
  });

  it("jendela berikutnya mengulang hitungan", () => {
    for (let i = 0; i < 4; i += 1) check({});
    expect(check({}).allowed).toBe(false);

    expect(check({ now: T0 + 60_000 })).toMatchObject({
      allowed: true,
      remaining: 2,
    });
  });

  it("key berbeda tidak saling memengaruhi", () => {
    for (let i = 0; i < 4; i += 1) check({});
    expect(check({ key: "story-read:def" })).toMatchObject({ allowed: true });
  });

  it("entri jendela lama dibersihkan saat map melewati batas", () => {
    for (let i = 0; i < MEMORY_RATE_LIMIT_MAX_ENTRIES + 5; i += 1) {
      store.check({
        key: `story-read:${i}`,
        limit: 10,
        windowSeconds: 60,
        now: T0,
      });
    }

    // Jendela baru: semua entri lama tidak berlaku dan dibersihkan.
    store.check({
      key: "story-read:baru",
      limit: 10,
      windowSeconds: 60,
      now: T0 + 120_000,
    });

    expect(store.size()).toBeLessThan(MEMORY_RATE_LIMIT_MAX_ENTRIES);
  });
});
