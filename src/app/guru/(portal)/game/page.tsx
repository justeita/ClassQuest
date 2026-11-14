import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { GamesGrid } from "@/components/guru/GamesGrid";
import { GamesSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { listClassrooms } from "@/server/classrooms";
import { getReadyDb } from "@/server/db";
import { listStories, MAX_STORIES_PAGE_LIMIT } from "@/server/stories";

export const metadata: Metadata = {
  title: "My Games",
};

/**
 * `/guru/game` — koleksi game dari cerita milik guru.
 *
 * Tidak ada tabel game terpisah: satu cerita = satu game, sesuai
 * `docs/02-data-model/story-schema.md` (cerita adalah kontrak tunggal).
 */
export default function GamePage() {
  return (
    <Suspense fallback={<GamesSkeleton />}>
      <GamesList />
    </Suspense>
  );
}

async function GamesList() {
  await connection();
  const { teacherId } = await requireTeacher();
  const db = await getReadyDb();
  const [items, classes] = await Promise.all([
    listStories(db, { teacherId, limit: MAX_STORIES_PAGE_LIMIT }),
    listClassrooms(db, teacherId),
  ]);

  return <GamesGrid items={items} classes={classes} />;
}
