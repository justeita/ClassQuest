import type { Answer, PlayResult } from "@/story/scoring";
import type { Story } from "@/story/schema";

import { scoreStory } from "@/story/scoring";

/**
 * Catatan jawaban satu kali main.
 *
 * Aturan `docs/04-game/interaction-loop.md`: skor memakai **percobaan pertama**.
 * Menjawab ulang tantangan yang sama (mis. setelah "Ulangi chapter") tidak
 * menimpa jawaban awal, sehingga `weakConcepts` tetap jujur.
 */
export class AnswerLog {
  private readonly answers = new Map<string, Answer>();

  /** Simpan jawaban hanya bila challenge itu belum pernah dijawab. */
  record(answer: Answer): void {
    if (this.answers.has(answer.challengeId)) return;
    this.answers.set(answer.challengeId, answer);
  }

  /**
   * Isi catatan dari progres tersimpan (LANJUTKAN setelah refresh). Tetap
   * memakai aturan percobaan pertama: jawaban yang sudah ada tidak ditimpa.
   */
  restore(answers: readonly Answer[]): void {
    for (const answer of answers) this.record(answer);
  }

  has(challengeId: string): boolean {
    return this.answers.has(challengeId);
  }

  /** Jawaban percobaan pertama, urut sesuai kemunculan. */
  all(): Answer[] {
    return [...this.answers.values()];
  }

  /** Ringkasan hasil memakai `scoreStory()` milik backend. */
  result(story: Story): PlayResult {
    return scoreStory(story, this.all());
  }
}
