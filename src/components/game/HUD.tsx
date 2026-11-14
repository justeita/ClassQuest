"use client";

import type { RefObject } from "react";

import { Keycap } from "@/components/game/Keycap";
import { TombolLayarPenuh } from "@/components/game/TombolLayarPenuh";

type HudProps = {
  /** Musik nyala = volume musik > 0. Efek suara diatur di menu jeda. */
  musikAktif: boolean;
  onToggleMusik: () => void;
  /** Buka buku catatan (riwayat dialog + jurnal konsep). */
  onBukaLog: () => void;
  /** Mulai menahan "Percepat": time-lapse berjalan sampai dilepas. */
  onMulaiLewati: () => void;
  /** Lepas "Percepat": kembali ke tempo normal. */
  onHentikanLewati: () => void;
  /** Tombol Percepat hanya tampil selama fase dialog, bukan saat soal. */
  tampilLewati: boolean;
  onJeda: () => void;
  /** Dipakai `GameCanvas` untuk mengembalikan fokus setelah menu jeda tutup. */
  tombolJedaRef?: RefObject<HTMLButtonElement | null>;
};

const KELAS_TOMBOL =
  "flex items-center gap-1.5 border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]";

/**
 * Tombol keycap ala Persona 3 Reload: **tahan** untuk mempercepat, lepas untuk
 * berhenti. `onPointerDown` memulai time-lapse; `onPointerUp`/`onPointerLeave`/
 * `onPointerCancel` menghentikannya supaya tidak nyangkut saat kursor geser
 * keluar tombol sambil menekan.
 */
function tombolPercepatProps(
  onMulaiLewati: () => void,
  onHentikanLewati: () => void,
) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.focus();
      onMulaiLewati();
    },
    onPointerUp: () => onHentikanLewati(),
    onPointerLeave: () => onHentikanLewati(),
    onPointerCancel: () => onHentikanLewati(),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Pemain keyboard menahan tombol HUD dengan Enter/Space.
      if (e.key === "Enter" || e.key === " ") {
        if (e.repeat) return;
        e.preventDefault();
        onMulaiLewati();
      }
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") onHentikanLewati();
    },
  };
}

/**
 * HUD minimal di atas canvas (docs/05-frontend/game-player.md → Playing):
 * tombol suara dan tombol jeda. Informasi chapter dan quest tidak lagi
 * menetap di sini — panel quest (`QuestTracker`) yang menampungnya, supaya
 * siswa melihat konteks cerita tanpa menutupi dunia permainan.
 *
 * Panel dibuat `pointer-events-none` supaya klik di area kosong tetap sampai
 * ke canvas; hanya tombolnya yang menerima pointer.
 */
export function Hud({
  musikAktif,
  onToggleMusik,
  onBukaLog,
  onMulaiLewati,
  onHentikanLewati,
  tampilLewati,
  onJeda,
  tombolJedaRef,
}: HudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-2 p-2 font-game text-base leading-tight text-[#F7F4EC]">
      <div className="pointer-events-auto flex gap-1.5">
        {tampilLewati && (
          <button
            type="button"
            {...tombolPercepatProps(onMulaiLewati, onHentikanLewati)}
            aria-keyshortcuts="Tab"
            title="Tahan untuk mempercepat dialog — soal tetap muncul"
            className={KELAS_TOMBOL}
          >
            <Keycap>Tab</Keycap>
            Percepat
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMusik();
          }}
          aria-pressed={musikAktif}
          aria-label={`Musik ${musikAktif ? "nyala" : "mati"}`}
          title="Musik nyala/mati — detail volume di menu jeda"
          className={KELAS_TOMBOL}
        >
          {musikAktif ? "♪ Musik" : "♪ Musik mati"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onBukaLog();
          }}
          aria-keyshortcuts="b"
          title="Buku catatan: riwayat dialog dan jurnal konsep"
          className={KELAS_TOMBOL}
        >
          <Keycap>B</Keycap>
          Catatan
        </button>
        <button
          ref={tombolJedaRef}
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onJeda();
          }}
          aria-keyshortcuts="Escape"
          className={KELAS_TOMBOL}
        >
          <Keycap>Esc</Keycap>
          Jeda
        </button>
        {/* Ikon saja: di ponsel HUD sudah penuh tombol teks, sedangkan tombol ini
            cuma pintasan masuk/keluar layar penuh. Hilang sendiri di peramban
            tanpa Fullscreen API (mis. Safari iPhone). */}
        <TombolLayarPenuh ringkas className="font-game" />
      </div>
    </div>
  );
}
