import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppFooter } from "@/components/brand/AppFooter";
import { AppHeader } from "@/components/brand/AppHeader";
import { GamePreview } from "@/components/landing/GamePreview";

/**
 * Halaman pengenalan produk di `/`.
 *
 * Halaman pertama yang dibuka juri, jadi urutannya mengikuti pertanyaan yang
 * muncul berurutan: "ini apa?" (hero + jendela game), "bagaimana caranya?"
 * (empat langkah), lalu "saya masuk sebagai siapa?" (dua kartu peran).
 *
 * Kartu "Portal Guru" mengarah ke `/guru` (belum masuk → diarahkan ke
 * `/guru/masuk` oleh layout portal), kartu "Arena Siswa" mengarah ke `/play`
 * (gerbang kode kelas; demo Phaser tetap di `/demo`).
 *
 * Server Component tanpa data dinamis, sesuai tabel cache di
 * `docs/01-architecture/data-flow.md` (landing statis). Tombol memakai
 * `next/link` supaya perpindahan halaman instan dan tetap jalan tanpa
 * JavaScript; desain asalnya memakai toast + `setTimeout`, yang sengaja
 * dilepas agar perangkat kelas bawah tidak menunggu.
 *
 * Isi kartu hanya menyebut yang benar-benar ada di aplikasi ini. Fitur yang
 * masih backlog (leaderboard, lencana, token kelas) tidak dijanjikan di sini —
 * lihat `docs/00-product/mvp-scope.md`.
 */

/** Empat langkah produk, sesuai diagram alur di `docs/README.md`. */
const LANGKAH = [
  {
    nomor: "01",
    ikon: "fa-file-pdf",
    judul: "Unggah PDF",
    teks: "Guru memilih materi yang sudah dipakai di kelas.",
  },
  {
    nomor: "02",
    ikon: "fa-wand-magic-sparkles",
    judul: "AI menyusun cerita",
    teks: "Materi dibaca per halaman, lalu dipecah jadi bab dan adegan.",
  },
  {
    nomor: "03",
    ikon: "fa-pen-to-square",
    judul: "Guru menyunting",
    teks: "Teks dan soal diperiksa dulu sebelum diterbitkan.",
  },
  {
    nomor: "04",
    ikon: "fa-gamepad",
    judul: "Siswa bermain",
    teks: "Satu tautan, langsung main sampai layar hasil.",
  },
] as const;

const FITUR_GURU = [
  { ikon: "fa-wand-magic-sparkles", teks: "AI Studio dari modul PDF" },
  { ikon: "fa-users-gear", teks: "Daftar kelas dan siswa" },
  { ikon: "fa-chart-simple", teks: "Ringkasan hasil tiap sesi" },
];

const FITUR_SISWA = [
  { ikon: "fa-scroll", teks: "Cerita dengan soal di dalam adegan" },
  { ikon: "fa-heart-pulse", teks: "Jawaban dinilai saat itu juga" },
  { ikon: "fa-medal", teks: "Layar hasil berisi skor dan konsep" },
];

/**
 * Label kecil di atas judul bagian. Dua garis pendek di kiri-kanan membuatnya
 * terbaca sebagai pemisah bagian, bukan paragraf biasa — ukuran 12 px dengan
 * jarak huruf lebar sendirian terlihat seperti sisa teks.
 */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 font-pixel text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
      <span
        aria-hidden="true"
        className="h-0.5 w-5 rounded-full bg-slate-300"
      />
      {children}
      <span
        aria-hidden="true"
        className="h-0.5 w-5 rounded-full bg-slate-300"
      />
    </p>
  );
}

export default function Home() {
  return (
    <>
      {/* Latar dekoratif: titik halus (dipudarkan ke tepi lewat mask) + dua
          cahaya lembut di sudut. Dikurung `overflow-hidden` supaya cahaya yang
          keluar tepi layar tidak menambah tinggi dokumen — tanpa itu ada ±80 px
          ruang kosong di bawah footer. */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="landing-dots absolute inset-0" />
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-guru-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-guru-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-siswa-100 opacity-50 blur-3xl" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        {/* --- Hero: nilai produk + bukti visual --- */}
        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="text-center lg:text-left">
            <p className="landing-pixel-shadow inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1 font-pixel text-xs font-bold tracking-[0.12em] text-slate-800">
              <i
                className="fa-solid fa-wand-magic-sparkles text-guru-600"
                aria-hidden="true"
              />{" "}
              MATERI PELAJARAN → GAME PIXEL
            </p>

            <h1 className="mt-4 font-heading text-3xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Pilih peran, mulai{" "}
              <span className="bg-gradient-to-r from-guru-700 via-guru-600 to-siswa-700 bg-clip-text font-pixel text-transparent">
                petualanganmu
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 lg:mx-0">
              PDF materi berubah jadi game 2D bergaya cerita: ada suasana,
              dialog, dan soal yang menyatu di dalam adegan. Guru menyiapkan dan
              menyuntingnya; siswa tinggal membuka tautan.
            </p>

            <dl className="mx-auto mt-6 flex max-w-md flex-wrap items-stretch justify-center gap-2 lg:mx-0 lg:justify-start">
              {[
                { nilai: "3–6", label: "bab per cerita" },
                { nilai: "4", label: "tipe soal" },
                { nilai: "3–30", label: "menit per sesi" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-center lg:text-left"
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-pixel text-lg font-bold leading-none text-slate-900">
                      {stat.nilai}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Di layar menengah (md–lg) kolom belum terbelah, jadi cuplikan game
              dibatasi lebarnya supaya tidak memenuhi layar tablet. */}
          <div className="mx-auto w-full max-w-xl lg:max-w-none">
            <GamePreview />
          </div>
        </section>

        {/* --- Cara kerja: empat langkah --- */}
        <section aria-labelledby="cara-kerja" className="mt-12 sm:mt-16">
          <Eyebrow>Alurnya empat langkah</Eyebrow>
          <h2
            id="cara-kerja"
            className="mt-2 text-center font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          >
            Dari PDF jadi game, tanpa menulis kode
          </h2>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map((langkah) => (
              <li
                key={langkah.nomor}
                className="landing-lift relative rounded-xl border border-slate-200 bg-white p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="landing-pixel-shadow flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-900 bg-slate-50 text-sm text-slate-800"
                    aria-hidden="true"
                  >
                    <i className={`fa-solid ${langkah.ikon}`} />
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-pixel text-[11px] font-bold text-slate-500">
                    {langkah.nomor}
                  </span>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-900">
                  {langkah.judul}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {langkah.teks}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* --- Pilih peran --- */}
        <section aria-labelledby="pilih-peran" className="mt-12 sm:mt-16">
          <Eyebrow>Pilih pintu masuk</Eyebrow>
          <h2
            id="pilih-peran"
            className="mt-2 text-center font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          >
            Masuk sebagai siapa?
          </h2>

          <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <article className="landing-pixel-card group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 text-left sm:p-6">
              <div className="absolute inset-x-0 top-0 h-2 bg-guru-600" />

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg border border-guru-200 bg-guru-50 px-2.5 py-0.5 font-pixel text-[10px] font-bold uppercase tracking-wider text-guru-800">
                    <i
                      className="fa-solid fa-hat-wizard mr-1 text-guru-600"
                      aria-hidden="true"
                    />{" "}
                    Game Master
                  </span>
                  <span className="font-pixel text-[11px] font-bold uppercase text-slate-500">
                    Pendidik
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-3">
                  <span className="landing-pixel-shadow flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-guru-50 transition group-hover:rotate-3 motion-reduce:group-hover:rotate-0">
                    {/* Potret karakter yang sama dipakai game; ikon Font Awesome
                        generik membuat halaman ini terasa seperti dasbor biasa. */}
                    <Image
                      src="/assets/portrait/npc_10/neutral.png"
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-cover object-top"
                    />
                  </span>
                  <div>
                    <h2 className="text-lg font-heading font-extrabold text-slate-900 transition group-hover:text-guru-700 sm:text-xl">
                      Portal Guru
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Studio Modul &amp; AI Engine
                    </p>
                  </div>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-slate-600">
                  Unggah modul, biarkan AI menyusun kerangka cerita, lalu
                  perbaiki bagian yang perlu sebelum dibagikan ke kelas.
                </p>

                <ul className="mb-5 space-y-2">
                  {FITUR_GURU.map((fitur) => (
                    <li
                      key={fitur.teks}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-guru-200 bg-guru-50 text-[9px] text-guru-700"
                        aria-hidden="true"
                      >
                        <i className={`fa-solid ${fitur.ikon}`} />
                      </span>
                      <span>{fitur.teks}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/guru"
                className="landing-btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-guru-600 px-4 py-3 font-pixel text-xs font-bold text-white hover:bg-guru-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guru-700 sm:text-sm"
              >
                <span>MASUK SEBAGAI GURU</span>
                <i
                  className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>

            <article className="landing-pixel-card group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 text-left sm:p-6">
              <div className="absolute inset-x-0 top-0 h-2 bg-siswa-600" />

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg border border-siswa-200 bg-siswa-50 px-2.5 py-0.5 font-pixel text-[10px] font-bold uppercase tracking-wider text-siswa-800">
                    <i
                      className="fa-solid fa-shield-halved mr-1 text-siswa-600"
                      aria-hidden="true"
                    />{" "}
                    Adventurer
                  </span>
                  <span className="font-pixel text-[11px] font-bold uppercase text-slate-500">
                    Peserta Didik
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-3">
                  <span className="landing-pixel-shadow flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-siswa-50 transition group-hover:-rotate-3 motion-reduce:group-hover:rotate-0">
                    <Image
                      src="/assets/portrait/mc/neutral.png"
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-cover object-top"
                    />
                  </span>
                  <div>
                    <h2 className="text-lg font-heading font-extrabold text-slate-900 transition group-hover:text-siswa-700 sm:text-xl">
                      Arena Siswa
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Ruang Cerita &amp; Tantangan
                    </p>
                  </div>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-slate-600">
                  Masukkan kode kelas dari gurumu, jelajahi setiap adegan, dan
                  jawab soal yang muncul di tengah cerita — tanpa perlu membuat
                  akun.
                </p>

                <ul className="mb-5 space-y-2">
                  {FITUR_SISWA.map((fitur) => (
                    <li
                      key={fitur.teks}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-siswa-200 bg-siswa-50 text-[9px] text-siswa-700"
                        aria-hidden="true"
                      >
                        <i className={`fa-solid ${fitur.ikon}`} />
                      </span>
                      <span>{fitur.teks}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/play"
                className="landing-btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-siswa-700 px-4 py-3 font-pixel text-xs font-bold text-white hover:bg-siswa-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-siswa-700 sm:text-sm"
              >
                <span>MASUK SEBAGAI SISWA</span>
                <i
                  className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-slate-500">
            Gambar, musik, dan suara disiapkan di awal dan tidak berubah. AI
            hanya menyusun cerita dari aset itu, jadi tampilan tetap konsisten
            dan isinya selalu bisa diperiksa guru.
          </p>
        </section>
      </main>

      <AppFooter />
    </>
  );
}
