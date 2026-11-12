import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DashboardStatCard } from "@/components/guru/StatCard";
import { STORY_STATUS_META, formatUpdatedAt } from "@/components/guru/logic";
import { DashboardSkeleton } from "@/components/guru/skeletons";
import { requireTeacher } from "@/server/auth";
import { getReadyDb } from "@/server/db";
import { listStories } from "@/server/stories";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Jumlah kartu "aktivitas terbaru" di dashboard. */
const RECENT_LIMIT = 6;

/** Batas baris yang dibaca untuk statistik; `listStories` membatasi di server. */
const STATS_LIMIT = 100;

/**
 * `/guru` — dashboard guru.
 *
 * Data berasal dari `listStories` (`src/server/stories`), bukan angka contoh.
 * Bagian yang membaca database ada di dalam `<Suspense>` supaya kerangka
 * halaman tetap bisa dirender lebih dulu (`docs/05-frontend/routes.md`).
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Kartu sapaan + ajakan membuat game baru. */}
      <section className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-[4px_4px_0px_#cbd5e1] sm:flex-row sm:items-center sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 font-pixel text-xs text-amber-800">
            <i className="fa-solid fa-star text-amber-600" aria-hidden /> DAILY
            QUEST ACTIVE
          </div>
          <h1 className="font-heading text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
            Create. Teach. Play! 🚀
          </h1>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Selamat datang kembali,{" "}
            <Suspense fallback="Guru">
              <TeacherGreeting />
            </Suspense>{" "}
            Ubah bahan ajar PDF menjadi game instruksional interaktif dengan
            Class Quest AI Engine.
          </p>
        </div>

        <Link
          href="/guru/materi/baru"
          className="guru-press-pixel relative z-10 flex shrink-0 items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-brand-600 px-5 py-3.5 font-pixel text-xs font-bold text-white shadow-[4px_4px_0px_#172554] transition hover:bg-brand-700"
        >
          <i className="fa-solid fa-wand-magic-sparkles text-sm" aria-hidden />
          <span>CREATE NEW GAME</span>
        </Link>
      </section>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardOverview />
      </Suspense>
    </div>
  );
}

/**
 * Nama guru dari sesi. Dipisah dan dibungkus `<Suspense>` di pemanggil karena
 * ditampilkan di dalam paragraf sapaan, di luar data dashboard.
 */
async function TeacherGreeting() {
  await connection();
  const { displayName } = await requireTeacher();

  return <b className="text-brand-700">{displayName}</b>;
}

/** Isi dashboard yang butuh sesi + database. */
async function DashboardOverview() {
  await connection();
  const { teacherId } = await requireTeacher();
  const stories = await listStories(await getReadyDb(), {
    teacherId,
    limit: STATS_LIMIT,
  });

  const published = stories.filter((item) => item.status === "published");
  const draft = stories.filter((item) => item.status === "draft");
  const processing = stories.filter((item) => item.status === "processing");

  return (
    <>
      <section className="guru-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Total Materials"
          value={stories.length}
          icon="fa-book-open"
          tone="purple"
        />
        <DashboardStatCard
          label="Published Games"
          value={published.length}
          icon="fa-gamepad"
          tone="blue"
        />
        <DashboardStatCard
          label="Need Review"
          value={draft.length}
          icon="fa-clipboard-check"
          tone="emerald"
        />
        <DashboardStatCard
          label="In Progress"
          value={processing.length}
          icon="fa-gears"
          tone="amber"
        />
      </section>

      <section className="guru-pixel-card space-y-5 rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
            <i
              className="fa-regular fa-clock text-lg text-brand-600"
              aria-hidden
            />{" "}
            Recent Activity
          </h2>
          <Link
            href="/guru/materi"
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            View All &rarr;
          </Link>
        </div>

        {stories.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="guru-stagger divide-y divide-slate-100">
            {stories.slice(0, RECENT_LIMIT).map((item) => {
              const meta = STORY_STATUS_META[item.status];

              return (
                <li key={item.id}>
                  <Link
                    href={`/guru/materi/${item.id}`}
                    className="group flex flex-col justify-between gap-2 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-bold text-slate-900 transition group-hover:text-brand-600">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {item.subject} • {item.gradeLevel}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 text-[11px]">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-pixel text-[10px] ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-slate-400">
                        <i
                          className="fa-regular fa-calendar mr-1"
                          aria-hidden
                        />
                        {formatUpdatedAt(item.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/** Empty state yang menjelaskan alur dalam tiga langkah (teacher-dashboard.md). */
function EmptyState() {
  return (
    <div className="guru-pop rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <i
        className="fa-solid fa-wand-magic-sparkles mb-2 text-3xl text-slate-300"
        aria-hidden
      />
      <p className="text-sm font-bold text-slate-700">Belum ada materi</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
        Unggah PDF materi, biarkan AI menyusun ceritanya, lalu review dan
        bagikan tautannya ke siswa.
      </p>
      <Link
        href="/guru/materi/baru"
        className="guru-press-pixel mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
      >
        <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
        <span>UPLOAD MATERI PERTAMA</span>
      </Link>
    </div>
  );
}
