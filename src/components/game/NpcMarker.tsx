"use client";

import type { NpcMarker as MarkerView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
};

/** Sisi kotak penanda quest, dalam piksel internal. */
const UKURAN_KOTAK = 26;

/**
 * Kotak `!` yang sama dipakai di dua keadaan, supaya UI penanda quest konsisten:
 *
 * - **Dekat**: NPC terlihat, kotak duduk di atas papan namanya dan naik-turun.
 * - **Tepi**: NPC di luar pandangan, kotak yang sama menjadi beacon di tepi
 *   layar dengan penunjuk arah yang berputar mengikuti `sudut`.
 *
 * `z-30` menaruh beacon di depan baris HUD, tetapi `pointer-events-none`
 * menjaga tombol di bawahnya tetap bisa diklik.
 */
export function NpcMarker({ marker }: NpcMarkerProps) {
  if (marker.tepi === true) {
    return <BeaconTepi marker={marker} />;
  }

  return (
    <div
      data-tanda="dekat"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      aria-hidden="true"
    >
      <KotakSeru className="animate-quest-bob" />
    </div>
  );
}

/** Beacon di tepi layar dengan penunjuk arah saat NPC di luar pandangan. */
function BeaconTepi({ marker }: { marker: MarkerView }) {
  const sudut = marker.sudut ?? 0;

  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      data-tepi="true"
      aria-hidden="true"
    >
      {/* Cincin denyut: menandai "ada yang perlu dituju". */}
      <span className="absolute -inset-1 animate-quest-beacon border border-[#E8A87C] opacity-0" />

      {/*
        Penunjuk arah. Orbit-nya titik nol di pusat kotak, lalu penunjuk
        digeser ke luar sejauh radius kotak. `sudut + 90` karena bentuk
        penunjuk menghadap ke atas pada rotasi 0.
      */}
      <span
        data-penunjuk="true"
        data-sudut={String(sudut)}
        className="absolute left-1/2 top-1/2"
        style={{ transform: `rotate(${sudut + 90}deg)` }}
      >
        <span
          className="absolute"
          style={{
            width: cqw(9),
            height: cqw(7),
            transform: `translate(-50%, -50%) translateY(${cqw(-19)})`,
          }}
        >
          <span
            className="absolute -inset-px bg-[#2A1A12]"
            style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
          />
          <span
            className="absolute inset-0 bg-[#E8A87C]"
            style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
          />
        </span>
      </span>

      <KotakSeru />
    </div>
  );
}

/** Kotak gelap bergaris aksen dengan glyph `!` di tengahnya. */
function KotakSeru({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative flex items-center justify-center border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold leading-none text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] ${className}`}
      style={{
        width: cqw(UKURAN_KOTAK),
        height: cqw(UKURAN_KOTAK),
        fontSize: ukuranHuruf(17, 13, 30),
      }}
    >
      !
    </span>
  );
}
