// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cookie store palsu meniru `cookies()` async di Next 16. Logout tidak
 * menyentuh database, jadi cukup `next/headers` yang di-mock.
 */
const { cookieStore, cookiesMock } = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  return { cookieStore, cookiesMock: vi.fn(async () => cookieStore) };
});

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { TEACHER_SESSION_COOKIE } from "@/server/auth";

import { POST } from "./route";

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});

describe("POST /api/auth/logout", () => {
  it("menghapus cookie sesi dan menjawab 200 { ok: true }", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(cookieStore.delete).toHaveBeenCalledWith({
      name: TEACHER_SESSION_COOKIE,
      path: "/",
    });
  });

  it("aman dipanggil tanpa sesi", async () => {
    // Tidak ada cookie di store; logout tetap 200 dan tidak men-set cookie.
    cookieStore.get.mockReturnValue(undefined);

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
