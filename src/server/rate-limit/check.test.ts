// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * `checkRateLimit` — penghitung fixed window di database (task 24).
 *
 * Memakai libSQL in-memory dan `now` yang diinjeksi, jadi tidak ada test yang
 * menunggu jendela sungguhan. Pembersihan oportunistik dimatikan di sebagian
 * besar test supaya jumlah statement bisa dihitung.
 */

import { applyMigrations } from "@/server/db/migrations";
import { checkRateLimit, windowStartOf } from "./check";
import { RATE_LIMIT_ROW_RETENTION_SECONDS } from "./limits";

const LIMIT = 5;
const WINDOW_SECONDS = 60;
const KEY =
  "login:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/** 2026-11-11T09:00:00.000Z — awal jendela 60 detik yang bersih. */
const T0 = Date.parse("2026-11-11T09:00:00.000Z");

let db: Client;

const call = (options: {
  key?: string;
  limit?: number;
  windowSeconds?: number;
  now?: number;
  random?: () => number;
  cleanup?: boolean;
}) =>
  checkRateLimit({
    key: options.key ?? KEY,
    limit: options.limit ?? LIMIT,
    windowSeconds: options.windowSeconds ?? WINDOW_SECONDS,
    now: options.now ?? T0,
    getDb: async () => db,
    ...(options.random === undefined ? {} : { random: options.random }),
    ...(options.cleanup === undefined ? {} : { cleanup: options.cleanup }),
  });

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
});

afterEach(() => {
  try {
    db.close();
  } catch {
    // In-memory; tidak ada yang perlu diselamatkan.
  }
});

describe("checkRateLimit — ambang", () => {
  it("mengizinkan permintaan di bawah batas dan menghitung sisa kuota", async () => {
    for (let i = 1; i < LIMIT; i += 1) {
      const result = await call({ cleanup: false });
      expect(result).toEqual({
        allowed: true,
        remaining: LIMIT - i,
        retryAfterSeconds: 0,
      });
    }
  });

  it("mengizinkan permintaan tepat di batas dengan sisa 0", async () => {
    for (let i = 1; i < LIMIT; i += 1) await call({ cleanup: false });

    const result = await call({ cleanup: false });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("menolak permintaan yang melewati batas dan tidak pernah negatif", async () => {
    for (let i = 1; i <= LIMIT; i += 1) await call({ cleanup: false });

    const over = await call({ cleanup: false });
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);

    const farOver = await call({ cleanup: false });
    expect(farOver.allowed).toBe(false);
    expect(farOver.remaining).toBe(0);
  });

  it("menghitung retryAfterSeconds sampai akhir jendela", async () => {
    for (let i = 1; i <= LIMIT; i += 1) await call({ cleanup: false });

    // 15 detik setelah awal jendela 60 detik → 45 detik tersisa.
    const result = await call({ now: T0 + 15_000, cleanup: false });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(45);

    // Tepat di detik terakhir jendela → minimal 1 detik.
    const last = await call({ now: T0 + 59_999, cleanup: false });
    expect(last.retryAfterSeconds).toBe(1);
  });

  it("jendela baru mengulang hitungan", async () => {
    for (let i = 1; i <= LIMIT; i += 1) await call({ cleanup: false });
    expect((await call({ cleanup: false })).allowed).toBe(false);

    const nextWindow = await call({
      now: T0 + WINDOW_SECONDS * 1000,
      cleanup: false,
    });
    expect(nextWindow).toEqual({
      allowed: true,
      remaining: LIMIT - 1,
      retryAfterSeconds: 0,
    });
  });

  it("key berbeda tidak saling memengaruhi", async () => {
    for (let i = 1; i <= LIMIT; i += 1) await call({ cleanup: false });

    const other = await call({ key: `${KEY}-lain`, cleanup: false });
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(LIMIT - 1);
  });
});

describe("checkRateLimit — atomisitas", () => {
  it("50 panggilan paralel menghasilkan hitungan tepat", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => call({ cleanup: false })),
    );

    const allowed = results.filter((result) => result.allowed).length;
    expect(allowed).toBe(LIMIT);
    expect(results.filter((result) => !result.allowed)).toHaveLength(
      50 - LIMIT,
    );

    const row = await db.execute({
      sql: "select count from rate_limits where key = ? and window_start = ?",
      args: [KEY, windowStartOf(T0, WINDOW_SECONDS)],
    });
    expect(Number(row.rows[0].count)).toBe(50);

    // Sisa kuota yang dilaporkan adalah kuota setelah permintaan itu dihitung,
    // jadi himpunan nilainya harus unik dan tidak berulang.
    const remainings = results
      .filter((result) => result.allowed)
      .map((result) => result.remaining)
      .sort((a, b) => a - b);
    expect(remainings).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("checkRateLimit — pembersihan oportunistik", () => {
  it("menghapus baris lama dan tidak menghapus yang baru", async () => {
    // `window_start` disimpan dalam detik epoch, sama seperti `checkRateLimit`.
    const nowSeconds = Math.floor(T0 / 1000);
    const oldWindow =
      nowSeconds - RATE_LIMIT_ROW_RETENTION_SECONDS - WINDOW_SECONDS;
    await db.execute({
      sql: "insert into rate_limits (key, window_start, count) values (?, ?, 3)",
      args: ["login:baris-lama", oldWindow],
    });
    await db.execute({
      sql: "insert into rate_limits (key, window_start, count) values (?, ?, 2)",
      args: ["login:baris-baru", nowSeconds],
    });

    // `random()` = 0 → selalu di bawah peluang pembersihan.
    await call({ random: () => 0 });

    const remaining = await db.execute(
      "select key from rate_limits order by key",
    );
    const keys = remaining.rows.map((row) => String(row.key));

    expect(keys).toContain("login:baris-baru");
    expect(keys).not.toContain("login:baris-lama");
    expect(keys).toContain(KEY);
  });

  it("tidak membersihkan saat undian di atas peluang", async () => {
    const oldWindow =
      Math.floor(T0 / 1000) - RATE_LIMIT_ROW_RETENTION_SECONDS - WINDOW_SECONDS;
    await db.execute({
      sql: "insert into rate_limits (key, window_start, count) values (?, ?, 3)",
      args: ["login:baris-lama", oldWindow],
    });

    await call({ random: () => 0.999 });

    const remaining = await db.execute({
      sql: "select key from rate_limits where key = ?",
      args: ["login:baris-lama"],
    });
    expect(remaining.rows).toHaveLength(1);
  });

  it("kegagalan pembersihan tidak menggagalkan pemeriksaan", async () => {
    // Client yang hanya menggagalkan statement pembersihan (`delete ...`).
    const flaky = new Proxy(db, {
      get(target, property) {
        if (property !== "execute")
          return Reflect.get(target, property, target);
        return async (query: unknown) => {
          const sql =
            typeof query === "string" ? query : (query as { sql: string }).sql;
          if (sql.trim().toLowerCase().startsWith("delete")) {
            throw new Error("pembersihan gagal");
          }
          return target.execute(query as never);
        };
      },
    }) as Client;

    const result = await checkRateLimit({
      key: KEY,
      limit: LIMIT,
      windowSeconds: WINDOW_SECONDS,
      now: T0,
      getDb: async () => flaky,
      random: () => 0,
    });

    expect(result.allowed).toBe(true);
  });
});

describe("checkRateLimit — privasi", () => {
  it("tabel tidak menyimpan IP mentah di kolom key", async () => {
    await call({ key: "login:nilai-yang-sudah-di-hash", cleanup: false });

    const rows = await db.execute(
      "select key, window_start, count from rate_limits",
    );
    const text = JSON.stringify(rows.rows);

    // Tidak ada bentuk IPv4/IPv6 di isi tabel.
    expect(text).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    expect(text).not.toMatch(/[0-9a-f]{0,4}:[0-9a-f]{1,4}::?/i);
  });
});

describe("checkRateLimit — masukan tidak sah", () => {
  it("menolak limit atau window yang tidak masuk akal", async () => {
    await expect(call({ limit: 0 })).rejects.toBeInstanceOf(RangeError);
    await expect(call({ windowSeconds: 0 })).rejects.toBeInstanceOf(RangeError);
    await expect(call({ limit: 1.5 })).rejects.toBeInstanceOf(RangeError);
  });
});

describe("windowStartOf", () => {
  it("membulatkan ke bawah ke kelipatan jendela", () => {
    expect(windowStartOf(T0 + 5_000, 60)).toBe(T0 / 1000);
    expect(windowStartOf(T0 + 61_000, 60)).toBe(T0 / 1000 + 60);
    expect(windowStartOf(T0 + 59_999, 3600)).toBe(T0 / 1000);
  });
});
