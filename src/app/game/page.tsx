import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { DEMO_STORY } from "@/game/demoStory";

export const metadata: Metadata = {
  title: "Dev game — ClassQuest",
  robots: { index: false, follow: false },
};

export default function GameDevPage() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-[#0b120e] p-2 sm:p-4 lg:p-6">
      <h1 className="sr-only">ClassQuest</h1>
      <div className="h-full w-full overflow-hidden rounded-lg bg-[#14201a] ring-1 ring-white/10 sm:rounded-xl">
        <GameShell story={DEMO_STORY} />
      </div>
    </main>
  );
}
