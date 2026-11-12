import { Inter, Pixelify_Sans, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

/**
 * Pembungkus halaman pemilihan peran (`/`).
 *
 * Halaman ini punya bahasa visual sendiri (interaksi bergaya pixel, dua palet
 * peran guru/siswa) dan memakai Inter, Plus Jakarta Sans, serta Pixelify Sans.
 * Font sengaja dimuat di sini, bukan di `src/app/layout.tsx`, supaya halaman
 * siswa/game tidak ikut mengunduh tiga keluarga tambahan — pola yang sama
 * dipakai `src/app/guru/layout.tsx`.
 *
 * Route group `(landing)` dipakai agar halaman tetap berada di `/` sambil punya
 * layout sendiri; lihat `docs/05-frontend/routes.md`.
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

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${jakarta.variable} ${pixelify.variable} landing-root relative flex min-h-dvh flex-1 flex-col bg-slate-50 text-slate-900 selection:bg-guru-200 selection:text-guru-900`}
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
