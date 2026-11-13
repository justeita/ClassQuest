import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ImageGuard } from "./ImageGuard";

/**
 * Penghalang gambar tampilan.
 *
 * Yang dijaga: klik-kanan dan seret pada `<img>` dicegah, sementara elemen lain
 * tidak ikut terganggu. Atribut `draggable`/`user-select` sendiri diatur lewat
 * CSS (`globals.css`), jadi tidak diuji di sini.
 */
function kirim(type: string, target: Element) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

afterEach(cleanup);

describe("ImageGuard", () => {
  it("mencegah klik-kanan dan seret pada gambar", () => {
    render(
      <>
        <ImageGuard />
        {createElement("img", {
          alt: "peta",
          src: "/assets/world/map_village.jpg",
        })}
      </>,
    );

    const gambar = screen.getByAltText("peta");
    expect(kirim("contextmenu", gambar).defaultPrevented).toBe(true);
    expect(kirim("dragstart", gambar).defaultPrevented).toBe(true);
  });

  it("tidak mengganggu klik-kanan pada elemen non-gambar", () => {
    render(
      <>
        <ImageGuard />
        {createElement("p", { "data-testid": "teks" }, "teks")}
      </>,
    );

    expect(
      kirim("contextmenu", screen.getByTestId("teks")).defaultPrevented,
    ).toBe(false);
  });
});
