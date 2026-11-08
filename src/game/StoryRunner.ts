import type { Beat, Chapter, Challenge, Story } from "@/story/schema";

export type StoryRunnerPhase = "dialog" | "challenge" | "chapter_end" | "done";

export interface StoryRunnerState {
  phase: StoryRunnerPhase;
  /** Indeks bab saat ini (0-based); -1 saat selesai. */
  chapterIndex: number;
  /** Indeks scene saat ini (0-based); -1 saat akhir bab maupun selesai. */
  sceneIndex: number;
  /** Indeks beat saat ini (0-based); -1 saat akhir bab maupun selesai. */
  beatIndex: number;
  /** Beat aktif; null saat chapter_end atau done. */
  beat: Beat | null;
  /** Bab aktif; null saat done. */
  chapter: Chapter | null;
  /** Nomor bab 1-based untuk HUD. */
  chapterNumber: number;
  chapterTotal: number;
}

/**
 * State machine murni pemutar cerita: tanpa Phaser, tanpa React, tanpa DOM.
 * Penilaian jawaban challenge bukan tanggung jawab runner (lihat PR tantangan);
 * runner hanya mengunci jalur sampai `resolveChallenge()` dipanggil.
 *
 * Kontrak kursor: sceneIndex/beatIndex -1 berarti kursor berada di akhir bab
 * (chapter_end), dan chapterIndex di luar rentang berarti cerita selesai.
 */
export class StoryRunner {
  private readonly story: Story;
  private chapterIndex = 0;
  private sceneIndex = 0;
  private beatIndex = 0;

  constructor(story: Story) {
    if (story.chapters.length === 0) {
      throw new Error("Cerita harus punya minimal satu bab.");
    }
    this.story = story;
  }

  getState(): StoryRunnerState {
    const chapters = this.story.chapters;
    const total = chapters.length;

    if (this.chapterIndex >= total) {
      return {
        phase: "done",
        chapterIndex: -1,
        sceneIndex: -1,
        beatIndex: -1,
        beat: null,
        chapter: null,
        chapterNumber: total,
        chapterTotal: total,
      };
    }

    const chapter = chapters[this.chapterIndex]!;

    if (this.sceneIndex === -1) {
      return {
        phase: "chapter_end",
        chapterIndex: this.chapterIndex,
        sceneIndex: -1,
        beatIndex: -1,
        beat: null,
        chapter,
        chapterNumber: this.chapterIndex + 1,
        chapterTotal: total,
      };
    }

    const scene = chapter.scenes[this.sceneIndex]!;
    const beat = scene.beats[this.beatIndex]!;

    return {
      phase: beat.type === "challenge" ? "challenge" : "dialog",
      chapterIndex: this.chapterIndex,
      sceneIndex: this.sceneIndex,
      beatIndex: this.beatIndex,
      beat,
      chapter,
      chapterNumber: this.chapterIndex + 1,
      chapterTotal: total,
    };
  }

  /** Lanjut dari beat dialog atau dari akhir bab. No-op di fase lain. */
  advance(): void {
    const state = this.getState();
    if (state.phase !== "dialog" && state.phase !== "chapter_end") return;

    if (state.phase === "chapter_end") {
      this.enterChapter(this.chapterIndex + 1);
      return;
    }
    this.beatIndex += 1;
    this.settle();
  }

  /** Buka jalan setelah challenge selesai dijawab. No-op di fase lain. */
  resolveChallenge(): void {
    if (this.getState().phase !== "challenge") return;
    this.beatIndex += 1;
    this.settle();
  }

  /** Cari definisi challenge berdasarkan id dari beat challenge. */
  getChallenge(challengeId: string): Challenge | undefined {
    return this.story.challenges.find(
      (challenge) => challenge.id === challengeId,
    );
  }

  /** Normalisasi kursor setelah beatIndex bertambah. */
  private settle(): void {
    const chapter = this.story.chapters[this.chapterIndex];
    if (!chapter) return;
    const scene = chapter.scenes[this.sceneIndex]!;

    if (this.beatIndex < scene.beats.length) return;

    // Akhir scene: pindah ke scene berikutnya, atau tandai akhir bab.
    this.sceneIndex += 1;
    this.beatIndex = 0;
    if (this.sceneIndex < chapter.scenes.length) return;

    this.sceneIndex = -1;
    this.beatIndex = -1;
  }

  private enterChapter(nextChapterIndex: number): void {
    this.chapterIndex = nextChapterIndex;
    this.sceneIndex = 0;
    this.beatIndex = 0;
  }
}
