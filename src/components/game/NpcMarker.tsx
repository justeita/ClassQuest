"use client";

import type { NpcMarker as MarkerView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
};

/** Lebar batang dan titik tanda seru, dalam piksel internal. */
const LEBAR_SERU = 7;

/**
 * Penanda quest pemberi quest, dua bentuk dalam satu komponen:
 *
 * - **Dekat**: NPC terlihat, tanda seru tinggi (batang + titik) bergaya pixel
 *   berdiri di atas kepala NPC, dengan papan nama dari `cast.name` di bawahnya.
 * - **Tepi**: NPC di luar pandangan, penanda menjadi beacon kotak bergaya HUD
 *   yang ditempel di tepi layar, dengan penunjuk kecil di atas kotak yang
 *   berputar mengikuti arah NPC.
 *
 * Posisi dikirim ulang tiap frame oleh `GameScene`, jadi penanda selalu
 * menempel pada NPC (atau pada titik tepi terdekat) saat kamera bergeser.
 * `z-30` menaruh beacon di depan baris HUD, tetapi `pointer-events-none`
 * menjaga tombol di bawahnya tetap bisa diklik. `INSET_PENANDA` (`layar.ts`)
 * memberi jarak aman agar beacon dan penunjuknya tidak menutupi HUD.
 *
 * Animasi naik-turun tanda seru dan denyut beacon mati saat
 * `prefers-reduced-motion`, supaya tidak terasa seperti notifikasi berkedip.
 */
export function NpcMarker({ marker }: NpcMarkerProps) {
  return marker.tepi === true ? (
    <BeaconTepi marker={marker} />
  ) : (
    <PenandaDekat marker={marker} />
  );
}

/** Tanda seru + papan nama di atas kepala NPC yang terlihat. */
function PenandaDekat({ marker }: { marker: MarkerView }) {
  return (
    <div
      data-tanda="dekat"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center" style={{ gap: cqw(4) }}>
        <span
          className="animate-quest-bob flex flex-col items-center"
          style={{ gap: cqw(3) }}
        >
          <span
            data-bagian="batang"
            className="border border-[#2A1A12]"
            style={{
              width: cqw(LEBAR_SERU),
              height: cqw(18),
              background:
                "linear-gradient(to bottom, #F2906F 0%, #D14B45 55%, #B33A3C 100%)",
              boxShadow: "1px 1px 0 0 rgba(0,0,0,0.35)",
            }}
          />
          <span
            data-bagian="titik"
            className="border border-[#2A1A12]"
            style={{
              width: cqw(LEBAR_SERU),
              height: cqw(LEBAR_SERU),
              background: "#C43F40",
              boxShadow: "1px 1px 0 0 rgba(0,0,0,0.35)",
            }}
          />
        </span>
        <span
          data-bagian="nama"
          className="overflow-hidden text-ellipsis whitespace-nowrap border border-[#3D4B41] bg-[#0b120e]/90 font-bold leading-none tracking-wide text-[#F7F4EC]"
          style={{
            maxWidth: cqw(120),
            fontSize: ukuranHuruf(11, 11, 22),
            paddingInline: cqw(4),
            paddingBlock: cqw(2),
          }}
        >
          {marker.nama}
        </span>
      </div>
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

      <span
        className="relative flex items-center justify-center border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold leading-none text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)]"
        style={{
          width: cqw(26),
          height: cqw(26),
          fontSize: ukuranHuruf(17, 13, 30),
        }}
      >
        !
      </span>
    </div>
  );
}
