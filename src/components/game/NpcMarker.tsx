"use client";

import type { NpcMarker as MarkerView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
};

/**
 * Penanda quest di atas NPC pemberi quest.
 *
 * Dua bentuk, satu komponen:
 *
 * - **Menempel**: NPC terlihat, tanda `!` duduk di atas kepalanya.
 * - **Tepi**: NPC di luar pandangan, tanda menempel di tepi layar dan panahnya
 *   menunjuk arah NPC (`marker.sudut`). Posisinya dihitung ulang tiap frame,
 *   jadi saat pemain berjalan mendekat indikator ini ikut bergeser, lalu
 *   berubah mulus menjadi tanda di atas kepala ketika NPC masuk layar.
 *
 * Kedua bentuk memakai jangkar kiri-bawah yang sama. Jadi saat NPC melewati
 * batas layar, badge tidak melompat vertikal — hanya panahnya yang muncul.
 *
 * Animasi naik-turun 2 px dibuat halus dan mati saat `prefers-reduced-motion`,
 * supaya tidak terasa seperti notifikasi berkedip.
 */
export function NpcMarker({ marker }: NpcMarkerProps) {
  const tepi = marker.tepi === true;
  const sudut = marker.sudut ?? 0;

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      data-tepi={tepi ? "true" : undefined}
      data-sudut={tepi ? String(sudut) : undefined}
      aria-hidden="true"
    >
      <span
        className="animate-quest-bob flex items-center justify-center gap-1 border border-[#2A1A12] bg-[#E8A87C] text-center font-bold leading-none text-[#2A1A12] shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]"
        style={{
          width: cqw(tepi ? 30 : 18),
          height: cqw(18),
          fontSize: ukuranHuruf(16, 13, 24),
          lineHeight: cqw(18),
        }}
      >
        {tepi && (
          <svg
            viewBox="0 0 9 9"
            fill="currentColor"
            data-arah="true"
            style={{
              width: cqw(9),
              height: cqw(9),
              flex: "none",
              transform: `rotate(${sudut}deg)`,
            }}
          >
            <path d="M0 0 L9 4.5 L0 9 Z" />
          </svg>
        )}
        !
      </span>
    </div>
  );
}
