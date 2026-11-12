import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ClassesBrowser } from "@/components/guru/ClassesBrowser";
import { ClassesSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { listClassrooms } from "@/server/classrooms";
import { getReadyDb } from "@/server/db";

export const metadata: Metadata = {
  title: "My Classes",
};

/**
 * `/guru/kelas` — daftar kelas, detail kelas, dan modal kelas baru.
 *
 * Data dibaca dari tabel `classrooms`/`students` milik guru yang login
 * (`docs/06-backend/persistence.md`). Daftar awal kosong: tidak ada kelas atau
 * siswa contoh.
 */
export default function KelasPage() {
  return (
    <Suspense fallback={<ClassesSkeleton />}>
      <ClassesSection />
    </Suspense>
  );
}

/** Bagian yang membaca sesi + database (harus di dalam batas Suspense). */
async function ClassesSection() {
  await connection();
  const { teacherId } = await requireTeacher();
  const classes = await listClassrooms(await getReadyDb(), teacherId);

  return <ClassesBrowser classes={classes} />;
}
