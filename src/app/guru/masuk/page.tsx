import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/guru/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
};

/**
 * Empat langkah produk. Teksnya sengaja sama dengan kartu alur di halaman `/`
 * (`src/app/(landing)/page.tsx`) supaya pintu guru dan halaman peran tidak
 * bercerita berbeda. Hanya yang benar-benar ada di MVP yang disebut — lihat
 * `docs/00-product/mvp-scope.md`.
 */
const LANGKAH = [
  {
    ikon: "fa-file-pdf",
    judul: "Unggah PDF",
    teks: "Materi yang sudah Anda pakai di kelas.",
  },
  {
    ikon: "fa-wand-magic-sparkles",
    judul: "AI menyusun cerita",
    teks: "Dipecah jadi bab, adegan, dan soal sesuai materi.",
  },
  {
    ikon: "fa-pen-to-square",
    judul: "Guru menyunting",
    teks: "Teks dan soal diperiksa sebelum diterbitkan.",
  },
  {
    ikon: "fa-gamepad",
    judul: "Siswa bermain",
    teks: "Satu tautan, langsung main sampai layar hasil.",
  },
] as const;

/**
 * Halaman masuk guru (`/guru/masuk`).
 *
 * Panel kiri statis — identitas brand dan empat langkah alur produk, memakai
 * palet dan kartu pixel yang sama dengan landing (`/`) dan portal (`/guru/*`).
 * Form-nya ada di `LoginForm` karena butuh state; lihat catatan di sana soal
 * wiring auth.
 *
 * Di layar lebar halaman dikunci setinggi viewport (tanpa scroll). Supaya tetap
 * proporsional saat peramban di-zoom (yang mengecilkan viewport CSS), jarak dan
 * ukuran kunci memakai variabel lentur `--masuk-*` dari `globals.css`.
 *
 * Lengkungan pemisah panel dipasang di lapisan latar terpisah, **bukan** pada
 * `<aside>` yang memuat konten: `clip-path` memotong seluruh keturunan elemen,
 * jadi kalau dipasang di `<aside>` isi panel bisa terpotong saat di-zoom.
 *
 * Sengaja tidak menampilkan statistik hiasan (XP, lencana, jumlah siswa) yang
 * belum ada di produk: itu bertentangan dengan `docs/00-product/mvp-scope.md`
 * dan aturan copy di `docs/05-frontend/ui-conventions.md`.
 */
export default function MasukPage() {
  return (
    <div className="guru-masuk flex min-h-[100dvh] w-full flex-col bg-slate-100 lg:h-[100dvh] lg:min-h-0 lg:flex-row">
      {/* Lengkungan pemisah panel; dipakai `.guru-wave-clip` di globals.css. */}
      <svg
        className="absolute h-0 w-0 overflow-hidden"
        aria-hidden
        focusable="false"
      >
        <defs>
          <clipPath id="guruWaveDesktop" clipPathUnits="objectBoundingBox">
            <path d="M 0,0 L 0.94,0 C 0.98,0.12 0.91,0.24 0.94,0.36 C 0.98,0.48 0.91,0.60 0.95,0.72 C 0.99,0.84 0.92,0.94 0.95,1 L 0,1 Z" />
          </clipPath>
        </defs>
      </svg>

      <aside className="relative flex w-full shrink-0 flex-col lg:min-h-0 lg:w-7/12">
        {/* Latar putih berlengkung + cahaya sudut. Dipisah dari konten supaya
            `clip-path` hanya memotong latar, bukan isi panel. */}
        <div
          aria-hidden
          className="guru-wave-clip pointer-events-none absolute inset-0 overflow-hidden bg-white"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-100 opacity-70 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-100 opacity-60 blur-3xl" />
        </div>

        {/* Jarak dan ukuran memakai variabel lentur (`--masuk-*`) agar panel
            tetap muat satu layar saat di-zoom. Lihat globals.css. */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between gap-6 p-6 pb-10 sm:p-10 sm:pb-12 lg:gap-[var(--masuk-gap)] lg:overflow-y-auto lg:p-[var(--masuk-pad)]">
          <div className="guru-enter flex items-center justify-between gap-4">
            <Link
              href="/"
              aria-label="Class Quest — beranda"
              className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
            >
              <Image
                src="/brand/classquest_logo.png"
                alt="Class Quest"
                width={1809}
                height={428}
                priority
                sizes="(min-width: 640px) 203px, 169px"
                className="h-9 w-auto sm:h-10 lg:h-[var(--masuk-logo)]"
              />
            </Link>

            <span className="rounded-full border-2 border-slate-900 bg-white px-2.5 py-1 font-pixel text-[10px] font-bold uppercase tracking-[0.12em] text-slate-800 shadow-[2px_2px_0px_#0f172a]">
              LOGICODIX 2026
            </span>
          </div>

          <div className="guru-enter my-auto max-w-xl space-y-5 lg:space-y-[var(--masuk-stack)]">
            <div className="flex items-center gap-3">
              {/* Potret karakter yang sama dipakai game; ikon generik membuat
                  halaman ini terasa seperti dasbor biasa. Aset ini sudah ada di
                  `public/assets/` dan dipakai landing, bukan aset manifest baru. */}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-brand-50 shadow-[2px_2px_0px_#0f172a]">
                <Image
                  src="/assets/portrait/pak_bima.png"
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full"
                  style={{ imageRendering: "pixelated" }}
                />
              </span>
              <p className="font-pixel text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
                Portal Guru
              </p>
            </div>

            <h1 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-[length:var(--masuk-judul)]">
              Ubah materi pelajaran jadi{" "}
              <span className="text-brand-600">game</span> yang bisa dimainkan.
            </h1>

            <p className="text-sm leading-relaxed text-slate-600">
              Unggah PDF materi yang sudah Anda pakai di kelas. ClassQuest
              menyusun kerangka cerita dan soal, lalu Anda periksa dan sunting
              sebelum dibagikan ke siswa.
            </p>

            <ol className="grid gap-2.5 sm:grid-cols-2 xl:gap-3">
              {LANGKAH.map((langkah) => (
                <li
                  key={langkah.judul}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-3.5 shadow-[3px_3px_0px_#cbd5e1] lg:p-[var(--masuk-kartupad)]"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-900 bg-brand-50 text-sm text-brand-700 shadow-[2px_2px_0px_#0f172a] lg:h-[var(--masuk-ikon)] lg:w-[var(--masuk-ikon)]"
                    aria-hidden
                  >
                    <i className={`fa-solid ${langkah.ikon}`} />
                  </span>
                  <p className="mt-2.5 text-xs font-bold text-slate-900 xl:mt-3">
                    {langkah.judul}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {langkah.teks}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="guru-fade flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500 lg:pt-[var(--masuk-kakipad)]">
            <span>© 2026 Class Quest</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" aria-hidden />
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </aside>

      <LoginForm />
    </div>
  );
}
