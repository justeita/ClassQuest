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
 * Tampil sebagai satu kartu gelap **membulat** dengan garis aksen oranye, sejalan
 * dengan bahasa visual kotak dialog, HUD, dan buku catatan (ADR 0026). Area
 * luarnya bisa digulir dan memakai scrollbar bertema (`scrollbar-tema`), jadi di
 * layar ponsel pendek menu tetap terjangkau tanpa memunculkan scrollbar bawaan
 * peramban.
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
    <div className="scrollbar-tema absolute inset-0 z-30 flex overflow-y-auto overscroll-contain bg-[#0b120e]/85 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-jeda"
        className="m-auto w-full max-w-xs overflow-hidden rounded-2xl border border-[#E8A87C]/30 bg-[#14201a] font-sans text-[#F7F4EC] shadow-[0_26px_60px_-24px_rgba(0,0,0,0.9)]"
      >
        {/* Garis aksen tipis di kepala kartu: penanda visual menu yang terbuka. */}
        <div className="h-1 w-full bg-[#E8A87C]" />

        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#E8A87C]">
            Permainan dijeda
          </p>
          <h2 id="judul-jeda" className="mt-1 text-lg font-bold tracking-wide">
            Jeda
          </h2>

          <fieldset className="mt-4 rounded-xl border border-[#3D4B41] px-3 pt-1.5 pb-2.5">
            <legend className="px-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8FA396]">
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

          <div className="mt-4 flex flex-col gap-2">
            <button
              ref={lanjutRef}
              type="button"
              onClick={onLanjut}
              className="rounded-lg bg-[#E8A87C] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0b120e] transition-colors hover:bg-[#f0b98f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              Lanjut
            </button>
            <button
              type="button"
              onClick={onUlangiChapter}
              className="rounded-lg border border-[#3D4B41] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#D9E4DA] transition-colors hover:border-[#8FA396] hover:text-[#F7F4EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              Ulangi chapter
            </button>
            <Link
              href="/"
              className="rounded-lg border border-[#3D4B41] px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#D9E4DA] transition-colors hover:border-[#8FA396] hover:text-[#F7F4EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
            >
              Keluar
            </Link>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-[#8FA396]">
            Tekan Esc untuk melanjutkan. Cerita berhenti di tempat yang sama.
          </p>
        </div>
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
          className="shrink-0 rounded-md border border-[#3D4B41] px-2 py-1 text-[10px] uppercase tracking-wide text-[#D9E4DA] transition-colors hover:border-[#E8A87C] hover:text-[#E8A87C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
        >
          {volume === 0 ? "Mute" : "Nyala"}
        </button>
      </div>
    </div>
  );
}
