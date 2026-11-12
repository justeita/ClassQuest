import type { Metadata } from "next";

import { GamesGrid } from "@/components/guru/GamesGrid";

export const metadata: Metadata = {
  title: "My Games",
};

/** `/guru/game` — koleksi game edukasi milik guru. */
export default function GamePage() {
  return <GamesGrid />;
}
