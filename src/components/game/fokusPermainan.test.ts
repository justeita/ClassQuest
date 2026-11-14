import { afterEach, describe, expect, it } from "vitest";

import { tangkapTab } from "./fokusPermainan";

/** Wadah permainan tiruan: fokusabel secara program, seperti area `region`. */
function buatWadah(isi = "") {
  const wadah = document.createElement("div");
  wadah.tabIndex = -1;
  wadah.innerHTML = isi;
  document.body.append(wadah);
  return wadah;
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

describe("tangkapTab", () => {
  it("menahan Tab dan menarik fokus kembali ke area permainan", () => {
    const wadah = buatWadah();
    const tombol = document.createElement("button");
    wadah.append(tombol);
    tombol.focus();
    const event = keydown();

    expect(tangkapTab(event, wadah)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(wadah);
  });

  it("menarik fokus ke area walau fokus sedang di luar", () => {
    const wadah = buatWadah();
    const luar = document.createElement("button");
    document.body.append(luar);
    luar.focus();
    const event = keydown();

    expect(tangkapTab(event, wadah)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(wadah);
  });

  it("hanya menahan Tab tanpa memindahkan fokus saat target null", () => {
    const wadah = buatWadah();
    const panel = document.createElement("section");
    panel.tabIndex = -1;
    wadah.append(panel);
    panel.focus();
    const event = keydown();

    expect(tangkapTab(event, null)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel);
  });

  it("membiarkan Ctrl/Alt/Meta+Tab milik peramban", () => {
    const wadah = buatWadah();

    for (const modifier of ["ctrlKey", "altKey", "metaKey"] as const) {
      const event = keydown({ [modifier]: true });
      expect(tangkapTab(event, wadah)).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it("tidak mengganggu tombol lain atau Tab yang sudah ditangani", () => {
    const wadah = buatWadah();

    const escape = keydown({ key: "Escape" });
    expect(tangkapTab(escape, wadah)).toBe(false);

    const sudahDitangani = keydown();
    sudahDitangani.preventDefault();
    expect(tangkapTab(sudahDitangani, wadah)).toBe(false);
  });
});
