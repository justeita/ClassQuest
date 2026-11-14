import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { decodePng } from "../../scripts/lib/png.mjs";
import { kotakOpaque, lebarKepala, median } from "../../scripts/lib/potret.mjs";

/**
 * Regresi ukuran potret.
 *
 * `scripts/import-portraits.mjs` menyeragamkan **tinggi** kepala, bukan lebar —
 * jadi wajah yang memang lebar bisa lolos jadi raksasa walau tingginya pas.
 * Itu yang dulu terjadi pada kakek jubah hijau (`npc_6`): wajahnya tampak ±33%
 * lebih besar dari karakter lain. Tabel `KOREKSI` di importer memperbaikinya,
 * dan test ini menjaga dua hal yang gampang rusak lagi:
 *
 * 1. Isi tiap potret menyentuh dasar kanvas — kalau tidak, potret "melayang"
 *    di atas kotak dialog (pemeriksa yang sama ada di importer).
 * 2. Lebar kepala `npc_6` tetap dekat nilai tengah karakter lain, jadi koreksi
 *    tidak terhapus oleh perubahan importer di kemudian hari.
 *
 * Angka kepalanya diturunkan dengan `bun run assets:portraits:ukur`.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(REPO, "public", "assets", "portrait");

/** Alpha minimum yang dianggap bagian pekat badan (bukan fringe). */
const AMBANG_PADAT = 160;

/** Rasio lebar kepala maksimum terhadap nilai tengah (koreksi `npc_6`). */
const RASIO_KEPALA_MAKS = 1.2;

/** Jarak baris pekat terbawah dari tepi bawah kanvas. */
function celahBawah(image: {
  width: number;
  height: number;
  data: Uint8Array;
}) {
  for (let y = image.height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] >= AMBANG_PADAT) {
        return image.height - 1 - y;
      }
    }
  }
  return image.height;
}

function bacaPotret(nama: string, ekspresi = "neutral") {
  return decodePng(readFileSync(join(DIR, nama, `${ekspresi}.png`)));
}

const KARAKTER = readdirSync(DIR, { withFileTypes: true })
  .filter((entri) => entri.isDirectory())
  .map((entri) => entri.name)
  .sort();

const KEPALA = new Map(
  KARAKTER.map((nama) => {
    const image = bacaPotret(nama);
    return [nama, lebarKepala(image, kotakOpaque(image))];
  }),
);

describe("ukuran potret dialog", () => {
  it("menyediakan potret untuk semua karakter", () => {
    expect(KARAKTER.length).toBeGreaterThan(1);
  });

  it.each(KARAKTER)("isi potret %s menyentuh dasar kanvas", (nama) => {
    expect(celahBawah(bacaPotret(nama))).toBe(0);
  });

  it("lebar kepala npc_6 sejajar karakter lain", () => {
    const tengah = median([...KEPALA.values()]);
    const rasio = (KEPALA.get("npc_6") ?? 0) / tengah;
    expect(rasio).toBeLessThanOrEqual(RASIO_KEPALA_MAKS);
  });
});
