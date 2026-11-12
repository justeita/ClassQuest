import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { DashboardStatCard } from "@/components/guru/StatCard";
import {
  CURRENT_TEACHER,
  PORTAL_STATS,
  RECENT_ACTIVITY,
  type RecentActivityKind,
} from "@/components/guru/data";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Label dan warna lencana kartu aktivitas, sesuai desain asal. */
const ACTIVITY_BADGE: Record<
  RecentActivityKind,
  { label: string; className: string }
> = {
  game: { label: "Active", className: "bg-emerald-500" },
  material: { label: "PDF Modul", className: "bg-blue-500" },
  quiz: { label: "HOTS Quiz", className: "bg-purple-500" },
};

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
            <b className="text-brand-700">{CURRENT_TEACHER.fullName}</b>{" "}
            Konversikan bahan ajar formal Anda menjadi game instruksional
            interaktif dengan Class Quest AI Engine.
          </p>
        </div>

        <Link
          href="/guru/materi/baru"
          className="relative z-10 flex shrink-0 items-center gap-2.5 rounded-xl border-2 border-slate-900 bg-brand-600 px-5 py-3.5 font-pixel text-xs font-bold text-white shadow-[4px_4px_0px_#172554] transition hover:bg-brand-700 active:translate-y-1"
        >
          <i className="fa-solid fa-wand-magic-sparkles text-sm" aria-hidden />
          <span>CREATE NEW GAME</span>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label="Total Games"
          value={PORTAL_STATS.totalGames}
          icon="fa-gamepad"
          tone="blue"
        />
        <DashboardStatCard
          label="Active Classes"
          value={PORTAL_STATS.activeClasses}
          icon="fa-users"
          tone="indigo"
        />
        <DashboardStatCard
          label="Total Students"
          value={PORTAL_STATS.totalStudents}
          icon="fa-graduation-cap"
          tone="emerald"
        />
        <DashboardStatCard
          label="Materials"
          value={PORTAL_STATS.materials}
          icon="fa-book-open"
          tone="purple"
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RECENT_ACTIVITY.map((activity) => {
            const badge = ACTIVITY_BADGE[activity.kind];

            return (
              <article
                key={activity.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 transition hover:border-brand-500"
              >
                <div>
                  <div className="relative h-36 w-full overflow-hidden bg-slate-800">
                    <Image
                      src={activity.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
                    />
                    <div
                      className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 font-pixel text-[10px] text-white shadow ${badge.className}`}
                    >
                      {badge.label}
                    </div>
                  </div>

                  <div className="space-y-2 p-4">
                    <h3 className="font-heading text-sm font-bold text-slate-900 transition group-hover:text-brand-600">
                      {activity.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-slate-600">
                      {activity.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-[11px] font-medium text-slate-500">
                  <span>
                    <i className="fa-regular fa-clock mr-1" aria-hidden />{" "}
                    {activity.time}
                  </span>
                  <span className="font-bold text-slate-700">
                    {activity.meta}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
