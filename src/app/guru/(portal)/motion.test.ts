// @vitest-environment node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Penjaga sistem gerak portal (`src/app/globals.css`).
 *
 * Dua aturan yang mahal kalau rusak dan tidak terlihat di typecheck:
 *
 * 1. **Semua `animation` harus berada di dalam `prefers-reduced-motion:
 *    no-preference`.** Kalau satu deklarasi lolos ke luar blok itu, pengguna
 *    yang meminta gerak dikurangi akan melihat elemen berhenti di tengah
 *    animasi (`opacity: 0`) — halaman terlihat kosong.
 * 2. **Kerangka halaman memakai `guru-skeleton`, bukan `animate-pulse`.**
 *    `animate-pulse` tidak menghormati preferensi gerak dan membuat denyut
 *    yang berbeda dari shimmer portal.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, "..", "..", "globals.css"), "utf8");

type Declaration = { line: number; media: string[] };

/**
 * Kumpulkan setiap deklarasi `animation:` beserta aturan `@media` yang
 * membungkusnya. Pembacaan dilakukan karakter per karakter supaya blok
 * bersarang (`@media` → `@media` → selektor) terhitung benar.
 */
function animationDeclarations(css: string): Declaration[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: string[] = [];
  const media: string[] = [];
  const found: Declaration[] = [];
  let segment = "";

  const lineAt = (index: number) => text.slice(0, index).split("\n").length;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "{") {
      const context = segment.trim();
      stack.push(context);
      if (context.startsWith("@media")) media.push(context);
      segment = "";
      continue;
    }

    if (char === "}") {
      const context = stack.pop();
      if (context?.startsWith("@media")) media.pop();
      segment = "";
      continue;
    }

    if (char === ";") {
      segment = "";
      continue;
    }

    if (text.startsWith("animation:", i)) {
      found.push({ line: lineAt(i), media: [...media] });
      i += "animation:".length - 1;
      segment = "";
      continue;
    }

    segment += char;
  }

  return found;
}

/**
 * Hanya bagian gerak portal yang diperiksa. Animasi game (`.garis-cepat`,
 * `.animate-quest-bob`) punya aturan sendiri di bagian atas berkas dan bukan
 * cakupan test ini.
 */
const MARKER = "Gerak portal guru";
const NO_PREFERENCE = "prefers-reduced-motion: no-preference";
const REDUCE = "prefers-reduced-motion: reduce";

describe("sistem gerak portal", () => {
  it("setiap animation hanya berjalan saat gerak tidak dikurangi", () => {
    const start = CSS.indexOf(MARKER);
    expect(
      start,
      "penanda bagian gerak portal tidak ditemukan",
    ).toBeGreaterThan(-1);

    const declarations = animationDeclarations(CSS.slice(start));

    // Sanity check: kalau pemindai rusak dan tidak menemukan apa pun, test ini
    // akan lulus tanpa menjaga apa-apa.
    expect(declarations.length).toBeGreaterThan(0);

    const outside = declarations.filter(
      (item) => !item.media.some((query) => query.includes(NO_PREFERENCE)),
    );
    expect(
      outside,
      `animation di luar blok no-preference: ${JSON.stringify(outside)}`,
    ).toEqual([]);

    const insideReduce = declarations.filter((item) =>
      item.media.some((query) => query.includes(REDUCE)),
    );
    expect(insideReduce).toEqual([]);
  });

  it("kerangka halaman memakai guru-skeleton, bukan animate-pulse", () => {
    const source = readFileSync(
      join(HERE, "..", "..", "..", "components", "guru", "skeletons.tsx"),
      "utf8",
    );

    expect(source, "skeletons.tsx masih memakai animate-pulse").not.toContain(
      "animate-pulse",
    );
    expect(source, "skeletons.tsx tidak memakai guru-skeleton").toContain(
      "guru-skeleton",
    );
  });

  it("segmen portal yang tahu bentuk halaman memakai loading.tsx berskeleton", () => {
    const loadingFiles = [
      join("materi", "loading.tsx"),
      join("materi", "baru", "loading.tsx"),
      join("materi", "[storyId]", "loading.tsx"),
      join("kelas", "loading.tsx"),
      join("game", "loading.tsx"),
    ];

    for (const file of loadingFiles) {
      const source = readFileSync(join(HERE, file), "utf8");
      expect(source, `${file} tidak memakai skeleton`).toContain("Skeleton");
    }

    // Boundary induk tidak tahu halaman tujuan, jadi sengaja memakai indikator
    // netral (bukan skeleton yang bisa salah bentuk).
    const parent = readFileSync(join(HERE, "loading.tsx"), "utf8");
    expect(parent).toContain('role="status"');
    expect(parent).not.toContain("guru-skeleton");
    expect(parent).not.toContain("@/components/guru/skeletons");
  });

  it("halaman kelas memakai skeleton, bukan teks loading lepas", () => {
    const source = readFileSync(join(HERE, "kelas", "page.tsx"), "utf8");
    expect(source).not.toContain("Memuat kelas");
    expect(source).toContain("ClassesSkeleton");
  });
});
