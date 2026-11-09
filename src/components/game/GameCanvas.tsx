"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChallengeOverlay,
  type GradedView,
} from "@/components/game/ChallengeOverlay";
import type { ChallengeView } from "@/game/challengeView";
import type { GameBus } from "@/game/gameBus";
import type { GameHandle } from "@/game/types";
import type { Story } from "@/story/schema";
import type { Answer, PlayResult } from "@/story/scoring";

type GameCanvasProps = {
  /** Cerita yang dimainkan; scene tidak lagi memuat fixture sendiri. */
  story: Story;
  /** Dipanggil sekali saat cerita selesai, membawa ringkasan hasil. */
  onFinished?: (result: PlayResult) => void;
};

export function GameCanvas({ story, onFinished }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const busRef = useRef<GameBus | null>(null);
  const [tantangan, setTantangan] = useState<ChallengeView | null>(null);
  const [hasil, setHasil] = useState<GradedView | null>(null);

  // Callback disimpan di ref agar pergantian identitas tidak memuat ulang Phaser.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const lepas: (() => void)[] = [];

    void import("@/game/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        const game = createGame(container, story);
        gameRef.current = game;
        busRef.current = game.bus;

        // Overlay hanya menerima view tanpa jawaban; penilaian di sisi game.
        lepas.push(
          game.bus.on("challenge", ({ view }) => {
            setHasil(null);
            setTantangan(view);
          }),
        );
        lepas.push(
          game.bus.on("graded", ({ correct, explanation }) => {
            setHasil({ correct, explanation });
          }),
        );
        lepas.push(
          game.bus.on("finished", ({ result }) => {
            setTantangan(null);
            setHasil(null);
            onFinishedRef.current?.(result);
          }),
        );
      })
      .catch((error: unknown) => {
        console.error("Gagal memuat game:", error);
      });

    return () => {
      cancelled = true;
      for (const berhenti of lepas) berhenti();
      gameRef.current?.destroy();
      gameRef.current = null;
      busRef.current = null;
    };
  }, [story]);

  const kirimJawaban = useCallback((answer: Answer) => {
    busRef.current?.send({
      type: "submit_answer",
      challengeId: answer.challengeId,
      answer,
    });
  }, []);

  const lanjut = useCallback(() => {
    const challengeId = tantangan?.id;
    setTantangan(null);
    setHasil(null);
    if (!challengeId) return;
    busRef.current?.send({
      type: "resolve_challenge",
      challengeId,
      correct: hasil?.correct ?? false,
    });
  }, [tantangan, hasil]);

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
