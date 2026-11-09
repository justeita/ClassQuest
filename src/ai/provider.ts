/**
 * Antarmuka provider LLM.
 *
 * Kontrak: `docs/03-ai-pipeline/provider-setup.md` bagian **Antarmuka provider**
 * dan **Pemetaan error**. Semua panggilan model — nyata maupun mock — lewat
 * `LlmProvider`, supaya pipeline tidak tahu provider mana yang dipakai dan test
 * tidak butuh jaringan.
 *
 * Catatan implementasi:
 *
 * - `LlmRequest` hanya berisi field yang tertulis di dokumen. Tahap pipeline
 *   (outline, chapter, repair) **tidak** ditambahkan ke request; provider tidak
 *   perlu tahu tahap, dan menambah field di sini akan menyimpang dari dokumen.
 * - `import "server-only"` dari contoh dokumen belum bisa dipakai karena paket
 *   `server-only` bukan dependensi repo ini. Batas servernya dijaga dengan
 *   konvensi: jangan impor file ini dari komponen client. `src/server/config.ts`
 *   memakai pendekatan yang sama.
 * - Error provider dipetakan ke kode dokumen, bukan pesan mentah provider.
 *   Retry dan fallback tetap tugas pipeline; provider hanya memberi tahu jenis
 *   kegagalannya.
 */

export type LlmRequest = {
  system: string;
  user: string;
  temperature: number;
  maxOutputTokens: number;
  json: true;
};

export type LlmResponse = {
  text: string;
  usage: { input: number; output: number };
  model: string;
};

export interface LlmProvider {
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}

/* -------------------------------------------------------------------------- */
/* Error                                                                      */
/* -------------------------------------------------------------------------- */

/** Kode error internal dari tabel pemetaan `provider-setup.md`. */
export const AI_PROVIDER_ERROR_CODES = [
  "AI_AUTH",
  "AI_RATE_LIMIT",
  "AI_UNAVAILABLE",
  "AI_TIMEOUT",
  "AI_BAD_OUTPUT",
  "AI_REFUSED",
] as const;

export type AiProviderErrorCode = (typeof AI_PROVIDER_ERROR_CODES)[number];

/**
 * Error transien yang boleh di-retry sekali oleh pipeline: 429, 5xx, dan
 * timeout/abort. `AI_AUTH` gagal cepat; `AI_BAD_OUTPUT`/`AI_REFUSED` masuk jalur
 * repair atau fallback, bukan retry jaringan.
 */
export const RETRYABLE_AI_PROVIDER_ERROR_CODES = [
  "AI_RATE_LIMIT",
  "AI_UNAVAILABLE",
  "AI_TIMEOUT",
] as const satisfies readonly AiProviderErrorCode[];

const retryableCodes = new Set<string>(RETRYABLE_AI_PROVIDER_ERROR_CODES);

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: AiProviderErrorCode, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = retryableCodes.has(code);
  }
}

export function isRetryableAiProviderError(error: unknown): boolean {
  return error instanceof AiProviderError && error.retryable;
}
