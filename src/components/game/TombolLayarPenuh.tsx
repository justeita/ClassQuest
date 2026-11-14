"use client";

import { useLayarPenuh } from "@/components/game/useLayarPenuh";
import { kelasTombolHud, type LetakHud } from "@/components/game/gayaHud";

type TombolLayarPenuhProps = {
  /** Kelas tambahan untuk menyesuaikan posisi/gaya pemakaian. */
  className?: string;
  /**
   * Sembunyikan label teks dan sisakan ikon. Dipakai HUD saat ruang mendatar
   * sempit, mis. HUD di ponsel yang sudah penuh tombol lain.
   */
  ringkas?: boolean;
  /** `overlay` di atas kanvas; `bar` di bar bawah dengan gaya cerah. */
  letak?: LetakHud;
};

/**
 * Tombol layar penuh (docs/05-frontend/game-player.md → Responsif).
 *
 * Meminta Fullscreen API lalu mencoba mengunci orientasi mendatar; lihat
 * `useLayarPenuh.ts`. Tombol menghilang bila peramban tidak punya Fullscreen
 * API untuk elemen (mis. Safari iPhone), jadi tidak ada tombol mati.
 */
export function TombolLayarPenuh({
  className = "",
  ringkas = false,
  letak = "overlay",
}: TombolLayarPenuhProps) {
  const { aktif, didukung, toggle } = useLayarPenuh();

  if (!didukung) return null;

  const label = aktif ? "Keluar dari layar penuh" : "Main layar penuh mendatar";

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={aktif}
      aria-label={label}
      title={label}
      className={`${kelasTombolHud(letak)} ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      >
        {/* Empat siku sudut: penanda "penuhkan layar" yang tidak bergantung font. */}
        <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
      </svg>
      {!ringkas && <span>{aktif ? "Keluar" : "Layar penuh"}</span>}
    </button>
  );
}
