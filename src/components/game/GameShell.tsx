"use client";

import { useState } from "react";

import { GameCanvas } from "@/components/game/GameCanvas";
import { ResultScreen } from "@/components/game/ResultScreen";
import type { Story } from "@/story/schema";
import type { PlayResult } from "@/story/scoring";

type GameShellProps = {
  /** Cerita sudah tervalidasi di sisi server. */
  story: Story;
};

/**
 * Shell halaman siswa (docs/05-frontend/game-player.md). Memegang state layar,
 * bukan state cerita: fase permainan dilacak `StoryRunner` di dalam Phaser.
 *
 * Progres `localStorage` belum ada di sini — menyusul bersama sinkronisasi
 * `storyVersion` dengan tim backend.
 */
export function GameShell({ story }: GameShellProps) {
  const [hasil, setHasil] = useState<PlayResult | null>(null);
  // Mengganti key me-remount GameCanvas, jadi "Main lagi" mulai dari awal.
  const [sesi, setSesi] = useState(0);

  function mainLagi() {
    setHasil(null);
    setSesi((nilai) => nilai + 1);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GameCanvas key={sesi} story={story} onFinished={setHasil} />
      {hasil && <ResultScreen result={hasil} onMainLagi={mainLagi} />}
    </div>
  );
}
