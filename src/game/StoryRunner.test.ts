import { describe, expect, it } from "vitest";

import type { Beat, Story } from "@/story/schema";

import demoStoryJson from "./fixture/demo-story.json";
import { StoryRunner } from "./StoryRunner";

const demoStory = demoStoryJson as unknown as Story;

function beatsOf(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
): Beat[] {
  return story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats;
}

describe("StoryRunner", () => {
  it("mulai di beat pertama bab pertama dengan fase dialog", () => {
    const runner = new StoryRunner(demoStory);
    const state = runner.getState();

    expect(state.phase).toBe("dialog");
    expect(state.chapterNumber).toBe(1);
    expect(state.chapterTotal).toBe(3);
    expect(state.beat).toEqual(beatsOf(demoStory, 0, 0)[0]);
  });

  it("advance menggerakkan kursor beat demi beat", () => {
    const runner = new StoryRunner(demoStory);

    runner.advance();
    expect(runner.getState().beat).toEqual(beatsOf(demoStory, 0, 0)[1]);
  });

  it("beat challenge mengunci fase sampai resolveChallenge dipanggil", () => {
    const runner = new StoryRunner(demoStory);
    const sceneDenganChallenge = beatsOf(demoStory, 0, 1);

    // Maju sampai beat challenge pertama (scene kedua bab pertama).
    while (runner.getState().phase !== "challenge") {
      runner.advance();
    }
    const stateChallenge = runner.getState();
    expect(stateChallenge.phase).toBe("challenge");
    expect(stateChallenge.beat).toEqual(sceneDenganChallenge[1]);

    // advance saat challenge harus no-op.
    runner.advance();
    expect(runner.getState().phase).toBe("challenge");

    runner.resolveChallenge();
    expect(runner.getState().phase).toBe("dialog");
    expect(runner.getState().beat).toEqual(sceneDenganChallenge[2]);
  });

  it("resolveChallenge di luar fase challenge adalah no-op", () => {
    const runner = new StoryRunner(demoStory);
    runner.resolveChallenge();
    expect(runner.getState().beatIndex).toBe(0);
  });

  it("akhir scene terakhir bab memicu chapter_end lalu lanjut ke bab berikutnya", () => {
    const runner = new StoryRunner(demoStory);
    const totalBeatBab1 = demoStory.chapters[0]!.scenes.reduce(
      (total, scene) => total + scene.beats.length,
      0,
    );

    // Habiskan seluruh beat bab 1 (termasuk dua challenge).
    for (let i = 0; i < totalBeatBab1; i += 1) {
      if (runner.getState().phase === "challenge") {
        runner.resolveChallenge();
      } else {
        runner.advance();
      }
    }

    const stateAkhirBab = runner.getState();
    expect(stateAkhirBab.phase).toBe("chapter_end");
    expect(stateAkhirBab.beat).toBeNull();
    expect(stateAkhirBab.chapterNumber).toBe(1);

    runner.advance();
    const stateBab2 = runner.getState();
    expect(stateBab2.phase).toBe("dialog");
    expect(stateBab2.chapterNumber).toBe(2);
    expect(stateBab2.beat).toEqual(beatsOf(demoStory, 1, 0)[0]);
  });

  it("menyelesaikan seluruh cerita berakhir di fase done dan advance tidak crash", () => {
    const runner = new StoryRunner(demoStory);
    let guard = 0;

    while (runner.getState().phase !== "done" && guard < 1000) {
      const phase = runner.getState().phase;
      if (phase === "challenge") {
        runner.resolveChallenge();
      } else {
        runner.advance();
      }
      guard += 1;
    }

    expect(runner.getState().phase).toBe("done");
    expect(runner.getState().beat).toBeNull();
    expect(guard).toBeLessThan(1000);

    runner.advance();
    runner.resolveChallenge();
    expect(runner.getState().phase).toBe("done");
  });

  it("getChallenge menemukan definisi challenge berdasarkan id", () => {
    const runner = new StoryRunner(demoStory);
    const challenge = runner.getChallenge("chl_01_01");

    expect(challenge?.type).toBe("multiple_choice");
    expect(runner.getChallenge("chl_tidak_ada")).toBeUndefined();
  });

  it("cerita tanpa bab ditolak", () => {
    const ceritaKosong = { ...demoStory, chapters: [] };
    expect(() => new StoryRunner(ceritaKosong)).toThrow(
      "Cerita harus punya minimal satu bab.",
    );
  });
});
