"use client";

import { useEffect, useRef, useState } from "react";

import { batasiStik, arahDariStik } from "@/game/arahSentuh";
import type { ArahGerak } from "@/game/world/karakter";

/**
 * Konteks tombol besar: `"bicara"` saat ada warga di jangkauan, `null` saat
 * belum ada sasaran. Tombol tidak lagi punya mode "Lanjut": selama dialog
 * kontrol sentuh disembunyikan, dan pemain melanjutkan dengan mengetuk kotak
 * dialog (ADR 0024).
 */
export type AksiSentuh = "bicara" | null;

type TouchControlsProps = {
  /**
   * `dek` (layar potret): kontrol mengisi panel di bawah panggung game.
   * `mengapung` (layar lebar): kontrol mengambang di dalam bingkai kanvas.
   */
  mode: "dek" | "mengapung";
  /** Arah gerak dari tongkat; `null` saat tongkat dilepas. */
  onMove: (arah: ArahGerak | null) => void;
  /** Tombol besar ditekan saat ada warga di jangkauan. */
  onAksi: () => void;
  /** Konteks tombol besar; `null` berarti belum ada warga di sekitar pemain. */
  aksi: AksiSentuh;
};

/** Jari-jari pad tongkat dalam px CSS; juga jadi skala pergeseran → 1. */
const RADIUS = 52;
/** Sisi kotak sentuh pad; lebih besar dari tongkat supaya mudah dijangkau jempol. */
const PAD = 136;

/** Lama pesan "dekati warga" tampil setelah tombol tanpa sasaran ditekan (ms). */
const DURASI_PESAN = 2200;

const KELAS_BUTTON =
  "pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-2 bg-[#0b120e]/85 font-game text-lg uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,0.45)] active:bg-[#1c2a22]";
/** Ada sasaran: tombol menyala. Belum ada sasaran: redup, tetapi tetap bisa ditekan. */
const KELAS_SIAP = "border-[#E8A87C] text-[#F7F4EC]";
const KELAS_REDUP = "border-[#3D4B41] text-[#8FA396]";

/**
 * Kontrol layar sentuh: satu tongkat 8 arah dan satu tombol besar kontekstual.
 *
 * Bukan papan tombol virtual: tongkat mengirim **satu arah** yang sama dipakai
 * `movement.ts`, jadi kecepatan, tabrakan, dan animasi tidak punya jalur kedua.
 * Tombol besar selalu "Bicara": menyala saat pemain di zona NPC, redup saat
 * belum ada warga di jangkauan.
 *
 * Tanpa sasaran tombolnya **tidak dimatikan** (ADR 0023): di ponsel tombol mati
 * tanpa penjelasan bikin bingung. Tombolnya tampil redup, tetap bisa ditekan,
 * dan menampilkan pesan singkat "dekati warga" — command `interact` baru dikirim
 * saat memang ada sasaran.
 *
 * Selama dialog kontrol ini tidak dirender sama sekali (ADR 0024): joystick dan
 * tombol hanya menutupi layar, sedangkan lanjut dialog cukup mengetuk kotak
 * dialognya.
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
  /** Pesan "dekati warga" sedang tampil setelah tombol tanpa sasaran ditekan. */
  const [pesan, setPesan] = useState(false);
  const timerPesan = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer pesan dibersihkan saat kontrol dilepas (mis. pindah layar).
  useEffect(
    () => () => {
      if (timerPesan.current !== null) clearTimeout(timerPesan.current);
    },
    [],
  );

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

  /**
   * Tombol besar ditekan. Tanpa sasaran ia hanya memunculkan pesan: lebih baik
   * memberi tahu pemain untuk mendekati warga daripada mengirim command yang
   * tidak melakukan apa-apa.
   */
  function tekanAksi() {
    if (aksi !== null) {
      onAksi();
      return;
    }
    setPesan(true);
    if (timerPesan.current !== null) clearTimeout(timerPesan.current);
    timerPesan.current = setTimeout(() => {
      timerPesan.current = null;
      setPesan(false);
    }, DURASI_PESAN);
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
    <div className="relative">
      {pesan && aksi === null && (
        <p
          role="status"
          className="absolute right-0 bottom-full mb-2 w-max max-w-[11rem] rounded-md border border-[#F7F4EC]/30 bg-[#0b120e]/95 px-2.5 py-1 text-center font-game text-xs text-[#F7F4EC]"
        >
          Dekati warga untuk bicara
        </p>
      )}
      <button
        type="button"
        data-kontrol="aksi"
        onClick={tekanAksi}
        aria-label={aksi === "bicara" ? "Bicara dengan warga" : "Bicara"}
        className={`${KELAS_BUTTON} ${aksi === null ? KELAS_REDUP : KELAS_SIAP}`}
      >
        Bicara
      </button>
    </div>
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
      {/* Bicara digeser agak ke kiri & ke atas dari sudut kanan bawah supaya
          tidak terpotong tepi layar di lanskap. Dek potret tetap di tempat. */}
      <div data-tombol-aksi="geser" className="mr-6 mb-6">
        {tombol}
      </div>
    </div>
  );
}
