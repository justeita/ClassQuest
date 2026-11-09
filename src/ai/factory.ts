/**
 * Pemilihan provider dari konfigurasi server.
 *
 * `src/server/config.ts` (`loadAiConfig`) adalah satu-satunya pembaca
 * environment AI; modul ini hanya menerjemahkan hasilnya menjadi
 * `LlmProvider`. Lihat `docs/03-ai-pipeline/provider-setup.md`.
 *
 * Provider sungguhan belum diimplementasikan (ADR 0006 masih `Proposed`).
 * `anthropic` sengaja menjadi stub yang gagal dengan pesan jelas, bukan
 * memanggil jaringan atau mengimpor `@anthropic-ai/sdk`.
 */

import type { AiConfig } from "../server/config";
import { MockProvider } from "./mock-provider";
import type { LlmProvider, LlmResponse } from "./provider";

export const ANTHROPIC_NOT_IMPLEMENTED_MESSAGE =
  "Provider Anthropic belum diimplementasikan (tugas 23)";

class UnimplementedProvider implements LlmProvider {
  async complete(): Promise<LlmResponse> {
    throw new Error(ANTHROPIC_NOT_IMPLEMENTED_MESSAGE);
  }
}

/**
 * Buat provider sesuai `config.provider`.
 *
 * `mock` tidak memakai kunci dan tidak menyentuh jaringan. `anthropic` tetap
 * mengembalikan objek yang memenuhi `LlmProvider`, tetapi setiap panggilan
 * gagal dengan pesan yang bisa ditampilkan ke operator.
 */
export function createLlmProvider(config: AiConfig): LlmProvider {
  switch (config.provider) {
    case "mock":
      return new MockProvider();
    case "anthropic":
      return new UnimplementedProvider();
  }
}
