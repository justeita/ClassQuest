// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@libsql/client", () => ({
  createClient: createClientMock,
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  createClientMock.mockReset();
});

describe("import modul database", () => {
  it("tidak membuat client atau efek samping saat modul diimpor", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    vi.resetModules();

    await import("./client");

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("membuat client hanya saat getDb() pertama kali dipanggil", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    vi.resetModules();

    const fakeClient = {
      execute: vi.fn(),
      close: vi.fn(),
    };
    createClientMock.mockReturnValue(fakeClient);

    const { getDb } = await import("./client");
    expect(createClientMock).not.toHaveBeenCalled();

    const db = getDb();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(db).toBeDefined();
    expect(createClientMock).toHaveBeenCalledWith({ url: ":memory:" });
  });

  it("memetakan error 401 dari driver ke code AUTH", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    vi.resetModules();

    createClientMock.mockReturnValue({
      execute: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Unauthorized"), { status: 401 }),
        ),
      close: vi.fn(),
    });

    const { getDb } = await import("./client");

    await expect(getDb().execute("select 1")).rejects.toMatchObject({
      code: "AUTH",
    });
  });

  it("memetakan kegagalan koneksi driver ke code NETWORK", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    vi.resetModules();

    createClientMock.mockReturnValue({
      execute: vi.fn().mockRejectedValue(
        Object.assign(new Error("getaddrinfo ENOTFOUND"), {
          code: "ENOTFOUND",
        }),
      ),
      close: vi.fn(),
    });

    const { getDb } = await import("./client");

    await expect(getDb().execute("select 1")).rejects.toMatchObject({
      code: "NETWORK",
    });
  });
});
