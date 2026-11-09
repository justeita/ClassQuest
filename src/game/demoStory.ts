import type { Story } from "@/story/schema";

import demoStoryJson from "./fixture/demo-story.json";

/**
 * Cerita demo untuk pengembangan frontend game. Isinya salinan
 * `docs/02-data-model/story.example.json`; id dan kontraknya milik backend.
 *
 * Sumber cerita sungguhan (`src/server/stories.ts`) butuh DB (ADR 0005) dan
 * belum ada. Halaman `/play/[storyId]` memakai fixture ini sampai query cerita
 * tersedia, supaya alur cerita bisa diuji end-to-end sekarang.
 */
export const DEMO_STORY = demoStoryJson as unknown as Story;

/** Id satu-satunya cerita demo yang bisa dimainkan sekarang. */
export const DEMO_STORY_ID = DEMO_STORY.meta.id;

/** Cari cerita demo berdasarkan id; `undefined` bila id tidak dikenal. */
export function findDemoStory(storyId: string): Story | undefined {
  return storyId === DEMO_STORY_ID ? DEMO_STORY : undefined;
}
