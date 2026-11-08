import { describe, expect, it } from "vitest";

import { GET } from "./route";

/**
 * Kontrak respons mengikuti `docs/06-backend/api-contract.md`.
 *
 * Yang diuji adalah bentuknya (field ada dan bertipe benar), bukan nilai
 * persisnya: `version` dan `commit` berbeda per lingkungan build, dan `time`
 * selalu berubah.
 */
describe("GET /api/health", () => {
  it("mengembalikan status 200", async () => {
    const response = GET();

    expect(response.status).toBe(200);
  });

  it("mengembalikan body sesuai kontrak", async () => {
    const response = GET();
    const body: unknown = await response.json();

    expect(body).toMatchObject({ ok: true });
    expect(body).toEqual({
      ok: true,
      version: expect.any(String),
      commit: expect.any(String),
      time: expect.any(String),
    });
  });

  it("time adalah tanggal ISO yang valid", async () => {
    const body = (await GET().json()) as { time: string };

    expect(Number.isNaN(new Date(body.time).getTime())).toBe(false);
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  it("tidak membocorkan detail internal", async () => {
    const body = (await GET().json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual([
      "commit",
      "ok",
      "time",
      "version",
    ]);
  });
});
