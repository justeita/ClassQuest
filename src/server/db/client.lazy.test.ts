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
});
