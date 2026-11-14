import { describe, expect, it, vi } from "vitest";

import {
  dukungLayarPenuh,
  layarPenuhAktif,
  masukLayarPenuhLanskap,
  ORIENTASI_PERMAINAN,
} from "@/game/layarPenuh";

/**
 * Predikat status layar penuh dipisah dari peramban supaya bisa diuji langsung.
 * Pemeriksaannya hanya membaca satu properti dokumen, jadi objek tiruan biasa
 * sudah cukup.
 */
describe("layarPenuhAktif", () => {
  it("false tanpa dokumen atau tanpa elemen yang tampil penuh", () => {
    expect(layarPenuhAktif(null)).toBe(false);
    expect(layarPenuhAktif(undefined)).toBe(false);
    expect(
      layarPenuhAktif({ fullscreenElement: null } as unknown as Document),
    ).toBe(false);
  });

  it("true saat ada elemen yang tampil penuh", () => {
    expect(
      layarPenuhAktif({ fullscreenElement: {} } as unknown as Document),
    ).toBe(true);
  });
});

describe("dukungLayarPenuh", () => {
  it("mengikuti fullscreenEnabled dokumen", () => {
    expect(dukungLayarPenuh(null)).toBe(false);
    expect(dukungLayarPenuh(undefined)).toBe(false);
    expect(
      dukungLayarPenuh({ fullscreenEnabled: false } as unknown as Document),
    ).toBe(false);
    expect(
      dukungLayarPenuh({ fullscreenEnabled: true } as unknown as Document),
    ).toBe(true);
  });
});

describe("ORIENTASI_PERMAINAN", () => {
  it("meminta orientasi mendatar", () => {
    expect(ORIENTASI_PERMAINAN).toBe("landscape");
  });
});

/** Dokumen tiruan dengan `requestFullscreen` yang bisa diamati. */
function dokumenTiruan({
  didukung = true,
  sudahPenuh = false,
  gagal = false,
}: { didukung?: boolean; sudahPenuh?: boolean; gagal?: boolean } = {}) {
  const requestFullscreen = gagal
    ? vi.fn().mockRejectedValue(new Error("ditolak"))
    : vi.fn().mockResolvedValue(undefined);
  return {
    doc: {
      fullscreenEnabled: didukung,
      fullscreenElement: sudahPenuh ? {} : null,
      documentElement: { requestFullscreen },
    } as unknown as Document,
    requestFullscreen,
  };
}

/** Orientasi tiruan dengan `lock` yang bisa diamati. */
function orientasiTiruan({ gagal = false } = {}) {
  const lock = gagal
    ? vi.fn().mockRejectedValue(new Error("tidak didukung"))
    : vi.fn().mockResolvedValue(undefined);
  return { orientation: { lock } as unknown as ScreenOrientation, lock };
}

describe("masukLayarPenuhLanskap", () => {
  it("meminta layar penuh lalu mengunci lanskap", async () => {
    const { doc, requestFullscreen } = dokumenTiruan();
    const { orientation, lock } = orientasiTiruan();

    await expect(masukLayarPenuhLanskap(doc, orientation)).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: "hide" });
    expect(lock).toHaveBeenCalledWith("landscape");
  });

  it("mengunci lanskap tanpa meminta ulang bila sudah layar penuh", async () => {
    const { doc, requestFullscreen } = dokumenTiruan({ sudahPenuh: true });
    const { orientation, lock } = orientasiTiruan();

    await expect(masukLayarPenuhLanskap(doc, orientation)).resolves.toBe(true);
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith("landscape");
  });

  it("tidak meminta apa pun bila peramban tidak mendukung", async () => {
    const { doc, requestFullscreen } = dokumenTiruan({ didukung: false });

    await expect(masukLayarPenuhLanskap(doc, null)).resolves.toBe(false);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("melaporkan gagal bila layar penuh ditolak dan tidak mengunci orientasi", async () => {
    const { doc } = dokumenTiruan({ gagal: true });
    const { orientation, lock } = orientasiTiruan();

    await expect(masukLayarPenuhLanskap(doc, orientation)).resolves.toBe(false);
    expect(lock).not.toHaveBeenCalled();
  });

  it("tetap berhasil saat kunci orientasi ditolak", async () => {
    const { doc } = dokumenTiruan();
    const { orientation } = orientasiTiruan({ gagal: true });

    await expect(masukLayarPenuhLanskap(doc, orientation)).resolves.toBe(true);
  });
});
