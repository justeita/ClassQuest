import { describe, expect, it } from "vitest";

import {
  dukungLayarPenuh,
  layarPenuhAktif,
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
