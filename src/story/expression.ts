/**
 * Ekspresi potret dialog — satu daftar untuk skema, manifest, dan prompt.
 *
 * Enam nilai ini adalah nama berkas potret sekaligus nilai yang boleh ditulis
 * AI di field `expression` sebuah beat (lihat
 * `docs/02-data-model/story-schema.md`). Semuanya ada untuk setiap karakter di
 * `public/assets/portrait/<nama>/<ekspresi>.png`.
 *
 * Modul ini sengaja bebas dependensi: `schema.ts` memakainya untuk enum zod dan
 * `assets/manifest.ts` untuk menyusun path potret, tanpa ikut menarik zod ke
 * bundel browser.
 */

export const EXPRESSIONS = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "shocked",
  "thinking",
] as const;

export type Expression = (typeof EXPRESSIONS)[number];

/** Ekspresi bawaan saat beat tidak menyebutkannya. */
export const DEFAULT_EXPRESSION: Expression = "neutral";
