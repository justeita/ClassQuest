import Image from "next/image";
import Link from "next/link";

/**
 * Kepala halaman bertema halaman peran (`/`).
 *
 * Dipakai halaman pemilihan peran dan halaman 404 global. Keduanya memakai
 * bahasa visual yang sama, jadi markahnya disimpan di satu tempat: mengubah
 * logo atau tautan beranda cukup di sini, bukan di dua file yang bisa berbeda.
 *
 * Logo memakai berkas brand penuh (`public/brand/classquest_logo.png`), bukan
 * ikon Font Awesome + teks, supaya tulisan "Class Quest" di dalam logo tetap
 * terbaca. Tingginya 36 px di ponsel dan 44 px di layar lebih besar — di bawah
 * itu huruf pixel di dalam logo mulai pecah.
 *
 * Bilah ini tidak lagi hanya logo di tengah: logo ditaruh di kiri, semboyan
 * produk di kanan (layar lebar), dan tepi bawahnya ditutup pita dua warna —
 * violet untuk pintu guru, emerald untuk pintu siswa. Pita yang sama dipakai di
 * tepi atas kaki halaman, jadi halaman terasa dibingkai dua warna peran.
 */
export function AppHeader() {
  return (
    <header id="atas" className="relative z-20 w-full shrink-0 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          aria-label="Class Quest — beranda"
          className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
        >
          <Image
            src="/brand/classquest_logo.png"
            alt="Class Quest"
            width={1809}
            height={428}
            priority
            sizes="(min-width: 640px) 203px, 169px"
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="flex items-center gap-3">
          <p className="hidden font-pixel text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">
            Gamified Formal Learning
          </p>
          <span
            aria-hidden="true"
            className="hidden h-4 w-0.5 bg-slate-200 lg:block"
          />
          <span className="landing-pixel-shadow inline-flex items-center rounded-full border-2 border-slate-900 bg-slate-50 px-2.5 py-1 font-pixel text-[10px] font-bold uppercase tracking-[0.12em] text-slate-800">
            LOGICODIX 2026
          </span>
        </div>
      </div>

      <div aria-hidden="true" className="landing-split-bar h-1" />
    </header>
  );
}
