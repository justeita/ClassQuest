"use client";

import { cqw, ukuranHuruf } from "@/game/layout";

export type ChapterCardView = {
  chapterNumber: number;
  chapterTotal: number;
  chapterTitle: string;
};

type ChapterCardProps = {
  view: ChapterCardView | null;
};

/**
 * Kartu judul chapter yang muncul sebentar saat bab berganti, lalu hilang
 * sendiri. Dulu judul chapter menetap di HUD; sekarang hanya tampil sebagai
 * transisi supaya panel quest bisa memakai ruang itu.
 */
export function ChapterCard({ view }: ChapterCardProps) {
  if (!view) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-[14%] z-20 -translate-x-1/2 border border-[#3D4B41] bg-[#0b120e]/90 px-4 py-2 text-center font-game text-[#F7F4EC] shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]"
      style={{ maxWidth: cqw(420) }}
    >
      <p
        className="uppercase tracking-[0.16em] text-[#E8A87C]"
        style={{ fontSize: ukuranHuruf(11, 9, 14) }}
      >
        Chapter {view.chapterNumber}/{view.chapterTotal}
      </p>
      <p
        className="mt-0.5"
        style={{ fontSize: ukuranHuruf(16, 13, 24), lineHeight: 1.2 }}
      >
        {view.chapterTitle}
      </p>
    </div>
  );
}
