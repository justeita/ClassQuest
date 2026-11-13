import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalShell } from "./PortalShell";

/**
 * Kerangka portal guru.
 *
 * Yang dijaga: keluar akun hanya melakukan `router.replace("/guru/masuk")`.
 * `router.refresh()` setelah navigasi tidak boleh kembali — ia menggandakan
 * permintaan dan menahan transisi sampai keduanya selesai.
 */

const replace = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/guru",
  useRouter: () => ({ replace, refresh, push }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PortalShell", () => {
  it("kembali ke halaman masuk tanpa refresh tambahan saat keluar akun", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 204 })),
    );

    render(<PortalShell teacherName="Guru Demo">konten</PortalShell>);
    fireEvent.click(screen.getByRole("button", { name: /keluar akun/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/guru/masuk"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
