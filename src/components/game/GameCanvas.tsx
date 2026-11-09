"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChallengeOverlay,
  type GradedView,
} from "@/components/game/ChallengeOverlay";
import type { ChallengeView } from "@/game/challengeView";
import type { GameBus } from "@/game/gameBus";
import type { GameHandle } from "@/game/types";
import type { Answer } from "@/story/scoring";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const busRef = useRef<GameBus | null>(null);
  const [tantangan, setTantangan] = useState<ChallengeView | null>(null);
  const [hasil, setHasil] = useState<GradedView | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let lepasChallenge: (() => void) | undefined;
    let lepasGraded: (() => void) | undefined;

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        const game = createGame(container);
        gameRef.current = game;
        busRef.current = game.bus;

        // Overlay hanya menerima view tanpa jawaban; penilaian di sisi game.
        lepasChallenge = game.bus.on("challenge", ({ view }) => {
          setHasil(null);
          setTantangan(view);
        });
        lepasGraded = game.bus.on("graded", ({ correct, explanation }) => {
          setHasil({ correct, explanation });
        });
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      lepasChallenge?.();
      lepasGraded?.();
      gameRef.current?.destroy();
      gameRef.current = null;
      busRef.current = null;
    };
  }, []);

  function kirimJawaban(answer: Answer) {
    busRef.current?.send({
      type: "submit_answer",
      challengeId: answer.challengeId,
      answer,
    });
  }

  function lanjut() {
    const challengeId = tantangan?.id;
    setTantangan(null);
    setHasil(null);
    if (!challengeId) return;
    busRef.current?.send({
      type: "resolve_challenge",
      challengeId,
      correct: hasil?.correct ?? false,
    });
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Area permainan ClassQuest"
      />
      {tantangan && (
        <ChallengeOverlay
          view={tantangan}
          graded={hasil}
          onSubmit={kirimJawaban}
          onResolve={lanjut}
        />
      )}
    </div>
  );
}
