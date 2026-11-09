/**
 * Kanvas piksel kecil + penulis PNG tanpa dependensi.
 *
 * Dipakai `scripts/generate-assets.mjs` untuk menggambar ulang seluruh aset di
 * `public/assets/`. Tidak ada pustaka gambar yang diimpor, jadi aset bisa
 * dibuat ulang dengan `bun run assets:generate` di mesin mana pun.
 *
 * Semua koordinat memakai piksel utuh (`Math.round` di pemanggil), sesuai
 * aturan di docs/07-assets/asset-guide.md: satu grid, tanpa anti-aliasing.
 */

import { deflateSync } from "node:zlib";

/* -------------------------------------------------------------------------- */
/* Warna                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Warna → `[r, g, b]`. Menerima `#rrggbb` maupun hasil `mix()`/`shade()` yang
 * sudah berupa array, supaya turunan bisa diturunkan lagi.
 */
export function rgb(color) {
  if (Array.isArray(color)) return [color[0], color[1], color[2]];
  const value = Number.parseInt(color.replace("#", ""), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

/** Campur dua warna; `t` 0 → `a`, 1 → `b`. */
export function mix(a, b, t) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return [
    clamp(ar + (br - ar) * t),
    clamp(ag + (bg - ag) * t),
    clamp(ab + (bb - ab) * t),
  ];
}

/** Campur beberapa warna berurutan dengan bobot sama. */
export function mixMany(colors) {
  const sum = [0, 0, 0];
  for (const color of colors) {
    const [r, g, b] = rgb(color);
    sum[0] += r;
    sum[1] += g;
    sum[2] += b;
  }
  return sum.map((value) => clamp(value / colors.length));
}

/** Turunkan kecerahan warna: tiap kanal dikali `factor` (0–1). */
export function shade(hex, factor) {
  return rgb(hex).map((value) => clamp(value * factor));
}

/* -------------------------------------------------------------------------- */
/* Kanvas                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Kanvas RGBA sederhana. Metode menggambar menulis langsung ke buffer, seperti
 * kanvas piksel pada umumnya — tidak ada scaling implisit.
 */
export function createCanvas(width, height) {
  const data = new Uint8Array(width * height * 4);

  const index = (x, y) => (y * width + x) * 4;
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;

  const canvas = {
    width,
    height,
    data,

    /** Piksel opaque. */
    px(x, y, color) {
      if (!inside(x, y)) return;
      const at = index(x, y);
      const [r, g, b] = Array.isArray(color) ? color : rgb(color);
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
      return canvas;
    },

    /** Piksel dengan alpha eksplisit 0–1 (menimpa, bukan mencampur). */
    pxAlpha(x, y, color, alpha) {
      if (!inside(x, y)) return;
      const at = index(x, y);
      const [r, g, b] = Array.isArray(color) ? color : rgb(color);
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = clamp(alpha * 255);
      return canvas;
    },

    /** Piksel setengah transparan di atas isi yang sudah ada. */
    blend(x, y, color, alpha) {
      if (!inside(x, y) || alpha <= 0) return;
      const at = index(x, y);
      const [r, g, b] = Array.isArray(color) ? color : rgb(color);
      const a = Math.min(1, alpha);
      const base = data[at + 3] / 255;
      const out = a + base * (1 - a);
      data[at] = clamp((r * a + data[at] * base * (1 - a)) / out);
      data[at + 1] = clamp((g * a + data[at + 1] * base * (1 - a)) / out);
      data[at + 2] = clamp((b * a + data[at + 2] * base * (1 - a)) / out);
      data[at + 3] = clamp(out * 255);
      return canvas;
    },

    /** Hapus piksel (dipakai untuk sudut membulat dan sprite). */
    clear(x, y) {
      if (!inside(x, y)) return;
      const at = index(x, y);
      data[at] = 0;
      data[at + 1] = 0;
      data[at + 2] = 0;
      data[at + 3] = 0;
      return canvas;
    },

    rect(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) canvas.px(x + dx, y + dy, color);
      }
      return canvas;
    },

    /** Kotak berongga setebal `thickness` di dalam batas. */
    frame(x, y, w, h, thickness, color) {
      canvas.rect(x, y, w, thickness, color);
      canvas.rect(x, y + h - thickness, w, thickness, color);
      canvas.rect(x, y, thickness, h, color);
      canvas.rect(x + w - thickness, y, thickness, h, color);
      return canvas;
    },

    hline(x, y, w, color) {
      return canvas.rect(x, y, w, 1, color);
    },

    vline(x, y, h, color) {
      return canvas.rect(x, y, 1, h, color);
    },

    /**
     * Gradasi vertikal bertingkat: `stops` = `[{ at: 0..1, color }]`.
     * Batas antar pita di-dither agar tidak terlihat seperti garis keras.
     */
    vgradient(x, y, w, h, stops) {
      for (let dy = 0; dy < h; dy += 1) {
        const t = h === 1 ? 0 : dy / (h - 1);
        const upper = stops.findLast((stop) => stop.at <= t) ?? stops[0];
        const lower = stops.find((stop) => stop.at > t) ?? stops.at(-1);
        if (upper === lower) {
          canvas.hline(x, y + dy, w, upper.color);
          continue;
        }
        const span = lower.at - upper.at || 1;
        const local = (t - upper.at) / span;
        for (let dx = 0; dx < w; dx += 1) {
          // Ambang ditentukan pola checker 2×2 supaya peralihannya bergerigi
          // teratur — itu tekstur pixel art, bukan noise acak.
          const checker = (dx + dy) % 2 === 0 ? 0.25 : 0;
          canvas.px(
            x + dx,
            y + dy,
            local + checker > 0.5 ? lower.color : upper.color,
          );
        }
      }
      return canvas;
    },

    /** Isi area dengan pola checker dua warna; `t` = porsi warna kedua. */
    dither(x, y, w, h, a, b, t = 0.5) {
      const thresholds = [
        [0.25, 0.5, 0.75],
        [0.5, 1, 0.5],
        [0.75, 0.5, 0.25],
      ];
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          const pattern = thresholds[dy % 3][dx % 3];
          canvas.px(x + dx, y + dy, pattern < t ? b : a);
        }
      }
      return canvas;
    },

    /** Elips penuh — dipakai untuk kepala dan bentuk organik lain. */
    ellipse(cx, cy, rx, ry, color) {
      for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy += 1) {
        for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx += 1) {
          const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
          if (value > 1) continue;
          canvas.px(cx + dx, cy + dy, color);
        }
      }
      return canvas;
    },

    /** Cakram penuh; tepinya memakai `edge` bila diberikan. */
    disc(cx, cy, radius, color, edge) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const distance = Math.hypot(dx, dy);
          if (distance > radius) continue;
          canvas.px(
            cx + dx,
            cy + dy,
            edge && distance > radius - 1.2 ? edge : color,
          );
        }
      }
      return canvas;
    },

    /** Cincin (untuk glow bulan bertingkat). */
    ring(cx, cy, radius, color, alpha = 1) {
      const steps = Math.max(24, radius * 8);
      const seen = new Set();
      for (let step = 0; step < steps; step += 1) {
        const angle = (step / steps) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(angle) * radius);
        const y = Math.round(cy + Math.sin(angle) * radius);
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (alpha >= 1) canvas.px(x, y, color);
        else canvas.blend(x, y, color, alpha);
      }
      return canvas;
    },

    /** Isi poligon (scanline). `points` = `[[x, y], ...]`. */
    polygon(points, color) {
      const ys = points.map((point) => point[1]);
      const top = Math.floor(Math.min(...ys));
      const bottom = Math.ceil(Math.max(...ys));

      for (let y = top; y <= bottom; y += 1) {
        const crossings = [];
        for (let i = 0; i < points.length; i += 1) {
          const [x1, y1] = points[i];
          const [x2, y2] = points[(i + 1) % points.length];
          if (y1 === y2) continue;
          if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
          crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
        crossings.sort((a, b) => a - b);
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          const from = Math.round(crossings[i]);
          const to = Math.round(crossings[i + 1]);
          canvas.rect(from, y, Math.max(1, to - from), 1, color);
        }
      }
      return canvas;
    },

    /** Poligon setengah transparan — dipakai untuk berkas cahaya. */
    polygonBlend(points, color, alpha) {
      const ys = points.map((point) => point[1]);
      const top = Math.floor(Math.min(...ys));
      const bottom = Math.ceil(Math.max(...ys));

      for (let y = top; y <= bottom; y += 1) {
        const crossings = [];
        for (let i = 0; i < points.length; i += 1) {
          const [x1, y1] = points[i];
          const [x2, y2] = points[(i + 1) % points.length];
          if (y1 === y2) continue;
          if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
          crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
        crossings.sort((a, b) => a - b);
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          const from = Math.round(crossings[i]);
          const to = Math.round(crossings[i + 1]);
          for (let x = from; x < Math.max(from + 1, to); x += 1) {
            canvas.blend(x, y, color, alpha);
          }
        }
      }
      return canvas;
    },

    /** Salin kanvas lain (untuk menyusun sprite di kanvas besar). */
    blit(source, x, y) {
      for (let dy = 0; dy < source.height; dy += 1) {
        for (let dx = 0; dx < source.width; dx += 1) {
          const at = (dy * source.width + dx) * 4;
          if (source.data[at + 3] === 0) continue;
          canvas.blend(
            x + dx,
            y + dy,
            [source.data[at], source.data[at + 1], source.data[at + 2]],
            source.data[at + 3] / 255,
          );
        }
      }
      return canvas;
    },

    /** Tebalkan/isi siluet: setiap piksel opaque mendapat outline 1 px. */
    outline(color) {
      const source = new Uint8Array(data);
      const opaque = (x, y) =>
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height &&
        source[(y * width + x) * 4 + 3] > 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (opaque(x, y)) continue;
          const near =
            opaque(x - 1, y) ||
            opaque(x + 1, y) ||
            opaque(x, y - 1) ||
            opaque(x, y + 1);
          if (near) canvas.px(x, y, color);
        }
      }
      return canvas;
    },
  };

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* PNG                                                                        */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** Kanvas → buffer PNG (truecolor + alpha, tanpa filter). */
export function encodePng(canvas) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = canvas.width * 4;
  const raw = Buffer.alloc((stride + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(canvas.data.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Acak deterministik                                                         */
/* -------------------------------------------------------------------------- */

/** PRNG kecil berbenih tetap: aset harus identik setiap kali dibuat ulang. */
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
