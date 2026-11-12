"use client";

import Link from "next/link";

import type { StoryListItem } from "@/server/contracts";

import { STORY_STATUS_META, formatUpdatedAt } from "./logic";

/**
 * Koleksi game edukasi milik guru.
 *
 * Satu kartu = satu cerita di `stories`. Hanya cerita `published` yang punya
 * tautan main (`/play/[storyId]`); status lain diarahkan ke halaman detail
 * karena game siswa menolak cerita yang belum terbit.
 */
export function GamesGrid({ items }: { items: StoryListItem[] }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            My Educational Games
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Game yang sudah disusun dari materi pelajaran Anda.
          </p>
        </div>
        <Link
          href="/guru/materi/baru"
          className="guru-press-pixel flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-pixel text-xs font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
        >
          <i className="fa-solid fa-plus" aria-hidden />
          <span>CREATE NEW GAME</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="guru-pop rounded-2xl border-2 border-slate-200 bg-white py-12 text-center">
          <i
            className="fa-solid fa-gamepad mb-2 text-3xl text-slate-300"
            aria-hidden
          />
          <p className="text-xs font-bold text-slate-700">Belum ada game</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Unggah materi pertama, lalu bagikan ceritanya ke siswa.
          </p>
        </div>
      ) : (
        <div className="guru-stagger grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((story) => {
            const meta = STORY_STATUS_META[story.status];
            const playable = story.status === "published";

            return (
              <article
                key={story.id}
                className="guru-pixel-card guru-lift space-y-3 rounded-2xl bg-white p-5 transition hover:border-brand-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-pixel text-[10px] ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {story.gradeLevel}
                  </span>
                </div>

                <div>
                  <h3 className="truncate font-heading text-base font-bold text-slate-900">
                    {story.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {story.subject} • {story.versionCount} versi
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="font-semibold text-slate-400">
                    <i className="fa-regular fa-calendar mr-1" aria-hidden />{" "}
                    {formatUpdatedAt(story.updatedAt)}
                  </span>

                  <Link
                    href={
                      playable
                        ? `/play/${story.id}`
                        : `/guru/materi/${story.id}`
                    }
                    className="font-bold text-brand-600 hover:underline"
                  >
                    {playable ? "Mainkan Game →" : "Buka materi →"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
