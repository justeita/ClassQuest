"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type PauseMenuProps = {
  onLanjut: () => void;
  onUlangiChapter: () => void;
  suaraAktif: boolean;
  onToggleSuara: () => void;
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
  suaraAktif,
  onToggleSuara,
}: PauseMenuProps) {
  const lanjutRef = useRef<HTMLButtonElement>(null);

  // Fokus masuk ke pilihan paling aman saat menu terbuka. `GameCanvas`
  // mengembalikan fokus ke tombol Jeda setelah menu ditutup.
  useEffect(() => {
    lanjutRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b120e]/80 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-jeda"
        className="w-full max-w-xs border-2 border-[#F7F4EC] bg-[#14201a] p-4 font-sans text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)]"
      >
        <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-[#8FA396]">
          Permainan dijeda
        </p>
        <h2 id="judul-jeda" className="mb-4 text-base">
          Jeda
        </h2>

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
          <button
            type="button"
            onClick={onToggleSuara}
            aria-pressed={suaraAktif}
            className="border-2 border-[#3D4B41] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Suara: {suaraAktif ? "aktif" : "mati"}
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
