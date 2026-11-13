import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { describe, expect, it } from "vitest";

import type { Challenge, Story } from "./schema";
import {
  DEFAULT_POINTS,
  aggregateByConcept,
  isCorrect,
  scoreAnswer,
  scoreStory,
  totalScore,
  type Answer,
} from "./scoring";

/**
 * Kontrak: `docs/02-data-model/challenge-types.md` (empat tipe + aturan skor)
 * dan `docs/04-game/interaction-loop.md` (skor memakai percobaan pertama).
 *
 * Fixture utama adalah cerita resmi `docs/02-data-model/story.example.json`,
 * jadi semua tipe tantangan yang benar-benar dipakai produk ikut teruji.
 *
 * Catatan: di jsdom `new URL(path, import.meta.url)` memakai basis
 * `http://localhost:3000`, jadi `URL` milik Node yang diimpor untuk membaca
 * fixture dari disk.
 */

const EXAMPLE: Story = JSON.parse(
  readFileSync(
    fileURLToPath(
      new NodeURL(
        "../../docs/02-data-model/story.example.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
) as Story;

const challengeById = (id: string): Challenge => {
  const challenge = EXAMPLE.challenges.find((item) => item.id === id);
  if (!challenge) throw new Error(`Tantangan ${id} tidak ada di contoh.`);
  return challenge;
};

const correctAnswerFor = (challenge: Challenge): Answer => {
  switch (challenge.type) {
    case "multiple_choice":
      return {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: challenge.correctOptionId,
      };
    case "true_false":
      return {
        challengeId: challenge.id,
        type: "true_false",
        answer: challenge.correctAnswer,
      };
    case "ordering":
      return {
        challengeId: challenge.id,
        type: "ordering",
        order: [...challenge.correctOrder],
      };
    case "short_answer":
      return {
        challengeId: challenge.id,
        type: "short_answer",
        text: challenge.acceptedAnswers[0]!,
      };
  }
};

const base = {
  prompt: "Pertanyaan uji yang cukup panjang.",
  conceptTag: "Evaporasi",
  difficulty: 1,
  explanation: "Penjelasan uji yang cukup panjang.",
} as const;

const multipleChoice = (overrides: Partial<Challenge> = {}): Challenge =>
  ({
    ...base,
    id: "chl_uji_mc",
    type: "multiple_choice",
    options: [
      { id: "opt_a", text: "Pilihan A" },
      { id: "opt_b", text: "Pilihan B" },
    ],
    correctOptionId: "opt_a",
    ...overrides,
  }) as Challenge;

const trueFalse = (overrides: Partial<Challenge> = {}): Challenge =>
  ({
    ...base,
    id: "chl_uji_tf",
    type: "true_false",
    statement: "Pernyataan uji yang cukup panjang.",
    correctAnswer: true,
    ...overrides,
  }) as Challenge;

const ordering = (overrides: Partial<Challenge> = {}): Challenge =>
  ({
    ...base,
    id: "chl_uji_order",
    type: "ordering",
    items: [
      { id: "itm_satu", text: "Langkah satu" },
      { id: "itm_dua", text: "Langkah dua" },
      { id: "itm_tiga", text: "Langkah tiga" },
    ],
    correctOrder: ["itm_satu", "itm_dua", "itm_tiga"],
    ...overrides,
  }) as Challenge;

const shortAnswer = (overrides: Partial<Challenge> = {}): Challenge =>
  ({
    ...base,
    id: "chl_uji_sa",
    type: "short_answer",
    acceptedAnswers: ["infiltrasi", "peresapan"],
    caseSensitive: false,
    ...overrides,
  }) as Challenge;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
};

describe("multiple_choice", () => {
  const challenge = multipleChoice();

  it("benar bila memilih opsi yang benar", () => {
    const answer: Answer = {
      challengeId: challenge.id,
      type: "multiple_choice",
      selectedId: "opt_a",
    };

    expect(isCorrect(challenge, answer)).toBe(true);
    expect(scoreAnswer(challenge, answer)).toEqual({
      challengeId: challenge.id,
      isCorrect: true,
      pointsAwarded: DEFAULT_POINTS,
    });
  });

  it("salah bila memilih opsi lain", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_b",
      }),
    ).toBe(false);
  });

  it("salah bila id opsi tidak dikenal", () => {
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_tidak_ada",
      }),
    ).toEqual({
      challengeId: challenge.id,
      isCorrect: false,
      pointsAwarded: 0,
    });
  });

  it("salah bila pilihan kosong", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "",
      }),
    ).toBe(false);
  });

  it("salah bila tipe jawaban tidak cocok dengan tantangan", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "true_false",
        answer: true,
      }),
    ).toBe(false);
  });
});

describe("true_false", () => {
  it("benar bila jawaban sama dengan correctAnswer", () => {
    const challenge = trueFalse({ correctAnswer: true });
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "true_false",
        answer: true,
      }),
    ).toBe(true);

    const falseChallenge = trueFalse({ correctAnswer: false });
    expect(
      isCorrect(falseChallenge, {
        challengeId: falseChallenge.id,
        type: "true_false",
        answer: false,
      }),
    ).toBe(true);
  });

  it("salah bila jawaban berbeda", () => {
    const challenge = trueFalse({ correctAnswer: true });
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "true_false",
        answer: false,
      }),
    ).toEqual({
      challengeId: challenge.id,
      isCorrect: false,
      pointsAwarded: 0,
    });
  });

  it("salah bila challengeId tidak cocok", () => {
    const challenge = trueFalse();
    expect(
      isCorrect(challenge, {
        challengeId: "chl_lain",
        type: "true_false",
        answer: true,
      }),
    ).toBe(false);
  });
});

describe("ordering", () => {
  const challenge = ordering();

  it("benar hanya bila urutan persis sama", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "ordering",
        order: ["itm_satu", "itm_dua", "itm_tiga"],
      }),
    ).toBe(true);
  });

  it("salah bila urutan berbeda (tanpa skor parsial)", () => {
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "ordering",
        order: ["itm_satu", "itm_tiga", "itm_dua"],
      }),
    ).toEqual({
      challengeId: challenge.id,
      isCorrect: false,
      pointsAwarded: 0,
    });
  });

  it("salah bila hanya sebagian urutan benar", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "ordering",
        order: ["itm_satu", "itm_dua"],
      }),
    ).toBe(false);
  });

  it("salah bila ada id berlebih atau berulang", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "ordering",
        order: ["itm_satu", "itm_dua", "itm_tiga", "itm_satu"],
      }),
    ).toBe(false);
  });

  it("salah bila jawaban kosong", () => {
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "ordering",
        order: [],
      }),
    ).toBe(false);
  });
});

describe("short_answer", () => {
  it("mengabaikan huruf besar dan spasi di tepi", () => {
    const challenge = shortAnswer();
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "  Infiltrasi ",
      }),
    ).toBe(true);
  });

  it("merapikan spasi ganda di dalam jawaban", () => {
    const challenge = shortAnswer({ acceptedAnswers: ["air tanah"] });
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "  Air   Tanah ",
      }),
    ).toBe(true);
  });

  it("membuang tanda baca di akhir jawaban dan di akhir acceptedAnswers", () => {
    const challenge = shortAnswer({ acceptedAnswers: ["peresapan."] });
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "peresapan!",
      }),
    ).toBe(true);
  });

  it("menghormati caseSensitive", () => {
    const challenge = shortAnswer({
      acceptedAnswers: ["Infiltrasi"],
      caseSensitive: true,
    });

    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "Infiltrasi",
      }),
    ).toBe(true);
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "infiltrasi",
      }),
    ).toBe(false);
  });

  it("salah bila jawaban kosong atau hanya spasi", () => {
    const challenge = shortAnswer();
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "",
      }),
    ).toBe(false);
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "   ",
      }),
    ).toBe(false);
  });

  it("salah bila jawaban tidak ada di acceptedAnswers", () => {
    const challenge = shortAnswer();
    expect(
      isCorrect(challenge, {
        challengeId: challenge.id,
        type: "short_answer",
        text: "kondensasi",
      }),
    ).toBe(false);
  });
});

describe("poin", () => {
  it("memakai poin 10 saat points tidak diisi", () => {
    const challenge = multipleChoice();
    expect(challenge.points).toBeUndefined();
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_a",
      }).pointsAwarded,
    ).toBe(10);
  });

  it("menghormati points yang diisi, termasuk 0", () => {
    const challenge = multipleChoice({ points: 0 });
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_a",
      }).pointsAwarded,
    ).toBe(0);
  });

  it("tidak mengurangi poin saat salah", () => {
    const challenge = multipleChoice({ points: 25 });
    expect(
      scoreAnswer(challenge, {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_b",
      }).pointsAwarded,
    ).toBe(0);
  });
});

describe("scoreStory pada cerita contoh", () => {
  it("menjumlahkan semua tantangan dengan jawaban benar", () => {
    const answers = EXAMPLE.challenges.map(correctAnswerFor);
    const result = scoreStory(EXAMPLE, answers);

    expect(result.totalChallenges).toBe(9);
    expect(result.totalPoints).toBe(140);
    expect(result.earnedPoints).toBe(140);
    expect(result.correctCount).toBe(9);
    expect(result.weakConcepts).toEqual([]);
  });

  it("mengumpulkan weakConcepts unik dari jawaban salah", () => {
    const answers = EXAMPLE.challenges.map(correctAnswerFor);
    const first = challengeById("chl_01_01");
    const second = challengeById("chl_02_01");

    answers[0] = {
      challengeId: first.id,
      type: "multiple_choice",
      selectedId: "opt_b",
    };
    answers[1] = {
      challengeId: second.id,
      type: "true_false",
      answer: !(second.type === "true_false" && second.correctAnswer),
    };

    const result = scoreStory(EXAMPLE, answers);
    expect(result.correctCount).toBe(7);
    expect(result.earnedPoints).toBe(120);
    expect(result.weakConcepts).toEqual(["Perbandingan", "Pecahan"]);
  });

  it("tantangan yang belum dijawab tidak dihitung benar atau lemah", () => {
    const result = scoreStory(EXAMPLE, []);

    expect(result.totalChallenges).toBe(9);
    expect(result.totalPoints).toBe(140);
    expect(result.earnedPoints).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.weakConcepts).toEqual([]);
  });

  it("memakai percobaan pertama saat ada jawaban berulang", () => {
    const challenge = challengeById("chl_01_01");
    const result = scoreStory(EXAMPLE, [
      {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_b",
      },
      {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: "opt_a",
      },
    ]);

    expect(result.correctCount).toBe(0);
    expect(result.earnedPoints).toBe(0);
    expect(result.weakConcepts).toEqual(["Perbandingan"]);
  });

  it("deterministik dan tidak bergantung urutan jawaban", () => {
    const answers = EXAMPLE.challenges.map(correctAnswerFor);
    const first = scoreStory(EXAMPLE, answers);
    const second = scoreStory(EXAMPLE, [...answers].reverse());

    expect(second).toEqual(first);
    expect(scoreStory(EXAMPLE, answers)).toEqual(first);
  });
});

describe("totalScore", () => {
  it("menjumlahkan pointsAwarded", () => {
    expect(
      totalScore([
        { challengeId: "a", isCorrect: true, pointsAwarded: 10 },
        { challengeId: "b", isCorrect: false, pointsAwarded: 0 },
        { challengeId: "c", isCorrect: true, pointsAwarded: 15 },
      ]),
    ).toBe(25);
  });

  it("mengembalikan 0 untuk hasil kosong", () => {
    expect(totalScore([])).toBe(0);
  });
});

describe("aggregateByConcept", () => {
  it("menghitung benar/total per konsep", () => {
    const answers = EXAMPLE.challenges.map(correctAnswerFor);
    expect(aggregateByConcept(EXAMPLE, answers)).toEqual([
      { conceptTag: "Perbandingan", correct: 1, total: 1 },
      { conceptTag: "Pecahan", correct: 2, total: 2 },
      { conceptTag: "Persentase", correct: 2, total: 2 },
      { conceptTag: "Rata-rata", correct: 2, total: 2 },
      { conceptTag: "Diagram data", correct: 2, total: 2 },
    ]);
  });

  it("menghitung jawaban salah dan belum dijawab sebagai belum benar", () => {
    const challenge = challengeById("chl_02_01");
    const scores = aggregateByConcept(EXAMPLE, [
      {
        challengeId: challenge.id,
        type: "true_false",
        answer: !(challenge.type === "true_false" && challenge.correctAnswer),
      },
    ]);

    expect(scores).toEqual([
      { conceptTag: "Perbandingan", correct: 0, total: 1 },
      { conceptTag: "Pecahan", correct: 0, total: 2 },
      { conceptTag: "Persentase", correct: 0, total: 2 },
      { conceptTag: "Rata-rata", correct: 0, total: 2 },
      { conceptTag: "Diagram data", correct: 0, total: 2 },
    ]);
  });

  it("deterministik dan mengikuti urutan kemunculan konsep", () => {
    const answers = EXAMPLE.challenges.map(correctAnswerFor);
    expect(aggregateByConcept(EXAMPLE, answers)).toEqual(
      aggregateByConcept(EXAMPLE, [...answers].reverse()),
    );
  });
});

describe("kemurnian", () => {
  it("tidak mengubah input yang di-deep-freeze", () => {
    const story = deepFreeze(EXAMPLE);
    const answers = deepFreeze(EXAMPLE.challenges.map(correctAnswerFor));
    const beforeStory = JSON.stringify(story);
    const beforeAnswers = JSON.stringify(answers);

    const result = scoreStory(story, answers);
    aggregateByConcept(story, answers);
    totalScore([
      scoreAnswer(challengeById("chl_01_01"), answers[0]!),
      scoreAnswer(challengeById("chl_03_01"), answers[4]!),
    ]);

    expect(JSON.stringify(story)).toBe(beforeStory);
    expect(JSON.stringify(answers)).toBe(beforeAnswers);
    expect(result.earnedPoints).toBe(140);
  });
});
