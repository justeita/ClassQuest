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
 * Token teks yang diganti jawaban salah terakhir siswa. Kontrak:
 * `docs/02-data-model/story-schema.md` bagian "Konsekuensi jawaban salah".
 */
export const JAWABAN_TOKEN = "{{jawaban}}";

/**
 * Ganti setiap `{{jawaban}}` dengan jawaban siswa.
 *
 * Bila belum ada jawaban salah (mis. cerita yang tidak pernah menjawab salah,
 * atau token di tempat yang salah), token dibuang dan spasi dirapikan supaya
 * kalimat tidak menyisakan celah. Validator cerita penuh menolak token sebelum
 * tantangan pertama (`E_JAWABAN_TANPA_SOAL`), jadi cabang ini hanya jaring
 * pengaman.
 */
export function substituteJawaban(
  text: string,
  jawaban?: string | null,
): string {
  if (!text.includes(JAWABAN_TOKEN)) return text;

  const nilai = (jawaban ?? "").trim();
  if (nilai.length > 0) return text.split(JAWABAN_TOKEN).join(nilai);

  return text
    .split(JAWABAN_TOKEN)
    .join("")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Teks dialog efektif: varian **pertama** yang cocok
 * (`flags[when.flag] === when.is`) menang; bila tidak ada yang cocok, `text`
 * utama yang dipakai. `{{jawaban}}` diganti jawaban salah terakhir. Berlaku
 * juga untuk dialog di dalam `detour`.
 */
export function resolveDialogueText(
  beat: DialogueBeat,
  flags: FlagState,
  jawaban?: string | null,
): string {
  for (const variant of beat.textVariants ?? []) {
    if (flags[variant.when.flag] === variant.when.is) {
      return substituteJawaban(variant.text, jawaban);
    }
  }
  return substituteJawaban(beat.text, jawaban);
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
  /** Flag **setelah** `onWrong.setFlags` diterapkan (setiap jawaban salah). */
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
  private jawabanSalah: string | null = null;
  private readonly attempts = new Map<string, number>();

  constructor(story: Story) {
    this.flagState = initialFlags(story);
  }

  /** Nilai flag saat ini (read-only; perubahan selalu lewat `grade`). */
  flags(): FlagState {
    return this.flagState;
  }

  /**
   * Jawaban salah terakhir dalam bentuk teks, untuk `{{jawaban}}`; `null` bila
   * belum pernah salah. Nilainya diisi `grade()` dari `renderAnswer()`, jadi
   * modul ini tidak perlu tahu bentuk tantangan.
   */
  jawabanSalahTerakhir(): string | null {
    return this.jawabanSalah;
  }

  /** Jumlah percobaan yang sudah dipakai untuk challenge ini. */
  attemptsFor(challengeId: string): number {
    return this.attempts.get(challengeId) ?? 0;
  }

  /**
   * Catat satu percobaan jawaban.
   *
   * - Jawaban benar selalu lanjut seperti biasa (`retry: null`).
   * - Jawaban salah **selalu** menyalakan `onWrong.setFlags` dan menyimpan
   *   `answerText` sebagai jawaban salah terakhir, termasuk pada percobaan
   *   terakhir yang tidak punya lanjutan. Flag berarti "pernah salah", sehingga
   *   dialog setelah soal bisa memakai `textVariants` untuk mengakui kesalahan
   *   (ADR 0020).
   * - `planWrong()` tetap menentukan apakah detour + soal ulang diputar.
   */
  grade(
    beat: ChallengeBeat,
    isCorrect: boolean,
    answerText?: string | null,
  ): GradeOutcome {
    const attempts = this.attemptsFor(beat.challengeId) + 1;
    this.attempts.set(beat.challengeId, attempts);

    if (isCorrect) {
      return { isCorrect: true, attempts, retry: null, flags: this.flagState };
    }

    const jawaban = answerText?.trim() ?? "";
    if (jawaban.length > 0) this.jawabanSalah = jawaban;
    this.flagState = applyFlags(this.flagState, beat.onWrong?.setFlags);

    const plan = planWrong(beat, attempts);
    return {
      isCorrect: false,
      attempts,
      retry: plan.kind === "retry" ? plan.retry : null,
      flags: this.flagState,
    };
  }
}
