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
    // Game memakai hampir seluruh viewport, tetapi diberi bingkai tipis:
    // margin kecil di tepi membuatnya terasa seperti jendela permainan, bukan
    // kanvas yang menempel mentah ke pojok peramban.
    <main className="h-dvh w-full overflow-hidden bg-[#0b120e] p-2 sm:p-4 lg:p-6">
      <h1 className="sr-only">{story.meta.title}</h1>
      <div className="h-full w-full overflow-hidden rounded-lg bg-[#14201a] ring-1 ring-white/10 sm:rounded-xl">
        <GameShell story={story} />
      </div>
    </main>
  );
}
