import { describe, expect, it, vi } from "vitest";

import { buildChallengeView } from "./challengeView";
import demoStoryJson from "./fixture/demo-story.json";
import { GameBus } from "./gameBus";
import type { Challenge, Story } from "@/story/schema";

const demoStory = demoStoryJson as unknown as Story;

/** Ambil tantangan pertama bertipe tertentu, sudah menyempit tipenya. */
function challengeBertipe<T extends Challenge["type"]>(
  type: T,
): Extract<Challenge, { type: T }> {
  const challenge = demoStory.challenges.find(
    (entry) => entry.type === type,
  ) as Extract<Challenge, { type: T }>;
  if (!challenge) throw new Error(`Tidak ada tantangan bertipe ${type}`);
  return challenge;
}

describe("GameBus", () => {
  it("emit mengirim payload ke pendengar tipe yang sama", () => {
    const bus = new GameBus();
    const handler = vi.fn();
    bus.on("graded", handler);

    bus.emit({
      type: "graded",
      challengeId: "chl_01_01",
      correct: true,
      explanation: "benar",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "graded",
      challengeId: "chl_01_01",
      correct: true,
      explanation: "benar",
    });
  });

  it("pendengar tipe lain tidak dipanggil", () => {
    const bus = new GameBus();
    const handler = vi.fn();
    bus.on("challenge", handler);

    bus.emit({ type: "error", code: "loaderror" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribe berhenti mendengarkan", () => {
    const bus = new GameBus();
    const handler = vi.fn();
    const off = bus.on("challenge", handler);

    off();
    bus.emit({
      type: "challenge",
      view: { id: "x", type: "true_false", prompt: "p", conceptTag: "c" },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("send dan onCommand menghubungkan React ke Phaser", () => {
    const bus = new GameBus();
    const handler = vi.fn();
    bus.onCommand("submit_answer", handler);

    bus.send({
      type: "submit_answer",
      challengeId: "chl_01_01",
      answer: {
        challengeId: "chl_01_01",
        type: "multiple_choice",
        selectedId: "opt_a",
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("event finished membawa ringkasan hasil apa adanya", () => {
    const bus = new GameBus();
    const handler = vi.fn();
    bus.on("finished", handler);

    const result = {
      totalPoints: 60,
      earnedPoints: 40,
      correctCount: 4,
      totalChallenges: 6,
      weakConcepts: ["Kondensasi"],
    };
    bus.emit({ type: "finished", result });

    expect(handler).toHaveBeenCalledWith({ type: "finished", result });
  });
});

describe("buildChallengeView", () => {
  it("multiple_choice menyertakan opsi tanpa jawaban benar", () => {
    const challenge = challengeBertipe("multiple_choice");

    const view = buildChallengeView(challenge);

    expect(view.id).toBe(challenge.id);
    expect(view.options).toHaveLength(3);
    const json = JSON.stringify(view);
    // Field jawaban tidak boleh ikut; id opsi sah muncul sebagai pilihan.
    expect(json).not.toContain("correctOptionId");
    expect(json).not.toContain(challenge.explanation);
  });

  it("true_false menyertakan pernyataan tanpa jawaban", () => {
    const challenge = challengeBertipe("true_false");

    const view = buildChallengeView(challenge);

    expect(view.statement).toBe(challenge.statement);
    const json = JSON.stringify(view);
    // "true_false" memuat kata "true", jadi yang dicek hanya field jawaban.
    expect(json).not.toContain("correctAnswer");
    expect(json).not.toContain(challenge.explanation);
  });

  it("ordering menyertakan item tanpa urutan benar", () => {
    const challenge = challengeBertipe("ordering");

    const view = buildChallengeView(challenge);

    expect(view.items).toHaveLength(4);
    const json = JSON.stringify(view);
    expect(json).not.toContain("correctOrder");
  });

  it("short_answer hanya base tanpa jawaban yang diterima", () => {
    const challenge = challengeBertipe("short_answer");

    const view = buildChallengeView(challenge);

    expect(view.options).toBeUndefined();
    expect(view.statement).toBeUndefined();
    expect(view.items).toBeUndefined();
    const json = JSON.stringify(view);
    expect(json).not.toContain("infiltrasi");
    expect(json).not.toContain(challenge.explanation);
  });
});
