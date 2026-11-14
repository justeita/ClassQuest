import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TombolPercepat } from "./TombolPercepat";

// `globals` tidak aktif di vitest.config.mjs, jadi RTL tidak membersihkan DOM
// sendiri di antara tes.
afterEach(cleanup);

function pasang() {
  const onMulai = vi.fn();
  const onHentikan = vi.fn();
  render(
    <TombolPercepat
      kelas="kelas-uji"
      onMulai={onMulai}
      onHentikan={onHentikan}
    />,
  );
  const tombol = screen.getByRole("button", { name: /percepat/i });
  return { onMulai, onHentikan, tombol };
}

describe("TombolPercepat", () => {
  it("mulai saat pointer ditekan dan berhenti saat dilepas", () => {
    const { onMulai, onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    expect(onMulai).toHaveBeenCalledTimes(1);
    expect(onHentikan).not.toHaveBeenCalled();

    // `pointerup` di luar tombol pun tetap dianggap pelepasan, karena didengar
    // dari window — inilah yang membuat tombol bertahan di peramban ponsel.
    fireEvent.pointerUp(window);
    expect(onHentikan).toHaveBeenCalledTimes(1);
  });

  it("berhenti saat pointer dibatalkan peramban", () => {
    const { onMulai, onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    expect(onMulai).toHaveBeenCalledTimes(1);

    fireEvent.pointerCancel(window);
    expect(onHentikan).toHaveBeenCalledTimes(1);
    expect(onMulai).toHaveBeenCalledTimes(1);
  });

  it("berhenti saat sentuhan berakhir, walau pointerup tidak pernah datang", () => {
    const { onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    fireEvent.touchEnd(window);

    expect(onHentikan).toHaveBeenCalledTimes(1);
  });

  it("tidak berhenti saat jempol hanya bergeser keluar tombol", () => {
    const { onMulai, onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    // Tanpa capture, jitter jempol memicu pointerleave; time-lapse tidak boleh
    // mati karenanya.
    fireEvent.pointerLeave(tombol);

    expect(onMulai).toHaveBeenCalledTimes(1);
    expect(onHentikan).not.toHaveBeenCalled();
  });

  it("menekan ulang saat masih ditahan tidak memulai dua kali", () => {
    const { onMulai, onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    fireEvent.pointerDown(tombol);
    expect(onMulai).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(window);
    // Pelepasan ganda (touchend menyusul pointerup) hanya berhenti sekali.
    fireEvent.touchEnd(window);
    expect(onHentikan).toHaveBeenCalledTimes(1);
  });

  it("melepas listener window setelah berhenti", () => {
    const { onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    fireEvent.pointerUp(window);
    expect(onHentikan).toHaveBeenCalledTimes(1);

    // Pelepasan berikutnya bukan lagi milik tombol ini.
    fireEvent.pointerUp(window);
    expect(onHentikan).toHaveBeenCalledTimes(1);
  });

  it("bisa ditahan lewat papan tombol (Enter/Space) tanpa auto-repeat", () => {
    const { onMulai, onHentikan, tombol } = pasang();

    fireEvent.keyDown(tombol, { key: "Enter", repeat: true });
    expect(onMulai).not.toHaveBeenCalled();

    fireEvent.keyDown(tombol, { key: "Enter" });
    expect(onMulai).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(tombol, { key: "Enter" });
    expect(onHentikan).toHaveBeenCalledTimes(1);
  });

  it("melepas listener window saat dilepas tombolnya", () => {
    const { onHentikan, tombol } = pasang();

    fireEvent.pointerDown(tombol);
    cleanup();

    // Komponen sudah dilepas, jadi pelepasan berikutnya tidak memanggil apa pun.
    fireEvent.pointerUp(window);
    expect(onHentikan).not.toHaveBeenCalled();
  });
});
