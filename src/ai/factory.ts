/**
 * Pemilihan provider dari konfigurasi server.
 *
 * `src/server/config.ts` (`loadAiConfig`) adalah satu-satunya pembaca
 * environment AI; modul ini hanya menerjemahkan hasilnya menjadi
 * `LlmProvider`. Lihat `docs/03-ai-pipeline/provider-setup.md`.
 *
 * - `mock` (atau `AI_PROVIDER` kosong) → `MockProvider`, tanpa kunci dan tanpa
 *   jaringan.
 * - `anthropic` → `AnthropicProvider` (`./providers/anthropic`).
 *
 * Validasi kelengkapan konfigurasi tetap di `loadAiConfig()`: `AI_PROVIDER=anthropic`
 * tanpa `AI_API_KEY` atau `AI_MODEL` sudah melempar `AiConfigError` yang menyebut
 * nama variabel sebelum sampai ke sini. Factory tidak pernah diam-diam jatuh ke
 * mock.
 */

import type { AiConfig } from "../server/config";
import { MockProvider } from "./mock-provider";
import { AnthropicProvider } from "./providers/anthropic";
import type { LlmProvider } from "./provider";

/**
 * Buat provider sesuai `config.provider`.
 *
 * @throws {AiConfigError} bila `config` tidak lengkap untuk provider yang dipilih.
 * Pemeriksaan di sini hanya jaring pengaman untuk pemanggil yang mengarang
 * `AiConfig` sendiri; jalur normal sudah divalidasi `loadAiConfig()`.
 */
export function createLlmProvider(config: AiConfig): LlmProvider {
  switch (config.provider) {
    case "mock":
      return new MockProvider();
    case "anthropic":
      return new AnthropicProvider(config);
  }
}
