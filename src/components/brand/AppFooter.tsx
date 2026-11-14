import Image from "next/image";
import Link from "next/link";

/**
 * Tautan dokumen legal. Ditempatkan di kaki halaman supaya keempat dokumen
 * terjangkau dari halaman mana pun yang memakai `AppFooter` (`/`, 404, dan
 * halaman legal sendiri), tanpa menambah menu di kepala halaman.
 *
 * Nama tautan sengaja berbeda dari tautan peran: dokumen ini bukan pintu masuk
 * kedua ke `/guru` atau `/demo`, dan namanya unik supaya tes `getByRole` di
 * halaman 404 tidak ambigu.
 */
const TAUTAN_LEGAL = [
  { href: "/privasi", label: "Kebijakan Privasi" },
  { href: "/syarat", label: "Syarat & Ketentuan" },
  { href: "/penafian", label: "Penafian" },
  { href: "/cookie", label: "Cookie" },
] as const;

/**
 * Kaki halaman bertema halaman peran (`/`).
 *
 * Dipakai halaman pemilihan peran dan halaman 404 global. Sama seperti
 * `AppHeader`: satu sumber markah supaya kedua halaman tidak perlahan berbeda.
 *
 * Kaki halaman sengaja dibuat gelap (`slate-900`), memakai warna panel yang sama
 * dengan kotak dialog game: halaman yang isinya putih butuh penutup yang tegas,
 * dan bilah tipis abu-abu sebelumnya terasa menggantung. Tepi atasnya memakai
 * pita dua warna yang sama dengan tepi bawah kepala halaman (violet guru,
 * emerald siswa), jadi kedua ujung halaman terbaca sebagai satu bingkai.
 *
 * Isinya hanya keterangan yang benar: nama produk, semboyan, penyelenggara
 * kompetisi, dan hak cipta. Tautan peran sengaja tidak diulang di sini — kartu
 * peran di badan halaman sudah jadi jalan masuknya, dan tautan kembar membuat
 * halaman 404 punya dua tautan bernama sama.
 */
export function AppFooter() {
  return (
    <footer className="relative z-20 w-full shrink-0 overflow-hidden bg-slate-900 text-slate-400">
      <div aria-hidden="true" className="landing-split-bar h-1" />
      <div
        aria-hidden="true"
        className="landing-footer-dots pointer-events-none absolute inset-0"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-3.5 pt-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            {/* Ikon brand (buku + bintang), bukan logo penuh: logo penuh sudah
                ada di kepala halaman, dan mengulanginya di sini membuat kaki
                halaman terasa seperti salinan kepala halaman. */}
            <Image
              src="/brand/classquest_icon.png"
              alt=""
              width={430}
              height={430}
              sizes="40px"
              className="h-10 w-10 shrink-0"
            />
            <div>
              <p className="font-heading text-sm font-extrabold tracking-tight text-white">
                Class Quest
              </p>
              <p className="mt-0.5 text-xs leading-relaxed">
                Materi pelajaran jadi game pixel.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-col sm:items-end sm:gap-y-0.5 sm:text-right">
            <p className="font-pixel text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
              LOGICODIX 2026
            </p>
            <span aria-hidden="true" className="text-slate-600 sm:hidden">
              /
            </span>
            <p className="text-xs">Smart &amp; Fun Education</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs">
          <nav
            aria-label="Tautan legal"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-start"
          >
            {TAUTAN_LEGAL.map((tautan) => (
              <Link
                key={tautan.href}
                href={tautan.href}
                className="inline-flex min-h-11 items-center text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
              >
                {tautan.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center sm:text-left">
              © 2026{" "}
              <b className="font-semibold text-slate-200">Class Quest Engine</b>
              . Gamified Formal Learning System.
            </p>

            {/* `#atas` menunjuk `id` pada `AppHeader`, jadi tautan ini bekerja di
                semua halaman yang memakai kaki halaman ini. */}
            <a
              href="#atas"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 font-semibold text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 sm:justify-end"
            >
              Kembali ke atas
              <i
                className="fa-solid fa-arrow-up text-[10px]"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
