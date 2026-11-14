"use client";

import { useRef, useState } from "react";

import { batasiStik, arahDariStik } from "@/game/arahSentuh";
import type { ArahGerak } from "@/game/world/karakter";

/** Aksi yang ditawarkan tombol besar; `null` berarti belum ada yang bisa dilakukan. */
export type AksiSentuh = "bicara" | "lanjut";

type TouchControlsProps = {
  /**
   * `dek` (layar potret): kontrol mengisi panel di bawah panggung game.
   * `mengapung` (layar lebar): kontrol mengambang di dalam bingkai kanvas.
   */
  mode: "dek" | "mengapung";
  /** Arah gerak dari tongkat; `null` saat tongkat dilepas. */
  onMove: (arah: ArahGerak | null) => void;
  /** Tombol besar ditekan: bicara ke NPC atau lanjut dialog. */
  onAksi: () => void;
  /** Konteks tombol besar; `null` menyembunyikan label aksi. */
  aksi: AksiSentuh | null;
};

/** Jari-jari pad tongkat dalam px CSS; juga jadi skala pergeseran → 1. */
const RADIUS = 52;
/** Sisi kotak sentuh pad; lebih besar dari tongkat supaya mudah dijangkau jempol. */
const PAD = 136;

const KELAS_BUTTON =
  "pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E8A87C] bg-[#0b120e]/85 font-game text-lg uppercase tracking-wide text-[#F7F4EC] shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] active:bg-[#1c2a22] disabled:border-[#3D4B41] disabled:text-[#6b7a70] disabled:opacity-70";

/**
 * Kontrol layar sentuh: satu tongkat 8 arah dan satu tombol besar kontekstual.
 *
 * Bukan papan tombol virtual: tongkat mengirim **satu arah** yang sama dipakai
 * `movement.ts`, jadi kecepatan, tabrakan, dan animasi tidak punya jalur kedua.
 * Tombol besar mengikuti konteks — "Bicara" saat pemain di zona NPC,
 * "Lanjut" saat dialog menunggu — supaya pemain tidak perlu menebak.
 *
 * Pad memakai pointer events + `setPointerCapture`, jadi jempol yang menggeser
 * keluar kotak tetap menahan tongkat sampai diangkat (tanpa "nyangkut").
 */
export function TouchControls({
  mode,
  onMove,
  onAksi,
  aksi,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const aktifRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function perbarui(e: React.PointerEvent<HTMLDivElement>) {
    const pad = padRef.current;
    if (!pad) return;
    const kotak = pad.getBoundingClientRect();
    const cx = kotak.left + kotak.width / 2;
    const cy = kotak.top + kotak.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setKnob(batasiStik(dx, dy, RADIUS));
    onMove(arahDariStik(dx / RADIUS, dy / RADIUS));
  }

  function mulai(e: React.PointerEvent<HTMLDivElement>) {
    aktifRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    perbarui(e);
  }

  function gerak(e: React.PointerEvent<HTMLDivElement>) {
    if (!aktifRef.current) return;
    perbarui(e);
  }

  function lepas(e: React.PointerEvent<HTMLDivElement>) {
    if (!aktifRef.current) return;
    aktifRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setKnob({ x: 0, y: 0 });
    onMove(null);
  }

  const tongkat = (
    <div
      ref={padRef}
      role="group"
      aria-label="Tongkat gerak"
      data-kontrol="tongkat"
      className="pointer-events-auto relative touch-none select-none"
      style={{ width: PAD, height: PAD }}
      onPointerDown={mulai}
      onPointerMove={gerak}
      onPointerUp={lepas}
      onPointerCancel={lepas}
    >
      <div className="absolute inset-0 rounded-full border border-[#3D4B41] bg-[#0b120e]/70" />
      <div
        data-knob="true"
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-[#E8A87C]/80 bg-[#1c2a22]/90"
        style={{
          transform: `translate(-50%, -50%) translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );

  const tombol = (
    <button
      type="button"
      data-kontrol="aksi"
      disabled={aksi === null}
      onClick={onAksi}
      aria-label={
        aksi === "lanjut"
          ? "Lanjut dialog"
          : aksi === "bicara"
            ? "Bicara dengan warga"
            : "Tidak ada yang bisa dilakukan"
      }
      className={KELAS_BUTTON}
    >
      {aksi === "lanjut" ? "Lanjut" : aksi === "bicara" ? "Bicara" : "·"}
    </button>
  );

  if (mode === "dek") {
    return (
      <div
        data-kontrol-sentuh="dek"
        className="flex flex-1 items-center justify-between gap-4 px-5 py-3"
      >
        {tongkat}
        {tombol}
      </div>
    );
  }

  return (
    <div
      data-kontrol-sentuh="mengapung"
      className="pointer-events-none absolute inset-0 z-30 flex items-end justify-between p-4"
    >
      {tongkat}
      {tombol}
    </div>
  );
}
