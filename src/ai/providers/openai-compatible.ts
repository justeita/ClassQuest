import "server-only";

/**
 * Provider generik untuk endpoint yang kompatibel dengan [OI]
 * (`POST {baseUrl}/chat/completions`).
 *
 * Dipakai untuk router seperti 9Router, OpenRouter, Groq, Ollama, dan
 * sejenisnya tanpa bergantung pada satu provider besar. Kontrak: lihat
 * `docs/03-ai-pipeline/provider-setup.md` (antarmuka provider, pemetaan error,
 * retry) dan `docs/03-ai-pipeline/pipeline.md` (anggaran waktu).
 *
 * Aturan yang dipegang:
 *
 * - **Konfigurasi hanya dari `src/server/config.ts`.** Modul ini tidak membaca
 *   `process.env`; `AiConfig` sudah divalidasi di sana.
 * - **`fetch` bawaan, tanpa dependency baru.** Test menyuntikkan `fetch` palsu
 *   lewat opsi konstruktor, jadi tidak ada jaringan dan tidak perlu `vi.mock`.
 * - **Tidak ada retry.** Pipeline yang mengatur retry jaringan dan repair.
 * - **Tidak mengirim `response_format`.** Tidak semua server mendukungnya;
 *   parsing dan repair JSON tetap tugas pipeline.
 * - **Non-streaming.** `stream: false`, lalu baca `choices[0].message.content`.
 * - **Error dipetakan ke `AiProviderError`** dengan pesan statis. API key, URL
 *   dasar, isi prompt, materi, isi respons, dan body error server tidak pernah
 *   masuk ke pesan error atau log.
 */

import type { AiConfig } from "../../server/config";
import {
  AiProviderError,
  type AiProviderErrorCode,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "../provider";

/** Konfigurasi yang diterima provider ini: cabang `openai-compatible`. */
export type OpenAiCompatibleProviderConfig = Extract<
  AiConfig,
  { provider: "openai-compatible" }
>;

/**
 * Bagian `fetch` yang dipakai. Dibatasi ke satu fungsi supaya test bisa
 * menyuntikkan implementasi palsu tanpa mengganti global.
 */
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type OpenAiCompatibleProviderOptions = {
  /** `fetch` pengganti untuk test. Bila kosong, memakai `globalThis.fetch`. */
  fetch?: FetchLike;
};

/**
 * Pesan statis per kode. Tidak pernah memuat nilai env, isi prompt, materi,
 * isi respons, atau body error server.
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

/* -------------------------------------------------------------------------- */
/* Pemeriksaan bentuk data                                                    */
/* -------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Abort dari `AbortSignal` maupun `AbortSignal.timeout`. */
const isAbortLike = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;

  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
};

/**
 * Petakan status HTTP ke taksonomi yang sudah ada.
 *
 * | Status                     | Kode             |
 * | -------------------------- | ---------------- |
 * | 408                        | `AI_TIMEOUT`     |
 * | 429, 402                   | `AI_RATE_LIMIT`  |
 * | 401, 403                   | `AI_AUTH`        |
 * | 5xx dan status lain        | `AI_UNAVAILABLE` |
 */
const codeForStatus = (status: number): AiProviderErrorCode => {
  if (status === 408) return "AI_TIMEOUT";
  if (status === 429 || status === 402) return "AI_RATE_LIMIT";
  if (status === 401 || status === 403) return "AI_AUTH";
  return "AI_UNAVAILABLE";
};

const AUTH_HINTS = [
  "authentication",
  "unauthenticated",
  "unauthorized",
  "forbidden",
  "invalid_api_key",
  "invalid api key",
  "permission_denied",
  "permission denied",
] as const;

const RATE_LIMIT_HINTS = [
  "rate_limit",
  "rate limit",
  "insufficient_quota",
  "quota_exceeded",
  "quota exceeded",
  "insufficient_credits",
  "billing",
] as const;

const hintMatches = (value: unknown, hints: readonly string[]): boolean => {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
};

/**
 * Beberapa router membalas HTTP 200 dengan `{ "error": ... }`. Hanya kode
 * otentikasi/rate limit yang jelas yang dipetakan khusus; sisanya dianggap
 * gangguan sementara (`AI_UNAVAILABLE`).
 */
const codeFromErrorBody = (error: unknown): AiProviderErrorCode => {
  if (!isRecord(error)) return "AI_UNAVAILABLE";

  for (const key of ["status", "statusCode"] as const) {
    const value = error[key];
    if (typeof value === "number") {
      if (value === 401 || value === 403) return "AI_AUTH";
      if (value === 429 || value === 402) return "AI_RATE_LIMIT";
    }
  }

  const code = error.code;
  if (typeof code === "number") {
    if (code === 401 || code === 403) return "AI_AUTH";
    if (code === 429 || code === 402) return "AI_RATE_LIMIT";
  }

  if (hintMatches(code, AUTH_HINTS) || hintMatches(error.type, AUTH_HINTS)) {
    return "AI_AUTH";
  }
  if (
    hintMatches(code, RATE_LIMIT_HINTS) ||
    hintMatches(error.type, RATE_LIMIT_HINTS)
  ) {
    return "AI_RATE_LIMIT";
  }

  return "AI_UNAVAILABLE";
};

/**
 * Buang blok `<think>...</think>` (juga `<thinking>`) di awal teks. Model
 * reasoning sering mengirim blok itu sebelum JSON; pipeline hanya butuh
 * JSON-nya. Hanya blok di awal yang dibuang, dan hanya bila tag penutupnya ada.
 */
const THINK_BLOCK = /^\s*<(think|thinking)>[\s\S]*?<\/\1>/i;

const stripLeadingThinkBlocks = (text: string): string => {
  let result = text;

  while (THINK_BLOCK.test(result)) {
    result = result.replace(THINK_BLOCK, "");
  }

  return result.trimStart();
};

/** Gabungkan teks dari `content` string atau array bagian `{type,text}`. */
const textOf = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const first = choices[0];
  if (!isRecord(first)) return null;

  const message = first.message;
  if (!isRecord(message)) return null;

  const content = message.content;

  if (typeof content === "string") {
    return stripLeadingThinkBlocks(content);
  }

  if (!Array.isArray(content)) return null;

  const parts: string[] = [];
  for (const part of content) {
    if (
      isRecord(part) &&
      part.type === "text" &&
      typeof part.text === "string"
    ) {
      parts.push(part.text);
    }
  }

  return stripLeadingThinkBlocks(parts.join(""));
};

const usageOf = (payload: unknown): LlmResponse["usage"] => {
  const usage =
    isRecord(payload) && isRecord(payload.usage) ? payload.usage : null;

  const input =
    usage !== null && typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : 0;
  const output =
    usage !== null && typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : 0;

  return { input, output };
};

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export class OpenAiCompatibleProvider implements LlmProvider {
  private readonly config: OpenAiCompatibleProviderConfig;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike | null;

  constructor(
    config: OpenAiCompatibleProviderConfig,
    options: OpenAiCompatibleProviderOptions = {},
  ) {
    this.config = config;
    // `loadAiConfig()` sudah membuang trailing slash; diulang di sini supaya
    // provider yang dibuat langsung (mis. di test) tetap membentuk URL benar.
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? null;
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    if (signal?.aborted) throw providerError("AI_TIMEOUT");

    // Gabungkan pagar waktu provider dengan signal pipeline. Abort dari salah
    // satunya membatalkan fetch; tidak ada retry di sini.
    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    const combined =
      signal === undefined
        ? timeoutSignal
        : AbortSignal.any([signal, timeoutSignal]);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey !== null && this.config.apiKey !== "") {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    // `req.json` sengaja tidak dipakai: `response_format` tidak dikirim karena
    // tidak semua server mendukungnya (parsing/repair tetap di pipeline).
    // `thinking` hanya dikirim bila diminta (`AI_DISABLE_THINKING=on`): model
    // reasoning yang membiarkannya menyala menghabiskan anggaran output untuk
    // `reasoning_content` sebelum menulis JSON (ADR 0017).
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: req.maxOutputTokens,
      stream: false,
      ...(this.config.disableThinking
        ? { thinking: { type: "disabled" } }
        : {}),
    };

    // Temperature hanya dikirim bila request menyediakannya. `0` tetap
    // dikirim; hanya `undefined` yang dianggap tidak ada.
    if (typeof req.temperature === "number") {
      body.temperature = req.temperature;
    }

    let response: Response;

    try {
      const fetchImpl = this.fetchImpl ?? globalThis.fetch;
      response = await fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: combined,
      });
    } catch (error) {
      if (isAbortLike(error) || combined.aborted) {
        throw providerError("AI_TIMEOUT");
      }
      throw providerError("AI_UNAVAILABLE");
    }

    if (!response.ok) {
      // Body error tidak dibaca sama sekali: isinya bisa memuat prompt,
      // materi, atau URL internal dan tidak diperlukan untuk keputusan.
      throw providerError(codeForStatus(response.status));
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      if (isAbortLike(error) || combined.aborted) {
        throw providerError("AI_TIMEOUT");
      }
      throw providerError("AI_BAD_OUTPUT");
    }

    if (
      isRecord(payload) &&
      payload.error !== undefined &&
      payload.error !== null
    ) {
      throw providerError(codeFromErrorBody(payload.error));
    }

    const text = textOf(payload);
    if (text === null || text.trim() === "") {
      throw providerError("AI_BAD_OUTPUT");
    }

    return {
      text,
      usage: usageOf(payload),
      model: this.config.model,
    };
  }
}
