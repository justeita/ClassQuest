"use client";

import type { PromptView } from "@/game/gameBus";
import {
  PENANDA,
  cqw,
  persenTinggi,
  persenLebar,
  ukuranHuruf,
} from "@/game/layout";

type InteractHintProps = {
  hint: PromptView;
};

/**
 * Kotak `Space` di atas NPC yang bisa diajak bicara. Dulu digambar Phaser;
 * sekarang DOM supaya tajam (ADR 0007) dan bisa dibaca screen reader.
 *
 * `hint.x`/`hint.y` adalah sudut kiri-bawah kotak dalam piksel internal ruang
 * game (lihat `posisiPrompt` di `interaction.ts`). Gayanya sengaja disamakan
 * dengan penanda quest `!` (latar gelap, garis dan teks aksen, tinggi sama)
 * supaya keduanya terbaca sebagai satu widget.
 *
 * Dua keadaan dibedakan `hint.menempel`:
 *
 * - **Pemberi quest** (`menempel: true`): kotak duduk rapat di kanan `!` dan
 *   **meluncur keluar** darinya lewat `animate-quest-slide-in` (titik tumbuh di
 *   tepi kiri), jadi prompt terasa lahir dari indikator quest.
 * - **Obrolan singkat** (`menempel: false`): tidak ada penanda, jadi kotak
 *   muncul halus seperti **pop-up** lewat `animate-quest-pop` — tanpa meluncur
 *   ke kanan, karena tidak ada `!` untuk dituju.
 *
 * Animasi hanya berjalan sekali per kemunculan: React memakai ulang elemen
 * yang sama saat koordinat berubah tiap frame, jadi kotak tidak berkedip
 * mengulang animasi selama pemain berjalan.
 */
export function InteractHint({ hint }: InteractHintProps) {
  const animasi = hint.menempel
    ? "origin-left animate-quest-slide-in"
    : "animate-quest-pop";

  return (
    <div
      data-prompt={hint.menempel ? "quest" : "obrolan"}
      className="pointer-events-none absolute z-10 -translate-y-full font-game"
      style={{ left: persenLebar(hint.x), top: persenTinggi(hint.y) }}
    >
      <span
        className={`flex items-center justify-center whitespace-nowrap border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold uppercase tracking-[0.12em] text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] ${animasi}`}
        style={{
          height: cqw(PENANDA.kotak),
          fontSize: ukuranHuruf(12, 10, 18),
          paddingInline: cqw(6),
        }}
      >
        {hint.text}
      </span>
    </div>
  );
}
