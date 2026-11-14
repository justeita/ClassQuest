import { afterEach, describe, expect, it } from "vitest";

import { elemenFokusable, fokusBerikutnya, tangkapTab } from "./fokusPermainan";

/** Wadah permainan tiruan: fokusabel secara program, seperti area`region`. */
function buatWadah(isi: string) {
  const wadah = document.createElement("div");
  wadah.tabIndex = -1;
  wadah.innerHTML = isi;
  document.body.append(wadah);
  return wadah;
}

function tombolDi(wadah: HTMLElement) {
  return Array.from(wadah.querySelectorAll<HTMLButtonElement>("button"));
}

function keydown(opsi: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
    ...opsi,
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("elemen fokus area permainan", () => {
  it("mengambil kontrol yang bisa dijangkau Tab, urut DOM", () => {
    const wadah = buatWadah(`
      <button id="a">A</button>
      <button id="b" disabled>B</button>
      <a href="#tujuan" id="c">C</a>
      <span tabindex="0" id="d">D</span>
      <span tabindex="-1" id="e">E</span>
      <button id="f" hidden>F</button>
    `);

    expect(elemenFokusable(wadah).map((elemen) => elemen.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("memutar maju dan mundur sampai kembali ke ujung", () => {
    const wadah = buatWadah(`
      <button id="a">A</button>
      <button id="b">B</button>
      <button id="c">C</button>
    `);
    const [a, b, c] = tombolDi(wadah);

    expect(fokusBerikutnya(wadah, null)).toBe(a);
    expect(fokusBerikutnya(wadah, a!)).toBe(b);
    expect(fokusBerikutnya(wadah, c!)).toBe(a);
    expect(fokusBerikutnya(wadah, a!, true)).toBe(c);
    expect(fokusBerikutnya(wadah, null, true)).toBe(c);
  });

  it("mengembalikan null bila area tidak punya kontrol", () => {
    const wadah = buatWadah("<p>Kosong</p>");

    expect(fokusBerikutnya(wadah, null)).toBeNull();
  });
});

describe("tangkapTab", () => {
  it("menarik fokus dari body ke kontrol pertama di area", () => {
    const wadah = buatWadah(`
      <button id="a">A</button>
      <button id="b">B</button>
    `);
    const [a] = tombolDi(wadah);
    const event = keydown();

    expect(tangkapTab(event, wadah, document.body)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
  });

  it("memutar fokus di dalam area, termasuk saat sudah di ujung", () => {
    const wadah = buatWadah(`
      <button id="a">A</button>
      <button id="b">B</button>
    `);
    const [a, b] = tombolDi(wadah);

    a!.focus();
    expect(tangkapTab(keydown(), wadah, a)).toBe(true);
    expect(document.activeElement).toBe(b);

    // Dari kontrol terakhir, Tab kembali ke kontrol pertama.
    expect(tangkapTab(keydown(), wadah, b)).toBe(true);
    expect(document.activeElement).toBe(a);
  });

  it("Shift+Tab berjalan mundur dan tetap di dalam area", () => {
    const wadah = buatWadah(`
      <button id="a">A</button>
      <button id="b">B</button>
    `);
    const [a, b] = tombolDi(wadah);

    a!.focus();
    expect(tangkapTab(keydown({ shiftKey: true }), wadah, a)).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it("tidak merebut fokus yang sedang berada di luar area", () => {
    const wadah = buatWadah(`<button id="a">A</button>`);
    const luar = document.createElement("button");
    document.body.append(luar);
    luar.focus();
    const event = keydown();

    expect(tangkapTab(event, wadah, luar)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(luar);
  });

  it("membiarkan Ctrl/Alt/Meta+Tab milik peramban", () => {
    const wadah = buatWadah(`<button id="a">A</button>`);

    for (const modifier of ["ctrlKey", "altKey", "metaKey"] as const) {
      const event = keydown({ [modifier]: true });
      expect(tangkapTab(event, wadah, document.body)).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it("tidak mengganggu tombol lain atau Tab yang sudah ditangani", () => {
    const wadah = buatWadah(`<button id="a">A</button>`);

    const escape = keydown({ key: "Escape" });
    expect(tangkapTab(escape, wadah, document.body)).toBe(false);

    const sudahDitangani = keydown();
    sudahDitangani.preventDefault();
    expect(tangkapTab(sudahDitangani, wadah, document.body)).toBe(false);
  });

  it("memfokuskan wadah sendiri bila tidak ada kontrol", () => {
    const wadah = buatWadah("<p>Kosong</p>");
    const event = keydown();

    expect(tangkapTab(event, wadah, document.body)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(wadah);
  });
});
