import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bacaPengaturanAudio,
  clampVolume,
  dariPersen,
  KUNCI_PENGATURAN,
  simpanPengaturanAudio,
} from "./audioSettings";

describe("clampVolume", () => {
  it("memotong nilai di luar 0-1", () => {
    expect(clampVolume(1.5)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0.42)).toBe(0.42);
  });

  it("nilai bukan angka jatuh ke 1 (default kanal)", () => {
    expect(clampVolume("0.5")).toBe(1);
    expect(clampVolume(undefined)).toBe(1);
  });
});

describe("simpan dan baca pengaturan", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("menyimpan dan membaca kembali nilai yang sudah di-clamp", () => {
    simpanPengaturanAudio({ music: 0.7, sfx: 2 }, localStorage);

    const hasil = bacaPengaturanAudio(localStorage);
    expect(hasil).toEqual({ music: 0.7, sfx: 1 });
    expect(localStorage.getItem(KUNCI_PENGATURAN)).toBe(
      JSON.stringify({ music: 0.7, sfx: 1 }),
    );
  });

  it("tanpa data tersimpan kembali ke default", () => {
    expect(bacaPengaturanAudio(localStorage)).toEqual({ music: 1, sfx: 1 });
  });

  it("JSON rusak tidak melempar error", () => {
    localStorage.setItem(KUNCI_PENGATURAN, "{rusak");
    expect(bacaPengaturanAudio(localStorage)).toEqual({ music: 1, sfx: 1 });
  });

  it("bentuk tidak lengkap jatuh ke default", () => {
    localStorage.setItem(KUNCI_PENGATURAN, JSON.stringify({ music: 0.5 }));
    expect(bacaPengaturanAudio(localStorage)).toEqual({ music: 1, sfx: 1 });
  });

  it("storage yang ditolak tidak menghentikan permainan", () => {
    const ditolak: Storage = {
      ...localStorage,
      getItem: vi.fn(() => {
        throw new DOMException("denied");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("full");
      }),
    };

    expect(bacaPengaturanAudio(ditolak)).toEqual({ music: 1, sfx: 1 });
    expect(simpanPengaturanAudio({ music: 0.5, sfx: 0.5 }, ditolak)).toEqual({
      music: 0.5,
      sfx: 0.5,
    });
  });

  it("tanpa storage tetap mengembalikan nilai yang di-clamp", () => {
    expect(bacaPengaturanAudio(null)).toEqual({ music: 1, sfx: 1 });
    expect(simpanPengaturanAudio({ music: 0.3, sfx: -1 }, null)).toEqual({
      music: 0.3,
      sfx: 0,
    });
  });
});

describe("dariPersen", () => {
  it("mengubah persen slider menjadi 0-1", () => {
    expect(dariPersen(80, 0)).toEqual({ music: 0.8, sfx: 0 });
    expect(dariPersen(150, -5)).toEqual({ music: 1, sfx: 0 });
  });
});
