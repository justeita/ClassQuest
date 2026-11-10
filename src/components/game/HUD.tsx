"use client";

import type { RefObject } from "react";

type HudProps = {
  suaraAktif: boolean;
  onToggleSuara: () => void;
  onJeda: () => void;
  /** Dipakai `GameCanvas` untuk mengembalikan fokus setelah menu jeda tutup. */
  tombolJedaRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * HUD minimal di atas canvas (docs/05-frontend/game-player.md → Playing):
 * tombol suara dan tombol jeda. Informasi chapter dan quest tidak lagi
 * menetap di sini — panel quest (`QuestTracker`) yang menampungnya, supaya
 * siswa melihat konteks cerita tanpa menutupi dunia permainan.
 *
 * Panel dibuat `pointer-events-none` supaya klik di area kosong tetap sampai
 * ke canvas; hanya tombolnya yang menerima pointer.
 */
export function Hud({
  suaraAktif,
  onToggleSuara,
  onJeda,
  tombolJedaRef,
}: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-2 p-2 font-game text-base leading-tight text-[#F7F4EC]">
      <div className="pointer-events-auto flex gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleSuara();
          }}
          aria-pressed={suaraAktif}
          aria-label={`Suara ${suaraAktif ? "aktif" : "nonaktif"}`}
          className="border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          Suara: {suaraAktif ? "aktif" : "mati"}
        </button>
        <button
          ref={tombolJedaRef}
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onJeda();
          }}
          aria-keyshortcuts="Escape"
          className="border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          Jeda
        </button>
      </div>
    </div>
  );
}
