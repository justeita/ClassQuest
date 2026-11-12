import Link from "next/link";

import { DEMO_STORY_ID } from "@/game/demoStory";

/**
 * Halaman pengenalan produk di `/`.
 *
 * Ini halaman pertama yang dibuka juri, jadi isinya menjelaskan alur
 * upload → review → main dalam sekali baca dan menyediakan dua pintu masuk:
 * portal guru (`/guru/masuk`) dan game demo (`/play/[storyId]`). Halaman ini
 * Server Component tanpa data dinamis, sesuai tabel cache di
 * `docs/01-architecture/data-flow.md` (landing statis).
 */

const LANGKAH = [
  {
    nomor: "1",
    judul: "Unggah materi",
    isi: "Guru mengunggah PDF pelajaran. Tidak perlu menyusun apa pun dari nol.",
  },
  {
    nomor: "2",
    judul: "AI menyusun cerita",
    isi: "Teks materi diubah menjadi chapter, dialog, dan soal yang menyatu dalam cerita.",
  },
  {
    nomor: "3",
    judul: "Guru meninjau, siswa bermain",
    isi: "Guru memperbaiki isi lalu menerbitkannya. Siswa membuka tautan dan langsung bermain.",
  },
];

const UNGGULAN = [
  "Bisa untuk materi apa pun yang teksnya terbaca, bukan hanya satu mata pelajaran.",
  "Semua keluaran AI bisa dibaca dan diedit guru sebelum sampai ke siswa.",
  "Game berjalan di browser: siswa tidak perlu memasang aplikasi.",
];

export default function Home() {
  return (
    <main className="flex-1 bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
        <header className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-brand-700">
            ClassQuest
          </span>
          <Link
            href="/guru/masuk"
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
          >
            Masuk guru
          </Link>
        </header>

        <section className="mt-14 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Smart &amp; Fun Education
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Materi pelajaran jadi game pixel yang dimainkan siswa
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Guru mengunggah PDF, ClassQuest menyusun cerita dan tantangan dari
            isi materi itu, lalu guru meninjau dan menerbitkannya. Siswa belajar
            lewat alur cerita, bukan hafalan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/guru/masuk"
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-700"
            >
              Masuk sebagai guru
            </Link>
            <Link
              href={`/play/${DEMO_STORY_ID}`}
              className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Coba game demo
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {LANGKAH.map((langkah) => (
            <div
              key={langkah.nomor}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm font-semibold text-brand-700">
                {langkah.nomor}
              </span>
              <h2 className="mt-4 text-base font-semibold text-slate-900">
                {langkah.judul}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {langkah.isi}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl bg-slate-900 p-8 text-slate-100 sm:p-10">
          <h2 className="text-xl font-semibold">
            Kenapa bukan sekadar ringkasan otomatis?
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            {UNGGULAN.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-brand-200">
                  ▸
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-16 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>ClassQuest — proyek Hacking Week LOGICODIX 2026.</p>
          <nav className="flex gap-4">
            <a
              className="transition hover:text-brand-700"
              href="https://github.com/justeita/ClassQuest"
            >
              Repositori
            </a>
            <Link
              className="transition hover:text-brand-700"
              href="/guru/masuk"
            >
              Masuk guru
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
