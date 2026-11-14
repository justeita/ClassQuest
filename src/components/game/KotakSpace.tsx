"use client";

import { useSentuh } from "@/components/game/useSentuh";
import { PROMPT_INTERAKSI } from "@/game/interaction";
import { PENANDA, cqw, ukuranHuruf } from "@/game/layout";

type KotakSpaceProps = {
  text: string;
  className?: string;
};

/**
 * Kotak bergaya HUD untuk tombol interaksi `Space`.
 *
 * Gayanya sengaja disamakan dengan kotak `!` (latar gelap, garis dan teks
 * aksen, tinggi `PENANDA.kotak`) supaya saat keduanya tampil berdampingan —
 * pada pemberi quest — terbaca sebagai satu widget, bukan dua elemen terpisah.
 * Dipakai dua tempat: menempel di kanan `!` (`NpcMarker`) dan berdiri sendiri
 * sebagai pop-up pada NPC obrolan singkat (`InteractHint`).
 *
 * Di perangkat sentuh labelnya berganti jadi "Sentuh": teks asal dari scene
 * (`PROMPT_INTERAKSI`) menyebut tombol papan ketik, sedangkan di sini yang
 * ditekan adalah tombol aksi.
 */
export function KotakSpace({ text, className = "" }: KotakSpaceProps) {
  const sentuh = useSentuh();
  const label = sentuh && text === PROMPT_INTERAKSI ? "Sentuh" : text;

  return (
    <span
      className={`flex items-center justify-center whitespace-nowrap border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold uppercase tracking-[0.12em] text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] ${className}`}
      style={{
        height: cqw(PENANDA.kotak),
        fontSize: ukuranHuruf(12, 10, 18),
        paddingInline: cqw(6),
      }}
    >
      {label}
    </span>
  );
}
