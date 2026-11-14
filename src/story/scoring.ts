/**
 * Penilaian tantangan ClassQuest.
 *
 * Kontrak: `docs/02-data-model/challenge-types.md` bagian "Penilaian dan skor",
 * ditambah aturan percobaan pertama di
 * `docs/04-game/interaction-loop.md` bagian "Alur tantangan".
 *
 * Semua fungsi di sini **murni**: tanpa I/O, tanpa DOM, tanpa React, tanpa
 * `localStorage`, dan tanpa API Node/Bun. Modul ini dipakai bersama oleh client
 * (overlay tantangan) dan server (pipeline/pratinjau), jadi hanya tipe dari
 * `./schema` yang boleh diimpor — dan hanya lewat `import type` supaya zod
 * tidak ikut ke bundle browser.
 */

import type { Challenge, Story } from "./schema";

/* -------------------------------------------------------------------------- */
/* Bentuk jawaban dan hasil                                                   */
/* -------------------------------------------------------------------------- */

/** Poin bawaan saat `challenge.points` tidak diisi. */
export const DEFAULT_POINTS = 10;

export type MultipleChoiceAnswer = {
  challengeId: string;
  type: "multiple_choice";
  selectedId: string;
};

export type TrueFalseAnswer = {
  challengeId: string;
  type: "true_false";
  answer: boolean;
};

export type OrderingAnswer = {
  challengeId: string;
  type: "ordering";
  order: string[];
};

export type ShortAnswerAnswer = {
  challengeId: string;
  type: "short_answer";
  text: string;
};

/**
 * Jawaban siswa untuk satu tantangan. Bentuk ini sama dengan yang tertulis di
 * `challenge-types.md`; `challengeId` yang menghubungkan jawaban ke tantangan,
 * bukan urutan larik.
 */
export type Answer =
  MultipleChoiceAnswer | TrueFalseAnswer | OrderingAnswer | ShortAnswerAnswer;

/** Hasil penilaian satu jawaban. */
export type AnswerResult = {
  challengeId: string;
  isCorrect: boolean;
  /** Poin yang didapat: `points` (default 10) bila benar, 0 bila salah. */
  pointsAwarded: number;
};

/**
 * Ringkasan satu kali main, sesuai `challenge-types.md` dan kolom
 * `play_results` di `docs/06-backend/persistence.md`.
 */
export type PlayResult = {
  /** Jumlah poin semua tantangan di cerita, termasuk yang belum dijawab. */
  totalPoints: number;
  /** Jumlah poin yang benar-benar didapat. */
  earnedPoints: number;
  correctCount: number;
  totalChallenges: number;
  /** `conceptTag` unik dari tantangan yang dijawab salah, urut kemunculan. */
  weakConcepts: string[];
};

/** Agregat benar/total per konsep. */
export type ConceptScore = {
  conceptTag: string;
  correct: number;
  total: number;
};

/* -------------------------------------------------------------------------- */
/* Normalisasi teks jawaban singkat                                           */
/* -------------------------------------------------------------------------- */

/**
 * Tanda baca di akhir jawaban dibuang, sesuai aturan "buang tanda baca akhir"
 * di `challenge-types.md`. Hanya bagian akhir yang dibuang; tanda baca di
 * tengah kata dan simbol seperti `%` tidak disentuh.
 */
const TRAILING_PUNCTUATION = /\p{P}+$/u;

/**
 * Normalisasi `short_answer`: rapikan spasi, lowercase bila tidak
 * `caseSensitive`, lalu buang tanda baca akhir.
 *
 * Dokumen tidak mendefinisikan pelipatan aksen, jadi aksen dibandingkan apa
 * adanya. Kalau aturan itu ditambahkan nanti, ubah di sini dan di dokumen
 * sekaligus.
 */
const normalizeShortAnswer = (
  value: string,
  caseSensitive: boolean,
): string => {
  let normalized = value.replace(/\s+/g, " ").trim();
  if (!caseSensitive) normalized = normalized.toLowerCase();
  return normalized.replace(TRAILING_PUNCTUATION, "").trim();
};

/* -------------------------------------------------------------------------- */
/* Pencocokan jawaban                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Cocokkan satu jawaban dengan tantangannya.
 *
 * Aturan per tipe mengikuti `challenge-types.md`:
 * - `multiple_choice`: `selectedId === correctOptionId`.
 * - `true_false`: `answer === correctAnswer`.
 * - `ordering`: urutan persis sama; MVP tidak memberi skor parsial.
 * - `short_answer`: teks ternormalisasi ada di `acceptedAnswers` ternormalisasi.
 *
 * Jawaban dengan tipe yang tidak cocok, id opsi yang tidak dikenal, atau bentuk
 * yang belum lengkap selalu dianggap salah — fungsi ini tidak melempar.
 */
const matches = (challenge: Challenge, answer: Answer): boolean => {
  if (challenge.id !== answer.challengeId) return false;

  switch (challenge.type) {
    case "multiple_choice":
      if (answer.type !== "multiple_choice") return false;
      return answer.selectedId === challenge.correctOptionId;

    case "true_false":
      if (answer.type !== "true_false") return false;
      return answer.answer === challenge.correctAnswer;

    case "ordering": {
      if (answer.type !== "ordering") return false;
      if (answer.order.length !== challenge.correctOrder.length) return false;
      return challenge.correctOrder.every(
        (itemId, index) => answer.order[index] === itemId,
      );
    }

    case "short_answer": {
      if (answer.type !== "short_answer") return false;
      const caseSensitive = challenge.caseSensitive ?? false;
      const normalized = normalizeShortAnswer(answer.text, caseSensitive);
      // Jawaban kosong tidak pernah benar, termasuk bila ada `acceptedAnswers`
      // yang seluruhnya tanda baca.
      if (!normalized) return false;
      return challenge.acceptedAnswers.some(
        (accepted) =>
          normalizeShortAnswer(accepted, caseSensitive) === normalized,
      );
    }
  }
};

/* -------------------------------------------------------------------------- */
/* API penilaian                                                              */
/* -------------------------------------------------------------------------- */

/** Poin tantangan; memakai `DEFAULT_POINTS` bila `points` tidak diisi. */
const pointsOf = (challenge: Challenge): number =>
  challenge.points ?? DEFAULT_POINTS;

/**
 * Nilai satu jawaban dan hitung poinnya.
 *
 * Benar mendapat `points` (default 10), salah mendapat 0. Tidak ada
 * pengurangan untuk mencoba lagi dan tidak ada skor parsial.
 */
export function scoreAnswer(
  challenge: Challenge,
  answer: Answer,
): AnswerResult {
  const correct = matches(challenge, answer);
  return {
    challengeId: challenge.id,
    isCorrect: correct,
    pointsAwarded: correct ? pointsOf(challenge) : 0,
  };
}

/** Versi boolean dari `scoreAnswer`, dipakai overlay sebelum menampilkan umpan balik. */
export function isCorrect(challenge: Challenge, answer: Answer): boolean {
  return matches(challenge, answer);
}

/* -------------------------------------------------------------------------- */
/* Jawaban sebagai teks                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Batas panjang jawaban yang dikutip di dialog (code point). Kotak dialog hanya
 * muat ±180 karakter; dengan teks bervariabel ≤ 120 karakter, jawaban 60
 * karakter masih muat. Kontrak: `story-schema.md` bagian "Konsekuensi jawaban
 * salah".
 */
export const MAX_JAWABAN_CHARS = 60;

const potong = (value: string): string => {
  const huruf = [...value];
  return huruf.length > MAX_JAWABAN_CHARS
    ? `${huruf.slice(0, MAX_JAWABAN_CHARS).join("")}…`
    : value;
};

/**
 * Jawaban siswa dalam bentuk yang bisa dibaca di dialog (`{{jawaban}}`).
 *
 * - `multiple_choice` → teks opsi yang dipilih; id tak dikenal dipakai apa adanya.
 * - `true_false` → `Benar` / `Salah`.
 * - `ordering` → teks item sesuai urutan susunan siswa, dipisah ` → `.
 * - `short_answer` → teks yang diketik, spasi dirapikan.
 *
 * Fungsi ini **tidak** menilai jawaban; ia hanya menerjemahkan bentuk jawaban.
 * Tipe jawaban yang tidak cocok dengan tantangan tetap diterjemahkan memakai
 * data tantangan bila ada, sehingga tidak pernah melempar.
 */
export function renderAnswer(challenge: Challenge, answer: Answer): string {
  switch (answer.type) {
    case "multiple_choice": {
      const opsi =
        challenge.type === "multiple_choice"
          ? challenge.options.find((option) => option.id === answer.selectedId)
          : undefined;
      return potong(opsi?.text ?? answer.selectedId);
    }

    case "true_false":
      return answer.answer ? "Benar" : "Salah";

    case "ordering": {
      const item =
        challenge.type === "ordering"
          ? challenge.items
          : ([] as { id: string; text: string }[]);
      return potong(
        answer.order
          .map((id) => item.find((entry) => entry.id === id)?.text ?? id)
          .join(" → "),
      );
    }

    case "short_answer":
      return potong(answer.text.replace(/\s+/g, " ").trim());
  }
}

/** Jumlahkan poin dari sekumpulan hasil jawaban. */
export function totalScore(results: readonly AnswerResult[]): number {
  return results.reduce((sum, result) => sum + result.pointsAwarded, 0);
}

/**
 * Jawaban pertama per tantangan. Sesuai `interaction-loop.md`, skor memakai
 * percobaan pertama; jawaban berikutnya untuk id yang sama diabaikan.
 */
const firstAnswersById = (answers: readonly Answer[]): Map<string, Answer> => {
  const byId = new Map<string, Answer>();
  for (const answer of answers) {
    if (!byId.has(answer.challengeId)) byId.set(answer.challengeId, answer);
  }
  return byId;
};

/**
 * Hitung hasil satu kali main dari seluruh jawaban.
 *
 * - Tantangan yang belum dijawab menyumbang 0 poin dan tidak masuk
 *   `weakConcepts` (siswa belum menjawab, bukan menjawab salah).
 * - `weakConcepts` unik dan urut kemunculan tantangan di cerita, supaya hasil
 *   deterministik.
 * - Input tidak pernah diubah.
 */
export function scoreStory(
  story: Story,
  answers: readonly Answer[],
): PlayResult {
  const byId = firstAnswersById(answers);
  const results: AnswerResult[] = [];
  const weakConcepts: string[] = [];
  const seenConcepts = new Set<string>();
  let totalPoints = 0;

  for (const challenge of story.challenges) {
    totalPoints += pointsOf(challenge);

    const answer = byId.get(challenge.id);
    if (answer === undefined) continue;

    const result = scoreAnswer(challenge, answer);
    results.push(result);

    if (!result.isCorrect && !seenConcepts.has(challenge.conceptTag)) {
      seenConcepts.add(challenge.conceptTag);
      weakConcepts.push(challenge.conceptTag);
    }
  }

  return {
    totalPoints,
    earnedPoints: totalScore(results),
    correctCount: results.filter((result) => result.isCorrect).length,
    totalChallenges: story.challenges.length,
    weakConcepts,
  };
}

/**
 * Agregat benar/total per `conceptTag`.
 *
 * Fungsi terpisah dan **belum dipakai** di route, server, schema, atau layar
 * mana pun; keputusan pemakaiannya masih menunggu tim. Urutan konsep mengikuti
 * kemunculan pertama di `story.challenges` agar deterministik.
 */
export function aggregateByConcept(
  story: Story,
  answers: readonly Answer[],
): ConceptScore[] {
  const byId = firstAnswersById(answers);
  const scores: ConceptScore[] = [];
  const indexByConcept = new Map<string, number>();

  for (const challenge of story.challenges) {
    let index = indexByConcept.get(challenge.conceptTag);
    if (index === undefined) {
      index = scores.length;
      indexByConcept.set(challenge.conceptTag, index);
      scores.push({ conceptTag: challenge.conceptTag, correct: 0, total: 0 });
    }

    const score = scores[index]!;
    score.total += 1;

    const answer = byId.get(challenge.id);
    if (answer !== undefined && matches(challenge, answer)) {
      score.correct += 1;
    }
  }

  return scores;
}
