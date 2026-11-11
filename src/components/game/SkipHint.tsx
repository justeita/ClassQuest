"use client";

import { Keycap } from "@/components/game/Keycap";
import { TEXTBOX } from "@/game/layout";
import { cqw, persenTinggi, ukuranHuruf } from "@/game/layout";

type SkipHintProps = {
  /** Time-lapse sedang berjalan; hint berubah jadi status. */
  berjalan: boolean;
};

/**
 * Petunjuk "tahan Tab — Percepat" di atas panel dialog.
 *
 * Siswa baru tidak tahu pintasan keyboard hanya dari tombol HUD, jadi hint ini
 * tampil selama fase dialog. Perilakunya ala Persona 3 Reload: tombol perlu
 * **ditahan** supaya adegan mempercepat; saat time-lapse berjalan, teksnya
 * berganti menjadi status supaya pemain tahu kenapa adegan melompat cepat.
 *
 * Sengaja `pointer-events-none`: hint tidak boleh menghalangi klik dialog yang
 * dipakai untuk melanjutkan beat.
 */
export function SkipHint({ berjalan }: SkipHintProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 flex w-full justify-center"
      // Ditaruh tepat di atas panel dialog supaya dekat dengan tempat mata
      // membaca teks, tanpa menutupi portrait di kiri panel.
      style={{ top: persenTinggi(TEXTBOX.y), transform: "translateY(-100%)" }}
    >
      <span
        className="mb-1 flex items-center gap-1.5 whitespace-nowrap border border-[#3D4B41] bg-[#0b120e]/85 text-[#F7F4EC]"
        style={{
          fontSize: ukuranHuruf(11, 10, 16),
          paddingInline: cqw(6),
          paddingBlock: cqw(1.5),
        }}
        role="status"
        aria-live="polite"
      >
        {berjalan ? (
          <>Mempercepat…</>
        ) : (
          <>
            <Keycap>Tab</Keycap>
            Tahan untuk mempercepat
          </>
        )}
      </span>
    </div>
  );
}
