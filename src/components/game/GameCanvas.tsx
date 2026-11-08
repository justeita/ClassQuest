"use client";

import { useEffect, useRef } from "react";

import type { GameHandle } from "@/game/types";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        gameRef.current = createGame(container);
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label="Area permainan ClassQuest"
    />
  );
}
