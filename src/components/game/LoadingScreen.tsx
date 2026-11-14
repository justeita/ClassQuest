"use client";

import { useEffect, useState } from "react";

import type { Story } from "@/story/schema";

type LoadingScreenProps = {
  /** Cerita yang sedang dimuat; judulnya ditampilkan sebagai konteks. */
  story: Story;
  /**
   * Progres aset 0–1 dari Phaser. `null` berarti skrip game belum siap, jadi
   * bilah memakai keadaan tak tentu (menyapu), bukan angka palsu.
   */
  progress: number | null;
  /** Scene pertama sudah dibangun; layar memudar lalu melepas diri. */
  selesai: boolean;
  /** Phaser gagal dimuat: tampilkan jalan keluar, jangan berputar selamanya. */
  gagal?: boolean;
  /** Kembali ke layar sebelumnya (menu utama, sama di `/demo` dan `/play`). */
  onBatal: () => void;
  /** Muat ulang Phaser tanpa berpindah layar. */
  onCobaLagi?: () => void;
};

/**
 * Bintang latar. Nilainya ditulis tetap (bukan `Math.random()`) supaya render
 * server dan client sama — bintang acak memicu hydration mismatch.
 */
const BINTANG = [
  { kiri: 6, atas: 14, ukuran: 2, jeda: 0, durasi: 3.4 },
  { kiri: 13, atas: 32, ukuran: 1, jeda: 1.2, durasi: 4.1 },
  { kiri: 18, atas: 9, ukuran: 2, jeda: 2.4, durasi: 3.7 },
  { kiri: 24, atas: 24, ukuran: 1, jeda: 0.6, durasi: 4.6 },
  { kiri: 31, atas: 12, ukuran: 2, jeda: 3.1, durasi: 3.2 },
  { kiri: 37, atas: 36, ukuran: 1, jeda: 1.8, durasi: 4.2 },
  { kiri: 44, atas: 19, ukuran: 2, jeda: 2.9, durasi: 3.9 },
  { kiri: 51, atas: 30, ukuran: 1, jeda: 0.3, durasi: 4.4 },
  { kiri: 57, atas: 8, ukuran: 2, jeda: 2.1, durasi: 3.5 },
  { kiri: 63, atas: 26, ukuran: 1, jeda: 3.6, durasi: 4.8 },
  { kiri: 70, atas: 16, ukuran: 2, jeda: 1.5, durasi: 3.3 },
  { kiri: 76, atas: 34, ukuran: 1, jeda: 2.7, durasi: 4.5 },
  { kiri: 82, atas: 11, ukuran: 2, jeda: 0.9, durasi: 3.8 },
  { kiri: 88, atas: 29, ukuran: 1, jeda: 3.3, durasi: 4.3 },
  { kiri: 93, atas: 17, ukuran: 2, jeda: 1.1, durasi: 3.6 },
  { kiri: 97, atas: 38, ukuran: 1, jeda: 2.2, durasi: 4.7 },
] as const;

/** Tips singkat, berganti pelan selama aset dimuat. */
const TIPS = [
  "Tekan Q untuk membuka buku quest kapan saja.",
  "Tahan Tab untuk mempercepat dialog.",
  "Klik di mana saja untuk melanjutkan percakapan.",
  "Jawaban salah tidak mengakhiri cerita; kamu bisa mencoba lagi.",
] as const;

/** Jeda sebelum memudar dan sesudahnya, supaya transisi ke dunia tidak patah. */
const JEDA_PUDAR = 320;
const DURASI_PUDAR = 320;

/** Rentang progres dari Phaser; dijaga tetap 0–100 walau nilainya aneh. */
function persenDari(progress: number | null): number {
  if (progress === null || !Number.isFinite(progress)) return 0;
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}

/**
 * Layar muat game (docs/05-frontend/game-player.md → Loading).
 *
 * Dulu progres hanya berupa teks `Memuat… N%` di canvas 640×360 yang di-upscale,
 * jadi hurufnya bergerigi dan tidak bisa dibaca pembaca layar. Sekarang seluruh
 * layar muat hidup di DOM: latar malam pixel, judul cerita, bilah progres
 * bersegmen, dan satu tombol keluar. Latarnya CSS murni (bintang + bukit),
 * tanpa gambar baru, supaya tidak menambah unduhan sebelum game jalan.
 *
 * Tiga keadaan: tak tentu (skrip game belum siap), terukur (persen aset), dan
 * gagal (Phaser tidak bisa dimuat). Yang terakhir sengaja punya tombol, karena
 * layar muat yang berputar selamanya adalah jalan buntu.
 */
export function LoadingScreen({
  story,
  progress,
  selesai,
  gagal = false,
  onBatal,
  onCobaLagi,
}: LoadingScreenProps) {
  const [tip, setTip] = useState(0);
  const [pudar, setPudar] = useState(false);
  const [hilang, setHilang] = useState(false);

  const persen = persenDari(progress);
  const takTentu = !gagal && !selesai && progress === null;

  // Tips berganti hanya selama menunggu; timer berhenti begitu layar pergi.
  useEffect(() => {
    if (gagal || selesai) return;
    const timer = setInterval(
      () => setTip((sebelum) => (sebelum + 1) % TIPS.length),
      5200,
    );
    return () => clearInterval(timer);
  }, [gagal, selesai]);

  // Beri satu ketukan napas sebelum memudar: progres yang sudah 100% dan scene
  // yang baru siap tidak boleh terasa "melompat" ke dunia.
  useEffect(() => {
    if (!selesai || gagal) return;
    const redup = setTimeout(() => setPudar(true), JEDA_PUDAR);
    const lepas = setTimeout(() => setHilang(true), JEDA_PUDAR + DURASI_PUDAR);
    return () => {
      clearTimeout(redup);
      clearTimeout(lepas);
    };
  }, [selesai, gagal]);

  if (hilang) return null;

  const status = selesai
    ? "Siap dimainkan!"
    : takTentu
      ? "Menyiapkan dunia…"
      : persen >= 100
        ? "Menyusun scene pertama…"
        : "Memuat aset desa…";

  return (
    <div
      aria-busy={!selesai && !gagal}
      data-muat={gagal ? "gagal" : selesai ? "selesai" : "memuat"}
      className={`absolute inset-0 z-50 overflow-hidden bg-[#0b120e] font-game text-[#F7F4EC] transition-opacity duration-300 ease-out ${
        pudar ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <LatarMalam />

      <div className="relative flex h-full w-full flex-col items-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center sm:px-8">
        <header className="muat-masuk flex w-full max-w-xl shrink-0 items-center gap-3">
          <span className="font-pixel text-[0.72rem] tracking-[0.24em] text-[#E8A87C] uppercase">
            Class Quest
          </span>
          <span aria-hidden="true" className="muat-garis h-px flex-1" />
          <span className="font-pixel text-[0.72rem] tracking-[0.12em] text-[#8FA396] uppercase">
            {story.chapters.length} bab
          </span>
        </header>

        <div className="muat-masuk my-auto flex w-full max-w-lg flex-col items-center py-4">
          <p className="text-[0.68rem] tracking-[0.3em] text-[#8FA396] uppercase">
            {story.meta.subject} · {story.meta.gradeLevel}
          </p>

          {/* Judul sengaja bukan heading: ini keadaan sementara, dan menu
              utama sudah memegang judul permainan di layar sebelumnya. */}
          <p className="mt-2.5 text-[clamp(1.45rem,5.6vw,2.35rem)] leading-[1.15] text-balance text-[#F7F4EC]">
            {story.meta.title}
          </p>

          <div
            aria-hidden="true"
            className="mt-3 flex items-center gap-2 text-[#C9A227]"
          >
            <i className="muat-garis h-px w-9" />
            <b className="font-pixel text-xs leading-none">✦</b>
            <i className="muat-garis h-px w-9" />
          </div>

          {gagal ? (
            <div className="mt-6 w-full border border-[#6b512b] bg-[#14201a]/85 px-4 py-3 text-left">
              <p
                role="status"
                className="text-[0.85rem] leading-snug text-[#D9E4DA]"
              >
                Game gagal dimuat. Periksa koneksi, lalu coba lagi.
              </p>
              {onCobaLagi && (
                <button
                  type="button"
                  onClick={onCobaLagi}
                  className="mt-3 inline-flex min-h-11 items-center border border-[#E8A87C] bg-[#6b512b] px-4 font-game text-sm tracking-[0.08em] text-[#F7F4EC] uppercase hover:bg-[#7d5f31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
                >
                  Coba lagi
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 w-full">
              <div
                role="progressbar"
                aria-label="Memuat permainan"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={takTentu ? undefined : persen}
                aria-valuetext={takTentu ? undefined : `${persen}%`}
                className="relative h-3.5 w-full overflow-hidden border border-[#3D4C43] bg-[#08130d] p-[3px]"
              >
                {takTentu ? (
                  <div
                    aria-hidden="true"
                    className="muat-sapu h-full w-1/3 bg-gradient-to-r from-[#E8A87C]/30 via-[#DAC173] to-[#E8A87C]/30"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="muat-isi h-full bg-gradient-to-r from-[#E8A87C] to-[#DAC173]"
                    style={{ width: `${persen}%` }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className="muat-segmen absolute inset-0"
                />
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-3">
                <p
                  role="status"
                  className="text-left text-[0.82rem] leading-snug text-[#D9E4DA]"
                >
                  {status}
                </p>
                <p className="font-pixel text-sm tabular-nums text-[#DAC173]">
                  {takTentu ? "··" : `${persen}%`}
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="muat-masuk flex w-full max-w-lg shrink-0 flex-col items-center gap-3">
          {!gagal && (
            <p className="min-h-9 text-[0.8rem] leading-snug text-[#8FA396]">
              {TIPS[tip]}
            </p>
          )}
          <button
            type="button"
            onClick={onBatal}
            className="inline-flex min-h-11 items-center border border-[#3D4C43] bg-[#0b120e]/70 px-5 font-game text-sm tracking-[0.14em] text-[#D9E4DA] uppercase hover:border-[#8FA396] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Batal
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Latar malam: langit bergradasi, bintang berkelip, bulan, dan dua lapis bukit
 * pixel. Semuanya CSS (tanpa berkas gambar) supaya layar muat tidak menunggu
 * unduhan apa pun — termasuk gambarnya sendiri.
 */
function LatarMalam() {
  return (
    <div
      aria-hidden="true"
      className="muat-langit pointer-events-none absolute inset-0 overflow-hidden"
    >
      {BINTANG.map((bintang) => (
        <span
          key={`${bintang.kiri}-${bintang.atas}`}
          className="muat-bintang absolute block bg-[#F4EFE6]"
          style={
            {
              left: `${bintang.kiri}%`,
              top: `${bintang.atas}%`,
              width: `${bintang.ukuran}px`,
              height: `${bintang.ukuran}px`,
              "--muat-jeda": `${bintang.jeda}s`,
              "--muat-durasi": `${bintang.durasi}s`,
            } as React.CSSProperties
          }
        />
      ))}

      <span className="absolute top-[8%] right-[9%] block h-11 w-11 rounded-full bg-[#F4EFE6]/85 shadow-[0_0_52px_16px_rgba(232,168,124,0.16)] sm:h-16 sm:w-16" />

      <div className="muat-bukit-jauh absolute inset-x-0 bottom-0 h-[42%]" />
      <div className="muat-bukit-dekat absolute inset-x-0 bottom-0 h-[27%]" />
    </div>
  );
}
