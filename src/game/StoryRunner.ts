import type { Beat, Chapter, Challenge, Story } from "@/story/schema";

export type StoryRunnerPhase =
  "explore" | "dialog" | "challenge" | "chapter_end" | "done";

export interface StoryRunnerState {
  phase: StoryRunnerPhase;
  /** Indeks bab saat ini (0-based); -1 saat selesai. */
  chapterIndex: number;
  /** Indeks scene saat ini (0-based); -1 saat akhir bab maupun selesai. */
  sceneIndex: number;
  /** Indeks beat saat ini (0-based); -1 saat explore, akhir bab, maupun selesai. */
  beatIndex: number;
  /** Beat aktif; null saat explore, chapter_end, atau done. */
  beat: Beat | null;
  /** Bab aktif; null saat done. */
  chapter: Chapter | null;
  /** Nomor bab 1-based untuk HUD. */
  chapterNumber: number;
  chapterTotal: number;
  /** Judul scene aktif; null saat explore/akhir bab/selesai atau scene tanpa judul. */
  sceneJudul: string | null;
}

/**
 * State machine murni pemutar cerita: tanpa Phaser, tanpa React, tanpa DOM.
 * Penilaian jawaban challenge bukan tanggung jawab runner (lihat PR tantangan);
 * runner hanya mengunci jalur sampai `resolveChallenge()` dipanggil.
 *
 * Kontrak kursor (ADR 0008): setiap scene dibuka dalam fase `explore` — pemain
 * berjalan bebas di ruangan sampai `interact()` memutar deretan beat scene itu.
 * beatIndex -1 berarti belum di dalam deretan beat (explore) atau sudah lewat
 * dari scene terakhir (chapter_end); chapterIndex di luar rentang berarti
 * cerita selesai.
 */
export class StoryRunner {
  private readonly story: Story;
  private chapterIndex = 0;
  private sceneIndex = 0;
  private beatIndex = -1;

  constructor(story: Story) {
    if (story.chapters.length === 0) {
      throw new Error("Cerita harus punya minimal satu bab.");
    }
    this.story = story;
  }

  getState(): StoryRunnerState {
    const chapters = this.story.chapters;
    const total = chapters.length;
    const sceneJudul = (): string | null => {
      const chapter = chapters[this.chapterIndex];
      if (!chapter) return null;
      const scene = chapter.scenes[this.sceneIndex];
      return scene?.title ?? chapter.title;
    };

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
        sceneJudul: null,
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
        sceneJudul: sceneJudul(),
      };
    }

    if (this.beatIndex === -1) {
      return {
        phase: "explore",
        chapterIndex: this.chapterIndex,
        sceneIndex: this.sceneIndex,
        beatIndex: -1,
        beat: null,
        chapter,
        chapterNumber: this.chapterIndex + 1,
        chapterTotal: total,
        sceneJudul: sceneJudul(),
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
      sceneJudul: sceneJudul(),
    };
  }

  /**
   * Mulai deretan beat scene saat pemain berinteraksi dengan NPC/objek di
   * zona interaksi. No-op di fase lain — GameScene yang memanggil ini.
   */
  interact(): void {
    if (this.getState().phase !== "explore") return;
    this.beatIndex = 0;
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

  /**
   * Kembali ke awal chapter yang sedang berjalan tanpa menyentuh catatan
   * jawaban. Dipakai menu jeda → "Ulangi chapter"; no-op saat cerita selesai.
   */
  restartChapter(): void {
    if (this.getState().phase === "done") return;
    this.sceneIndex = 0;
    this.beatIndex = -1;
  }

  /** Cari definisi challenge berdasarkan id dari beat challenge. */
  getChallenge(challengeId: string): Challenge | undefined {
    return this.story.challenges.find(
      (challenge) => challenge.id === challengeId,
    );
  }

  /**
   * Satu langkah mode cepat: maju satu beat bila beat itu boleh dilewati.
   * Kembalikan `false` saat skip harus berhenti (soal, transisi, atau scene
   * habis) sehingga pemanggil bisa menghentikan timer-nya.
   */
  lewatiSatuBeat(): boolean {
    if (!bolehTerusLewati(this.getState())) return false;
    this.advance();
    return true;
  }

  /** Normalisasi kursor setelah beatIndex bertambah. */
  private settle(): void {
    const chapter = this.story.chapters[this.chapterIndex];
    if (!chapter) return;
    const scene = chapter.scenes[this.sceneIndex]!;

    if (this.beatIndex < scene.beats.length) return;

    // Akhir scene: scene berikutnya dibuka dalam fase explore.
    this.sceneIndex += 1;
    this.beatIndex = -1;
    if (this.sceneIndex < chapter.scenes.length) return;

    this.sceneIndex = -1;
  }

  private enterChapter(nextChapterIndex: number): void {
    this.chapterIndex = nextChapterIndex;
    this.sceneIndex = 0;
    this.beatIndex = -1;
  }
}

/**
 * Apakah kursor boleh melompati beat yang sedang tampil?
 *
 * Hanya beat dialog/narasi. Beat `challenge` tidak pernah boleh dilewati —
 * soal wajib dijawab supaya skor tidak bolong (interaction-loop.md) — dan beat
 * `transition` tetap diputar karena fade adalah bagian dari perpindahan scene.
 */
export function bolehTerusLewati(state: StoryRunnerState): boolean {
  return (
    state.phase === "dialog" &&
    state.beat !== null &&
    state.beat.type !== "transition"
  );
}
