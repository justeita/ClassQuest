/**
 * Cerita yang boleh dimainkan di `/play/[storyId]`.
 *
 * Kontrak: `docs/05-frontend/game-player.md` dan
 * `docs/05-frontend/routes.md`.
 *
 * Aturan:
 *
 * - Hanya cerita berstatus `published` dengan `published_version` yang
 *   dilayani. `draft`, `processing`, `failed`, dan `archived` sama-sama
 *   menghasilkan `null` (halaman lalu `notFound()`), tanpa membocorkan
 *   keberadaan cerita.
 * - Id kosong atau terlalu panjang juga `null`.
 * - `st_demo_siklus_air` adalah pengecualian yang disengaja: fixture demo
 *   untuk pengembangan frontend tetap bisa dibuka tanpa database. Cerita lain
 *   wajib punya baris terbit.
 *
 * Query database tetap di `getPublishedStory` (`./core`) supaya halaman hanya
 * menerjemahkan hasilnya menjadi cerita atau 404.
 */

import "server-only";

import { DEMO_STORY, DEMO_STORY_ID } from "@/game/demoStory";
import { getReadyDb } from "@/server/db";
import type { Story } from "@/story/schema";

import { getPublishedStory, MAX_STORY_ID_LENGTH } from "./core";

/**
 * Ambil cerita yang boleh dimainkan, atau `null` bila tidak ada.
 *
 * `getReadyDb()` baru dipanggil untuk id non-demo, jadi halaman demo tidak
 * membuka koneksi/menjalankan migrasi.
 */
export async function getPlayableStory(storyId: string): Promise<Story | null> {
  if (
    typeof storyId !== "string" ||
    storyId === "" ||
    storyId.length > MAX_STORY_ID_LENGTH
  ) {
    return null;
  }

  if (storyId === DEMO_STORY_ID) return DEMO_STORY;

  const published = await getPublishedStory(await getReadyDb(), { storyId });
  return published === null ? null : published.story;
}
