import type { Metadata } from "next";
import { Inter, Pixelify_Sans, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";

import { AppFooter } from "@/components/brand/AppFooter";
import { AppHeader } from "@/components/brand/AppHeader";

/**
 * Halaman 404 global (`app/not-found.tsx`).
 *
 * Dipakai untuk dua hal sekaligus:
 * 1. URL yang tidak cocok dengan route mana pun.
 * 2. `notFound()` dan rewrite `/_not-found` dari `src/proxy.ts` untuk
 *    `/play/[storyId]` yang tidak boleh dimainkan.
 *
 * Karena file ini berada di akar `app/`, ia dirender di dalam
 * `src/app/layout.tsx` — **bukan** di dalam layout `(landing)` atau `guru`.
 * Itu sebabnya font dan ikon dimuat di sini: tanpa itu halaman jatuh ke font
 * root (Geist) dan terlihat seperti produk lain. Bahasanya visualnya sengaja
 * memakai tema halaman peran (`/`): latar titik, kartu bergaya pixel, dan
 * tautan ke dua pintu (guru/siswa). Jangan membuat tema 404 sendiri. Kepala dan
 * kaki halaman memakai komponen bersama `src/components/brand/` supaya markahnya
 * tidak disalin ke dua tempat.
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
  title: "Halaman tidak ditemukan",
  description: "Alamat yang dibuka tidak ada di ClassQuest.",
  robots: { index: false, follow: false },
};

const PINTU = [
  {
    href: "/guru",
    label: "Portal Guru",
    ikon: "fa-chalkboard-user",
    warna: "text-guru-600",
  },
  {
    href: "/demo",
    label: "Arena Siswa",
    ikon: "fa-gamepad",
    warna: "text-siswa-600",
  },
] as const;

export default function NotFound() {
  return (
    <div
      className={`${inter.variable} ${jakarta.variable} ${pixelify.variable} landing-root relative flex min-h-dvh flex-1 flex-col bg-slate-50 text-slate-900 selection:bg-guru-200 selection:text-guru-900`}
    >
      {/* Ikon Font Awesome: sama seperti layout `(landing)` dan `guru`, supaya
          ikon di halaman ini tidak berbeda gaya. */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        precedence="default"
        crossOrigin="anonymous"
      />

      {/* Latar dekoratif dikurung `overflow-hidden` supaya cahaya yang keluar
          tepi layar tidak menambah tinggi dokumen (halaman 404 pendek, jadi
          tanpa ini muncul scroll kosong ±80 px di ponsel). */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="landing-dots absolute inset-0" />
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-guru-100 opacity-60 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-siswa-100 opacity-60 blur-3xl" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <article className="landing-pixel-card relative w-full overflow-hidden rounded-2xl bg-white p-6 text-center sm:p-8">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-guru-600 to-siswa-600" />

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-100 text-2xl text-slate-700 shadow-[2px_2px_0px_#0f172a]">
            <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
          </div>

          <p
            className="font-pixel text-6xl font-bold leading-none tracking-widest text-slate-900 sm:text-7xl"
            aria-hidden="true"
          >
            404
          </p>

          <h1 className="mt-3 font-heading text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            Halaman tidak ditemukan
          </h1>

          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
            Alamat yang dibuka tidak ada, sudah dipindahkan, atau salah ketik.
            Kembali ke beranda untuk memilih peran — atau langsung buka salah
            satu pintu di bawah.
          </p>

          <Link
            href="/"
            className="landing-btn-press mx-auto mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-pixel text-xs font-bold text-white hover:bg-slate-800 sm:text-sm"
          >
            <span>KEMBALI KE BERANDA</span>
            <i className="fa-solid fa-house text-xs" aria-hidden="true" />
          </Link>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-600">
            {PINTU.map((pintu) => (
              <Link
                key={pintu.href}
                href={pintu.href}
                className="inline-flex items-center gap-1.5 hover:text-slate-900"
              >
                <i
                  className={`fa-solid ${pintu.ikon} text-[11px] ${pintu.warna}`}
                  aria-hidden="true"
                />
                <span>{pintu.label}</span>
              </Link>
            ))}
          </div>
        </article>
      </main>

      <AppFooter />
    </div>
  );
}
