import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AnalyticsBrowser } from "@/components/guru/AnalyticsBrowser";
import { AnalyticsSkeleton } from "@/components/guru/skeletons";
import { getClassroomAnalytics } from "@/server/analytics";
import { requireTeacher } from "@/server/auth";
import { listClassrooms } from "@/server/classrooms";
import { getReadyDb } from "@/server/db";
import { listStories, MAX_STORIES_PAGE_LIMIT } from "@/server/stories";

export const metadata: Metadata = {
  title: "Analytics",
};

/**
 * `/guru/analitik` — analytics per kelas dan game.
 *
 * Pilihan kelas/game disimpan di query string (`?kelas=&storyId=`), bukan state
 * klien, supaya tautan bisa dibagikan dan agregatnya dihitung server
 * (`getClassroomAnalytics`). Halaman ini hanya menampilkan hasil; tidak ada
 * penulisan data di sini.
 */
export default function AnalyticsPage(props: PageProps<"/guru/analitik">) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsSection searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AnalyticsSection({
  searchParams,
}: {
  searchParams: PageProps<"/guru/analitik">["searchParams"];
}) {
  await connection();
  const { teacherId } = await requireTeacher();
  const db = await getReadyDb();

  const [classes, stories] = await Promise.all([
    listClassrooms(db, teacherId),
    listStories(db, { teacherId, limit: MAX_STORIES_PAGE_LIMIT }),
  ]);

  const params = await searchParams;
  const classroomId = typeof params.kelas === "string" ? params.kelas : null;
  const storyId = typeof params.storyId === "string" ? params.storyId : null;

  const analytics =
    classroomId !== null && storyId !== null
      ? await getClassroomAnalytics(db, {
          teacherId,
          classroomId,
          storyId,
        })
      : null;

  return (
    <AnalyticsBrowser
      classes={classes}
      stories={stories}
      selectedClassroomId={classroomId}
      selectedStoryId={storyId}
      analytics={analytics}
    />
  );
}
