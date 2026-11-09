import { describe, expect, it } from "vitest";

import {
  AI_PROVIDER_ERROR_CODES,
  AiProviderError,
  isRetryableAiProviderError,
} from "./provider";

/**
 * Pemetaan error mengikuti `docs/03-ai-pipeline/provider-setup.md`: hanya 429,
 * 5xx, dan timeout/abort yang boleh di-retry. Auth gagal cepat, sedangkan
 * output rusak dan penolakan masuk jalur repair/fallback.
 */

const RETRYABLE = ["AI_RATE_LIMIT", "AI_UNAVAILABLE", "AI_TIMEOUT"];

describe("AiProviderError", () => {
  it.each(AI_PROVIDER_ERROR_CODES)(
    "%s adalah error provider dengan kode yang sama",
    (code) => {
      const error = new AiProviderError(code, "pesan aman");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AiProviderError);
      expect(error.name).toBe("AiProviderError");
      expect(error.code).toBe(code);
      expect(error.message).toBe("pesan aman");
    },
  );

  it.each(AI_PROVIDER_ERROR_CODES)(
    "%s punya sifat retryable sesuai tabel dokumen",
    (code) => {
      const error = new AiProviderError(code, "pesan aman");

      expect(error.retryable).toBe(RETRYABLE.includes(code));
      expect(isRetryableAiProviderError(error)).toBe(error.retryable);
    },
  );

  it("mengembalikan false untuk error yang bukan AiProviderError", () => {
    expect(isRetryableAiProviderError(new Error("biasa"))).toBe(false);
    expect(isRetryableAiProviderError(null)).toBe(false);
    expect(isRetryableAiProviderError("AI_TIMEOUT")).toBe(false);
  });
});
