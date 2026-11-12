import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: {
    default: "ClassQuest — materi pelajaran jadi game pixel",
    template: "%s · ClassQuest",
  },
  description:
    "ClassQuest mengubah materi pelajaran yang diunggah guru menjadi game pixel 2D bercerita, supaya siswa belajar lewat alur cerita dan tantangan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${gameFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
