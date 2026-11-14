import { describe, expect, it } from "vitest";

import { perangkatSentuh } from "@/game/sentuh";

/**
 * Aturan pemilih kontrol sentuh. Yang diuji bukan "apakah ada layar sentuh"
 * (laptop sentuh juga punya), melainkan apakah penunjuk **utama** memang jari:
 * `pointer: coarse` dan `hover: none`. Tanpa aturan ini joystick muncul di
 * laptop yang tidak pemain butuhkan.
 */
describe("perangkatSentuh", () => {
  it("memakai matchMedia bila tersedia, apa pun jumlah titik sentuhnya", () => {
    expect(
      perangkatSentuh({
        maxTouchPoints: 0,
        pointerCoarse: true,
        hoverNone: true,
        mediaQuery: true,
      }),
    ).toBe(true);
  });

  it("laptop layar sentuh tetap dianggap desktop: penunjuknya presisi dan bisa hover", () => {
    expect(
      perangkatSentuh({
        maxTouchPoints: 10,
        pointerCoarse: false,
        hoverNone: false,
        mediaQuery: true,
      }),
    ).toBe(false);
  });

  it("penunjuk hybrid (coarse + hover) tidak dianggap sentuh murni", () => {
    expect(
      perangkatSentuh({
        maxTouchPoints: 5,
        pointerCoarse: true,
        hoverNone: false,
        mediaQuery: true,
      }),
    ).toBe(false);
  });

  it("tanpa matchMedia jatuh ke maxTouchPoints", () => {
    expect(
      perangkatSentuh({
        maxTouchPoints: 5,
        pointerCoarse: false,
        hoverNone: false,
        mediaQuery: false,
      }),
    ).toBe(true);
    expect(
      perangkatSentuh({
        maxTouchPoints: 0,
        pointerCoarse: false,
        hoverNone: false,
        mediaQuery: false,
      }),
    ).toBe(false);
  });
});
