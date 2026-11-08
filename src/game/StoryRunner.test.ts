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
  it("mulai di fase explore bab pertama tanpa beat aktif", () => {
    const runner = new StoryRunner(demoStory);
    const state = runner.getState();

    expect(state.phase).toBe("explore");
    expect(state.chapterNumber).toBe(1);
    expect(state.chapterTotal).toBe(3);
    expect(state.beat).toBeNull();
    expect(state.beatIndex).toBe(-1);
  });

  it("interact memulai deretan beat scene dari beat pertama", () => {
    const runner = new StoryRunner(demoStory);

    runner.interact();
    const state = runner.getState();

    expect(state.phase).toBe("dialog");
    expect(state.beat).toEqual(beatsOf(demoStory, 0, 0)[0]);
  });

  it("advance di fase explore adalah no-op", () => {
    const runner = new StoryRunner(demoStory);

    runner.advance();
    expect(runner.getState().phase).toBe("explore");
    expect(runner.getState().beat).toBeNull();

    // interact tetap berjalan setelah advance yang no-op.
    runner.interact();
    expect(runner.getState().phase).toBe("dialog");
  });

  it("interact di luar fase explore adalah no-op", () => {
    const runner = new StoryRunner(demoStory);

    runner.interact();
    expect(runner.getState().beatIndex).toBe(0);

    runner.interact();
    expect(runner.getState().beatIndex).toBe(0);
  });

  it("advance menggerakkan kursor beat demi beat", () => {
    const runner = new StoryRunner(demoStory);

    runner.interact();
    runner.advance();
    expect(runner.getState().beat).toEqual(beatsOf(demoStory, 0, 0)[1]);
  });

  it("beat challenge mengunci fase sampai resolveChallenge dipanggil", () => {
    const runner = new StoryRunner(demoStory);
    const sceneDenganChallenge = beatsOf(demoStory, 0, 1);

    // Maju sampai beat challenge pertama (scene kedua bab pertama).
    while (runner.getState().phase !== "challenge") {
      if (runner.getState().phase === "explore") {
        runner.interact();
      } else {
        runner.advance();
      }
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
    expect(runner.getState().phase).toBe("explore");
  });

  it("akhir scene memicu kembali ke explore scene berikutnya", () => {
    const runner = new StoryRunner(demoStory);
    const totalBeatScene1 = demoStory.chapters[0]!.scenes[0]!.beats.length;

    // Habiskan seluruh beat scene pertama (tanpa challenge di scene ini).
    runner.interact();
    for (let i = 0; i < totalBeatScene1; i += 1) {
      runner.advance();
    }

    const stateScene2 = runner.getState();
    expect(stateScene2.phase).toBe("explore");
    expect(stateScene2.sceneIndex).toBe(1);
    expect(stateScene2.chapterNumber).toBe(1);
    expect(stateScene2.beat).toBeNull();

    // Deretan beat scene kedua bisa dimulai dari awal.
    runner.interact();
    expect(runner.getState().beat).toEqual(beatsOf(demoStory, 0, 1)[0]);
  });

  it("akhir scene terakhir bab memicu chapter_end lalu bab berikutnya dibuka di explore", () => {
    const runner = new StoryRunner(demoStory);
    let guard = 0;

    // Habiskan seluruh beat bab 1 (termasuk dua challenge).
    while (runner.getState().phase !== "chapter_end" && guard < 1000) {
      const phase = runner.getState().phase;
      if (phase === "challenge") {
        runner.resolveChallenge();
      } else if (phase === "explore") {
        runner.interact();
      } else {
        runner.advance();
      }
      guard += 1;
    }

    const stateAkhirBab = runner.getState();
    expect(stateAkhirBab.phase).toBe("chapter_end");
    expect(stateAkhirBab.beat).toBeNull();
    expect(stateAkhirBab.chapterNumber).toBe(1);

    runner.advance();
    const stateBab2 = runner.getState();
    expect(stateBab2.phase).toBe("explore");
    expect(stateBab2.chapterNumber).toBe(2);
    expect(stateBab2.beat).toBeNull();

    // Scene pertama bab 2 tetap bisa diputar.
    runner.interact();
    expect(runner.getState().beat).toEqual(beatsOf(demoStory, 1, 0)[0]);
  });

  it("menyelesaikan seluruh cerita berakhir di fase done dan aksi tidak crash", () => {
    const runner = new StoryRunner(demoStory);
    let guard = 0;

    while (runner.getState().phase !== "done" && guard < 1000) {
      const phase = runner.getState().phase;
      if (phase === "challenge") {
        runner.resolveChallenge();
      } else if (phase === "explore") {
        runner.interact();
      } else {
        runner.advance();
      }
      guard += 1;
    }

    expect(runner.getState().phase).toBe("done");
    expect(runner.getState().beat).toBeNull();
    expect(guard).toBeLessThan(1000);

    runner.interact();
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
