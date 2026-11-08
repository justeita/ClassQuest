/**
 * Konfigurasi server dari environment.
 *
 * **Satu-satunya** modul yang membaca `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`,
 * `AI_BASE_URL`, dan `AI_TIMEOUT_MS` dari `process.env`
 * (`docs/03-ai-pipeline/provider-setup.md`). Modul lain memakai hasil
 * `loadAiConfig()` supaya test tidak perlu menyentuh environment global dan
 * supaya satu nilai tidak dibaca di dua tempat dengan aturan berbeda.
 *
 * Aturan yang dipegang di sini:
 *
 * - Nilai default adalah `mock`. Provider sungguhan belum diputuskan
 *   (ADR 0006), jadi `mock` harus bisa jalan tanpa kunci apa pun.
 * - Provider di luar `mock` dan `anthropic` gagal dengan pesan yang jelas,
 *   bukan diterima lalu gagal saat demo.
 * - `AI_API_KEY` **tidak pernah** ikut di pesan error. Pesan ke guru/operator
 *   hanya menyebut nama variabel.
 * - Modul ini sengaja tidak memanggil `process.exit()` dan tidak mencetak apa
 *   pun saat diimpor: pemanggil yang memutuskan cara gagal (Next.js akan
 *   menggagalkan request pertama), dan import harus aman untuk test.
 *
 * Batas impor `docs/01-architecture/repo-structure.md`: `src/server` hanya boleh
 * diimpor dari server code. Kunci API diperlakukan sebagai kredensial
 * (`docs/11-logicodix/06-keamanan-kredensial.md`), jadi jangan mengimpor file
 * ini dari komponen client.
 */

/** Provider yang sah. Daftar ini sengaja pendek sampai ADR 0006 selesai. */
export const SUPPORTED_AI_PROVIDERS = ["mock", "anthropic"] as const;

export type AiProviderName = (typeof SUPPORTED_AI_PROVIDERS)[number];

/** `AI_TIMEOUT_MS` bawaan; satu panggilan LLM yang lewat ini dianggap gagal. */
export const DEFAULT_AI_TIMEOUT_MS = 60_000;

export type AiConfig =
  | {
      provider: "mock";
      /** `null` = tidak dipakai provider ini, walau variabelnya terisi. */
      apiKey: null;
      model: null;
      baseUrl: null;
      timeoutMs: number;
    }
  | {
      provider: "anthropic";
      apiKey: string;
      model: string;
      baseUrl: string | null;
      timeoutMs: number;
    };

/**
 * Error konfigurasi. `message` aman ditampilkan (tidak memuat nilai rahasia);
 * `variables` menyebut variabel mana yang perlu diperbaiki.
 */
export class AiConfigError extends Error {
  readonly variables: readonly string[];

  constructor(message: string, variables: readonly string[] = []) {
    super(message);
    this.name = "AiConfigError";
    this.variables = variables;
  }
}

/**
 * Sumber environment yang bisa diganti di test. Default-nya `process.env`
 * dibaca saat fungsi dipanggil, bukan saat modul diimpor.
 */
export type EnvSource = Record<string, string | undefined>;

const read = (env: EnvSource, name: string): string | null => {
  const value = env[name];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const readTimeout = (env: EnvSource): number => {
  const raw = read(env, "AI_TIMEOUT_MS");
  if (raw === null) return DEFAULT_AI_TIMEOUT_MS;

  // Hanya digit; menolak "60s", "6e4", "1.5", dan tanda minus/plus.
  if (!/^[0-9]+$/.test(raw)) {
    throw new AiConfigError(
      `AI_TIMEOUT_MS harus bilangan bulat positif dalam milidetik (contoh: ${DEFAULT_AI_TIMEOUT_MS}).`,
      ["AI_TIMEOUT_MS"],
    );
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new AiConfigError(
      `AI_TIMEOUT_MS harus bilangan bulat positif dalam milidetik (contoh: ${DEFAULT_AI_TIMEOUT_MS}).`,
      ["AI_TIMEOUT_MS"],
    );
  }

  return value;
};

/**
 * Baca dan validasi konfigurasi AI.
 *
 * @param env sumber environment; default `process.env`.
 * @throws {AiConfigError} bila provider tidak dikenal, variabel wajib kosong,
 * atau timeout tidak sah.
 */
export function loadAiConfig(env: EnvSource = process.env): AiConfig {
  const timeoutMs = readTimeout(env);

  // Kosong atau tidak diset berarti `mock`: onboarding dan test tidak boleh
  // butuh kunci (docs/03-ai-pipeline/provider-setup.md).
  const providerName = (read(env, "AI_PROVIDER") ?? "mock").toLowerCase();

  if (!isSupportedProvider(providerName)) {
    throw new AiConfigError(
      `Provider AI "${providerName}" belum didukung. Nilai yang bisa dipakai: ${SUPPORTED_AI_PROVIDERS.join(", ")}.`,
      ["AI_PROVIDER"],
    );
  }

  if (providerName === "mock") {
    return {
      provider: "mock",
      apiKey: null,
      model: null,
      baseUrl: null,
      timeoutMs,
    };
  }

  // Provider sungguhan: wajib punya kunci dan model. Pesan hanya menyebut nama
  // variabel — nilai `AI_API_KEY` tidak boleh muncul di mana pun.
  const apiKey = read(env, "AI_API_KEY");
  const model = read(env, "AI_MODEL");
  const missing: string[] = [];

  if (apiKey === null) missing.push("AI_API_KEY");
  if (model === null) missing.push("AI_MODEL");

  if (missing.length > 0 || apiKey === null || model === null) {
    throw new AiConfigError(
      `AI_PROVIDER=${providerName} membutuhkan ${missing.join(" dan ")} yang tidak boleh kosong. Isi di .env.local.`,
      missing,
    );
  }

  return {
    provider: "anthropic",
    apiKey,
    model,
    baseUrl: read(env, "AI_BASE_URL"),
    timeoutMs,
  };
}

export function isSupportedProvider(value: string): value is AiProviderName {
  return (SUPPORTED_AI_PROVIDERS as readonly string[]).includes(value);
}
