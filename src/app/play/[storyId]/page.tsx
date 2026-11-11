import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { DEMO_STORY_ID, findDemoStory } from "@/game/demoStory";

export function generateStaticParams() {
  return [{ storyId: DEMO_STORY_ID }];
}

export async function generateMetadata(
  props: PageProps<"/play/[storyId]">,
): Promise<Metadata> {
  const { storyId } = await props.params;
  const story = findDemoStory(storyId);
  return { title: story ? `${story.meta.title} — ClassQuest` : "ClassQuest" };
}

/**
 * Halaman siswa (docs/05-frontend/game-player.md). Route ini tipis: ambil
 * cerita, lalu serahkan ke `GameShell`. Cerita yang tidak ada → 404.
 *
 * Sumber cerita masih fixture karena query database belum ada; bentuk
 * `PageProps` dan `await params` sudah mengikuti pola Next 16.4.5 sehingga
 * penggantian ke `getPublishedStory()` nanti tidak mengubah halaman.
 */
export default async function PlayPage(props: PageProps<"/play/[storyId]">) {
  const { storyId } = await props.params;
  const story = findDemoStory(storyId);
  if (!story) notFound();

  return (
    // Game mengisi seluruh viewport (full-bleed): kanvas dan menu judul
    // menutupi sampai pojok, bukan kotak kecil di tengah halaman.
    <main className="h-dvh w-full overflow-hidden bg-[#14201a]">
      <h1 className="sr-only">{story.meta.title}</h1>
      <GameShell story={story} />
    </main>
  );
}
