#!/usr/bin/env bun
/**
 * Ukur potret dialog yang sudah di-commit.
 *
 *   bun run assets:portraits:ukur
 *
 * Dipakai untuk menurunkan angka di tabel `KOREKSI` (lihat
 * `scripts/import-portraits.mjs`): normalisasi menyamakan **tinggi** kepala,
 * jadi wajah yang memang lebar tetap tampak lebih besar. Skrip ini melaporkan
 * lebar kepala tiap karakter — memakai deteksi leher yang sama dengan importer —
 * beserta rasionya terhadap nilai tengah, supaya koreksi dipilih dari data.
 *
 * Membaca langsung PNG di `public/assets/portrait/`, jadi importer (yang butuh
 * aset sumber di luar repo) tidak perlu dijalankan.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decodePng } from "./lib/png.mjs";
import { kotakOpaque, lebarKepala, median } from "./lib/potret.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "assets", "portrait");

const nama = readdirSync(DIR, { withFileTypes: true })
  .filter((entri) => entri.isDirectory())
  .map((entri) => entri.name)
  .sort();

const ukur = nama.map((namaKarakter) => {
  const image = decodePng(readFileSync(join(DIR, namaKarakter, "neutral.png")));
  const box = kotakOpaque(image);
  return { nama: namaKarakter, lebar: lebarKepala(image, box) };
});

const tengah = median(ukur.map((entri) => entri.lebar));
process.stdout.write(`lebar kepala (nilai tengah ${tengah} px)\n`);
for (const entri of ukur) {
  const rasio = (entri.lebar / tengah).toFixed(2);
  process.stdout.write(
    `  ${entri.nama.padEnd(8)} ${String(entri.lebar).padStart(4)} px  ×${rasio}\n`,
  );
}
