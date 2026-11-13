"use client";

import type { NpcMarker as MarkerView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
};

/**
 * Penanda quest pemberi quest, dua bentuk dalam satu komponen:
 *
 * - **Menempel**: NPC terlihat, badge `!` oranye duduk di atas kepalanya.
 * - **Tepi**: NPC di luar pandangan, badge berganti menjadi beacon kecil
 *   bergaya HUD (`bg-[#0b120e]` + garis aksen) yang ditempel di tepi layar.
 *   Sisi tempat beacon berhenti menunjukkan arah NPC — tanpa panah atau
 *   segitiga. Karena posisinya dihitung ulang tiap frame, beacon ikut bergeser
 *   saat pemain berjalan mendekat, lalu kembali menjadi badge di atas kepala
 *   begitu NPC masuk layar.
 *
 * Beacon memakai `z-30` agar tampil di depan baris HUD, tetapi
 * `pointer-events-none` supaya tombol di bawahnya tetap bisa diklik. Jarak
 * aman di `INSET_PENANDA` (layar.ts) menahan beacon agar tidak menutupi tombol.
 *
 * Animasi naik-turun 2 px dan denyut beacon mati saat `prefers-reduced-motion`,
 * supaya tidak terasa seperti notifikasi berkedip.
 */
export function NpcMarker({ marker }: NpcMarkerProps) {
  if (marker.tepi === true) {
    return (
      <div
        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 font-game"
        style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
        data-tepi="true"
        aria-hidden="true"
      >
        {/* Cincin denyut: menandai "ada yang perlu dituju" tanpa memakai panah. */}
        <span className="absolute -inset-1 animate-quest-beacon border border-[#E8A87C] opacity-0" />
        <span
          className="relative flex items-center justify-center border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold leading-none text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]"
          style={{
            width: cqw(20),
            height: cqw(20),
            fontSize: ukuranHuruf(13, 10, 20),
          }}
        >
          !
        </span>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      aria-hidden="true"
    >
      <span
        className="animate-quest-bob flex items-center justify-center border border-[#2A1A12] bg-[#E8A87C] text-center font-bold leading-none text-[#2A1A12] shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]"
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
