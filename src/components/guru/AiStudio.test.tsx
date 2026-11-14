import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiStudio } from "./AiStudio";

/**
 * AI Studio.
 *
 * Yang dijaga: saat sesi berakhir (respons `401`), komponen hanya memanggil
 * `router.replace("/guru/masuk")`. `router.refresh()` setelah navigasi tidak
 * boleh kembali — ia menggandakan permintaan dan menahan transisi sampai
 * keduanya selesai (gejala halaman terlihat beku).
 */

const replace = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push }),
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

describe("AiStudio", () => {
  it("kembali ke halaman masuk tanpa refresh tambahan saat sesi berakhir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 })),
    );

    const { container } = render(<AiStudio maxBytes={5_000_000} />);

    // Pilih berkas PDF: cukup bentuknya (nama/tipe/size) karena validasi klien
    // hanya menyaring awal; server tetap memvalidasi ulang.
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [
          new File(["%PDF-1.4"], "materi.pdf", { type: "application/pdf" }),
        ],
      },
    });

    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "Biologi" },
    });

    fireEvent.click(screen.getByRole("combobox", { name: /jenjang/i }));
    const opsi = await screen.findAllByRole("option");
    fireEvent.click(opsi[0]);

    fireEvent.click(screen.getByRole("combobox", { name: /mode permainan/i }));
    const modeOpsi = await screen.findAllByRole("option");
    fireEvent.click(modeOpsi[0]);

    const kirim = screen.getByRole("button", { name: /buat cerita/i });
    await waitFor(() => expect(kirim).toBeEnabled());
    fireEvent.click(kirim);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/guru/masuk"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("tidak bisa dikirim sebelum mode permainan dipilih", async () => {
    const { container } = render(<AiStudio maxBytes={5_000_000} />);

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [
          new File(["%PDF-1.4"], "materi.pdf", { type: "application/pdf" }),
        ],
      },
    });
    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "Biologi" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /jenjang/i }));
    fireEvent.click((await screen.findAllByRole("option"))[0]);

    const kirim = screen.getByRole("button", { name: /buat cerita/i });
    expect(kirim).toBeDisabled();

    fireEvent.click(screen.getByRole("combobox", { name: /mode permainan/i }));
    fireEvent.click((await screen.findAllByRole("option"))[1]);

    await waitFor(() => expect(kirim).toBeEnabled());
  });

  it("mengirim mode permainan yang dipilih ke /api/upload", async () => {
    // Tipe parameter dideklarasikan supaya `fetchMock.mock.calls[0][1]` punya
    // bentuk `RequestInit`.
    const fetchMock = vi.fn<
      (
        url: string,
        init: RequestInit,
      ) => Promise<{
        status: number;
        json: () => Promise<{ storyId: string }>;
      }>
    >(async () => ({
      status: 202,
      json: async () => ({ storyId: "st_baru" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<AiStudio maxBytes={5_000_000} />);

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [
          new File(["%PDF-1.4"], "materi.pdf", { type: "application/pdf" }),
        ],
      },
    });
    fireEvent.change(screen.getByLabelText(/mata pelajaran/i), {
      target: { value: "Biologi" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /jenjang/i }));
    fireEvent.click((await screen.findAllByRole("option"))[0]);

    fireEvent.click(screen.getByRole("combobox", { name: /mode permainan/i }));
    const modeOptions = await screen.findAllByRole("option");
    // Pilihan kedua adalah "Pertanyaan" (kuis padat).
    fireEvent.click(modeOptions[1]);

    fireEvent.click(screen.getByRole("button", { name: /buat cerita/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0][1] as { body: FormData };
    expect(init.body.get("mode")).toBe("pertanyaan");
    expect(push).toHaveBeenCalledWith("/guru/materi/st_baru");
  });
});
