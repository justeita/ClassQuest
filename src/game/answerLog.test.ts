import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "./demoStory";
import { AnswerLog } from "./answerLog";
import { isCorrect, type Answer } from "@/story/scoring";
import type { Challenge } from "@/story/schema";

function challengePertama(): Challenge {
  const challenge = DEMO_STORY.challenges[0];
  if (!challenge) throw new Error("Fixture demo harus punya tantangan");
  return challenge;
}

describe("AnswerLog", () => {
  it("menyimpan jawaban pertama sebuah tantangan", () => {
    const log = new AnswerLog();
    const challenge = challengePertama();
    const answer = jawabanSalah(challenge);

    log.record(answer);

    expect(log.has(challenge.id)).toBe(true);
    expect(log.all()).toEqual([answer]);
  });

  it("jawaban ulang tidak menimpa percobaan pertama", () => {
    const log = new AnswerLog();
    const challenge = challengePertama();
    const pertama = jawabanSalah(challenge);
    const ulang = jawabanBenar(challenge);

    log.record(pertama);
    log.record(ulang);

    expect(log.all()).toHaveLength(1);
    expect(log.all()[0]).toEqual(pertama);
    expect(isCorrect(challenge, log.all()[0]!)).toBe(false);
  });

  it("tantangan berbeda disimpan semua, urut kemunculan", () => {
    const log = new AnswerLog();
    const [satu, dua] = DEMO_STORY.challenges;
    if (!satu || !dua) throw new Error("Fixture demo butuh dua tantangan");

    log.record(jawabanSalah(satu));
    log.record(jawabanSalah(dua));

    expect(log.all()).toHaveLength(2);
    expect(log.all().map((answer) => answer.challengeId)).toEqual([
      satu.id,
      dua.id,
    ]);
  });

  it("result memakai scoreStory: percobaan pertama menentukan skor", () => {
    const log = new AnswerLog();
    const challenge = challengePertama();

    log.record(jawabanSalah(challenge));
    log.record(jawabanBenar(challenge));

    const result = log.result(DEMO_STORY);

    expect(result.totalChallenges).toBe(DEMO_STORY.challenges.length);
    expect(result.correctCount).toBe(0);
    expect(result.earnedPoints).toBe(0);
    expect(result.weakConcepts).toContain(challenge.conceptTag);
  });

  it("tantangan yang belum dijawab tidak masuk weakConcepts", () => {
    const log = new AnswerLog();

    const result = log.result(DEMO_STORY);

    expect(result.earnedPoints).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.totalChallenges).toBe(DEMO_STORY.challenges.length);
    expect(result.weakConcepts).toEqual([]);
  });
});

/** Jawaban yang pasti salah untuk tipe tantangan apa pun. */
function jawabanSalah(challenge: Challenge): Answer {
  switch (challenge.type) {
    case "multiple_choice": {
      const salah = challenge.options.find(
        (option) => option.id !== challenge.correctOptionId,
      );
      if (!salah) throw new Error("Butuh opsi salah");
      return {
        challengeId: challenge.id,
        type: "multiple_choice",
        selectedId: salah.id,
      };
    }
    case "true_false":
      return {
        challengeId: challenge.id,
        type: "true_false",
        answer: !challenge.correctAnswer,
      };
    case "ordering":
      return {
        challengeId: challenge.id,
        type: "ordering",
        order: [...challenge.correctOrder].reverse(),
      };
    case "short_answer":
      return {
        challengeId: challenge.id,
        type: "short_answer",
        text: "jawaban yang pasti tidak diterima",
      };
  }
}

/** Jawaban yang pasti benar. */
function jawabanBenar(challenge: Challenge): Answer {
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
      return { challengeId: challenge.id, type: "ordering", order: [] };
    case "short_answer":
      return {
        challengeId: challenge.id,
        type: "short_answer",
        text: challenge.acceptedAnswers[0] ?? "",
      };
  }
}
