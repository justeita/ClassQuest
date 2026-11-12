"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { StoryListItem, StoryStatus } from "@/server/contracts";

import { SelectMenu } from "./SelectMenu";
import { StatCard } from "./StatCard";
import {
  EMPTY_STORY_FILTER,
  STORY_STATUS_META,
  filterStories,
  formatUpdatedAt,
  type StoryFilter,
} from "./logic";

/** Urutan status di pilihan penyaring, mengikuti siklus di persistence.md. */
const STATUS_OPTIONS: StoryStatus[] = [
  "processing",
  "draft",
  "published",
  "failed",
  "archived",
];

/**
 * Daftar materi milik guru.
 *
 * Datanya dibaca server component (`/guru/materi/page.tsx`) lewat
 * `listStories`, lalu diteruskan sebagai prop. Komponen ini hanya menyaring di
 * browser; tidak ada panggilan database atau API dari client.
 */
export function MaterialsBrowser({ items }: { items: StoryListItem[] }) {
  const [filter, setFilter] = useState<StoryFilter>(EMPTY_STORY_FILTER);

  const subjects = useMemo(
    () => [...new Set(items.map((item) => item.subject))].sort(),
    [items],
  );

  const visible = useMemo(() => filterStories(items, filter), [items, filter]);

  const published = items.filter((item) => item.status === "published").length;
  const needReview = items.filter((item) => item.status === "draft").length;
  const latest = items[0];

  function ubahFilter<K extends keyof StoryFilter>(
    key: K,
    value: StoryFilter[K],
  ) {
    setFilter((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            Learning Materials
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage and organize your teaching resources.
          </p>
        </div>
        <Link
          href="/guru/materi/baru"
          className="guru-press-pixel flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
        >
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
          <span>UPLOAD NEW MATERIAL</span>
        </Link>
      </div>

      <div className="guru-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Materials"
          value={items.length}
          icon="fa-folder-closed"
          tone="blue"
        />
        <StatCard
          label="Total Subjects"
          value={subjects.length}
          icon="fa-book-bookmark"
          tone="indigo"
        />
        <StatCard
          label="Shared Games"
          value={published}
          icon="fa-gamepad"
          tone="emerald"
        />
        <StatCard
          label="Need Review"
          value={needReview}
          icon="fa-clipboard-check"
          tone="amber"
        />
      </div>

      <div className="guru-pixel-card space-y-3 rounded-2xl bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-xs text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={filter.query}
              onChange={(event) => ubahFilter("query", event.target.value)}
              placeholder="Cari judul materi atau mata pelajaran..."
              aria-label="Cari materi"
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="matFilterSubject" className="sr-only">
              Mata pelajaran
            </label>
            <SelectMenu
              id="matFilterSubject"
              value={filter.subject}
              onChange={(subject) => ubahFilter("subject", subject)}
              options={[
                { value: "", label: "Semua Mata Pelajaran" },
                ...subjects.map((subject) => ({
                  value: subject,
                  label: subject,
                })),
              ]}
              placeholder="Semua Mata Pelajaran"
            />
          </div>

          <div>
            <label htmlFor="matFilterStatus" className="sr-only">
              Status
            </label>
            <SelectMenu
              id="matFilterStatus"
              value={filter.status}
              onChange={(status) =>
                ubahFilter("status", status as StoryFilter["status"])
              }
              options={[
                { value: "", label: "Semua Status" },
                ...STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: STORY_STATUS_META[status].label,
                })),
              ]}
              placeholder="Semua Status"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="guru-pop rounded-2xl border-2 border-slate-200 bg-white py-12 text-center">
          <i
            className="fa-solid fa-folder-open mb-2 text-3xl text-slate-300"
            aria-hidden
          />
          <p className="text-xs font-bold text-slate-700">
            Materi tidak ditemukan
          </p>
          {items.length === 0 ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Mulai dengan mengunggah PDF materi pertama.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="guru-stagger grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const meta = STORY_STATUS_META[item.status];

            return (
              <Link
                key={item.id}
                href={`/guru/materi/${item.id}`}
                className="guru-pixel-card guru-lift group flex flex-col justify-between space-y-4 rounded-2xl bg-white p-5 text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-lg border px-2.5 py-1 font-pixel text-[10px] font-bold ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {item.versionCount > 0
                        ? `${item.versionCount} versi`
                        : "Belum ada cerita"}
                    </span>
                  </div>

                  <div>
                    <h3 className="truncate font-heading text-sm font-bold text-slate-900 transition group-hover:text-brand-600">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {item.subject} • {item.gradeLevel}
                    </p>
                  </div>

                  {item.usedFallback ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                      <i
                        className="fa-solid fa-triangle-exclamation mr-1"
                        aria-hidden
                      />
                      Memakai cerita cadangan
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                  <span className="text-slate-400">
                    <i className="fa-regular fa-calendar mr-1" aria-hidden />{" "}
                    {formatUpdatedAt(item.updatedAt)}
                  </span>
                  <span className="font-bold text-brand-600 group-hover:underline">
                    Buka &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {latest ? (
        <p className="text-[11px] text-slate-400">
          Terakhir diperbarui:{" "}
          <span className="font-semibold text-slate-600">{latest.title}</span> —{" "}
          {formatUpdatedAt(latest.updatedAt)}
        </p>
      ) : null}
    </div>
  );
}
