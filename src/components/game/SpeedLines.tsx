"use client";

type SpeedLinesProps = {
  /** Time-lapse sedang berjalan; garis memudar masuk/keluar 200 ms. */
  aktif: boolean;
};

/**
 * Garis kecepatan ala Persona 3 Reload: saat time-lapse "Percepat" berjalan,
 * garis-garis horizontal menyala di tepi atas dan bawah kanvas lalu memudar ke
 * arah tengah — layaknya frame anime yang melompat cepat.
 *
 * Dirender di DOM (ADR 0007) supaya garisnya tajam di atas kanvas pixelated.
 * Animasinya murni CSS berbasis transform (`.garis-cepat` di globals.css)
 * supaya jalan di compositor GPU dan mulus. Komponen tetap terpasang selama
 * fase dialog dan hanya beralih opacity, jadi masuk/keluarnya memudar halus
 * alih-alih muncul-hilang mendadak. Hormati preferensi reduced-motion.
 */
export function SpeedLines({ aktif }: SpeedLinesProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="speed-lines"
      className={`pointer-events-none absolute inset-0 z-[5] overflow-hidden transition-opacity duration-200 ease-out motion-reduce:hidden ${
        aktif ? "opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="garis-cepat absolute inset-x-0 top-0 h-[26%]" />
      <div className="garis-cepat garis-cepat-balik absolute inset-x-0 bottom-0 h-[26%]" />
    </div>
  );
}
