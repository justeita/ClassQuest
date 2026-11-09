"use client";

import { useState } from "react";

import { GameCanvas } from "@/components/game/GameCanvas";
import { ResultScreen } from "@/components/game/ResultScreen";
import { TitleScreen } from "@/components/game/TitleScreen";
import type { Story } from "@/story/schema";
import type { PlayResult } from "@/story/scoring";

type GameShellProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
};

/** Layar yang dipegang `GameShell`; fase cerita tetap milik Phaser. */
type Layar = "judul" | "main" | "hasil";

/**
 * Shell halaman siswa (docs/05-frontend/game-player.md). Memegang state layar,
 * bukan state cerita: fase permainan dilacak `StoryRunner` di dalam Phaser.
 *
 * `GameCanvas` sengaja baru dipasang setelah "Mulai", jadi Phaser (dan memori
 * kanvasnya) tidak berjalan di belakang layar judul. Key `sesi` memaksa
 * remount saat "Main lagi" supaya cerita dimulai dari awal.
 *
 * Progres `localStorage` belum ada di sini — menyusul bersama sinkronisasi
 * `storyVersion` dengan tim backend.
 */
export function GameShell({ story }: GameShellProps) {
  const [layar, setLayar] = useState<Layar>("judul");
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  const [sesi, setSesi] = useState(0);

  function mulai() {
    setHasil(null);
    setLayar("main");
  }

  function selesai(result: PlayResult) {
    setHasil(result);
    setLayar("hasil");
  }

  function mainLagi() {
    setHasil(null);
    setSesi((nilai) => nilai + 1);
    setLayar("main");
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layar === "judul" ? (
        <TitleScreen story={story} onStart={mulai} />
      ) : (
        <GameCanvas key={sesi} story={story} onFinished={selesai} />
      )}
      {layar === "hasil" && hasil && (
        <ResultScreen result={hasil} onMainLagi={mainLagi} />
      )}
    </div>
  );
}
