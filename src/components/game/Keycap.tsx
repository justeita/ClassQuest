"use client";

import { useSentuh } from "@/components/game/useSentuh";

/**
 * Keycap tombol keyboard yang dipakai konsisten di semua tombol overlay game
 * (HUD dan QuestTracker). Siswa langsung tahu tombol apa yang harus
 * ditekan tanpa menebak — `Tab`, `B`, `Q`, `Esc` terbaca di tempatnya.
 *
 * `aria-hidden` karena label tombol sudah cukup; keycap murni dekorasi visual
 * dan tidak perlu dibaca screen reader dua kali.
 *
 * Di perangkat sentuh keycap tidak berarti apa-apa — tidak ada tombol fisik yang
 * bisa ditekan — jadi komponen ini tidak merender apa pun di sana. Semua pemakai
 * (HUD, QuestTracker, pilihan jawaban) ikut bersih tanpa perlu tahu soal
 * perangkat.
 */
export function Keycap({ children }: { children: string }) {
  const sentuh = useSentuh();
  if (sentuh) return null;

  return (
    <span
      aria-hidden="true"
      className="border border-[#8FA396]/60 px-1 text-[0.7em] leading-tight text-[#8FA396]"
    >
      {children}
    </span>
  );
}
