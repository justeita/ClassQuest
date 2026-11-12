import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";
import { SelectMenu } from "./SelectMenu";

afterEach(cleanup);

/**
 * Perilaku modal yang terlihat langsung oleh guru: Escape menutup, klik latar
 * menutup, dan halaman di belakang tidak ikut menggulir.
 *
 * Kasus terpenting di sini adalah **lapisan**: dropdown custom di dalam modal
 * juga memakai Escape. Tanpa `stopPropagation`, satu Escape menutup daftar dan
 * modal sekaligus sehingga isian form hilang.
 */
describe("Modal", () => {
  it("Escape menutup modal", () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} labelledBy="judul">
        <p id="judul">Judul</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("klik latar menutup, klik isi tidak", () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} labelledBy="judul-2">
        <p id="judul-2">Judul</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("mengunci gulir halaman selama terbuka", () => {
    const onClose = vi.fn();
    const layar = render(
      <Modal open onClose={onClose} labelledBy="judul-3">
        <p id="judul-3">Judul</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    layar.unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("dropdown di dalam modal menangani Escape lebih dulu", () => {
    const onClose = vi.fn();
    const onChange = vi.fn();

    function Berlapis() {
      const [value, setValue] = useState("id");

      return (
        <Modal open onClose={onClose} labelledBy="judul-lapis">
          <p id="judul-lapis">Judul</p>
          <SelectMenu
            id="bahasa-lapis"
            value={value}
            onChange={(next) => {
              setValue(next);
              onChange(next);
            }}
            options={[
              { value: "id", label: "Bahasa Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
        </Modal>
      );
    }

    render(<Berlapis />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Escape di dokumen tidak menutup modal selagi daftar masih terbuka", () => {
    // Kasus nyata di browser: klik memindahkan fokus ke `body`, lalu Escape
    // tetap sampai ke pendengar `document` walaupun dropdown menanganinya.
    // Modal harus melihat sendiri apakah masih ada lapisan terbuka di dalamnya.
    const onClose = vi.fn();

    function Berlapis() {
      const [value, setValue] = useState("id");

      return (
        <Modal open onClose={onClose} labelledBy="judul-lapis-2">
          <p id="judul-lapis-2">Judul</p>
          <SelectMenu
            id="bahasa-lapis-2"
            value={value}
            onChange={setValue}
            options={[
              { value: "id", label: "Bahasa Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
        </Modal>
      );
    }

    render(<Berlapis />);

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    // Setelah daftar tertutup, Escape kembali menjadi milik modal.
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape yang sudah di-preventDefault lapisan dalam tidak menutup modal", () => {
    // Di browser, React memasang pendengar di `document`, jadi
    // `stopPropagation()` dari dropdown tidak menghalangi pendengar Modal.
    // Sinyal yang dipakai: `defaultPrevented`.
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} labelledBy="judul-klaim">
        <p id="judul-klaim">Judul</p>
        <div
          onKeyDown={(event) => {
            if (event.key === "Escape") event.preventDefault();
          }}
        >
          <button type="button">fokus di sini</button>
        </div>
      </Modal>,
    );

    const tombol = screen.getByRole("button", { name: "fokus di sini" });
    tombol.focus();
    fireEvent.keyDown(tombol, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();

    // Escape tanpa klaim tetap menutup.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
