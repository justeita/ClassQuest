/**
 * Provider mock untuk pengembangan dan test.
 *
 * Kontrak: `docs/03-ai-pipeline/provider-setup.md` bagian **Pengembangan tanpa
 * kunci API** dan `docs/03-ai-pipeline/validation-and-repair.md` bagian
 * **Test**. MockProvider:
 *
 * - membaca fixture dari `src/ai/__fixtures__/outputs/`,
 * - tidak memanggil jaringan dan tidak butuh kunci API,
 * - deterministik: input sama → output sama (isi file + `usage` tetap),
 * - menyediakan output valid, tiga output rusak dengan kode validator berbeda,
 *   JSON rusak, dan simulasi timeout.
 *
 * **Pemilihan skenario.** Dokumen tidak menetapkan mekanismenya. Karena
 * `src/server/config.ts` adalah satu-satunya pembaca environment AI, mock tidak
 * membaca env sendiri; skenario dipilih lewat opsi konstruktor. Opsi
 * `stages` memungkinkan skenario berbeda per tahap, mis.
 * `{ stages: { outline: "valid", chapter: "unknown-speaker" } }`.
 *
 * **Pemilihan tahap.** Setiap fixture adalah keluaran satu tahap. Urutan
 * penentuan tahap:
 *
 * 1. opsi `stage` (eksplisit, dipakai test),
 * 2. penanda prompt yang sudah ditetapkan `prompt-contract.md` dan
 *    `validation-and-repair.md` (repair → chapter → outline),
 * 3. `"chapter"` sebagai bawaan.
 *
 * Tahap `"story"` bukan tahap pipeline; ia hanya menyajikan `Story` utuh untuk
 * menguji validator dan fallback. Skrip rusak selalu tersedia di
 * `outputs/story/`, sehingga tahap mana pun bisa memakainya bila tidak ada
 * fixture khusus tahap itu.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AiProviderError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "./provider";

/* -------------------------------------------------------------------------- */
/* Skenario dan tahap                                                         */
/* -------------------------------------------------------------------------- */

export const MOCK_SCENARIOS = [
  "valid",
  "unknown-asset",
  "text-too-long",
  "unknown-speaker",
  "malformed-json",
  "timeout",
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const MOCK_STAGES = ["outline", "chapter", "repair", "story"] as const;

export type MockStage = (typeof MOCK_STAGES)[number];

export type MockProviderOptions = {
  /** Skenario untuk semua tahap yang tidak diatur di `stages`. Bawaan `valid`. */
  scenario?: MockScenario;
  /** Tahap eksplisit. Bila kosong, tahap disimpulkan dari penanda prompt. */
  stage?: MockStage;
  /** Skenario per tahap; menang atas `scenario`. */
  stages?: Partial<Record<MockStage, MockScenario>>;
  /**
   * Jeda sebelum skenario `timeout` melempar `AI_TIMEOUT`, dalam milidetik.
   * Bawaan `0` supaya test tidak menunggu.
   */
  timeoutMs?: number;
};

const DEFAULT_SCENARIO: MockScenario = "valid";
const DEFAULT_STAGE: MockStage = "chapter";

/**
 * Vite mengganti `new URL(..., import.meta.url)` menjadi URL aset, jadi jalur
 * fixture dihitung dari `fileURLToPath` agar tetap menunjuk ke disk.
 */
const OUTPUTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "outputs",
);

/* -------------------------------------------------------------------------- */
/* Penentuan tahap dari prompt                                                */
/* -------------------------------------------------------------------------- */

/** Awal prompt repair di `validation-and-repair.md`. */
const REPAIR_PROMPT = /^\s*Perbaiki JSON berikut/;

/** Judul blok schema chapter di `prompt-contract.md`. */
const CHAPTER_PROMPT = "SCHEMA CHAPTER";

/** Baris `OUTLINE` yang berdiri sendiri di blok schema outline. */
const OUTLINE_PROMPT = /(^|\n)OUTLINE(\r?\n|$)/;

const stageFromPrompt = (req: LlmRequest): MockStage | null => {
  if (REPAIR_PROMPT.test(req.user)) return "repair";
  if (req.user.includes(CHAPTER_PROMPT)) return "chapter";
  if (OUTLINE_PROMPT.test(req.user)) return "outline";
  return null;
};

/* -------------------------------------------------------------------------- */
/* Fixture                                                                    */
/* -------------------------------------------------------------------------- */

const fixturePath = (stage: MockStage, scenario: MockScenario): string => {
  const candidates = [`${stage}/${scenario}.json`, `story/${scenario}.json`];

  for (const candidate of candidates) {
    const path = join(OUTPUTS_DIR, candidate);
    if (existsSync(path)) return path;
  }

  throw new Error(
    `Fixture mock tidak ditemukan untuk tahap "${stage}" skenario "${scenario}" di src/ai/__fixtures__/outputs/.`,
  );
};

/* -------------------------------------------------------------------------- */
/* Timeout                                                                    */
/* -------------------------------------------------------------------------- */

const timeoutError = (message: string) =>
  new AiProviderError("AI_TIMEOUT", message);

const waitForTimeout = (timeoutMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(timeoutError("Mock provider dibatalkan sebelum selesai."));
      return;
    }

    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
      Math.max(0, timeoutMs),
    );

    const onAbort = () => {
      clearTimeout(timer);
      reject(timeoutError("Mock provider dibatalkan sebelum selesai."));
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    // Abort bisa terjadi di antara pemeriksaan awal dan pemasangan listener.
    if (signal?.aborted) onAbort();
  });

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export class MockProvider implements LlmProvider {
  private readonly scenario: MockScenario;
  private readonly stage: MockStage | null;
  private readonly stages: Partial<Record<MockStage, MockScenario>>;
  private readonly timeoutMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.stage = options.stage ?? null;
    this.stages = options.stages ?? {};
    this.timeoutMs = options.timeoutMs ?? 0;
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    if (signal?.aborted) {
      throw timeoutError("Mock provider dibatalkan sebelum panggilan selesai.");
    }

    const stage = this.stage ?? stageFromPrompt(req) ?? DEFAULT_STAGE;
    const scenario = this.stages[stage] ?? this.scenario;

    if (scenario === "timeout") {
      await waitForTimeout(this.timeoutMs, signal);
      throw timeoutError("Mock provider melewati batas waktu panggilan.");
    }

    const text = readFileSync(fixturePath(stage, scenario), "utf8");

    return {
      text,
      usage: { input: 0, output: 0 },
      model: "mock",
    };
  }
}
