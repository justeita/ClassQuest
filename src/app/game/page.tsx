import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { DEMO_STORY } from "@/game/demoStory";

export const metadata: Metadata = {
  title: "Menu utama",
  robots: { index: false, follow: false },
};

/**
 * `/game` — pintu siswa sementara (docs/05-frontend/routes.md) dan halaman demo
 * Phaser. Server Component ini tidak merender Phaser: ia hanya menyerahkan
 * cerita demo ke `GameShell`, yang membuka menu utama (docs/05-frontend/
 * game-player.md → Menu utama) sebelum layar judul cerita.
 */
export default function GameDevPage() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-[#0b120e] p-2 sm:p-4 lg:p-6">
      <div className="h-full w-full overflow-hidden rounded-lg bg-[#14201a] ring-1 ring-white/10 sm:rounded-xl">
        <GameShell story={DEMO_STORY} menuUtama />
      </div>
    </main>
  );
}
