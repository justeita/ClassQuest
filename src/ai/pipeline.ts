/**
 * Orkestrasi pipeline AI ClassQuest: outline → chapter → validasi → repair →
 * fallback.
 *
 * Kontrak: `docs/03-ai-pipeline/pipeline.md` (tahapan, pseudocode, anggaran),
 * `docs/03-ai-pipeline/validation-and-repair.md` (alur repair dan fallback),
 * `docs/06-backend/jobs-and-limits.md` (batas keras), dan
 * `docs/03-ai-pipeline/provider-setup.md` (retry dan pemetaan error).
 *
 * Modul ini **murni orkestrasi**: semua ketergantungan di-inject lewat
 * parameter — provider, halaman materi, manifest aset, metadata, jam, dan
 * `AbortSignal`. Tidak ada I/O, jaringan, environment, atau database di sini.
 * Ekstraksi PDF, penyimpanan job, route, dan provider nyata adalah tugas lain.
 *
 * Janji yang dipegang:
 *
 * - **Tidak pernah melempar ke pemanggil.** Input aneh, provider gagal, waktu
 *   habis, atau anggaran panggilan habis tetap menghasilkan `Story` valid.
 * - **Selalu memvalidasi.** `validateOutline`, `validateChapter`, dan
 *   `validateStory` adalah satu-satunya pintu masuk cerita.
 * - **`assetUsage` dihitung di kode**, bukan diambil dari model.
 * - **Anggaran keras**: 18 panggilan LLM, 2 repair per chapter + 2 repair
 *   cerita, 60 detik per panggilan, deadline 240 detik, maksimal 8.000 token
 *   keluaran (ADR 0018).
 */

import { fixedCast } from "../story/cast";
import { buildFallbackStory } from "../story/fallback";
import { STORY_SCHEMA_VERSION } from "../story/schema";
import type {
  Challenge,
  Chapter,
  Character,
  Story,
  StoryFlag,
} from "../story/schema";
import type { AssetManifest, ValidationIssue } from "../story/validate";
import { validateStory } from "../story/validate";
import { validateChapter, validateOutline } from "../story/validate-parts";
import {
  buildChapterPrompt,
  buildOutlinePrompt,
  buildRepairPrompt,
  type ContinuityState,
  type Outline,
  type PromptResult,
} from "./prompt";
import {
  AiProviderError,
  isRetryableAiProviderError,
  type LlmProvider,
  type LlmResponse,
} from "./provider";

/* -------------------------------------------------------------------------- */
/* Batas keras (jobs-and-limits.md, validation-and-repair.md)                  */
/* -------------------------------------------------------------------------- */

/**
 * Batas atas panggilan LLM per cerita, termasuk retry jaringan dan cadangan.
 *
 * Dinaikkan 12 → 18 oleh ADR 0017: repair dihitung per chapter, jadi cerita
 * 3–6 chapter yang tiap chapternya butuh satu perbaikan tetap muat.
 */
export const MAX_LLM_CALLS_PER_STORY = 18;

/**
 * Repair per **chapter**. Model nyata sering menghasilkan satu error mekanis
 * per chapter (mis. `E_TRANSITION_LAST`); memberi jatah per unit membuat satu
 * chapter yang buruk tidak menghabiskan jatah chapter lain (ADR 0017).
 */
export const MAX_REPAIRS_PER_CHAPTER = 2;

/** Repair tingkat **cerita** saja (setelah semua chapter digabung). */
export const MAX_REPAIRS_PER_STORY = 2;

/** Pagar satu panggilan yang menggantung. Bukan target. */
export const LLM_CALL_TIMEOUT_MS = 60_000;

/**
 * Deadline keseluruhan; lewat ini berhenti memanggil dan memakai fallback.
 *
 * Dinaikkan 120 → 240 detik oleh ADR 0017: dengan repair per chapter, satu
 * cerita 6 chapter bisa memakai belasan panggilan.
 */
export const TOTAL_BUDGET_MS = 240_000;

/** Sebelum memulai panggilan baru, sisa waktu harus minimal sebesar ini. */
export const MIN_REMAINING_BUDGET_MS = 30_000;

/**
 * Maksimal diagnostik validasi yang disimpan saat fallback. Cukup untuk melihat
 * pola error (mis. id bentrok) tanpa membanjiri `jobs.log`.
 */
export const MAX_DIAGNOSTICS = 20;

/**
 * Maksimal output token per panggilan.
 *
 * Dinaikkan 4.000 → 8.000 oleh ADR 0018: saat reasoning dibiarkan hidup, model
 * bisa memakai 6.000–14.000 karakter `reasoning_content` sebelum menulis JSON,
 * sehingga plafon 4.000 membuat `finish_reason: "length"` dan `content` kosong.
 */
export const MAX_OUTPUT_TOKENS = 8_000;

/** Generate outline: satu percobaan + satu retry (pipeline.md tahap 4). */
export const OUTLINE_GENERATE_ATTEMPTS = 2;

/** Perbaikan outline: satu kali, terpisah dari jatah repair chapter. */
export const OUTLINE_REPAIRS = 1;

/* -------------------------------------------------------------------------- */
/* Stage dan progress job (jobs-and-limits.md, api-contract.md)                */
/* -------------------------------------------------------------------------- */

export const JOB_STAGES = [
  "queued",
  "extracting",
  "outlining",
  "generating",
  "validating",
  "repairing",
  "saving",
  "done",
  "failed",
] as const;

export type JobStage = (typeof JOB_STAGES)[number];

/**
 * Satu-satunya nilai `progress` yang boleh dikirim ke UI. Angka bebas membuat
 * UI melompat dan menyulitkan tes, jadi pipeline memakai peta ini.
 */
export const STAGE_PROGRESS: Record<JobStage, number> = {
  queued: 5,
  extracting: 15,
  outlining: 30,
  generating: 55,
  validating: 75,
  repairing: 75,
  saving: 90,
  done: 100,
  failed: 100,
};

/** Stage yang benar-benar dipancarkan pipeline ini (ekstraksi milik task 17). */
export type PipelineStage =
  "outlining" | "generating" | "validating" | "repairing" | "saving" | "done";

export type ProgressEvent = {
  stage: JobStage;
  progress: number;
};

/* -------------------------------------------------------------------------- */
/* Bentuk masukan dan hasil                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Metadata yang sudah diketahui sebelum generasi. `id` disediakan pemanggil
 * (record story), bukan dibuat pipeline. Field lain adalah petunjuk untuk
 * prompt dan untuk `Story.meta`.
 */
export type PipelineMeta = {
  id: string;
  fileName: string;
  /** Jumlah halaman PDF asli; dipakai `source.pageCount` dan validasi akhir. */
  pageCount: number;
  title?: string;
  subject?: string;
  gradeLevel?: string;
  language?: string;
  tone?: string;
  estimatedMinutes?: number;
};

export type GenerateStoryInput = {
  provider: LlmProvider;
  /** Teks materi per halaman; indeks 0 = halaman 1. Ekstraksi PDF di task 17. */
  pages: readonly string[];
  manifest: AssetManifest;
  meta: PipelineMeta;
  /**
   * Bila `true`, prompt chapter mengajari model aturan percabangan `onWrong`
   * (`AI_BRANCHING=on`). Default mati supaya perilaku lama tidak berubah.
   */
  branching?: boolean;
  /** Jam yang bisa di-inject untuk tes anggaran. Bawaan `Date.now`. */
  clock?: () => number;
  signal?: AbortSignal;
  /** Dipanggil hanya dengan stage dan progress yang tercantum di dokumen. */
  onProgress?: (event: ProgressEvent) => void;
};

export type GenerateStoryStats = {
  llmCalls: number;
  /**
   * Repair chapter + repair cerita. Total dibatasi anggaran panggilan
   * (`MAX_LLM_CALLS_PER_STORY`), bukan angka tetap per cerita.
   */
  repairs: number;
  durationMs: number;
};

/** Alasan fallback untuk record job. Tidak pernah masuk ke `Story`. */
export type FallbackReason =
  | "aborted"
  | "budget-exhausted"
  | "call-limit"
  | "outline-invalid"
  | "chapter-invalid"
  | "story-invalid"
  | "provider-timeout"
  | "provider-error"
  | "unexpected";

export type GenerateStoryResult = {
  story: Story;
  usedFallback: boolean;
  /** `null` saat sukses; kode alasan saat fallback. Milik record job. */
  reason: FallbackReason | null;
  stats: GenerateStoryStats;
  /** `source.gaps` cerita final; berguna untuk banner dan telemetri. */
  gaps: string[];
  /**
   * Kode + path error validasi terakhir saat fallback, mis.
   * `"E_DUPLICATE_ID challenges[3].id"`. **Tidak** memuat teks materi atau isi
   * cerita, jadi aman ditulis ke `jobs.log` dan ditampilkan ke operator.
   */
  diagnostics: string[];
};

/* -------------------------------------------------------------------------- */
/* Konstanta meta                                                             */
/* -------------------------------------------------------------------------- */

const DEFAULT_STORY_ID = "st_unknown";
const DEFAULT_FILE_NAME = "materi.pdf";
const DEFAULT_SUBJECT = "Umum";
const DEFAULT_GRADE = "SMP";
const DEFAULT_TONE = "hangat dan penasaran";
const DEFAULT_LANGUAGE = "id";
const DEFAULT_MINUTES = 6;
const DEFAULT_SYNOPSIS =
  "Cerita ini disusun dari materi pelajaran yang diunggah guru.";

const MAX_FILE_NAME = 200;
const MAX_CONCEPT = 60;
const MAX_GAP = 240;

/* -------------------------------------------------------------------------- */
/* Utilitas teks                                                              */
/* -------------------------------------------------------------------------- */

/** Buang kontrol, rapikan spasi, lalu potong per code point. */
const textOr = (
  value: unknown,
  fallback: string,
  min: number,
  max: number,
): string => {
  const raw =
    typeof value === "string"
      ? value
          .replace(/[\u0000-\u001F\u007F]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  const characters = [...raw];
  const clipped =
    characters.length > max ? characters.slice(0, max).join("").trimEnd() : raw;
  return [...clipped].length >= min ? clipped : fallback;
};

const pageCountOf = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(40, Math.max(1, Math.round(value)));
};

const minutesOf = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MINUTES;
  }
  return Math.min(30, Math.max(3, Math.round(value)));
};

const normalizeGaps = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const gaps: string[] = [];

  for (const value of values) {
    const gap = textOr(value, "", 1, MAX_GAP);
    if (gap.length === 0 || seen.has(gap)) continue;
    seen.add(gap);
    gaps.push(gap);
  }

  return gaps;
};

/* -------------------------------------------------------------------------- */
/* assemble                                                                   */
/* -------------------------------------------------------------------------- */

export type AssembleParts = {
  chapters: readonly Chapter[];
  challenges: readonly Challenge[];
};

export type AssembleOptions = {
  meta: PipelineMeta;
  /** Gap tambahan dari pipeline (pemotongan materi, halaman di luar rentang). */
  gaps?: readonly string[];
};

/**
 * Deklarasi flag yang dipakai chapter.
 *
 * Prompt tidak mengajarkan `onWrong`/`textVariants` (lihat task 25b), jadi
 * cerita biasa tetap tanpa `flags` dan bentuknya sama persis seperti sebelum
 * fitur bercabang ada. Fixture mock (dan model yang kelak memakai field itu)
 * mendapat deklarasi otomatis di sini; nilai awalnya `false` supaya teks utama
 * dipakai sampai siswa menjawab salah. Urutan mengikuti kemunculan pertama,
 * sehingga hasilnya deterministik.
 */
const collectFlags = (
  chapters: readonly Chapter[],
): StoryFlag[] | undefined => {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string" || value.length === 0) return;
    if (seen.has(value)) return;
    seen.add(value);
    ids.push(value);
  };

  for (const chapter of chapters) {
    for (const scene of chapter?.scenes ?? []) {
      for (const beat of scene?.beats ?? []) {
        if (beat?.type === "dialogue") {
          for (const variant of beat.textVariants ?? []) {
            if ("flag" in variant.when) add(variant.when.flag);
          }
        } else if (beat?.type === "challenge") {
          for (const flagId of Object.keys(beat.onWrong?.setFlags ?? {})) {
            add(flagId);
          }
          for (const detour of beat.onWrong?.detour ?? []) {
            if (detour?.type !== "dialogue") continue;
            for (const variant of detour.textVariants ?? []) {
              if ("flag" in variant.when) add(variant.when.flag);
            }
          }
        }
      }
    }
  }

  return ids.length === 0
    ? undefined
    : ids.map((id) => ({ id, default: false }));
};

/**
 * Gabungkan chapter menjadi `Story` yang siap divalidasi.
 *
 * Yang dibangun di sini dan tidak pernah dipercayakan ke model:
 *
 * - `meta` dan `source` (konsep, `pageCount`, `gaps`),
 * - `cast` dari roster tetap (`src/story/cast.ts`), bukan dari model,
 * - `assetUsage` dari hasil pemindaian cerita, diurutkan dan tanpa duplikat.
 */
export function assemble(
  outline: Outline,
  parts: AssembleParts,
  options: AssembleOptions,
): Story {
  const { meta } = options;
  const pageCount = pageCountOf(meta.pageCount);

  // Roster dikunci: nama, id, role, dan sprite karakter tidak pernah diambil
  // dari keluaran model. Dengan begitu guru/siswa selalu melihat tokoh desa
  // yang sama walaupun materi atau model berubah.
  const cast: Character[] = fixedCast();

  const concepts = [
    ...new Set(
      outline.concepts
        .map((concept) => textOr(concept, "", 1, MAX_CONCEPT))
        .filter((concept) => concept.length > 0),
    ),
  ].slice(0, 12);

  const chapters = [...parts.chapters];
  const challenges = [...parts.challenges];
  const flags = collectFlags(chapters);
  const gaps = normalizeGaps([
    ...(outline.gaps ?? []),
    ...(options.gaps ?? []),
  ]);

  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    meta: {
      id: textOr(meta.id, DEFAULT_STORY_ID, 1, MAX_FILE_NAME),
      title: textOr(meta.title, outline.title, 3, 80),
      subject: textOr(meta.subject, DEFAULT_SUBJECT, 1, 40),
      gradeLevel: textOr(meta.gradeLevel, DEFAULT_GRADE, 1, 40),
      language: textOr(outline.language, DEFAULT_LANGUAGE, 2, 10),
      tone: textOr(meta.tone, DEFAULT_TONE, 1, 60),
      synopsis: textOr(outline.synopsis, DEFAULT_SYNOPSIS, 40, 400),
      estimatedMinutes: minutesOf(meta.estimatedMinutes),
    },
    source: {
      fileName: textOr(meta.fileName, DEFAULT_FILE_NAME, 1, MAX_FILE_NAME),
      pageCount,
      concepts,
      gaps,
    },
    cast,
    chapters,
    challenges,
    assetUsage: computeAssetUsage(chapters, cast),
    ...(flags === undefined ? {} : { flags }),
  };
}

/** Sama persis dengan `checkAssetUsageConsistency` di validator. */
const computeAssetUsage = (
  chapters: readonly Chapter[],
  cast: readonly Character[],
) => {
  const backgrounds = new Set<string>();
  const music = new Set<string>();

  for (const chapter of chapters) {
    if (typeof chapter?.backgroundId === "string") {
      backgrounds.add(chapter.backgroundId);
    }
    if (typeof chapter?.musicId === "string") music.add(chapter.musicId);

    for (const scene of chapter?.scenes ?? []) {
      if (typeof scene?.backgroundId === "string") {
        backgrounds.add(scene.backgroundId);
      }
      if (typeof scene?.musicId === "string") music.add(scene.musicId);
    }
  }

  const sprites = new Set<string>();
  for (const character of cast) {
    if (typeof character?.spriteId === "string") {
      sprites.add(character.spriteId);
    }
  }

  return {
    backgrounds: [...backgrounds].sort(),
    music: [...music].sort(),
    sprites: [...sprites].sort(),
  };
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

const createReporter = (callback?: (event: ProgressEvent) => void) => {
  let lastProgress = -1;
  let lastStage: JobStage | null = null;

  return (stage: PipelineStage) => {
    if (!callback) return;

    const progress = STAGE_PROGRESS[stage];
    if (progress < lastProgress) return;
    if (progress === lastProgress && stage === lastStage) return;

    lastProgress = progress;
    lastStage = stage;

    try {
      callback({ stage, progress });
    } catch {
      // Callback UI tidak boleh menggagalkan generasi.
    }
  };
};

/* -------------------------------------------------------------------------- */
/* Penghentian internal                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Sinyal internal untuk berhenti dan memakai fallback. Selalu ditangkap
 * `generateStory`; tidak pernah sampai ke pemanggil.
 */
class PipelineStop extends Error {
  readonly reason: FallbackReason;

  constructor(reason: FallbackReason) {
    super(reason);
    this.name = "PipelineStop";
    this.reason = reason;
  }
}

/* -------------------------------------------------------------------------- */
/* Panggilan provider                                                         */
/* -------------------------------------------------------------------------- */

const timeoutError = () =>
  new AiProviderError("AI_TIMEOUT", "Panggilan LLM melewati batas waktu.");

type ProviderErrorShape = { name?: unknown } | null;

/**
 * Satu percobaan panggilan, dengan pagar 60 detik dan penghormatan `signal`.
 *
 * `Promise.race` dipakai supaya provider yang mengabaikan `signal` tetap tidak
 * menggantung pemanggil saat abort/timeout.
 */
const callWithTimeout = async (
  provider: LlmProvider,
  request: PromptResult,
  outerSignal: AbortSignal | undefined,
): Promise<LlmResponse> => {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort, { once: true });

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, LLM_CALL_TIMEOUT_MS);
  });

  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => reject(timeoutError()), {
      once: true,
    });
  });

  const payload: PromptResult = {
    ...request,
    maxOutputTokens: Math.min(request.maxOutputTokens, MAX_OUTPUT_TOKENS),
  };

  try {
    return await Promise.race([
      provider.complete(payload, controller.signal),
      timedOut,
      aborted,
    ]);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (outerSignal?.aborted) throw timeoutError();
    if ((error as ProviderErrorShape)?.name === "AbortError") {
      throw timeoutError();
    }
    // Kegagalan tak dikenal diperlakukan seperti gangguan sementara: satu
    // retry, lalu fallback. Tidak pernah bocor sebagai exception ke pemanggil.
    throw new AiProviderError("AI_UNAVAILABLE", "Provider gagal menjawab.");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
};

type BudgetState = { calls: number };

const beginCall = (
  state: BudgetState,
  startedAt: number,
  clock: () => number,
  signal: AbortSignal | undefined,
) => {
  if (signal?.aborted) throw new PipelineStop("aborted");
  if (state.calls >= MAX_LLM_CALLS_PER_STORY) {
    throw new PipelineStop("call-limit");
  }

  const elapsed = Math.max(0, clock() - startedAt);
  if (TOTAL_BUDGET_MS - elapsed < MIN_REMAINING_BUDGET_MS) {
    throw new PipelineStop("budget-exhausted");
  }

  state.calls += 1;
};

const parseJsonText = (
  text: string,
): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
};

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Jalankan pipeline generasi. Selalu mengembalikan cerita valid; kegagalan
 * apa pun berakhir di `buildFallbackStory`.
 */
export async function generateStory(
  input: GenerateStoryInput,
): Promise<GenerateStoryResult> {
  const clock = input.clock ?? Date.now;
  const startedAt = clock();
  const emit = createReporter(input.onProgress);
  const budget: BudgetState = { calls: 0 };
  const stats: GenerateStoryStats = {
    llmCalls: 0,
    repairs: 0,
    durationMs: 0,
  };

  const gaps = new Set<string>();
  const addGap = (value: string) => {
    const gap = textOr(value, "", 1, MAX_GAP);
    if (gap.length > 0) gaps.add(gap);
  };

  const pageCount = pageCountOf(input.meta.pageCount);
  let outline: Outline | null = null;
  let storyRepairsLeft = MAX_REPAIRS_PER_STORY;

  /**
   * Error validasi terakhir yang membuat fallback. Hanya kode + path; teks
   * materi tidak pernah masuk sini.
   */
  let lastIssues: readonly ValidationIssue[] = [];
  const rememberIssues = (issues: readonly ValidationIssue[]): void => {
    lastIssues = issues;
  };

  /** Satu panggilan + satu retry jaringan untuk error transien. */
  const complete = async (prompt: PromptResult): Promise<LlmResponse> => {
    try {
      beginCall(budget, startedAt, clock, input.signal);
      return await callWithTimeout(input.provider, prompt, input.signal);
    } catch (error) {
      if (error instanceof PipelineStop) throw error;
      if (isRetryableAiProviderError(error) && !input.signal?.aborted) {
        beginCall(budget, startedAt, clock, input.signal);
        return callWithTimeout(input.provider, prompt, input.signal);
      }
      throw error;
    }
  };

  /**
   * Ambil payload JSON. JSON rusak diminta sekali lagi (generate ulang), sesuai
   * `validation-and-repair.md`: kasus struktural tidak diselesaikan repair.
   */
  const requestPayload = async (
    prompt: PromptResult,
    reason: FallbackReason,
  ): Promise<unknown> => {
    const first = parseJsonText((await complete(prompt)).text);
    if (first.ok) return first.value;

    const second = parseJsonText((await complete(prompt)).text);
    if (second.ok) return second.value;

    throw new PipelineStop(reason);
  };

  const collectPromptGaps = (prompt: PromptResult, label: string) => {
    if (prompt.material.droppedPages.length > 0) {
      const pages = [...prompt.material.droppedPages].sort((a, b) => a - b);
      addGap(
        `Halaman ${pages.join(", ")} tidak dikirim ke model untuk ${label} karena batas materi.`,
      );
    }
    if (prompt.material.droppedCharacters > 0) {
      addGap(
        `Materi untuk ${label} dipotong ${prompt.material.droppedCharacters} karakter karena batas 30.000 karakter.`,
      );
    }
  };

  /**
   * `sourcePages` di luar rentang halaman asli tidak punya kode error, jadi
   * halaman itu dibuang dan dicatat sebagai gap. Input tidak diubah.
   */
  const normalizeSourcePages = (value: Outline): Outline => ({
    ...value,
    chapters: value.chapters.map((chapter) => {
      const kept: number[] = [];
      const dropped: number[] = [];

      for (const page of chapter.sourcePages) {
        if (Number.isInteger(page) && page >= 1 && page <= pageCount) {
          kept.push(page);
        } else {
          dropped.push(page);
        }
      }

      if (dropped.length > 0) {
        addGap(
          `Chapter ${chapter.id} meminta halaman ${dropped.join(", ")} di luar rentang materi 1-${pageCount}; halaman itu diabaikan.`,
        );
      }

      return { ...chapter, sourcePages: kept };
    }),
  });

  /* ---------------------------------------------------------------------- */
  /* Outline pass                                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Ganti `cast` keluaran model dengan roster tetap sebelum validasi.
   *
   * Model tetap diminta menyalin cast dari blok CAST, tetapi jawabannya tidak
   * dipercaya: kalau ia lupa, mengubah nama, atau menambah tokoh, hasilnya tetap
   * roster desa yang sama. Nilai bukan objek dikembalikan apa adanya supaya
   * validator yang melaporkan error bentuk.
   */
  const withFixedCast = (candidate: unknown): unknown =>
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
      ? { ...candidate, cast: fixedCast() }
      : candidate;

  const outlinePass = async (): Promise<Outline> => {
    emit("outlining");

    const prompt = buildOutlinePrompt({
      pages: input.pages,
      assets: input.manifest,
      meta: input.meta,
    });
    collectPromptGaps(prompt, "outline");

    let candidate: unknown = null;
    let check = validateOutline(candidate);

    for (let attempt = 0; attempt < OUTLINE_GENERATE_ATTEMPTS; attempt += 1) {
      candidate = withFixedCast(
        await requestPayload(prompt, "outline-invalid"),
      );
      check = validateOutline(candidate, { manifest: input.manifest });
      if (check.ok) return normalizeSourcePages(candidate as Outline);
    }

    for (let attempt = 0; attempt < OUTLINE_REPAIRS; attempt += 1) {
      emit("repairing");
      const repairPrompt = buildRepairPrompt({
        draft: candidate,
        errors: check.errors,
        truncatedErrorCount: check.truncatedErrorCount,
        assets: input.manifest,
      });

      candidate = withFixedCast(
        await requestPayload(repairPrompt, "outline-invalid"),
      );
      check = validateOutline(candidate, { manifest: input.manifest });
      if (check.ok) return normalizeSourcePages(candidate as Outline);
    }

    rememberIssues(check.errors);
    throw new PipelineStop("outline-invalid");
  };

  /* ---------------------------------------------------------------------- */
  /* Chapter pass                                                           */
  /* ---------------------------------------------------------------------- */

  const initialContinuity = (value: Outline): ContinuityState => ({
    previousChapterSummary: "",
    characterStates: value.cast.map((member) => ({
      id: member.id,
      location: "",
      knows: [],
    })),
    openThreads: [],
  });

  const chapterPass = async (
    value: Outline,
    planned: Outline["chapters"][number],
    continuity: ContinuityState,
    usedFlags: readonly string[],
  ) => {
    const prompt = buildChapterPrompt({
      pages: input.pages,
      assets: input.manifest,
      outline: value,
      planned,
      continuity,
      meta: input.meta,
      branching: input.branching === true,
      usedFlags,
    });
    collectPromptGaps(prompt, `chapter ${planned.id}`);

    const context = {
      outline: { concepts: value.concepts, cast: value.cast },
      planned: { id: planned.id, concept: planned.concept },
      manifest: input.manifest,
      priorFlags: usedFlags,
    };

    let draft = await requestPayload(prompt, "chapter-invalid");
    let check = validateChapter(draft, context);
    let chapterRepairsLeft = MAX_REPAIRS_PER_CHAPTER;

    while (!check.ok && chapterRepairsLeft > 0) {
      chapterRepairsLeft -= 1;
      stats.repairs += 1;
      emit("repairing");

      const repairPrompt = buildRepairPrompt({
        draft,
        errors: check.errors,
        truncatedErrorCount: check.truncatedErrorCount,
        assets: input.manifest,
        outline: value,
        planned,
      });

      draft = await requestPayload(repairPrompt, "chapter-invalid");
      check = validateChapter(draft, context);
    }

    if (!check.ok) {
      rememberIssues(check.errors);
      throw new PipelineStop("chapter-invalid");
    }

    return draft as {
      chapter: Chapter;
      challenges: Challenge[];
      continuity: ContinuityState;
    };
  };

  /* ---------------------------------------------------------------------- */
  /* Cerita                                                                 */
  /* ---------------------------------------------------------------------- */

  const fallback = (reason: FallbackReason): GenerateStoryResult => {
    const story = buildFallbackStory({
      meta: {
        title: input.meta.title,
        subject: input.meta.subject,
        gradeLevel: input.meta.gradeLevel,
        language: outline?.language ?? input.meta.language,
        tone: input.meta.tone,
        fileName: input.meta.fileName,
        pageCount,
        estimatedMinutes: input.meta.estimatedMinutes,
      },
      concepts: outline?.concepts,
      castSeed: outline?.cast,
      reason,
    });

    const identified: Story = {
      ...story,
      meta: {
        ...story.meta,
        id: textOr(input.meta.id, DEFAULT_STORY_ID, 1, MAX_FILE_NAME),
      },
    };

    emit("saving");
    emit("done");

    return {
      story: identified,
      usedFallback: true,
      reason,
      stats: {
        ...stats,
        llmCalls: budget.calls,
        durationMs: Math.max(0, clock() - startedAt),
      },
      gaps: identified.source.gaps ?? [],
      diagnostics: lastIssues
        .slice(0, MAX_DIAGNOSTICS)
        .map((issue) => `${issue.code} ${issue.path}`),
    };
  };

  const reasonOf = (error: unknown): FallbackReason => {
    if (error instanceof PipelineStop) return error.reason;
    if (input.signal?.aborted) return "aborted";
    if (error instanceof AiProviderError) {
      return error.code === "AI_TIMEOUT"
        ? "provider-timeout"
        : "provider-error";
    }
    return "unexpected";
  };

  try {
    outline = await outlinePass();

    emit("generating");

    const chapters: Chapter[] = [];
    const challenges: Challenge[] = [];
    let continuity = initialContinuity(outline);

    for (const planned of outline.chapters) {
      emit("generating");
      const usedFlags = (collectFlags(chapters) ?? []).map((flag) => flag.id);
      const result = await chapterPass(outline, planned, continuity, usedFlags);

      chapters.push(result.chapter);
      challenges.push(...result.challenges);
      continuity = result.continuity;
    }

    emit("validating");

    let story = assemble(
      outline,
      { chapters, challenges },
      { meta: input.meta, gaps: [...gaps] },
    );
    let check = validateStory(story, {
      manifest: input.manifest,
      pageCount,
    });

    // Repair tingkat cerita punya jatah sendiri, terpisah dari jatah chapter.
    while (!check.ok && storyRepairsLeft > 0) {
      storyRepairsLeft -= 1;
      stats.repairs += 1;
      emit("repairing");

      const repairPrompt = buildRepairPrompt({
        draft: story,
        errors: check.errors,
        truncatedErrorCount: check.truncatedErrorCount,
        assets: input.manifest,
        outline,
      });

      const repaired = await requestPayload(repairPrompt, "story-invalid");
      const parts = asStoryParts(repaired);
      if (!parts) throw new PipelineStop("story-invalid");

      story = assemble(outline, parts, {
        meta: input.meta,
        gaps: [...gaps],
      });
      check = validateStory(story, {
        manifest: input.manifest,
        pageCount,
      });
    }

    if (!check.ok) {
      rememberIssues(check.errors);
      throw new PipelineStop("story-invalid");
    }

    emit("saving");
    emit("done");

    return {
      story,
      usedFallback: false,
      reason: null,
      stats: {
        ...stats,
        llmCalls: budget.calls,
        durationMs: Math.max(0, clock() - startedAt),
      },
      gaps: story.source.gaps ?? [],
      diagnostics: [],
    };
  } catch (error) {
    return fallback(reasonOf(error));
  }
}

/** Ambil bagian yang bisa dirakit ulang dari hasil repair tingkat cerita. */
const asStoryParts = (value: unknown): AssembleParts | null => {
  if (typeof value !== "object" || value === null) return null;

  const record = value as { chapters?: unknown; challenges?: unknown };
  if (!Array.isArray(record.chapters) || !Array.isArray(record.challenges)) {
    return null;
  }

  return {
    chapters: record.chapters as Chapter[],
    challenges: record.challenges as Challenge[],
  };
};
