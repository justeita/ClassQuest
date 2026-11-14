import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

/**
 * Pembungkus halaman publik bertema peran (`/` dan empat dokumen legal).
 *
 * Halaman-halaman ini punya bahasa visual sendiri (interaksi bergaya pixel, dua
 * palet peran guru/siswa) dan memakai Inter serta Plus Jakarta Sans. Font
 * dimuat di sini, bukan di `src/app/layout.tsx`, supaya halaman siswa/game tidak
 * ikut mengunduh dua keluarga tambahan — pola yang sama dipakai
 * `src/app/guru/layout.tsx`. Font pixel (Pixelify Sans, `font-pixel`) justru
 * tinggal di root karena dipakai juga oleh nama pembicara di game.
 *
 * Route group `(landing)` dipakai agar halaman tetap berada di `/` (dan
 * `/privasi`, `/syarat`, `/penafian`, `/cookie`) sambil punya layout sendiri;
 * lihat `docs/05-frontend/routes.md`.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${jakarta.variable} landing-root relative flex min-h-dvh flex-1 flex-col bg-slate-50 text-slate-900 selection:bg-guru-200 selection:text-guru-900`}
    >
      {/* Ikon Font Awesome: desain asalnya memuat CDN, jadi dipertahankan agar
          tidak perlu menggambar ulang tiap ikon sebagai SVG. */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        precedence="default"
        crossOrigin="anonymous"
      />

      {children}
    </div>
  );
}
