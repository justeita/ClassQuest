// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { migrateMock, getDbMock, fakeDb } = vi.hoisted(() => {
  const fakeDb = { execute: vi.fn() };
  return {
    fakeDb,
    migrateMock: vi.fn<() => Promise<void>>(),
    getDbMock: vi.fn(() => fakeDb),
  };
});

vi.mock("./migrations", () => ({ migrate: migrateMock }));
vi.mock("./client", () => ({ getDb: getDbMock }));

import { getReadyDb, resetReadyDbForTests } from "./ready";

beforeEach(() => {
  resetReadyDbForTests();
  migrateMock.mockReset();
  getDbMock.mockReset();
  getDbMock.mockReturnValue(fakeDb);
});

describe("getReadyDb", () => {
  it("menjalankan migrasi sekali untuk panggilan bersamaan", async () => {
    let resolveMigrate!: () => void;
    migrateMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMigrate = resolve;
        }),
    );

    const first = getReadyDb();
    const second = getReadyDb();

    expect(migrateMock).toHaveBeenCalledTimes(1);

    resolveMigrate();

    await expect(Promise.all([first, second])).resolves.toEqual([
      fakeDb,
      fakeDb,
    ]);
    expect(getDbMock).toHaveBeenCalledTimes(1);
  });

  it("tidak menjalankan ulang migrasi setelah sukses", async () => {
    migrateMock.mockResolvedValue(undefined);

    await expect(getReadyDb()).resolves.toBe(fakeDb);
    await expect(getReadyDb()).resolves.toBe(fakeDb);

    expect(migrateMock).toHaveBeenCalledTimes(1);
  });

  it("mencoba lagi setelah migrasi gagal", async () => {
    const failure = new Error("migrasi gagal");
    migrateMock.mockRejectedValueOnce(failure);

    await expect(getReadyDb()).rejects.toBe(failure);

    migrateMock.mockResolvedValueOnce(undefined);

    await expect(getReadyDb()).resolves.toBe(fakeDb);
    expect(migrateMock).toHaveBeenCalledTimes(2);
  });
});
