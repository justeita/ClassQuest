import type { Metadata } from "next";

import { LoginForm } from "@/components/guru/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
};

/**
 * Halaman masuk guru (`/guru/masuk`).
 *
 * Panel kiri statis — identitas produk dan ilustrasi dunia quest. Form-nya ada
 * di `LoginForm` karena butuh state; lihat catatan di sana soal wiring auth.
 */
export default function MasukPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-[#e2e8f0] lg:flex-row lg:overflow-hidden">
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
          <clipPath id="guruWaveMobile" clipPathUnits="objectBoundingBox">
            <path d="M 0,0 L 1,0 L 1,0.90 C 0.75,0.99 0.50,0.85 0.25,0.96 C 0.12,1.01 0.05,0.95 0,0.92 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="guru-wave-clip relative flex w-full shrink-0 flex-col justify-between gap-6 overflow-hidden bg-gradient-to-br from-indigo-900 via-brand-900 to-slate-900 p-8 pb-20 shadow-2xl sm:p-12 sm:pb-24 lg:h-screen lg:w-7/12 lg:p-12 lg:pb-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-10 [background-size:16px_16px]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 font-pixel text-xl text-slate-900 shadow-[3px_3px_0px_#000]">
            <i className="fa-solid fa-gamepad" aria-hidden />
          </div>
          <div>
            <h2 className="font-pixel text-lg tracking-wider text-white">
              CLASS QUEST
            </h2>
            <p className="text-xs font-semibold tracking-wide text-amber-300">
              GAMIFIED TEACHER STUDIO
            </p>
          </div>
        </div>

        <div className="guru-enter relative z-10 my-auto max-w-lg space-y-6 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-amber-300">
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />{" "}
            Transformasi Silabus Menjadi Misi Game
          </div>

          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Jelajahi Dunia Pembelajaran Interaktif.
          </h1>

          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Sistem manajemen kelas berbasis gamifikasi semi-formal. Ubah bahan
            ajar PDF menjadi petualangan belajar yang memotivasi siswa dengan
            pelacakan XP, lencana pencapaian, dan kuis HOTS yang menyenangkan.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Quest Level
              </div>
              <div className="mt-0.5 font-pixel text-lg text-amber-400">
                LVL. 99
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Active Students
              </div>
              <div className="mt-0.5 font-pixel text-lg text-emerald-400">
                120+
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                AI Synthesizer
              </div>
              <div className="mt-0.5 font-pixel text-lg text-cyan-400">
                READY
              </div>
            </div>
          </div>
        </div>

        <div className="guru-fade relative z-10 flex items-center justify-between gap-4 border-t border-slate-800 pt-4 pr-6 text-xs text-slate-400 sm:pr-10">
          <span>© 2026 Class Quest Studio Engine</span>
          <span className="flex shrink-0 items-center gap-1.5 font-semibold text-emerald-400">
            <i
              className="fa-solid fa-circle animate-pulse motion-reduce:animate-none text-[8px]"
              aria-hidden
            />{" "}
            Server Active
          </span>
        </div>
      </div>

      <LoginForm />
    </div>
  );
}
