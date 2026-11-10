import "server-only";

/**
 * Provider Anthropic untuk `LlmProvider`.
 *
 * Kontrak: `docs/03-ai-pipeline/provider-setup.md` (antarmuka provider, pemetaan
 * error, retry) dan `docs/03-ai-pipeline/pipeline.md` (anggaran waktu).
 *
 * Aturan yang dipegang:
 *
 * - **Konfigurasi hanya dari `src/server/config.ts`.** Modul ini tidak membaca
 *   `process.env`; `AiConfig` sudah divalidasi di sana.
 * - **Tidak ada retry bawaan SDK** (`maxRetries: 0`). Pipeline punya retry dan
 *   repair sendiri plus deadline 120 detik; retry SDK bisa melewati anggaran itu.
 * - **Non-streaming** lewat `messages.create`. Teks dikembalikan apa adanya;
 *   parsing dan repair JSON tetap tugas pipeline.
 * - **Error dipetakan ke taksonomi `AiProviderError`**, dengan pesan statis yang
 *   tidak pernah memuat API key, isi prompt, materi, atau isi respons model.
 * - **Tidak ada log** prompt/materi/respons. Modul ini tidak menulis log sama
 *   sekali; pemanggil yang memutuskan apa yang dicatat.
 */

import Anthropic from "@anthropic-ai/sdk";

import type { AiConfig } from "../../server/config";
import {
  AiProviderError,
  type AiProviderErrorCode,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "../provider";

/** Konfigurasi yang diterima provider ini: cabang `anthropic` dari `AiConfig`. */
export type AnthropicProviderConfig = Extract<
  AiConfig,
  { provider: "anthropic" }
>;

/**
 * Bagian klien SDK yang dipakai. Dibatasi ke satu metode supaya test bisa
 * menyuntikkan klien palsu tanpa jaringan dan tanpa `vi.mock` global.
 */
export type AnthropicMessagesClient = {
  messages: {
    create: (
      params: Anthropic.MessageCreateParamsNonStreaming,
      options?: Anthropic.RequestOptions,
    ) => Promise<Anthropic.Message>;
  };
};

export type AnthropicProviderOptions = {
  /**
   * Klien pengganti untuk test. Bila kosong, provider membuat `Anthropic` dari
   * konfigurasi. Klien yang disuntikkan tetap menerima `maxRetries: 0` dan
   * `timeout` lewat opsi request, jadi perilakunya sama.
   */
  client?: AnthropicMessagesClient;
};

/**
 * Pesan statis per kode. Tidak pernah memuat nilai env, isi prompt, materi,
 * isi respons, atau pesan mentah SDK.
 */
const ERROR_MESSAGES: Record<AiProviderErrorCode, string> = {
  AI_AUTH:
    "Otentikasi provider AI gagal. Periksa AI_API_KEY dan AI_MODEL di server.",
  AI_RATE_LIMIT: "Provider AI sedang membatasi permintaan. Coba lagi nanti.",
  AI_UNAVAILABLE: "Provider AI tidak bisa dihubungi. Coba lagi nanti.",
  AI_TIMEOUT: "Panggilan ke provider AI melewati batas waktu.",
  AI_BAD_OUTPUT: "Provider AI tidak mengembalikan teks yang bisa dipakai.",
  AI_REFUSED: "Provider AI menolak permintaan.",
};

const providerError = (code: AiProviderErrorCode): AiProviderError =>
  new AiProviderError(code, ERROR_MESSAGES[code]);

/** Bentuk minimal error SDK yang dibaca; tidak bergantung pada `instanceof`. */
type SdkErrorShape = {
  name?: unknown;
  status?: unknown;
};

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as SdkErrorShape).name === "AbortError";

/**
 * Petakan error SDK ke taksonomi `AiProviderError`.
 *
 * | Kondisi                          | Kode             |
 * | -------------------------------- | ---------------- |
 * | abort / timeout / 408            | `AI_TIMEOUT`     |
 * | 429                              | `AI_RATE_LIMIT`  |
 * | 401 / 403                        | `AI_AUTH`        |
 * | 5xx (termasuk 529 overloaded)    | `AI_UNAVAILABLE` |
 * | kegagalan jaringan tanpa status  | `AI_UNAVAILABLE` |
 * | sisanya (4xx lain, tak dikenal)  | `AI_UNAVAILABLE` |
 *
 * `AI_BAD_OUTPUT` dipakai terpisah saat respons tidak punya blok teks.
 * `AI_REFUSED` belum dipakai: SDK tidak memberi penanda penolakan yang stabil
 * di jalur non-streaming, dan menebaknya akan salah lebih sering daripada benar.
 */
export function mapAnthropicError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (isAbortError(error)) return providerError("AI_TIMEOUT");

  const shape: SdkErrorShape =
    typeof error === "object" && error !== null ? error : {};
  const status = typeof shape.status === "number" ? shape.status : null;

  if (status === null) {
    // `APIConnectionTimeoutError` tidak membawa status; namanya yang dikenali.
    if (shape.name === "APIConnectionTimeoutError") {
      return providerError("AI_TIMEOUT");
    }
    // `APIConnectionError` dan error tak dikenal: anggap gangguan sementara.
    return providerError("AI_UNAVAILABLE");
  }

  if (status === 408) return providerError("AI_TIMEOUT");
  if (status === 429) return providerError("AI_RATE_LIMIT");
  if (status === 401 || status === 403) return providerError("AI_AUTH");
  if (status >= 500) return providerError("AI_UNAVAILABLE");

  return providerError("AI_UNAVAILABLE");
}

/** Gabungkan semua blok teks; blok non-teks (thinking, tool) diabaikan. */
const textOf = (message: Anthropic.Message): string => {
  const blocks = Array.isArray(message?.content) ? message.content : [];

  return blocks
    .filter(
      (block): block is Anthropic.TextBlock =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: unknown }).type === "text" &&
        typeof (block as { text?: unknown }).text === "string",
    )
    .map((block) => block.text)
    .join("");
};

const usageOf = (message: Anthropic.Message): LlmResponse["usage"] => {
  const usage = message?.usage;
  const input =
    typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
  const output =
    typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;

  return { input, output };
};

export class AnthropicProvider implements LlmProvider {
  private readonly config: AnthropicProviderConfig;
  private readonly client: AnthropicMessagesClient;

  constructor(
    config: AnthropicProviderConfig,
    options: AnthropicProviderOptions = {},
  ) {
    this.config = config;
    this.client =
      options.client ??
      new Anthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl === null ? {} : { baseURL: config.baseUrl }),
        // Pipeline punya retry sendiri; retry SDK bisa melewati deadline 120 detik.
        maxRetries: 0,
        timeout: config.timeoutMs,
      });
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    if (signal?.aborted) throw providerError("AI_TIMEOUT");

    let message: Anthropic.Message;

    try {
      message = await this.client.messages.create(
        {
          model: this.config.model,
          max_tokens: req.maxOutputTokens,
          system: req.system,
          messages: [{ role: "user", content: req.user }],
        },
        {
          // Ditegaskan per request juga: klien yang disuntikkan test tidak
          // melewati konstruktor di atas.
          maxRetries: 0,
          timeout: this.config.timeoutMs,
          ...(signal === undefined ? {} : { signal }),
        },
      );
    } catch (error) {
      throw mapAnthropicError(error);
    }

    const text = textOf(message);
    if (text.trim() === "") throw providerError("AI_BAD_OUTPUT");

    return {
      text,
      usage: usageOf(message),
      model: this.config.model,
    };
  }
}
