// @vitest-environment node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Regresi guard `server-only`.
 *
 * Modul yang membaca environment/rahasia atau mengakses database wajib memuat
 * `import "server-only"` sebagai **import pertama**. Tanpa itu, impor tak sengaja
 * dari komponen client tidak gagal saat build dan kredensial bisa ikut ke bundle
 * browser (`docs/11-logicodix/06-keamanan-kredensial.md`,
 * `docs/01-architecture/security-and-privacy.md`).
 *
 * Test ini membaca isi file, bukan mengimpornya: Vitest mengalihkan
 * `server-only` ke stub (`vitest.config.mjs`), jadi impor biasa tidak akan
 * membuktikan apa pun.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Modul yang wajib dijaga. Tambahkan di sini saat ada modul server baru. */
const GUARDED_MODULES = [
  "server/config.ts",
  "server/auth.ts",
  "server/db/client.ts",
  "server/stories/core.ts",
  "server/play-results/save.ts",
  "server/rate-limit/check.ts",
  "server/rate-limit/identity.ts",
  "server/rate-limit/index.ts",
  "ai/providers/anthropic.ts",
  "ai/providers/openai-compatible.ts",
] as const;

const GUARD = 'import "server-only";';

/**
 * Ambil baris import pertama yang bukan komentar. Komentar blok di kepala file
 * boleh mendahului guard; yang dilarang adalah import lain mendahuluinya.
 */
const firstImportLine = (source: string): string | null => {
  const lines = source.split("\n");
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      continue;
    }
    if (trimmed === "" || trimmed.startsWith("//")) continue;

    return trimmed;
  }

  return null;
};

describe("guard server-only", () => {
  it.each(GUARDED_MODULES)(
    '%s memuat import "server-only" sebagai import pertama',
    (relativePath) => {
      const source = readFileSync(join(SRC, relativePath), "utf8");

      expect(firstImportLine(source)).toBe(GUARD);
    },
  );

  it("daftar modul yang dijaga tidak kosong", () => {
    expect(GUARDED_MODULES.length).toBeGreaterThan(0);
  });
});
