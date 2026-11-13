"use client";

import type { PromptView } from "@/game/gameBus";
import { cqw, persenTinggi, persenLebar, ukuranHuruf } from "@/game/layout";

type InteractHintProps = {
  hint: PromptView;
};

/**
 * Kotak `Space` di samping penanda `!` pada NPC yang bisa diajak bicara. Dulu
 * digambar Phaser; sekarang DOM supaya tajam (ADR 0007) dan bisa dibaca screen
 * reader.
 *
 * `hint.x`/`hint.y` adalah sudut kiri-bawah kotak dalam piksel internal ruang
 * game (lihat `posisiPrompt` di `interaction.ts`). Kotak sengaja tidak
 * menggantikan penanda `!` — keduanya tampil bersamaan supaya indikator quest
 * tidak berkedip hilang-muncul saat pemain masuk-keluar zona interaksi.
 *
 * Saat pemain masuk zona, kotak **menyembul ke kanan dari kotak `!`** lewat
 * `animate-quest-slide-in` dengan titik tumbuh di tepi kirinya. Animasi hanya
 * berjalan sekali per kemunculan: React memakai ulang elemen yang sama saat
 * koordinat berubah tiap frame, jadi kotak tidak berkedip mengulang animasi
 * selama pemain berjalan.
 */
export function InteractHint({ hint }: InteractHintProps) {
  return (
    <div
      data-prompt="true"
      className="pointer-events-none absolute z-10 -translate-y-full font-game"
      style={{ left: persenLebar(hint.x), top: persenTinggi(hint.y) }}
    >
      <span
        className="block origin-left animate-quest-slide-in whitespace-nowrap border-2 border-[#F7F4EC] bg-[#0b120e]/90 uppercase tracking-[0.12em] text-[#F7F4EC] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]"
        style={{
          fontSize: ukuranHuruf(11, 10, 16),
          paddingInline: cqw(6),
          paddingBlock: cqw(1.5),
        }}
      >
        {hint.text}
      </span>
    </div>
  );
}
