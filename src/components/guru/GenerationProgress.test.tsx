import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationProgress } from "./GenerationProgress";

/**
 * Tampilan progres generasi.
 *
 * Yang diuji hanya bagian yang bisa rusak tanpa terlihat oleh typecheck: bilah
 * progres memakai `guru-progress-fill` (kilau berjalan) dan tahap yang sedang
 * dikerjakan memakai `guru-step-active` (denyut). Keduanya murni kelas CSS, jadi
 * tanpa test ini penghapusannya tidak akan gagal di mana pun.
 *
 * `next/navigation` di-stub karena komponen memanggil `router.refresh()` saat
 * job selesai; `fetch` di-stub supaya polling tidak menyentuh jaringan.
 */
const refresh = vi.fn();

// Objek router harus stabil: `useRouter()` di Next mengembalikan referensi yang
// sama antar-render, dan `GenerationProgress` memakainya sebagai dependency efek.
const router = { refresh, push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

beforeEach(() => {
  refresh.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ stage: "outlining", progress: 40 }),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GenerationProgress", () => {
  it("menandai bilah progres dan tahap aktif untuk dianimasikan", () => {
    render(
      <GenerationProgress
        jobId="job-1"
        initialStage="extracting"
        initialProgress={10}
      />,
    );

    const bar = screen.getByRole("status").querySelector(".guru-progress-fill");
    expect(bar).not.toBeNull();

    // Satu tahap aktif: "Membaca PDF" (stage `extracting` = indeks 0).
    const aktif = screen
      .getByRole("status")
      .querySelectorAll(".guru-step-active");
    expect(aktif).toHaveLength(1);
    expect(aktif[0].textContent).toContain("Membaca PDF");

    // Daftar langkah ikut berurutan masuk.
    expect(screen.getByRole("list")).toHaveClass("guru-stagger");
  });

  it("tidak menganimasikan tahap saat pemrosesan gagal", () => {
    render(
      <GenerationProgress
        jobId="job-2"
        initialStage="failed"
        initialProgress={0}
      />,
    );

    expect(
      screen.getByRole("status").querySelectorAll(".guru-step-active"),
    ).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toContain(
      "Pemrosesan gagal",
    );
  });

  it("terus memeriksa status setelah done sampai halaman menampilkan ringkasan", async () => {
    // Regresi: dulu polling berhenti tepat saat `done`. Kalau `router.refresh()`
    // tiba sebelum halaman melihat status cerita yang baru, kartu progres
    // berhenti selamanya di langkah terakhir walaupun cerita sudah tersimpan.
    vi.useFakeTimers();

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ stage: "done", progress: 100, version: 1 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GenerationProgress
        jobId="job-3"
        initialStage="validating"
        initialProgress={75}
      />,
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Menyiapkan ringkasan",
    );

    // Tick berikutnya tetap berjalan (komponen masih terpasang).
    await vi.advanceTimersByTimeAsync(1600);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);

    // `router.refresh()` tidak dipanggil berulang tiap tick.
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
