/**
 * Pembaca PNG tanpa dependensi.
 *
 * Dipakai `scripts/compose-map.mjs` untuk membaca aset pihak ketiga di
 * `D:/Data/LOGICODIX 26/Asset` lalu menyusunnya jadi satu gambar peta. Penulis
 * PNG-nya sudah ada di `pixel.mjs` (`encodePng`); modul ini hanya kebalikannya.
 *
 * Cakupan sengaja sempit: PNG 8-bit, tanpa interlace, dengan color type 0
 * (grayscale), 2 (RGB), 3 (palet), 4 (grayscale+alpha), atau 6 (RGBA). Itu
 * bentuk semua berkas yang dipakai; kalau ada format lain, error dilempar —
 * bukan ditebak-tebak.
 */

import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Jumlah kanal per piksel untuk tiap color type (0–6). */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Satu baris tersaring → baris RGBA mentah.
 *
 * `raw` memuat seluruh IDAT yang sudah di-inflate; setiap baris diawali satu
 * byte tipe filter (0 None, 1 Sub, 2 Up, 3 Average, 4 Paeth).
 */
function unfilterRow(raw, rowStart, stride, bpp, previous, current) {
  const filter = raw[rowStart];
  for (let i = 0; i < stride; i += 1) {
    const value = raw[rowStart + 1 + i];
    const left = i >= bpp ? current[i - bpp] : 0;
    const up = previous[i];
    const upLeft = i >= bpp ? previous[i - bpp] : 0;
    let out;
    if (filter === 0) out = value;
    else if (filter === 1) out = value + left;
    else if (filter === 2) out = value + up;
    else if (filter === 3) out = value + ((left + up) >> 1);
    else if (filter === 4) out = value + paeth(left, up, upLeft);
    else throw new Error(`tipe filter PNG tidak dikenal: ${filter}`);
    current[i] = out & 0xff;
  }
}

/**
 * Buffer PNG → kanvas `{ width, height, data }` (RGBA, 4 byte/piksel).
 *
 * Bentuk hasilnya sama dengan `createCanvas()` di `pixel.mjs`, jadi bisa
 * langsung disalin dengan `canvas.blit()`.
 */
export function decodePng(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error("berkas bukan PNG (tanda tangan salah)");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8) {
    throw new Error(`hanya PNG 8-bit yang didukung (ini ${bitDepth}-bit)`);
  }
  if (interlace !== 0) {
    throw new Error("PNG ber-interlace belum didukung");
  }
  const channels = CHANNELS[colorType];
  if (channels === undefined) {
    throw new Error(`color type PNG tidak didukung: ${colorType}`);
  }

  const width3 = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = width3 + 1;
  const pixels = new Uint8Array(width3 * height);
  let previous = new Uint8Array(width3);
  let current = new Uint8Array(width3);

  for (let y = 0; y < height; y += 1) {
    unfilterRow(raw, y * rowBytes, width3, channels, previous, current);
    pixels.set(current, y * width3);
    [previous, current] = [current, previous];
  }

  return {
    width,
    height,
    data: toRgba(pixels, width, height, colorType, palette, transparency),
  };
}

/** Piksel mentah (semua color type) → buffer RGBA seragam. */
function toRgba(pixels, width, height, colorType, palette, transparency) {
  const count = width * height;
  const out = new Uint8Array(count * 4);

  if (colorType === 6) {
    out.set(pixels);
    return out;
  }

  for (let i = 0; i < count; i += 1) {
    const at = i * 4;
    if (colorType === 2) {
      out[at] = pixels[i * 3];
      out[at + 1] = pixels[i * 3 + 1];
      out[at + 2] = pixels[i * 3 + 2];
      out[at + 3] = 255;
    } else if (colorType === 0) {
      const gray = pixels[i];
      out[at] = gray;
      out[at + 1] = gray;
      out[at + 2] = gray;
      out[at + 3] = 255;
    } else if (colorType === 4) {
      const gray = pixels[i * 2];
      out[at] = gray;
      out[at + 1] = gray;
      out[at + 2] = gray;
      out[at + 3] = pixels[i * 2 + 1];
    } else {
      // Palet: indeks → RGB; alpha dari tRNS bila ada.
      const index = pixels[i];
      out[at] = palette[index * 3];
      out[at + 1] = palette[index * 3 + 1];
      out[at + 2] = palette[index * 3 + 2];
      out[at + 3] =
        transparency && index < transparency.length ? transparency[index] : 255;
    }
  }

  return out;
}
