import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { DEMO_STORY } from "@/game/demoStory";

export const metadata: Metadata = {
  title: "Dev game — ClassQuest",
  robots: { index: false, follow: false },
};

export default function GameDevPage() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-[#14201a]">
      <h1 className="sr-only">ClassQuest</h1>
      <GameShell story={DEMO_STORY} />
    </main>
  );
}
