"use client";

import type { NpcMarker as MarkerView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
};

/**
 * Penanda "!" di atas NPC pemberi quest. Koordinatnya sudah dikonversi
 * dunia → layar oleh `GameScene`, jadi kamera yang bergeser tidak membuat
 * tanda tertinggal. Hanya NPC pemegang quest aktif yang punya tanda ini.
 *
 * Animasi naik-turun 2 px dibuat halus dan mati saat `prefers-reduced-motion`,
 * supaya tidak terasa seperti notifikasi berkedip.
 */
export function NpcMarker({ marker }: NpcMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      aria-hidden="true"
    >
      <span
        className="animate-quest-bob block border border-[#2A1A12] bg-[#E8A87C] text-center font-bold leading-none text-[#2A1A12] shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]"
        style={{
          width: cqw(18),
          height: cqw(18),
          fontSize: ukuranHuruf(16, 13, 24),
          lineHeight: cqw(18),
        }}
      >
        !
      </span>
    </div>
  );
}
