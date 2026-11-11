"use client";

/**
 * Keycap tombol keyboard yang dipakai konsisten di semua tombol overlay game
 * (HUD, QuestTracker, hint Percepat). Siswa langsung tahu tombol apa yang harus
 * ditekan tanpa menebak — `Tab`, `B`, `Q`, `Esc` terbaca di tempatnya.
 *
 * `aria-hidden` karena label tombol sudah cukup; keycap murni dekorasi visual
 * dan tidak perlu dibaca screen reader dua kali.
 */
export function Keycap({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      className="border border-[#8FA396]/60 px-1 text-[0.7em] leading-tight text-[#8FA396]"
    >
      {children}
    </span>
  );
}
