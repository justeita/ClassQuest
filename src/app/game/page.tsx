import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { DEMO_STORY } from "@/game/demoStory";

export const metadata: Metadata = {
  title: "Dev game — ClassQuest",
  robots: { index: false, follow: false },
};

export default function GameDevPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#14201a] p-4">
      <h1 className="sr-only">ClassQuest</h1>
      <div className="relative aspect-video w-full max-w-5xl">
        <div className="absolute inset-0">
          <GameShell story={DEMO_STORY} />
        </div>
      </div>
    </main>
  );
}
