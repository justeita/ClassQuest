"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { PengaturanAudio } from "@/game/audioSettings";

type PauseMenuProps = {
  onLanjut: () => void;
  onUlangiChapter: () => void;
  pengaturan: PengaturanAudio;
  /** Perubahan satu kanal audio; nilai sudah di-clamp pemanggil. */
  onUbahAudio: (kanal: "music" | "sfx", volume: number) => void;
};

/**
 * Menu jeda (docs/04-game/interaction-loop.md → Menu jeda).
 *
 * "Ulangi chapter" mengembalikan kursor ke scene pertama bab aktif, tetapi
 * catatan jawaban tidak dihapus: skor tetap memakai percobaan pertama.
 * "Keluar" memakai tautan biasa ke beranda — tidak ada state yang perlu
 * dibersihkan karena progres `localStorage` belum ada.
 */
export function PauseMenu({
  onLanjut,
  onUlangiChapter,
  pengaturan,
  onUbahAudio,
}: PauseMenuProps) {
  const lanjutRef = useRef<HTMLButtonElement>(null);

  // Fokus masuk ke pilihan paling aman saat menu terbuka. `GameCanvas`
  // mengembalikan fokus ke tombol Jeda setelah menu ditutup.
  useEffect(() => {
    lanjutRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    /*
     * `overflow-y-auto` + `m-auto` pada panel: di ponsel lanskap tinggi layar
     * sangat pendek, jadi menu yang lebih tinggi dari viewport harus bisa
     * digulir alih-alih terpotong di tepi. Auto-margin menjaga panel tetap
     * center saat muat, dan mulai dari atas saat tidak.
     */
    <div className="absolute inset-0 z-30 flex overflow-y-auto overscroll-contain bg-[#0b120e]/80 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-jeda"
        className="m-auto w-full max-w-xs border-2 border-[#F7F4EC] bg-[#14201a] p-4 font-sans text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)]"
      >
        <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-[#8FA396]">
          Permainan dijeda
        </p>
        <h2 id="judul-jeda" className="mb-4 text-base">
          Jeda
        </h2>

        <fieldset className="mt-3 border border-[#3D4B41] p-2.5">
          <legend className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#8FA396]">
            Pengaturan suara
          </legend>
          <PengaturanSuara
            label="Musik"
            volume={pengaturan.music}
            onUbah={(v) => onUbahAudio("music", v)}
          />
          <PengaturanSuara
            label="Efek suara"
            volume={pengaturan.sfx}
            onUbah={(v) => onUbahAudio("sfx", v)}
          />
        </fieldset>

        <div className="flex flex-col gap-2">
          <button
            ref={lanjutRef}
            type="button"
            onClick={onLanjut}
            className="border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#F7F4EC] hover:text-[#14201a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Lanjut
          </button>
          <button
            type="button"
            onClick={onUlangiChapter}
            className="border-2 border-[#3D4B41] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Ulangi chapter
          </button>
          <Link
            href="/"
            className="border-2 border-[#3D4B41] px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Keluar
          </Link>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-[#8FA396]">
          Tekan Esc untuk melanjutkan. Cerita berhenti di tempat yang sama.
        </p>
      </section>
    </div>
  );
}

type PengaturanSuaraProps = {
  label: string;
  /** Volume 0-1. */
  volume: number;
  onUbah: (volume: number) => void;
};

/**
 * Satu baris pengaturan audio: slider dengan persen terlihat + tombol mute.
 * Slider operable keyboard secara bawaan; `aria-valuetext` menyebut persen
 * supaya pembaca layar tidak membaca angka mentah (accessibility.md).
 */
function PengaturanSuara({ label, volume, onUbah }: PengaturanSuaraProps) {
  const persen = Math.round(volume * 100);
  const id = `volume-${label.toLowerCase().replace(/ /g, "-")}`;

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs text-[#D9E4DA]">
          {label}
        </label>
        <span className="text-xs tabular-nums text-[#8FA396]">{persen}%</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={persen}
          onChange={(e) => onUbah(Number(e.target.value) / 100)}
          aria-valuetext={`${persen}%`}
          className="h-1.5 w-full accent-[#E8A87C]"
        />
        <button
          type="button"
          onClick={() => onUbah(volume > 0 ? 0 : 1)}
          aria-pressed={volume === 0}
          aria-label={`${label} ${volume === 0 ? "mati" : "nyala"}`}
          className="shrink-0 border border-[#3D4B41] px-2 py-1 text-[10px] uppercase tracking-wide text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          {volume === 0 ? "Mute" : "Nyala"}
        </button>
      </div>
    </div>
  );
}
