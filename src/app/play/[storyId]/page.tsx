import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { getPlayableStory } from "@/server/stories";

/**
 * Halaman siswa (docs/05-frontend/game-player.md). Route ini tipis: ambil
 * cerita terbit, lalu serahkan ke `GameShell`. Cerita yang tidak ada atau belum
 * terbit → `notFound()`.
 *
 * `instant = false` menandai route ini boleh memblokir saat menunggu baca
 * database: Cache Components + Partial Prefetching memang membuat App Shell
 * `◐` untuk segmen ini, jadi permintaan pertama tidak instan. Ini hanya
 * menonaktifkan validasi instant-navigation, bukan model render.
 *
 * Status 404 yang sesungguhnya datang dari `src/proxy.ts`. Tanpa proxy,
 * `notFound()` berjalan setelah App Shell terkirim dan respons tetap 200
 * (soft 404) — lihat
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
 * bagian "Status codes".
 */
export const instant = false;

export async function generateMetadata(
  props: PageProps<"/play/[storyId]">,
): Promise<Metadata> {
  const { storyId } = await props.params;
  const story = await getPlayableStory(storyId);
  return { title: story ? `${story.meta.title} — ClassQuest` : "ClassQuest" };
}

export default async function PlayPage(props: PageProps<"/play/[storyId]">) {
  const { storyId } = await props.params;
  const story = await getPlayableStory(storyId);
  if (story === null) notFound();

  return (
    // Game mengisi seluruh viewport (full-bleed): kanvas dan menu judul
    // menutupi sampai pojok, bukan kotak kecil di tengah halaman.
    <main className="h-dvh w-full overflow-hidden bg-[#14201a]">
      <h1 className="sr-only">{story.meta.title}</h1>
      <GameShell story={story} />
    </main>
  );
}
