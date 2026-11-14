"use client";

import type { RefObject } from "react";

import { Keycap } from "@/components/game/Keycap";
import { TombolLayarPenuh } from "@/components/game/TombolLayarPenuh";
import { TombolPercepat } from "@/components/game/TombolPercepat";
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
        <TombolPercepat
          kelas={kelas}
          onMulai={onMulaiLewati}
          onHentikan={onHentikanLewati}
        />
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
