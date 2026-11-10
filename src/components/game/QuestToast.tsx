"use client";

import { cqw, ukuranHuruf } from "@/game/layout";

type QuestToastProps = {
  /** Judul quest baru; null saat toast tidak tampil. */
  title: string | null;
};

/**
 * Notifikasi singkat "Quest baru" saat scene berganti. Dipakai supaya siswa
 * tahu kenapa penanda "!" pindah ke NPC lain, tanpa harus membaca panel quest.
 */
export function QuestToast({ title }: QuestToastProps) {
  if (!title) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-[30%] left-1/2 z-20 -translate-x-1/2 border border-[#E8A87C] bg-[#0b120e]/92 px-3 py-1.5 text-center font-game text-[#F7F4EC] shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]"
      style={{ maxWidth: cqw(460) }}
    >
      <p
        className="uppercase tracking-[0.16em] text-[#E8A87C]"
        style={{ fontSize: ukuranHuruf(10, 8, 13) }}
      >
        Quest baru
      </p>
      <p style={{ fontSize: ukuranHuruf(13, 11, 19), lineHeight: 1.2 }}>
        {title}
      </p>
    </div>
  );
}
