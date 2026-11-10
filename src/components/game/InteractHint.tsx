"use client";

import type { PromptView } from "@/game/gameBus";
import { cqw, persenTinggi, persenLebar, ukuranHuruf } from "@/game/layout";

type InteractHintProps = {
  hint: PromptView;
};

/**
 * Chip "Space" di atas NPC yang bisa diajak bicara. Dulu digambar Phaser;
 * sekarang DOM supaya tajam (ADR 0007) dan bisa dibaca screen reader.
 *
 * `hint.x`/`hint.y` adalah titik tengah chip dalam piksel internal 640×360
 * (lihat `posisiPrompt` di `interaction.ts`), jadi posisinya diubah ke persen
 * ruang game dan chip digeser ke atas titik itu.
 */
export function InteractHint({ hint }: InteractHintProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(hint.x), top: persenTinggi(hint.y) }}
    >
      <span
        className="whitespace-nowrap border border-[#F7F4EC] bg-[#0b120e]/90 uppercase tracking-[0.12em] text-[#F7F4EC] shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]"
        style={{
          fontSize: ukuranHuruf(11, 10, 16),
          paddingInline: cqw(6),
          paddingBlock: cqw(1),
        }}
      >
        {hint.text}
      </span>
    </div>
  );
}
