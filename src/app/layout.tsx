import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import localFont from "next/font/local";

import { ImageGuard } from "@/components/ImageGuard";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Font teks game (dialog, prompt, HUD) — handwriting yang tetap terbaca.
 * File OFL ada di `public/fonts/`; dimuat lewat `next/font/local` supaya
 * tersedia sebagai CSS variable dan tidak bergantung jaringan saat build.
 */
const gameFont = localFont({
  src: [
    {
      path: "../../public/fonts/patrick-hand-latin.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-handwriting",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

/**
 * Font pixel untuk **nama pembicara** di kotak dialog (utility `font-pixel`).
 * Dipasang di root karena kotak dialog muncul di route game (`/game`,
 * `/play/[storyId]`) yang tidak punya layout sendiri. Hanya dipakai untuk nama
 * dan label kecil: teks isi dialog tetap Patrick Hand supaya mudah dibaca.
 */
const pixelFont = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ClassQuest — materi pelajaran jadi game pixel",
    template: "%s · ClassQuest",
  },
  description:
    "ClassQuest mengubah materi pelajaran yang diunggah guru menjadi game pixel 2D bercerita, supaya siswa belajar lewat alur cerita dan tantangan.",
};

/**
 * `viewportFit: "cover"` membuat halaman memakai seluruh layar ponsel —
 * termasuk bagian di balik notch dan bar sistem. Tanpa ini, `env(safe-area-inset-*)`
 * selalu bernilai nol dan padding aman di `.area-game` tidak ada gunanya.
 * `themeColor` disamakan dengan latar game supaya bilah alamat dan status iOS
 * menyatu dengan kanvas, bukan muncul sebagai garis putih.
 */
export const viewport: Viewport = {
  themeColor: "#0b120e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${gameFont.variable} ${pixelFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ImageGuard />
        {children}
      </body>
    </html>
  );
}
