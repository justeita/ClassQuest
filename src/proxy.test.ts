// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gerbang 404 `/play/[storyId]`.
 *
 * Yang diuji hanya keputusan proxy: diteruskan, ditulis ulang ke `/_not-found`,
 * atau gagal-terbuka saat database bermasalah. `getPlayableStory` di-mock
 * supaya test tidak butuh database.
 */

const { getPlayableStoryMock } = vi.hoisted(() => ({
  getPlayableStoryMock: vi.fn(),
}));

vi.mock("@/server/stories", () => ({
  getPlayableStory: getPlayableStoryMock,
}));

import { config, proxy } from "./proxy";

const call = (path: string) =>
  proxy(new NextRequest(new URL(path, "http://localhost")));

const rewrittenTo = (res: Response) => res.headers.get("x-middleware-rewrite");

const isPassThrough = (res: Response) =>
  res.headers.get("x-middleware-next") === "1";

beforeEach(() => {
  getPlayableStoryMock.mockReset();
});

describe("proxy /play/[storyId]", () => {
  it("hanya mencocokkan satu segmen /play", () => {
    expect(config.matcher).toBe("/play/:storyId");
  });

  it("meneruskan cerita yang boleh dimainkan", async () => {
    getPlayableStoryMock.mockResolvedValue({ meta: { id: "st_ok" } });

    const res = await call("/play/st_ok");

    expect(isPassThrough(res)).toBe(true);
    expect(rewrittenTo(res)).toBeNull();
    expect(getPlayableStoryMock).toHaveBeenCalledWith("st_ok");
  });

  it("menulis ulang cerita yang tidak ada ke /_not-found", async () => {
    getPlayableStoryMock.mockResolvedValue(null);

    const res = await call("/play/st_tidak_ada");

    expect(rewrittenTo(res)).toContain("/_not-found");
    expect(isPassThrough(res)).toBe(false);
  });

  it("mendekode id di URL", async () => {
    getPlayableStoryMock.mockResolvedValue(null);

    await call("/play/st%20spasi");

    expect(getPlayableStoryMock).toHaveBeenCalledWith("st spasi");
  });

  it("meneruskan sub-path tanpa menyentuh database", async () => {
    const res = await call("/play/st_ok/extra");

    expect(isPassThrough(res)).toBe(true);
    expect(getPlayableStoryMock).not.toHaveBeenCalled();
  });

  it("gagal-terbuka saat pembacaan database melempar", async () => {
    getPlayableStoryMock.mockRejectedValue(new Error("db down"));

    const res = await call("/play/st_ok");

    expect(isPassThrough(res)).toBe(true);
    expect(rewrittenTo(res)).toBeNull();
  });
});
