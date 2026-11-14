import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { GenerationProgress } from "@/components/guru/GenerationProgress";
import { StoryActions } from "@/components/guru/StoryActions";
import { STORY_STATUS_META, formatUpdatedAt } from "@/components/guru/logic";
import { MateriDetailSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { getReadyDb } from "@/server/db";
import { getJobStatus, getLatestJobId } from "@/server/jobs/status";
import { getStoryDetail } from "@/server/stories";
import type { Story, StoryMode } from "@/story/schema";

export const metadata: Metadata = {
  title: "Materi",
};

/**
 * Label tampilan untuk `Story.meta.mode`. Cerita lama tanpa `mode` dibaca
 * sebagai `mix` (ADR 0028); nilainya tidak ditulis ulang.
 */
const MODE_LABELS: Record<StoryMode, string> = {
  menjelaskan: "Menjelaskan",
  pertanyaan: "Pertanyaan",
  mix: "Mix",
};

/**
 * `/guru/materi/[storyId]` — status generasi + ringkasan cerita.
 *
 * Tiga keadaan sesuai `docs/05-frontend/teacher-dashboard.md`:
 *
 * 1. **Sedang diproses** — `GenerationProgress` mem-polling
 *    `GET /api/jobs/[jobId]`. `storyId` bukan `jobId`, jadi job terbaru dicari
 *    lewat `getLatestJobId` (query dengan filter kepemilikan yang sama).
 * 2. **Selesai** — ringkasan chapter/tantangan/konsep, peringatan
 *    `source.gaps`, banner cerita cadangan, dan aksi bagikan/arsip/hapus.
 * 3. **Gagal** — alasan dari status job (pesan statis server), bukan stack
 *    trace atau kode provider.
 *
 * Cerita yang tidak ada dan cerita milik guru lain sama-sama `notFound()`.
 */
export default function MateriDetailPage(
  props: PageProps<"/guru/materi/[storyId]">,
) {
  return (
    <Suspense fallback={<MateriDetailSkeleton />}>
      <MateriDetailContent params={props.params} />
    </Suspense>
  );
}

/**
 * Isi halaman. `connection()` harus berada di dalam `<Suspense>` (aturan Cache
 * Components), jadi halaman ini dipecah: kerangka halaman boleh diprerender,
 * sedangkan sesi + database menunggu request.
 */
async function MateriDetailContent({
  params,
}: {
  params: PageProps<"/guru/materi/[storyId]">["params"];
}) {
  const { storyId } = await params;
  await connection();

  const { teacherId } = await requireTeacher();

  const db = await getReadyDb();

  // Job dibaca lebih dulu: `getJobStatus` bisa menandai job basi gagal dan
  // mengubah status cerita, jadi detail dibaca setelahnya.
  const jobId = await getLatestJobId(db, { storyId, teacherId });
  const job = jobId
    ? (await getJobStatus(db, { jobId, teacherId })).result
    : null;

  const detail = await getStoryDetail(db, { storyId, teacherId });
  if (detail === null) notFound();

  const meta = STORY_STATUS_META[detail.status];
  const story = detail.story;
  const processing = detail.status === "processing";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-col gap-3 border-b-2 border-slate-200 pb-4">
        <Link
          href="/guru/materi"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-brand-600"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden /> Semua materi
        </Link>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-2xl font-extrabold text-slate-900">
              {detail.title}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {detail.subject} • {detail.gradeLevel} • Diperbarui{" "}
              {formatUpdatedAt(detail.updatedAt)}
            </p>
          </div>

          <span
            className={`w-fit shrink-0 rounded-full border px-3 py-1 font-pixel text-[11px] font-bold ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {processing ? (
            jobId !== null ? (
              <GenerationProgress
                jobId={jobId}
                initialStage={job?.stage ?? "queued"}
                initialProgress={job?.progress ?? 5}
              />
            ) : (
              <section className="guru-pixel-card rounded-2xl bg-white p-6">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
                  <i
                    className="fa-solid fa-gears animate-spin text-brand-600"
                    aria-hidden
                  />
                  Sedang diproses…
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Proses berjalan di latar belakang. Muat ulang halaman ini
                  beberapa saat lagi untuk melihat hasilnya.
                </p>
              </section>
            )
          ) : null}

          {detail.status === "failed" ? (
            <section className="space-y-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-6">
              <h3 className="flex items-center gap-2 font-heading text-base font-bold text-rose-900">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden />
                Gagal dibuat
              </h3>
              <p className="text-xs leading-relaxed text-rose-800">
                {job?.error?.message ??
                  "Cerita gagal dibuat. Coba unggah ulang materi ini."}
              </p>
              <Link
                href="/guru/materi/baru"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
              >
                <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
                <span>UNGGAH ULANG / GANTI PDF</span>
              </Link>
            </section>
          ) : null}

          {story !== null ? (
            <StorySummary
              story={story}
              usedFallback={detail.usedFallback}
              version={detail.version}
            />
          ) : detail.status !== "processing" ? (
            <section className="rounded-2xl border-2 border-slate-200 bg-white p-6">
              <p className="text-xs leading-relaxed text-slate-600">
                Cerita untuk materi ini belum tersedia. Coba unggah ulang
                PDF-nya untuk memulai generasi baru.
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="guru-pixel-card space-y-3 rounded-2xl bg-white p-5">
            <h3 className="font-pixel text-xs font-bold uppercase tracking-wider text-slate-800">
              Aksi
            </h3>
            <StoryActions
              storyId={detail.id}
              status={detail.status}
              version={detail.version}
              hasStory={story !== null}
            />
            <p className="text-[11px] leading-relaxed text-slate-400">
              Editor cerita dan preview versi draft belum ada; perubahan isi
              cerita dilakukan lewat pipeline. Bagikan hanya setelah cerita
              selesai dibuat.
            </p>
          </div>

          <dl className="space-y-2 rounded-2xl border-2 border-slate-200 bg-white p-5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-500">Versi tersimpan</dt>
              <dd className="font-bold text-slate-800">{detail.version}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-500">Bahasa</dt>
              <dd className="font-bold text-slate-800">
                {detail.language === "en" ? "English" : "Indonesia"}
              </dd>
            </div>
            {story ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-500">Mode permainan</dt>
                <dd className="font-bold text-slate-800">
                  {MODE_LABELS[story.meta.mode ?? "mix"]}
                </dd>
              </div>
            ) : null}
            {story ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-500">Sumber halaman</dt>
                <dd className="font-bold text-slate-800">
                  {story.source.pageCount} halaman
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}

/** Ringkasan isi cerita: jumlah chapter/tantangan, konsep, dan catatan gap. */
function StorySummary({
  story,
  usedFallback,
  version,
}: {
  story: Story;
  usedFallback: boolean;
  version: number;
}) {
  if (story === null) return null;

  const gaps = story.source.gaps ?? [];

  return (
    <section className="space-y-4">
      {usedFallback ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <p className="font-bold">
            <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden />
            Cerita cadangan dipakai
          </p>
          <p className="mt-1">
            AI belum menghasilkan cerita yang lolos validator, jadi sistem
            memakai cerita cadangan supaya demo tidak kosong. Baca dulu isinya
            sebelum dibagikan.
          </p>
        </div>
      ) : null}

      <div className="guru-pixel-card space-y-4 rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <h3 className="font-heading text-base font-bold text-slate-900">
            Ringkasan Cerita
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            versi {version}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="font-heading text-2xl font-extrabold text-slate-900">
              {story.chapters.length}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Chapter
            </p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="font-heading text-2xl font-extrabold text-slate-900">
              {story.challenges.length}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Tantangan
            </p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
            <p className="font-heading text-2xl font-extrabold text-slate-900">
              {story.meta.estimatedMinutes}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Menit
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-900">
            Konsep yang tercakup
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {story.source.concepts.map((concept) => (
              <li
                key={concept}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800"
              >
                {concept}
              </li>
            ))}
          </ul>
        </div>

        {gaps.length > 0 ? (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
            <h4 className="font-pixel text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Catatan kekurangan materi
            </h4>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-amber-800">
              {gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-1">
          <h4 className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-900">
            Sinopsis
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            {story.meta.synopsis}
          </p>
        </div>
      </div>
    </section>
  );
}
