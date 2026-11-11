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
 * **Chapter mengikuti id prompt.** Dalam mode bawaan (tanpa `stage`/`sequence`
 * eksplisit) tahap chapter memakai fixture `chapter/<id>.json` bila ada, mis.
 * `ch_02` → `chapter/ch_02.json`. `ch_01` tetap memakai `chapter/valid.json`.
 * Tanpa pemetaan ini, outline tiga chapter akan menerima fixture chapter yang
 * sama tiga kali; id duplikat membuat cerita tidak valid dan pipeline selalu
 * jatuh ke fallback.
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

/**
 * Satu langkah skrip per panggilan. String berarti skenario (tahap disimpulkan
 * dari prompt); objek menunjuk fixture relatif terhadap `outputs/`.
 *
 * Dipakai test pipeline yang butuh chapter berbeda per panggilan, tanpa
 * mengubah antarmuka `LlmProvider`.
 */
export type MockProviderStep = MockScenario | { readonly fixture: string };

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
  /**
   * Skrip per panggilan, dikonsumsi berurutan. Setelah habis, perilaku kembali
   * ke `stage`/`scenario` biasa.
   */
  sequence?: readonly MockProviderStep[];
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

/** `TASK` chapter di `prompt-contract.md`: `Tulis chapter "ch_02" ...`. */
const CHAPTER_ID_PROMPT = /Tulis chapter "([^"]+)"/;

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

/**
 * Fixture chapter untuk id yang diminta prompt (`ch_02` → `chapter/ch_02.json`).
 * `null` bila id tidak punya fixture khusus; pemanggil memakai `valid.json`.
 */
const plannedChapterFixture = (user: string): string | null => {
  const id = CHAPTER_ID_PROMPT.exec(user)?.[1];
  if (id === undefined) return null;

  const candidate = `chapter/${id}.json`;
  return existsSync(join(OUTPUTS_DIR, candidate)) ? candidate : null;
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
  private readonly sequence: readonly MockProviderStep[];
  private stepIndex = 0;

  constructor(options: MockProviderOptions = {}) {
    this.scenario = options.scenario ?? DEFAULT_SCENARIO;
    this.stage = options.stage ?? null;
    this.stages = options.stages ?? {};
    this.timeoutMs = options.timeoutMs ?? 0;
    this.sequence = options.sequence ?? [];
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    if (signal?.aborted) {
      throw timeoutError("Mock provider dibatalkan sebelum panggilan selesai.");
    }

    const step = this.sequence[this.stepIndex];
    if (step !== undefined) this.stepIndex += 1;

    const stage = this.stage ?? stageFromPrompt(req) ?? DEFAULT_STAGE;
    const scenario =
      typeof step === "string" ? step : (this.stages[stage] ?? this.scenario);

    if (typeof step === "object") {
      const text = readFileSync(join(OUTPUTS_DIR, step.fixture), "utf8");
      return { text, usage: { input: 0, output: 0 }, model: "mock" };
    }

    if (scenario === "timeout") {
      await waitForTimeout(this.timeoutMs, signal);
      throw timeoutError("Mock provider melewati batas waktu panggilan.");
    }

    // Mode bawaan mengikuti id chapter dari prompt. `stage`/`sequence`
    // eksplisit tetap menang supaya test bisa memilih fixture rusak.
    if (
      step === undefined &&
      this.stage === null &&
      stage === "chapter" &&
      scenario === "valid"
    ) {
      const planned = plannedChapterFixture(req.user);
      if (planned !== null) {
        return {
          text: readFileSync(join(OUTPUTS_DIR, planned), "utf8"),
          usage: { input: 0, output: 0 },
          model: "mock",
        };
      }
    }

    const text = readFileSync(fixturePath(stage, scenario), "utf8");

    return {
      text,
      usage: { input: 0, output: 0 },
      model: "mock",
    };
  }
}
