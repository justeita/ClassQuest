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
 *
 * Kedua filter opsional: tanpa `?kelas=` dan `?storyId=` halaman langsung
 * menampilkan agregat semua kelas × semua game terbit milik guru, jadi guru
 * tidak melihat layar kosong sebelum memilih apa pun. Id yang tidak dikenal
 * diabaikan (dianggap tidak difilter) karena hasilnya sudah dibatasi
 * `teacher_id`.
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
  const kelas = typeof params.kelas === "string" ? params.kelas.trim() : "";
  const game = typeof params.storyId === "string" ? params.storyId.trim() : "";

  // Filter hanya diteruskan bila id-nya memang ada di daftar milik guru; id
  // asing/kedaluwarsa jatuh kembali ke "semua" alih-alih layar kosong.
  const classroomId = classes.some((item) => item.id === kelas) ? kelas : null;
  const storyId = stories.some(
    (story) => story.status === "published" && story.id === game,
  )
    ? game
    : null;

  const analytics = await getClassroomAnalytics(db, {
    teacherId,
    classroomId,
    storyId,
  });

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
