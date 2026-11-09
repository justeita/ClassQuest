"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Story } from "@/story/schema";

type TitleScreenProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
  /** Dipanggil saat siswa memilih "Mulai"; Phaser baru dinyalakan setelahnya. */
  onStart: () => void;
};

/** Urutan fokus menu, dipakai panah atas/bawah. */
const MENU_COUNT = 3;

/**
 * Layar judul (docs/05-frontend/game-player.md → Ready / judul).
 *
 * Sengaja hanya memakai aset yang sudah ada: `bg_mountain_night` dan sprite
 * pemain dari `story.cast`. Tidak ada state permainan di sini — komponen ini
 * hanya menampilkan ringkasan cerita dan menyerahkan kontrol ke `GameShell`.
 *
 * "Lanjutkan" belum ditampilkan karena progres `localStorage` belum ada, dan
 * tombol suara menyusul bersama HUD. `Esc` juga belum diiklankan di panel
 * kontrol karena baru aktif setelah menu jeda dibuat.
 */
export function TitleScreen({ story, onStart }: TitleScreenProps) {
  const { meta, cast, chapters } = story;
  const [aktif, setAktif] = useState(0);
  const [bukaKontrol, setBukaKontrol] = useState(false);
  const menuRefs = useRef<Array<HTMLElement | null>>([]);

  const pemain = cast.find((karakter) => karakter.role === "player") ?? cast[0];
  const spritePemain = pemain
    ? `/assets/char/${pemain.spriteId.replace(/^char_/, "")}.png`
    : null;

  // Fokus awal ke "Mulai" supaya layar judul bisa dimainkan tanpa mouse.
  useEffect(() => {
    menuRefs.current[0]?.focus({ preventScroll: true });
  }, []);

  function pindahkanFokus(arah: 1 | -1) {
    const berikut = (aktif + arah + MENU_COUNT) % MENU_COUNT;
    setAktif(berikut);
    menuRefs.current[berikut]?.focus({ preventScroll: true });
  }

  function tanganiTombol(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      pindahkanFokus(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      pindahkanFokus(-1);
    }
  }

  const kelasMenu = (indeks: number) =>
    [
      "w-full border-2 px-4 py-2 text-left text-xs font-bold uppercase tracking-[0.2em] transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]",
      indeks === aktif
        ? "border-[#E8A87C] bg-[#E8A87C] text-[#14201a]"
        : "border-[#3D4B41] text-[#F7F4EC] hover:border-[#8FA396]",
    ].join(" ");

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#14201a] bg-cover bg-center"
      style={{
        backgroundImage: "url(/assets/bg/mountain_night.png)",
        imageRendering: "pixelated",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b120e]/95 via-[#14201a]/85 to-[#14201a]/30" />

      <div className="relative flex h-full w-full flex-col justify-between gap-4 overflow-y-auto p-4 font-mono text-[#F7F4EC] sm:p-6">
        <header className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8A87C]">
            ClassQuest
          </p>
          <h1 className="mt-2 text-xl leading-tight sm:text-2xl">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-[#D9E4DA]">
            {meta.synopsis}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
            <li className="border border-[#3D4B41] px-2 py-1 text-[#D9E4DA]">
              {meta.subject}
            </li>
            <li className="border border-[#3D4B41] px-2 py-1 text-[#D9E4DA]">
              {meta.gradeLevel}
            </li>
            <li className="border border-[#3D4B41] px-2 py-1 text-[#D9E4DA]">
              {chapters.length} chapter
            </li>
            <li className="border border-[#3D4B41] px-2 py-1 text-[#D9E4DA]">
              ± {meta.estimatedMinutes} menit
            </li>
          </ul>
        </header>

        <div className="flex items-end justify-between gap-4">
          <div className="w-full max-w-xs">
            <nav aria-label="Menu utama" onKeyDown={tanganiTombol}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#8FA396]">
                Menu
              </p>
              <ul className="space-y-2">
                <li>
                  <button
                    ref={(el) => {
                      menuRefs.current[0] = el;
                    }}
                    type="button"
                    onClick={onStart}
                    onFocus={() => setAktif(0)}
                    className={kelasMenu(0)}
                  >
                    Mulai
                  </button>
                </li>
                <li>
                  <button
                    ref={(el) => {
                      menuRefs.current[1] = el;
                    }}
                    type="button"
                    aria-expanded={bukaKontrol}
                    aria-controls="kontrol-permainan"
                    onClick={() => setBukaKontrol((nilai) => !nilai)}
                    onFocus={() => setAktif(1)}
                    className={kelasMenu(1)}
                  >
                    Kontrol
                  </button>
                </li>
                <li>
                  <Link
                    ref={(el) => {
                      menuRefs.current[2] = el;
                    }}
                    href="/"
                    onFocus={() => setAktif(2)}
                    className={`block ${kelasMenu(2)}`}
                  >
                    Kembali
                  </Link>
                </li>
              </ul>
            </nav>

            <div
              id="kontrol-permainan"
              aria-label="Kontrol permainan"
              hidden={!bukaKontrol}
              className="mt-3 border border-[#3D4B41] bg-[#0b120e]/80 p-3 text-[11px] leading-relaxed text-[#D9E4DA]"
            >
              <p>Klik atau tekan Enter untuk melanjutkan cerita.</p>
              <p className="mt-1">
                Panah atas dan bawah memilih menu. Enter menjalankan pilihan.
              </p>
              <p className="mt-1">
                Saat tantangan muncul, pilih jawaban dengan tombol di layar.
              </p>
            </div>

            <p className="mt-3 text-[10px] uppercase tracking-widest text-[#8FA396]">
              Panah atas/bawah · Enter untuk memilih
            </p>
          </div>

          {spritePemain && (
            <div aria-hidden className="hidden shrink-0 md:block">
              <div className="flex h-40 w-28 items-end justify-center border border-[#E8A87C]/40 bg-[#0b120e]/70">
                <div
                  className="mb-2 h-36 w-24"
                  style={{
                    backgroundImage: `url(${spritePemain})`,
                    backgroundSize: "200% 100%",
                    backgroundPosition: "left center",
                    backgroundRepeat: "no-repeat",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
