/**
 * Konsekuensi jawaban salah untuk cerita bercabang.
 *
 * Kontrak: `docs/02-data-model/story-schema.md` bagian "Konsekuensi jawaban
 * salah". Modul ini **murni**: tanpa Phaser, tanpa DOM, tanpa React, tanpa
 * `localStorage`, dan tanpa API Node/Bun — jadi perilakunya bisa dites tanpa
 * canvas. `BranchingRun` hanya pembungkus state kecil (nilai flag + jumlah
 * percobaan) di atas fungsi murni di bawahnya.
 *
 * Cerita yang tidak memakai field baru tetap berperilaku seperti v1.0 biasa:
 * `maxAttempts` efektif 1, sehingga `planWrong()` selalu `final`.
 */

import type {
  ChallengeBeat,
  DetourBeat,
  DialogueBeat,
  Story,
} from "@/story/schema";

/** Nilai flag cerita saat berjalan; kunci = id flag (pola `flg_*`). */
export type FlagState = Readonly<Record<string, boolean>>;

/**
 * Nilai awal flag dari `story.flags`. Cerita tanpa flag (field opsional)
 * menghasilkan objek kosong, sehingga `flags[id]` selalu `undefined` dan tidak
 * ada varian yang cocok.
 */
export function initialFlags(story: Story): FlagState {
  const flags: Record<string, boolean> = {};
  for (const flag of story.flags ?? []) flags[flag.id] = flag.default;
  return flags;
}

/**
 * Salinan flag dengan `setFlags` diterapkan. Objek masukan tidak diubah, jadi
 * pemanggil boleh menyimpan snapshot lama (mis. untuk perbandingan di tes).
 */
export function applyFlags(
  flags: FlagState,
  setFlags: Readonly<Record<string, boolean>> | undefined,
): FlagState {
  if (setFlags === undefined) return flags;
  return { ...flags, ...setFlags };
}

/**
 * Teks dialog efektif: varian **pertama** yang cocok
 * (`flags[when.flag] === when.is`) menang; bila tidak ada yang cocok, `text`
 * utama yang dipakai. Berlaku juga untuk dialog di dalam `detour`.
 */
export function resolveDialogueText(
  beat: DialogueBeat,
  flags: FlagState,
): string {
  for (const variant of beat.textVariants ?? []) {
    if (flags[variant.when.flag] === variant.when.is) return variant.text;
  }
  return beat.text;
}

/** Jumlah percobaan beat tantangan; default 1 (perilaku v1.0 biasa). */
export function maxAttemptsOf(beat: ChallengeBeat): number {
  return beat.maxAttempts ?? 1;
}

/** Rencana lanjutan saat jawaban salah masih punya percobaan tersisa. */
export type RetryPlan = {
  /** Beat narasi/dialog yang diputar sebelum soal ditanyakan ulang. */
  detour: DetourBeat[];
  /** Teks soal pengganti untuk percobaan berikutnya. */
  retryQuestion: string;
};

export type WrongPlan = { kind: "retry"; retry: RetryPlan } | { kind: "final" };

/**
 * Keputusan setelah jawaban salah. `attemptsUsed` termasuk percobaan yang baru
 * saja dipakai (1-based).
 *
 * Retry hanya terjadi bila masih ada percobaan berikutnya
 * (`attemptsUsed < maxAttempts`) **dan** teks soal ulang tersedia. Validator
 * menjamin `retryQuestions` tepat `maxAttempts - 1`, jadi cabang kedua praktis
 * hanya jaring pengaman untuk data yang belum divalidasi.
 */
export function planWrong(
  beat: ChallengeBeat,
  attemptsUsed: number,
): WrongPlan {
  if (attemptsUsed >= maxAttemptsOf(beat)) return { kind: "final" };

  const retryQuestion = beat.onWrong?.retryQuestions?.[attemptsUsed - 1];
  if (retryQuestion === undefined) return { kind: "final" };

  return {
    kind: "retry",
    retry: {
      detour: beat.onWrong?.detour ?? [],
      retryQuestion,
    },
  };
}

/** Hasil satu percobaan jawaban. */
export type GradeOutcome = {
  isCorrect: boolean;
  /** Jumlah percobaan yang sudah dipakai untuk challenge ini. */
  attempts: number;
  /** Rencana detour + soal ulang; `null` bila cerita lanjut seperti biasa. */
  retry: RetryPlan | null;
  /** Flag **setelah** `onWrong.setFlags` diterapkan (hanya saat retry). */
  flags: FlagState;
};

/**
 * State bercabang satu kali main: nilai flag dan jumlah percobaan per
 * challenge.
 *
 * Jawaban **pertama** per challenge tetap dicatat `AnswerLog` (skor
 * `firstAttempt`), jadi modul ini sengaja tidak menyimpannya lagi dan tidak
 * pernah menimpa percobaan pertama.
 */
export class BranchingRun {
  private flagState: FlagState;
  private readonly attempts = new Map<string, number>();

  constructor(story: Story) {
    this.flagState = initialFlags(story);
  }

  /** Nilai flag saat ini (read-only; perubahan selalu lewat `grade`). */
  flags(): FlagState {
    return this.flagState;
  }

  /** Jumlah percobaan yang sudah dipakai untuk challenge ini. */
  attemptsFor(challengeId: string): number {
    return this.attempts.get(challengeId) ?? 0;
  }

  /**
   * Catat satu percobaan jawaban.
   *
   * - Jawaban benar selalu lanjut seperti biasa (`retry: null`).
   * - Jawaban salah memakai `planWrong()`; `onWrong.setFlags` hanya dinyalakan
   *   ketika soal memang akan ditanyakan ulang, karena percobaan terakhir
   *   tidak punya lanjutan yang membaca flag.
   */
  grade(beat: ChallengeBeat, isCorrect: boolean): GradeOutcome {
    const attempts = this.attemptsFor(beat.challengeId) + 1;
    this.attempts.set(beat.challengeId, attempts);

    if (isCorrect) {
      return { isCorrect: true, attempts, retry: null, flags: this.flagState };
    }

    const plan = planWrong(beat, attempts);
    if (plan.kind === "final") {
      return {
        isCorrect: false,
        attempts,
        retry: null,
        flags: this.flagState,
      };
    }

    this.flagState = applyFlags(this.flagState, beat.onWrong?.setFlags);
    return {
      isCorrect: false,
      attempts,
      retry: plan.retry,
      flags: this.flagState,
    };
  }
}
