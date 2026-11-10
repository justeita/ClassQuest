"use client";

import type { RefObject } from "react";

export type ProgresBab = {
  chapterNumber: number;
  chapterTotal: number;
  chapterTitle: string;
};

type HudProps = {
  /** Bab aktif dari event `progress` Phaser; null sebelum game siap. */
  progres: ProgresBab | null;
  suaraAktif: boolean;
  onToggleSuara: () => void;
  onJeda: () => void;
  /** Dipakai `GameCanvas` untuk mengembalikan fokus setelah menu jeda tutup. */
  tombolJedaRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * HUD minimal di atas canvas (docs/05-frontend/game-player.md → Playing):
 * indikator chapter, tombol suara, dan tombol jeda. Tidak ada angka skor di
 * sini — umpan balik skor baru muncul di layar hasil.
 *
 * Panel dibuat `pointer-events-none` supaya klik di area kosong tetap sampai
 * ke canvas; hanya tombolnya yang menerima pointer.
 */
export function Hud({
  progres,
  suaraAktif,
  onToggleSuara,
  onJeda,
  tombolJedaRef,
}: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 font-game text-base leading-tight text-[#F7F4EC]">
      <div className="border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5">
        <p aria-live="polite" className="uppercase tracking-[0.12em]">
          {progres
            ? `Chapter ${progres.chapterNumber}/${progres.chapterTotal}`
            : "Chapter …"}
        </p>
        {progres && (
          <p className="mt-0.5 max-w-[18rem] truncate text-[#D9E4DA]">
            {progres.chapterTitle}
          </p>
        )}
      </div>

      <div className="pointer-events-auto flex gap-1.5">
        <button
          type="button"
          onClick={onToggleSuara}
          aria-pressed={suaraAktif}
          aria-label={`Suara ${suaraAktif ? "aktif" : "nonaktif"}`}
          className="border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          Suara: {suaraAktif ? "aktif" : "mati"}
        </button>
        <button
          ref={tombolJedaRef}
          type="button"
          onClick={onJeda}
          aria-keyshortcuts="Escape"
          className="border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          Jeda
        </button>
      </div>
    </div>
  );
}
