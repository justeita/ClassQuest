import { describe, expect, it } from "vitest";

import { acakDeterministik, acakOpsi } from "./acak";

const opsi = [
  { id: "opt_a", text: "6 cangkir" },
  { id: "opt_b", text: "4 cangkir" },
  { id: "opt_c", text: "12 cangkir" },
];
const ids = opsi.map((item) => item.id);

describe("acakDeterministik", () => {
  it("mengembalikan semua id tanpa duplikat", () => {
    expect([...acakDeterministik(ids, "chl_01_01")].sort()).toEqual(
      [...ids].sort(),
    );
  });

  it("deterministik untuk benih yang sama", () => {
    expect(acakDeterministik(ids, "chl_01_01")).toEqual(
      acakDeterministik(ids, "chl_01_01"),
    );
  });

  it("cenderung mengubah urutan asli", () => {
    const berbeda = ["chl_01_01", "chl_03_02", "a", "b", "c"].some(
      (seed) => acakDeterministik(ids, seed).join() !== ids.join(),
    );
    expect(berbeda).toBe(true);
  });

  it("tidak mengubah daftar masukan", () => {
    const asli = [...ids];
    acakDeterministik(asli, "chl_01_01");
    expect(asli).toEqual(ids);
  });
});

describe("acakOpsi", () => {
  it("mempertahankan pasangan id dan teks opsi", () => {
    const hasil = acakOpsi(opsi, "chl_01_01");

    expect([...hasil].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...opsi].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("mengacak urutan tampil tapi tetap stabil per benih", () => {
    const pertama = acakOpsi(opsi, "chl_01_01");

    expect(pertama.map((item) => item.id)).not.toEqual(ids);
    expect(acakOpsi(opsi, "chl_01_01")).toEqual(pertama);
  });
});
