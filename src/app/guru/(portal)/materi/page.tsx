import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { MaterialsBrowser } from "@/components/guru/MaterialsBrowser";
import { MaterialsSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { getReadyDb } from "@/server/db";
import { listStories, MAX_STORIES_PAGE_LIMIT } from "@/server/stories";

export const metadata: Metadata = {
  title: "Learning Materials",
};

/**
 * `/guru/materi` — daftar materi milik guru.
 *
 * Halaman ini tipis: sesi → `listStories` → serahkan ke komponen client untuk
 * penyaringan. Pagination belum ada di MVP, jadi batas atas yang dipakai
 * adalah `MAX_STORIES_PAGE_LIMIT` (100 baris).
 */
export default function MateriPage() {
  return (
    <Suspense fallback={<MaterialsSkeleton />}>
      <MaterialsList />
    </Suspense>
  );
}

async function MaterialsList() {
  await connection();
  const { teacherId } = await requireTeacher();
  const items = await listStories(await getReadyDb(), {
    teacherId,
    limit: MAX_STORIES_PAGE_LIMIT,
  });

  return <MaterialsBrowser items={items} />;
}
