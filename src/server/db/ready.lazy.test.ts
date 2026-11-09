// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const { migrateMock, getDbMock } = vi.hoisted(() => ({
  migrateMock: vi.fn(),
  getDbMock: vi.fn(),
}));

vi.mock("./migrations", () => ({ migrate: migrateMock }));
vi.mock("./client", () => ({ getDb: getDbMock }));

afterEach(() => {
  vi.resetModules();
  migrateMock.mockReset();
  getDbMock.mockReset();
});

describe("import modul ready", () => {
  it("tidak menjalankan migrasi atau membuat client saat diimpor", async () => {
    vi.resetModules();

    await import("./ready");

    expect(migrateMock).not.toHaveBeenCalled();
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
