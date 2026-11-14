import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TouchControls } from "./TouchControls";

// `globals` tidak aktif di vitest.config.mjs, jadi RTL tidak membersihkan DOM
// sendiri di antara tes.
afterEach(cleanup);

/**
 * jsdom melaporkan `getBoundingClientRect()` sebagai kotak nol, jadi pusat pad
 * ada di (0,0): pergeseran sama dengan koordinat pointer yang dikirim. Itu cukup
 * untuk memeriksa kontrak tongkat → arah → callback, tanpa mengukur tata letak.
 */
function pad() {
  return screen.getByRole("group", { name: "Tongkat gerak" });
}

describe("TouchControls — tongkat", () => {
  it("menahan tongkat ke kanan mengirim arah kanan", () => {
    const onMove = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={onMove}
        onAksi={() => {}}
        aksi={null}
      />,
    );

    fireEvent.pointerDown(pad(), { pointerId: 1, clientX: 52, clientY: 0 });

    expect(onMove).toHaveBeenCalledWith("right");
  });

  it("pergeseran kecil di dalam deadzone tidak menggerakkan pemain", () => {
    const onMove = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={onMove}
        onAksi={() => {}}
        aksi={null}
      />,
    );

    fireEvent.pointerDown(pad(), { pointerId: 1, clientX: 5, clientY: 0 });

    expect(onMove).toHaveBeenCalledWith(null);
  });

  it("mengabaikan gerak sebelum tongkat ditekan", () => {
    const onMove = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={onMove}
        onAksi={() => {}}
        aksi={null}
      />,
    );

    fireEvent.pointerMove(pad(), { pointerId: 1, clientX: 52, clientY: 0 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("melepas tongkat mengirim null", () => {
    const onMove = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={onMove}
        onAksi={() => {}}
        aksi={null}
      />,
    );

    fireEvent.pointerDown(pad(), { pointerId: 1, clientX: 52, clientY: 0 });
    onMove.mockClear();
    fireEvent.pointerUp(pad(), { pointerId: 1 });

    expect(onMove).toHaveBeenCalledWith(null);
  });
});

describe("TouchControls — tombol aksi", () => {
  it("bertuliskan Bicara redup dan menampilkan pesan saat belum ada sasaran", () => {
    const onAksi = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={() => {}}
        onAksi={onAksi}
        aksi={null}
      />,
    );

    const tombol = screen.getByRole("button", { name: "Bicara" });
    expect(tombol).toBeEnabled();
    expect(tombol).toHaveTextContent("Bicara");
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(tombol);

    expect(onAksi).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Dekati warga untuk bicara",
    );
  });

  it("menyembunyikan pesan tanpa sasaran setelah beberapa saat", () => {
    vi.useFakeTimers();
    try {
      render(
        <TouchControls
          mode="dek"
          onMove={() => {}}
          onAksi={() => {}}
          aksi={null}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Bicara" }));
      expect(screen.getByRole("status")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2200);
      });
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("memicu aksi saat pemain di zona NPC", () => {
    const onAksi = vi.fn();
    render(
      <TouchControls
        mode="dek"
        onMove={() => {}}
        onAksi={onAksi}
        aksi="bicara"
      />,
    );

    const tombol = screen.getByRole("button", { name: "Bicara dengan warga" });
    expect(tombol).toBeEnabled();
    expect(tombol).toHaveTextContent("Bicara");
    fireEvent.click(tombol);
    expect(onAksi).toHaveBeenCalledTimes(1);
  });
});

describe("TouchControls — mode", () => {
  it("mode mengapung tidak memakai pembungkus dek", () => {
    const { container } = render(
      <TouchControls
        mode="mengapung"
        onMove={() => {}}
        onAksi={() => {}}
        aksi={null}
      />,
    );

    expect(
      container.querySelector('[data-kontrol-sentuh="mengapung"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-kontrol-sentuh="dek"]')).toBeNull();
  });

  it("menggeser tombol Bicara dari sudut saat mengapung, bukan di dek", () => {
    const { container } = render(
      <TouchControls
        mode="mengapung"
        onMove={() => {}}
        onAksi={() => {}}
        aksi="bicara"
      />,
    );

    // Bicara diberi margin ke kiri & ke atas supaya tidak terpotong tepi layar
    // di lanskap (ADR 0026).
    const geser = container.querySelector('[data-tombol-aksi="geser"]');
    expect(geser).not.toBeNull();
    expect(geser?.className).toContain("mr-6");
    expect(geser?.className).toContain("mb-6");

    cleanup();

    const dek = render(
      <TouchControls
        mode="dek"
        onMove={() => {}}
        onAksi={() => {}}
        aksi="bicara"
      />,
    );
    expect(
      dek.container.querySelector('[data-tombol-aksi="geser"]'),
    ).toBeNull();
  });
});
