"use client";

import type { RefObject } from "react";

import { Keycap } from "@/components/game/Keycap";
import { TombolLayarPenuh } from "@/components/game/TombolLayarPenuh";
import { kelasTombolHud, type LetakHud } from "@/components/game/gayaHud";

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
  /**
   * `overlay`: deretan tombol melayang di kanan atas kanvas.
   * `bar`: deretan tombol statis untuk bar bawah di luar kanvas (layar potret).
   */
  letak?: LetakHud;
};

/**
 * Tombol keycap ala Persona 3 Reload: **tahan** untuk mempercepat, lepas untuk
 * berhenti. `onPointerDown` memulai time-lapse; `onPointerUp`/`onPointerLeave`/
 * `onPointerCancel` menghentikannya supaya tidak nyangkut saat kursor geser
 * keluar tombol sambil menekan.
 *
 * Di layar sentuh pointer **ditangkap** (`setPointerCapture`): jempol mudah
 * bergeser beberapa px saat menahan, dan tanpa capture `pointerleave` langsung
 * menghentikan time-lapse — penyebab tombol "Percepat" terasa mati di HP. Tombol
 * juga `touch-none` + menolak menu konteks supaya gestur gulir/tekan-lama tidak
 * membatalkan pointer di tengah jalan.
 */
function tombolPercepatProps(
  onMulaiLewati: () => void,
  onHentikanLewati: () => void,
) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.currentTarget.focus();
      onMulaiLewati();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      onHentikanLewati();
    },
    onPointerLeave: () => onHentikanLewati(),
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      onHentikanLewati();
    },
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) =>
      e.preventDefault(),
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
 * Dalam mode `overlay` panel dibuat `pointer-events-none` supaya klik di area
 * kosong tetap sampai ke canvas; hanya tombolnya yang menerima pointer. Dalam
 * mode `bar` (layar potret) tombol dirender di luar kanvas dengan gaya cerah.
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
  letak = "overlay",
}: HudProps) {
  const kelas = kelasTombolHud(letak);

  const isi = (
    <>
      {tampilLewati && (
        <button
          type="button"
          {...tombolPercepatProps(onMulaiLewati, onHentikanLewati)}
          aria-keyshortcuts="Tab"
          title="Tahan untuk mempercepat dialog — soal tetap muncul"
          className={`${kelas} touch-none select-none`}
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
        className={kelas}
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
        className={kelas}
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
        className={kelas}
      >
        <Keycap>Esc</Keycap>
        Jeda
      </button>
      {/* Ikon saja: di ponsel HUD sudah penuh tombol teks, sedangkan tombol ini
          cuma pintasan masuk/keluar layar penuh. Hilang sendiri di peramban
          tanpa Fullscreen API (mis. Safari iPhone). */}
      <TombolLayarPenuh ringkas letak={letak} className="font-game" />
    </>
  );

  if (letak === "bar") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {isi}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-2 p-2 font-game text-base leading-tight text-[#F7F4EC]">
      <div className="pointer-events-auto flex gap-1.5">{isi}</div>
    </div>
  );
}
