import type { Metadata } from "next";
import { Inter, Pixelify_Sans, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/guru/toast";

/**
 * Font portal guru, dipisah dari font game di root layout supaya halaman siswa
 * tidak ikut mengunduh tiga keluarga tambahan.
 *
 * Desain asalnya memuat Inter, Plus Jakarta Sans, dan Pixelify Sans lewat
 * Google Fonts `<link>`; di sini `next/font` yang menyajikan berkasnya sendiri
 * (tanpa permintaan ke pihak ketiga saat runtime).
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

export const metadata: Metadata = {
  title: {
    default: "Portal Guru — ClassQuest",
    template: "%s — ClassQuest",
  },
  description:
    "Studio guru ClassQuest: ubah materi pelajaran menjadi game pembelajaran.",
};

/**
 * Pembungkus semua halaman `/guru/*`.
 *
 * Yang dipasang di sini hanya hal yang dipakai bersama: variabel font, gaya
 * dasar, dan penyedia notifikasi. Sidebar portal sengaja **tidak** di sini
 * karena `/guru/masuk` tidak boleh memakainya — lihat
 * `src/app/guru/(portal)/layout.tsx`.
 */
export default function GuruLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${jakarta.variable} ${pixelify.variable} guru-root min-h-screen bg-slate-100 text-slate-800 antialiased`}
    >
      {/* Ikon Font Awesome: desain asal memakai CDN, jadi dipertahankan agar
          tidak perlu menggambar ulang ~80 ikon sebagai SVG. */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        precedence="default"
        crossOrigin="anonymous"
      />

      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
