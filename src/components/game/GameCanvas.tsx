"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChallengeOverlay,
  type GradedView,
} from "@/components/game/ChallengeOverlay";
import { Hud, type ProgresBab } from "@/components/game/HUD";
import { PauseMenu } from "@/components/game/PauseMenu";
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
  const tombolJedaRef = useRef<HTMLButtonElement>(null);
  const pernahJeda = useRef(false);
  const [tantangan, setTantangan] = useState<ChallengeView | null>(null);
  const [hasil, setHasil] = useState<GradedView | null>(null);
  const [progres, setProgres] = useState<ProgresBab | null>(null);
  const [jeda, setJeda] = useState(false);
  const [suaraAktif, setSuaraAktif] = useState(true);

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
        lepas.push(
          game.bus.on("progress", (bab) => {
            setProgres(bab);
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

  const bukaJeda = useCallback(() => {
    busRef.current?.send({ type: "pause" });
    setJeda(true);
  }, []);

  const tutupJeda = useCallback(() => {
    busRef.current?.send({ type: "resume" });
    setJeda(false);
  }, []);

  /** Fokus kembali ke tombol Jeda setelah menu ditutup, bukan hilang ke body. */
  useEffect(() => {
    if (pernahJeda.current && !jeda) {
      tombolJedaRef.current?.focus({ preventScroll: true });
    }
    pernahJeda.current = jeda;
  }, [jeda]);

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

  const gantiSuara = useCallback(() => {
    const berikut = !suaraAktif;
    setSuaraAktif(berikut);
    busRef.current?.send({ type: "set_muted", muted: !berikut });
  }, [suaraAktif]);

  const ulangiChapter = useCallback(() => {
    setTantangan(null);
    setHasil(null);
    busRef.current?.send({ type: "restart_chapter" });
    tutupJeda();
  }, [tutupJeda]);

  // Esc: buka/tutup jeda. Saat tantangan terbuka, Esc hanya berlaku setelah
  // dijawab (docs/04-game/interaction-loop.md) — sebelum itu diabaikan.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (tantangan) {
        if (hasil) {
          event.preventDefault();
          lanjut();
        }
        return;
      }

      event.preventDefault();
      if (jeda) {
        tutupJeda();
      } else {
        bukaJeda();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tantangan, hasil, jeda, lanjut, bukaJeda, tutupJeda]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Area permainan ClassQuest"
      />
      {!jeda && !tantangan && (
        <Hud
          progres={progres}
          suaraAktif={suaraAktif}
          onToggleSuara={gantiSuara}
          onJeda={bukaJeda}
          tombolJedaRef={tombolJedaRef}
        />
      )}
      {tantangan && (
        <ChallengeOverlay
          view={tantangan}
          graded={hasil}
          onSubmit={kirimJawaban}
          onResolve={lanjut}
        />
      )}
      {jeda && (
        <PauseMenu
          onLanjut={tutupJeda}
          onUlangiChapter={ulangiChapter}
          suaraAktif={suaraAktif}
          onToggleSuara={gantiSuara}
        />
      )}
    </div>
  );
}
