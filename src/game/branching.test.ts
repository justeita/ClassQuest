import { describe, expect, it } from "vitest";

import type { ChallengeBeat, DialogueBeat, Story } from "@/story/schema";

import branchingJson from "../story/__fixtures__/branching.json";
import { AnswerLog } from "./answerLog";
import {
  applyFlags,
  BranchingRun,
  initialFlags,
  maxAttemptsOf,
  planWrong,
  resolveDialogueText,
} from "./branching";

const branchingStory = branchingJson as unknown as Story;

/** Beat challenge di fixture harus ada; gagal cepat kalau fixture berubah. */
function challengeBeatOf(story: Story, challengeId: string): ChallengeBeat {
  for (const chapter of story.chapters) {
    for (const scene of chapter.scenes) {
      for (const beat of scene.beats) {
        if (beat.type === "challenge" && beat.challengeId === challengeId) {
          return beat;
        }
      }
    }
  }
  throw new Error(`Fixture tidak punya beat challenge "${challengeId}".`);
}

/** Beat dialog pertama yang punya `textVariants`; dipakai tes varian teks. */
function dialogueWithVariants(story: Story): DialogueBeat {
  for (const chapter of story.chapters) {
    for (const scene of chapter.scenes) {
      for (const beat of scene.beats) {
        if (beat.type === "dialogue" && beat.textVariants) return beat;
      }
    }
  }
  throw new Error("Fixture tidak punya dialog dengan textVariants.");
}

const JAWABAN_SALAH = {
  challengeId: "chl_01_01",
  type: "multiple_choice",
  selectedId: "opt_b",
} as const;

const JAWABAN_BENAR = {
  challengeId: "chl_01_01",
  type: "multiple_choice",
  selectedId: "opt_a",
} as const;

describe("initialFlags", () => {
  it("memakai nilai default dari story.flags", () => {
    expect(initialFlags(branchingStory)).toEqual({
      flg_salah_hitung: false,
      flg_sudah_dibantu: false,
    });
  });

  it("cerita tanpa flag menghasilkan objek kosong", () => {
    const tanpaFlag: Story = { ...branchingStory, flags: undefined };
    expect(initialFlags(tanpaFlag)).toEqual({});
  });
});

describe("applyFlags", () => {
  it("menerapkan setFlags tanpa mengubah objek masukan", () => {
    const awal = { flg_salah_hitung: false };
    const hasil = applyFlags(awal, { flg_salah_hitung: true });

    expect(hasil).toEqual({ flg_salah_hitung: true });
    expect(awal).toEqual({ flg_salah_hitung: false });
  });

  it("tanpa setFlags mengembalikan nilai apa adanya", () => {
    const awal = { flg_salah_hitung: true };
    expect(applyFlags(awal, undefined)).toBe(awal);
  });
});

describe("resolveDialogueText", () => {
  const dialog = dialogueWithVariants(branchingStory);

  it("memakai teks utama saat tidak ada varian yang cocok", () => {
    expect(resolveDialogueText(dialog, {})).toBe(dialog.text);
    expect(resolveDialogueText(dialog, { flg_lain: true })).toBe(dialog.text);
  });

  it("memakai varian pertama yang cocok", () => {
    const varian = dialog.textVariants![0]!;
    const hasil = resolveDialogueText(dialog, {
      [varian.when.flag]: varian.when.is,
    });
    expect(hasil).toBe(varian.text);
  });

  it("varian pertama menang saat beberapa varian cocok", () => {
    const flags: Record<string, boolean> = {};
    for (const variant of dialog.textVariants!) {
      flags[variant.when.flag] = variant.when.is;
    }
    expect(resolveDialogueText(dialog, flags)).toBe(
      dialog.textVariants![0]!.text,
    );
  });

  it("berlaku juga untuk dialog di dalam detour", () => {
    const detourDialog: DialogueBeat = {
      type: "dialogue",
      speakerId: "char_npc_1",
      text: "Teks utama detour.",
      textVariants: [
        {
          when: { flag: "flg_salah_hitung", is: true },
          text: "Teks varian detour.",
        },
      ],
    };

    expect(resolveDialogueText(detourDialog, {})).toBe("Teks utama detour.");
    expect(resolveDialogueText(detourDialog, { flg_salah_hitung: true })).toBe(
      "Teks varian detour.",
    );
  });
});

describe("maxAttemptsOf", () => {
  it("memakai maxAttempts beat bila ada", () => {
    expect(maxAttemptsOf(challengeBeatOf(branchingStory, "chl_01_01"))).toBe(2);
  });

  it("default 1 pada beat tanpa maxAttempts", () => {
    const tanpaBatas = challengeBeatOf(branchingStory, "chl_02_01");
    expect(tanpaBatas.maxAttempts).toBeUndefined();
    expect(maxAttemptsOf(tanpaBatas)).toBe(1);
  });
});

describe("planWrong", () => {
  const beat = challengeBeatOf(branchingStory, "chl_01_01");

  it("percobaan pertama yang salah berlanjut ke detour + soal ulang", () => {
    const plan = planWrong(beat, 1);
    expect(plan.kind).toBe("retry");
    if (plan.kind !== "retry") throw new Error("harus retry");
    expect(plan.retry.detour).toHaveLength(2);
    expect(plan.retry.retryQuestion).toBe(beat.onWrong?.retryQuestions?.[0]);
  });

  it("percobaan terakhir yang salah berhenti (tanpa detour)", () => {
    expect(planWrong(beat, 2)).toEqual({ kind: "final" });
  });

  it("maxAttempts 1 tidak pernah retry", () => {
    const sehari: ChallengeBeat = {
      type: "challenge",
      challengeId: "chl_x",
      onWrong: { retryQuestions: ["a"] },
    };
    expect(planWrong(sehari, 1)).toEqual({ kind: "final" });
  });

  it("beat tanpa onWrong tidak pernah retry walau maxAttempts lebih dari 1", () => {
    const tanpaOnWrong: ChallengeBeat = {
      type: "challenge",
      challengeId: "chl_x",
      maxAttempts: 2,
    };
    expect(planWrong(tanpaOnWrong, 1)).toEqual({ kind: "final" });
  });
});

describe("BranchingRun", () => {
  it("jawaban salah pertama memutar retry dan menyalakan setFlags", () => {
    const run = new BranchingRun(branchingStory);

    const hasil = run.grade(
      challengeBeatOf(branchingStory, "chl_01_01"),
      false,
    );

    expect(hasil.isCorrect).toBe(false);
    expect(hasil.attempts).toBe(1);
    expect(hasil.retry).not.toBeNull();
    expect(hasil.flags).toEqual({
      flg_salah_hitung: true,
      flg_sudah_dibantu: true,
    });
    expect(run.attemptsFor("chl_01_01")).toBe(1);
  });

  it("jawaban salah kedua berhenti tanpa menyalakan flag baru", () => {
    const run = new BranchingRun(branchingStory);
    run.grade(challengeBeatOf(branchingStory, "chl_01_01"), false);

    const hasil = run.grade(
      challengeBeatOf(branchingStory, "chl_01_01"),
      false,
    );

    expect(hasil.isCorrect).toBe(false);
    expect(hasil.attempts).toBe(2);
    expect(hasil.retry).toBeNull();
  });

  it("jawaban benar di percobaan mana pun lanjut seperti biasa", () => {
    const run = new BranchingRun(branchingStory);

    const pertama = run.grade(
      challengeBeatOf(branchingStory, "chl_01_01"),
      false,
    );
    expect(pertama.retry).not.toBeNull();

    const kedua = run.grade(challengeBeatOf(branchingStory, "chl_01_01"), true);
    expect(kedua.isCorrect).toBe(true);
    expect(kedua.retry).toBeNull();
    expect(kedua.attempts).toBe(2);
  });

  it("menghitung percobaan per challenge, bukan global", () => {
    const run = new BranchingRun(branchingStory);
    run.grade(challengeBeatOf(branchingStory, "chl_01_01"), false);

    expect(run.attemptsFor("chl_01_01")).toBe(1);
    expect(run.attemptsFor("chl_02_01")).toBe(0);
  });
});

describe("skor tidak berubah oleh retry", () => {
  it("percobaan pertama yang salah tetap menentukan hasil akhir", () => {
    const log = new AnswerLog();
    const run = new BranchingRun(branchingStory);

    // Percobaan pertama: salah → retry.
    const retry = run.grade(
      challengeBeatOf(branchingStory, "chl_01_01"),
      false,
    );
    expect(retry.retry).not.toBeNull();
    log.record(JAWABAN_SALAH);

    // Percobaan kedua: benar, tetapi skor memakai jawaban pertama.
    const benar = run.grade(challengeBeatOf(branchingStory, "chl_01_01"), true);
    expect(benar.isCorrect).toBe(true);
    log.record(JAWABAN_BENAR);

    const hasil = log.result(branchingStory);
    expect(hasil.correctCount).toBe(0);
    expect(hasil.earnedPoints).toBe(0);
    expect(hasil.weakConcepts).toContain("Perbandingan");
  });

  it("jawaban benar pada percobaan pertama tetap dinilai benar", () => {
    const log = new AnswerLog();
    log.record(JAWABAN_BENAR);

    const hasil = log.result(branchingStory);
    expect(hasil.correctCount).toBe(1);
    expect(hasil.earnedPoints).toBe(10);
    expect(hasil.weakConcepts).toEqual([]);
  });
});
