import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { StoryEditor } from "@/components/guru/StoryEditor";
import { EditorSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { getReadyDb } from "@/server/db";
import { getStoryDetail } from "@/server/stories";

export const metadata: Metadata = {
  title: "Edit cerita",
};

/**
 * `/guru/materi/[storyId]/edit` — story editor guru.
 *
 * Kontrak: `docs/05-frontend/routes.md` dan
 * `docs/05-frontend/story-editor.md`.
 *
 * Halaman ini hanya menyiapkan data awal: cerita versi terbaru, nomor versinya
 * (untuk optimistic locking `saveStoryDraft`), dan status cerita. Semua
 * penyuntingan terjadi di client (`StoryEditor`), dan server tetap memvalidasi
 * ulang setiap kali draft disimpan.
 *
 * Cerita yang tidak ada / bukan milik guru → `notFound()`, sama seperti halaman
 * detail.
 */
export default function StoryEditorPage(
  props: PageProps<"/guru/materi/[storyId]/edit">,
) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <StoryEditorContent params={props.params} />
    </Suspense>
  );
}

/**
 * `connection()` harus di dalam `<Suspense>` (aturan Cache Components), jadi
 * halaman dipecah seperti halaman detail materi.
 */
async function StoryEditorContent({
  params,
}: {
  params: PageProps<"/guru/materi/[storyId]/edit">["params"];
}) {
  const { storyId } = await params;
  await connection();

  const { teacherId } = await requireTeacher();
  const detail = await getStoryDetail(await getReadyDb(), {
    storyId,
    teacherId,
  });

  if (detail === null) notFound();

  // Belum ada cerita sama sekali (mis. generasi gagal sebelum versi pertama):
  // editor tidak punya apa pun untuk disunting.
  if (detail.story === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-10">
        <Link
          href={`/guru/materi/${storyId}`}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-brand-600"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden /> Kembali ke materi
        </Link>
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
          <h1 className="font-heading text-base font-bold text-amber-900">
            Belum ada cerita untuk disunting
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-amber-800">
            Materi ini belum punya versi cerita. Tunggu proses generasi selesai,
            atau unggah ulang PDF lewat AI Studio.
          </p>
          <Link
            href="/guru/materi/baru"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
          >
            <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
            <span>BUAT MATERI BARU</span>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <StoryEditor
      storyId={detail.id}
      initialStory={detail.story}
      initialVersion={detail.version}
      status={detail.status}
    />
  );
}
