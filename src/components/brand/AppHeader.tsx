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
 * terbaca. Tingginya 48 px di ponsel dan 56 px di layar lebih besar — di bawah
 * itu huruf pixel di dalam logo mulai pecah.
 */
export function AppHeader() {
  return (
    <header className="relative z-20 flex w-full shrink-0 items-center justify-center border-b-2 border-slate-900 bg-white px-6 py-2.5 shadow-sm">
      <Link
        href="/"
        aria-label="Class Quest — beranda"
        className="inline-flex items-center"
      >
        <Image
          src="/brand/classquest_logo.png"
          alt="Class Quest"
          width={1809}
          height={428}
          priority
          sizes="(min-width: 640px) 237px, 203px"
          className="h-12 w-auto sm:h-14"
        />
      </Link>
    </header>
  );
}
