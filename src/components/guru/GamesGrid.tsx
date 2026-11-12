"use client";

import Link from "next/link";

import { GAMES } from "./data";
import { useToast } from "./toast";

/**
 * Koleksi game edukasi.
 *
 * Tombol "Mainkan Game" sengaja hanya menampilkan toast: game siswa hidup di
 * `/play/[storyId]` dan belum ada pemetaan id game portal → `storyId`.
 */
export function GamesGrid() {
  const showToast = useToast();

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            My Educational Games
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Koleksi game edukasi yang telah disintesis oleh Class Quest AI
            Studio.
          </p>
        </div>
        <Link
          href="/guru/materi/baru"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-pixel text-xs font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
        >
          <i className="fa-solid fa-plus" aria-hidden />
          <span>CREATE NEW GAME</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => {
          const active = game.status === "Active";

          return (
            <article
              key={game.id}
              className="guru-pixel-card space-y-3 rounded-2xl bg-white p-5 transition hover:border-brand-500"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-pixel text-[10px] ${
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {game.status}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {game.grade}
                </span>
              </div>

              <h3 className="font-heading text-base font-bold text-slate-900">
                {game.title}
              </h3>
              <p className="text-xs text-slate-500">{game.description}</p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-semibold text-slate-500">
                  <i className="fa-solid fa-users mr-1" aria-hidden />{" "}
                  {game.students} Siswa
                </span>

                {active ? (
                  <button
                    type="button"
                    onClick={() => showToast("Memuat Game...", "info")}
                    className="font-bold text-brand-600 hover:underline"
                  >
                    Mainkan Game &rarr;
                  </button>
                ) : (
                  <Link
                    href="/guru/materi/baru"
                    className="font-bold text-brand-600 hover:underline"
                  >
                    Edit di AI Studio &rarr;
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
