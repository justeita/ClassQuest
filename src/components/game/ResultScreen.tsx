"use client";

import Link from "next/link";

import type { PlayResult } from "@/story/scoring";

type ResultScreenProps = {
  /** Ringkasan satu kali main dari `scoreStory()`. */
  result: PlayResult;
  /** Status penyimpanan hasil ke tabel `play_results`. */
  statusSimpan?: StatusSimpanHasil;
  /** Mulai ulang cerita tanpa memuat ulang halaman. */
  onMainLagi: () => void;
};

/**
 * Status penyimpanan hasil main. `menyimpan` tampil selagi Server Action
 * berjalan; `gagal` jujur mengatakan hasil belum masuk tabel, tanpa memblokir
 * siswa melihat skornya.
 */
export type StatusSimpanHasil = "menyimpan" | "tersimpan" | "gagal";

const TEKS_SIMPAN: Record<StatusSimpanHasil, string> = {
  menyimpan: "Menyimpan hasil main…",
  tersimpan: "Hasil main tersimpan.",
  gagal: "Hasil main belum tersimpan.",
};

/**
 * Layar hasil (docs/05-frontend/game-player.md → Finished). Tanpa ranking dan
 * tanpa perbandingan dengan siswa lain; nadanya mendorong, bukan menghakimi.
 */
export function ResultScreen({
  result,
  statusSimpan = "menyimpan",
  onMainLagi,
}: ResultScreenProps) {
  const { earnedPoints, totalPoints, correctCount, totalChallenges } = result;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b120e]/90 p-3">
      <section
        aria-labelledby="judul-hasil"
        className="w-full max-w-md border-2 border-[#F7F4EC] bg-[#14201a] p-5 font-sans text-[#F7F4EC] shadow-[4px_4px_0_0_rgba(0,0,0,0.45)]"
      >
        <p className="mb-1 text-[10px] uppercase tracking-widest text-[#8FA396]">
          Cerita selesai
        </p>
        <h2 id="judul-hasil" className="mb-4 text-base leading-snug">
          Perjalanan ini sudah sampai ujung.
        </h2>

        <dl className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <div className="border border-[#3D4B41] p-2">
            <dt className="mb-0.5 text-[10px] uppercase tracking-widest text-[#8FA396]">
              Skor
            </dt>
            <dd className="text-lg font-bold">
              {earnedPoints}
              <span className="text-xs font-normal text-[#8FA396]">
                {" "}
                / {totalPoints}
              </span>
            </dd>
          </div>
          <div className="border border-[#3D4B41] p-2">
            <dt className="mb-0.5 text-[10px] uppercase tracking-widest text-[#8FA396]">
              Jawaban tepat
            </dt>
            <dd className="text-lg font-bold">
              {correctCount}
              <span className="text-xs font-normal text-[#8FA396]">
                {" "}
                / {totalChallenges}
              </span>
            </dd>
          </div>
        </dl>

        {result.weakConcepts.length > 0 ? (
          <div className="mb-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[#8FA396]">
              Untuk diulang
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-[#D9E4DA]">
              {result.weakConcepts.map((concept) => (
                <li key={concept}>Coba ulang bagian ini: {concept}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mb-4 text-xs leading-relaxed text-[#6F9B7A]">
            Semua tantangan kamu jawab tepat. Konsepnya sudah kuat.
          </p>
        )}

        <p
          aria-live="polite"
          className={`mb-4 text-[10px] uppercase tracking-widest ${
            statusSimpan === "tersimpan"
              ? "text-[#6F9B7A]"
              : statusSimpan === "gagal"
                ? "text-[#E8A87C]"
                : "text-[#8FA396]"
          }`}
        >
          {TEKS_SIMPAN[statusSimpan]}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onMainLagi}
            className="flex-1 border-2 border-[#F7F4EC] px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#F7F4EC] hover:text-[#14201a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Main lagi
          </button>
          <Link
            href="/"
            className="flex-1 border-2 border-[#3D4B41] px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#D9E4DA] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]"
          >
            Kembali ke awal
          </Link>
        </div>
      </section>
    </div>
  );
}
