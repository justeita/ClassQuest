/**
 * Tipe `Story` mengikuti `docs/02-data-model/story.schema.json`.
 * File ini milik track data secara kontrak; saat track data mulai
 * mengelolanya, sisi game tinggal menyinkronkan dengan dokumen yang sama.
 */

export type ChallengeType =
  | "multiple_choice"
  | "true_false"
  | "ordering"
  | "short_answer";

export interface StoryMeta {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  language: string;
  tone: string;
  synopsis: string;
  estimatedMinutes: number;
}

export interface StorySource {
  fileName: string;
  pageCount: number;
  concepts: string[];
  gaps: string[];
}

export type CastRole = "player" | "mentor" | "npc";

export interface CastMember {
  id: string;
  name: string;
  role: CastRole;
  spriteId: string;
  description: string;
}

export interface NarrationBeat {
  type: "narration";
  text: string;
}

export interface DialogueBeat {
  type: "dialogue";
  speakerId: string;
  text: string;
}

export interface ChallengeBeat {
  type: "challenge";
  challengeId: string;
}

export type Beat = NarrationBeat | DialogueBeat | ChallengeBeat;

export interface Scene {
  id: string;
  title: string;
  backgroundId?: string;
  beats: Beat[];
}

export interface Chapter {
  id: string;
  title: string;
  concept: string;
  summary: string;
  backgroundId: string;
  musicId: string;
  scenes: Scene[];
}

interface ChallengeBase {
  id: string;
  prompt: string;
  conceptTag: string;
  difficulty: number;
  explanation: string;
  points: number;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface MultipleChoiceChallenge extends ChallengeBase {
  type: "multiple_choice";
  options: MultipleChoiceOption[];
  correctOptionId: string;
}

export interface TrueFalseChallenge extends ChallengeBase {
  type: "true_false";
  statement: string;
  correctAnswer: boolean;
}

export interface OrderingItem {
  id: string;
  text: string;
}

export interface OrderingChallenge extends ChallengeBase {
  type: "ordering";
  items: OrderingItem[];
  correctOrder: string[];
}

export interface ShortAnswerChallenge extends ChallengeBase {
  type: "short_answer";
  acceptedAnswers: string[];
  caseSensitive: boolean;
}

export type Challenge =
  | MultipleChoiceChallenge
  | TrueFalseChallenge
  | OrderingChallenge
  | ShortAnswerChallenge;

export interface AssetUsage {
  backgrounds: string[];
  music: string[];
  sprites: string[];
}

export interface Story {
  schemaVersion: string;
  meta: StoryMeta;
  source: StorySource;
  cast: CastMember[];
  chapters: Chapter[];
  challenges: Challenge[];
  assetUsage: AssetUsage;
}
