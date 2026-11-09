import type { Challenge, ChallengeType } from "@/story/schema";

/**
 * Data tantangan yang aman dikirim ke React (docs/04-game/scene-format.md):
 * hanya soal dan pilihan. Jawaban benar, penjelasan, dan poin **tidak**
 * disertakan — penilaian dijalankan di sisi game yang memegang Story.
 */

export type ChallengeView = {
  id: string;
  type: ChallengeType;
  prompt: string;
  conceptTag: string;
  /** Hanya untuk multiple_choice. */
  options?: { id: string; text: string }[];
  /** Hanya untuk true_false. */
  statement?: string;
  /** Hanya untuk ordering. */
  items?: { id: string; text: string }[];
};

export function buildChallengeView(challenge: Challenge): ChallengeView {
  const base = {
    id: challenge.id,
    type: challenge.type,
    prompt: challenge.prompt,
    conceptTag: challenge.conceptTag,
  };

  switch (challenge.type) {
    case "multiple_choice":
      return { ...base, options: challenge.options };
    case "true_false":
      return { ...base, statement: challenge.statement };
    case "ordering":
      return { ...base, items: challenge.items };
    case "short_answer":
      // Input teks menyusul; view tetap valid untuk placeholder.
      return base;
  }
}
