import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./LoginForm";
import { hardNavigate } from "./navigation";

/**
 * Form masuk guru.
 *
 * Yang dijaga: setelah login berhasil, pengarahan ke `/guru` harus satu langkah
 * (muat ulang penuh lewat `hardNavigate`). Pola lama `router.replace()` +
 * `router.refresh()` berjalan dalam satu transisi React, sehingga layar login
 * baru berganti setelah KEDUA permintaan RSC selesai — inilah penyebab halaman
 * terlihat beku saat server lambat.
 */

const replace = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push }),
}));

vi.mock("./navigation", () => ({ hardNavigate: vi.fn() }));

const hardNavigateMock = vi.mocked(hardNavigate);

beforeEach(() => {
  replace.mockClear();
  refresh.mockClear();
  push.mockClear();
  hardNavigateMock.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Isi form dan kirim; tombol dikembalikan supaya bisa dicek statusnya. */
function kirim() {
  const tombol = screen.getByRole("button", { name: /masuk ke portal/i });

  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "guru" },
  });
  fireEvent.change(screen.getByLabelText("Sandi"), {
    target: { value: "rahasia" },
  });
  fireEvent.click(tombol);

  return tombol;
}

describe("LoginForm", () => {
  it("mengarahkan dengan muat ulang penuh setelah login berhasil", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 })),
    );

    render(<LoginForm />);
    kirim();

    await waitFor(() => expect(hardNavigateMock).toHaveBeenCalledWith("/guru"));
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("tidak mengarahkan dan mengaktifkan tombol lagi saat kredensial ditolak", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 })),
    );

    render(<LoginForm />);
    const tombol = kirim();

    await waitFor(() => expect(tombol).toBeEnabled());

    expect(hardNavigateMock).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
