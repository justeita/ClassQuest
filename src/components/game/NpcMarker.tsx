"use client";

import { KotakSpace } from "@/components/game/KotakSpace";
import type { NpcMarker as MarkerView } from "@/game/gameBus";
import {
  PENANDA,
  cqw,
  persenLebar,
  persenTinggi,
  ukuranHuruf,
} from "@/game/layout";

type NpcMarkerProps = {
  marker: MarkerView;
  /**
   * Teks tombol interaksi bila pemain berada di zona pemberi quest ini. Saat
   * ada, kotak `Space` menjadi **satu paket** dengan kotak `!`: duduk rapat di
   * kanannya dan naik-turun bersama animasi idle yang sama.
   */
  prompt?: string;
};

/**
 * Kotak `!` yang sama dipakai di dua keadaan, supaya UI penanda quest konsisten:
 *
 * - **Dekat**: NPC terlihat, kotak duduk di atas papan namanya dan naik-turun.
 *   Bila pemain di zona interaksi, kotak `Space` menempel di kanannya dalam satu
 *   paket yang ikut naik-turun (lihat `prompt`).
 * - **Tepi**: NPC di luar pandangan, kotak yang sama menjadi beacon di tepi
 *   layar dengan penunjuk arah yang berputar mengikuti `sudut`.
 *
 * `z-30` menaruh beacon di depan baris HUD, tetapi `pointer-events-none`
 * menjaga tombol di bawahnya tetap bisa diklik.
 */
export function NpcMarker({ marker, prompt }: NpcMarkerProps) {
  if (marker.tepi === true) {
    return <BeaconTepi marker={marker} />;
  }

  return (
    <div
      data-tanda="dekat"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(marker.x), top: persenTinggi(marker.y) }}
    >
      {/*
        Satu paket: kotak `!` dan (bila ada) kotak `Space` dibungkus satu
        elemen ber-animasi idle, jadi keduanya naik-turun **bersama** dan tidak
        terlihat terpisah. Kotak `Space` diletakkan absolut di kanan `!` supaya
        tidak menambah lebar paket — penanda tetap di tengah NPC.
      */}
      <div className="relative animate-quest-bob">
        <KotakSeru />
        {prompt ? (
          <KotakSpace
            text={prompt}
            className="absolute left-full top-0 origin-left animate-quest-slide-in"
          />
        ) : null}
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
            width: cqw(PENANDA.penunjuk.lebar),
            height: cqw(PENANDA.penunjuk.tinggi),
            transform: `translate(-50%, -50%) translateY(${cqw(-PENANDA.penunjuk.geser)})`,
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
      aria-hidden="true"
      className={`relative flex items-center justify-center border border-[#E8A87C]/80 bg-[#0b120e]/90 font-bold leading-none text-[#E8A87C] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] ${className}`}
      style={{
        width: cqw(PENANDA.kotak),
        height: cqw(PENANDA.kotak),
        fontSize: ukuranHuruf(17, 13, 30),
      }}
    >
      !
    </span>
  );
}
