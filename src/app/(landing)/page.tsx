import Link from "next/link";

/**
 * Halaman pengenalan produk di `/`.
 *
 * Halaman pertama yang dibuka juri: satu layar untuk memilih peran. Kartu
 * "Portal Guru" mengarah ke `/guru` (belum masuk → diarahkan ke `/guru/masuk`
 * oleh layout portal), kartu "Arena Siswa" mengarah ke `/game` (demo Phaser).
 *
 * Server Component tanpa data dinamis, sesuai tabel cache di
 * `docs/01-architecture/data-flow.md` (landing statis). Tombol memakai
 * `next/link` supaya perpindahan halaman instan dan tetap jalan tanpa
 * JavaScript; desain asalnya memakai toast + `setTimeout`, yang sengaja
 * dilepas agar perangkat kelas bawah tidak menunggu.
 */

const FITUR_GURU = [
  { ikon: "fa-wand-magic-sparkles", teks: "AI Studio Modul PDF" },
  { ikon: "fa-users-gear", teks: "Manajemen Roster & Kelas" },
  { ikon: "fa-chart-pie", teks: "Pelacakan Nilai & Analitik XP" },
];

const FITUR_SISWA = [
  { ikon: "fa-scroll", teks: "Misi Studi Kasus Interaktif" },
  { ikon: "fa-medal", teks: "Koleksi Lencana & Naik Level" },
  { ikon: "fa-trophy", teks: "Papan Skor (Leaderboard) Kelas" },
];

export default function Home() {
  return (
    <>
      {/* Latar dekoratif: titik halus + dua cahaya lembut di sudut. */}
      <div
        className="landing-dots pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-20 left-10 h-72 w-72 rounded-full bg-guru-100 opacity-60 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-siswa-100 opacity-60 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-20 flex w-full shrink-0 items-center justify-center border-b-2 border-slate-900 bg-white px-6 py-3 shadow-sm">
        <div className="flex select-none items-center gap-2.5 sm:gap-3.5">
          <div className="flex h-9 w-9 shrink-0 -rotate-2 items-center justify-center rounded-xl border-2 border-slate-900 bg-guru-600 font-pixel text-lg text-white shadow-[2px_2px_0px_#0f172a]">
            <i className="fa-solid fa-gamepad" aria-hidden="true" />
          </div>

          <span className="font-pixel text-2xl font-bold tracking-wider text-slate-900 sm:text-3xl">
            Class Quest
          </span>

          <span className="shrink-0 rounded-lg border-2 border-slate-900 bg-slate-100 px-2 py-0.5 font-pixel text-[10px] font-bold tracking-wider text-slate-700 shadow-[2px_2px_0px_#0f172a] sm:text-xs">
            EDU-OS v2.4
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-5 max-w-2xl space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-0.5 font-pixel text-[11px] font-bold tracking-wide text-slate-800 shadow-[2px_2px_0px_#0f172a]">
            <i
              className="fa-solid fa-wand-magic-sparkles text-guru-600"
              aria-hidden="true"
            />{" "}
            PORTAL PEMBELAJARAN
          </div>

          <h1 className="text-2xl font-heading font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Pilih Peran &{" "}
            <span className="bg-gradient-to-r from-guru-600 to-siswa-600 bg-clip-text font-pixel text-transparent">
              Mulai Petualangan!
            </span>
          </h1>

          <p className="mx-auto max-w-lg text-xs text-slate-600 sm:text-sm">
            Masuk sebagai <b>Guru</b> untuk menyusun silabus &amp; AI Studio,
            atau sebagai <b>Siswa</b> untuk menyelesaikan quest akademik dan
            mengumpulkan XP.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
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
                <span className="font-pixel text-[10px] font-bold uppercase text-slate-400">
                  Pendidik
                </span>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-guru-50 text-xl text-guru-700 shadow-[2px_2px_0px_#0f172a] transition group-hover:rotate-3">
                  <i
                    className="fa-solid fa-chalkboard-user"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 transition group-hover:text-guru-700 sm:text-xl">
                    Portal Guru
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    Studio Modul &amp; AI Engine
                  </p>
                </div>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                Kelola bahan ajar formal, sintesis dokumen PDF menjadi skenario
                studi kasus interaktif, dan pantau kemajuan kelas.
              </p>

              <div className="mb-5 space-y-2">
                {FITUR_GURU.map((fitur) => (
                  <div
                    key={fitur.teks}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <i
                      className={`fa-solid ${fitur.ikon} text-[11px] text-guru-600`}
                      aria-hidden="true"
                    />
                    <span>{fitur.teks}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/guru"
              className="landing-btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-guru-600 px-4 py-3 font-pixel text-xs font-bold text-white hover:bg-guru-700 sm:text-sm"
            >
              <span>MASUK SEBAGAI GURU</span>
              <i
                className="fa-solid fa-arrow-right text-xs"
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
                <span className="font-pixel text-[10px] font-bold uppercase text-slate-400">
                  Peserta Didik
                </span>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-siswa-50 text-xl text-siswa-700 shadow-[2px_2px_0px_#0f172a] transition group-hover:-rotate-3">
                  <i className="fa-solid fa-gamepad" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 transition group-hover:text-siswa-700 sm:text-xl">
                    Arena Siswa
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    Ruang Quest &amp; Ujian Interaktif
                  </p>
                </div>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-slate-600">
                Akses ruang kelas dengan token belajar, selesaikan studi kasus
                seru, raih XP, dan duduki papan peringkat!
              </p>

              <div className="mb-5 space-y-2">
                {FITUR_SISWA.map((fitur) => (
                  <div
                    key={fitur.teks}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <i
                      className={`fa-solid ${fitur.ikon} text-[11px] text-siswa-600`}
                      aria-hidden="true"
                    />
                    <span>{fitur.teks}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/game"
              className="landing-btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-siswa-600 px-4 py-3 font-pixel text-xs font-bold text-white hover:bg-siswa-700 sm:text-sm"
            >
              <span>MASUK SEBAGAI SISWA</span>
              <i
                className="fa-solid fa-arrow-right text-xs"
                aria-hidden="true"
              />
            </Link>
          </article>
        </div>
      </main>

      <footer className="relative z-20 w-full shrink-0 border-t-2 border-slate-900 bg-white px-6 py-3 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p>
            © 2026 <b className="text-slate-800">Class Quest Engine</b>.
            Gamified Formal Learning System.
          </p>
          <div className="flex items-center gap-4 font-medium text-slate-600">
            <span>Panduan</span>
            <span aria-hidden="true">•</span>
            <span>Pusat Bantuan</span>
          </div>
        </div>
      </footer>
    </>
  );
}
