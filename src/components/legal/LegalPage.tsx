import Link from "next/link";
import type { ReactNode } from "react";

import { AppFooter } from "@/components/brand/AppFooter";
import { AppHeader } from "@/components/brand/AppHeader";
import { LegalNav, type LegalKey } from "@/components/legal/LegalNav";
import { LegalPrintButton } from "@/components/legal/LegalPrintButton";

/**
 * Kerangka bersama empat dokumen legal (`/privasi`, `/syarat`, `/penafian`,
 * `/cookie`).
 *
 * Desain asalnya satu halaman dengan sub-tab yang diubah JavaScript. Di sini
 * dokumen dipecah menjadi route sendiri, jadi isi yang tadinya `hidden`
 * sekarang dirender per halaman dan bisa ditautkan langsung.
 *
 * Yang dijaga komponen ini:
 * - kepala/kaki halaman dan navigasi dokumen selalu sama;
 * - penanda halaman aktif memakai `aria-current`, bukan warna saja;
 * - isi dokumen hanya menyebut perilaku aplikasi yang benar-benar ada
 *   (`docs/00-product/mvp-scope.md`). Fitur backlog tidak boleh muncul sebagai
 *   janji, termasuk di teks legal.
 */

export type LegalTone = "guru" | "siswa" | "netral";

type LegalSection = {
  judul: string;
  isi: ReactNode;
};

type LegalNotice = {
  ikon: string;
  judul: string;
  isi: ReactNode;
};

export type LegalPageProps = {
  aktif: LegalKey;
  tone?: LegalTone;
  badge: string;
  judul: string;
  ringkasan: string;
  notifikasi: LegalNotice;
  bagian: LegalSection[];
  diperbarui?: string;
};

const NADA: Record<LegalTone, { kotak: string; ikon: string; chip: string }> = {
  guru: {
    kotak: "border-guru-200 bg-guru-50 text-guru-900",
    ikon: "text-guru-700",
    chip: "border-guru-200 bg-guru-100 text-guru-800",
  },
  siswa: {
    kotak: "border-siswa-200 bg-siswa-50 text-siswa-900",
    ikon: "text-siswa-700",
    chip: "border-siswa-200 bg-siswa-100 text-siswa-800",
  },
  netral: {
    kotak: "border-slate-300 bg-slate-100 text-slate-800",
    ikon: "text-slate-700",
    chip: "border-slate-300 bg-slate-100 text-slate-800",
  },
};

export function LegalPage({
  aktif,
  tone = "netral",
  badge,
  judul,
  ringkasan,
  notifikasi,
  bagian,
  diperbarui = "13 November 2026",
}: LegalPageProps) {
  const nada = NADA[tone];

  return (
    <>
      <AppHeader />

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 font-pixel text-xs font-bold uppercase tracking-wide text-slate-600 transition hover:text-guru-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guru-700"
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Beranda
          </Link>
          <LegalPrintButton />
        </div>

        <LegalNav aktif={aktif} className="mt-3" />

        <article className="landing-pixel-card mt-5 rounded-3xl bg-white p-6 sm:p-9">
          <header>
            <span
              className={`inline-flex items-center rounded border px-2.5 py-0.5 font-pixel text-[10px] font-bold ${nada.chip}`}
            >
              {badge}
            </span>
            <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {judul}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {ringkasan}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Terakhir diperbarui {diperbarui}.
            </p>
          </header>

          <div
            className={`mt-5 rounded-2xl border-2 p-3.5 text-xs font-medium leading-relaxed ${nada.kotak}`}
          >
            <i
              className={`fa-solid ${notifikasi.ikon} mr-1 ${nada.ikon}`}
              aria-hidden="true"
            />
            <b>{notifikasi.judul}</b> {notifikasi.isi}
          </div>

          <div className="mt-6 space-y-4">
            {bagian.map((section) => (
              <section
                key={section.judul}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <h2 className="font-heading text-sm font-bold text-slate-900">
                  {section.judul}
                </h2>
                <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-slate-600">
                  {section.isi}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-6 flex flex-col gap-2 border-t-2 border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5">
              <i
                className="fa-solid fa-shield-halved text-guru-600"
                aria-hidden="true"
              />
              Class Quest · LOGICODIX 2026
            </span>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-pixel font-bold text-guru-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guru-700"
            >
              KEMBALI KE BERANDA &rarr;
            </Link>
          </footer>
        </article>
      </main>

      <AppFooter />
    </>
  );
}
