"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChallengeOverlay,
  type GradedView,
} from "@/components/game/ChallengeOverlay";
import { DialogueBox } from "@/components/game/DialogueBox";
import {
  ChapterCard,
  type ChapterCardView,
} from "@/components/game/ChapterCard";
import { NpcMarker } from "@/components/game/NpcMarker";
import { QuestToast } from "@/components/game/QuestToast";
import { QuestTracker } from "@/components/game/QuestTracker";
import { Hud } from "@/components/game/HUD";
import { InteractHint } from "@/components/game/InteractHint";
import { PauseMenu } from "@/components/game/PauseMenu";
import type { ChallengeView } from "@/game/challengeView";
import type {
  DialogueView,
  GameBus,
  NpcMarker as NpcMarkerView,
  PromptView,
} from "@/game/gameBus";
import type { QuestState } from "@/game/questLog";
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
  const [quest, setQuest] = useState<QuestState | null>(null);
  const [penanda, setPenanda] = useState<NpcMarkerView[]>([]);
  const [kartuChapter, setKartuChapter] = useState<ChapterCardView | null>(
    null,
  );
  const [toastQuest, setToastQuest] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogueView | null>(null);
  const [hint, setHint] = useState<PromptView | null>(null);
  const [jeda, setJeda] = useState(false);
  const [suaraAktif, setSuaraAktif] = useState(true);
  /** Pelacak perubahan chapter/quest untuk memicu kartu dan toast sekali. */
  const chapterTerakhir = useRef<number | null>(null);
  const questTerakhir = useRef<string | null>(null);

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
            setHint(null);
            setPenanda([]);
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
            setHint(null);
            setPenanda([]);
            onFinishedRef.current?.(result);
          }),
        );
        lepas.push(
          game.bus.on("quest", ({ view }) => {
            setQuest(view);

            if (chapterTerakhir.current !== view.chapterNumber) {
              chapterTerakhir.current = view.chapterNumber;
              setKartuChapter({
                chapterNumber: view.chapterNumber,
                chapterTotal: view.chapterTotal,
                chapterTitle: view.chapterTitle,
              });
            }

            // Toast hanya untuk quest berikutnya, bukan quest pertama sesi.
            if (
              view.activeQuestId &&
              questTerakhir.current !== null &&
              questTerakhir.current !== view.activeQuestId
            ) {
              setToastQuest(view.sceneTitle);
            }
            questTerakhir.current = view.activeQuestId;
          }),
        );
        lepas.push(
          game.bus.on("markers", ({ markers }) => {
            setPenanda(markers);
          }),
        );
        lepas.push(
          game.bus.on("dialogue", ({ view }) => {
            setDialog(view);
          }),
        );
        lepas.push(
          game.bus.on("prompt", (payload) => {
            setHint(payload.hint);
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
    setToastQuest(null);
    setKartuChapter(null);
    // Quest pertama setelah restart bukan "quest baru"; jangan munculkan toast.
    questTerakhir.current = null;
    busRef.current?.send({ type: "restart_chapter" });
    tutupJeda();
  }, [tutupJeda]);

  // Kartu chapter dan toast hilang sendiri; tidak ada tombol tutup.
  useEffect(() => {
    if (!kartuChapter) return;
    const timer = setTimeout(() => setKartuChapter(null), 4500);
    return () => clearTimeout(timer);
  }, [kartuChapter]);

  useEffect(() => {
    if (!toastQuest) return;
    const timer = setTimeout(() => setToastQuest(null), 3200);
    return () => clearTimeout(timer);
  }, [toastQuest]);

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

  const lanjutDialog = useCallback(() => {
    busRef.current?.send({ type: "advance" });
  }, []);

  return (
    <div
      className="relative h-full w-full"
      style={{ containerType: "inline-size" }}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Area permainan ClassQuest"
      />
      {!jeda && !tantangan && <QuestTracker view={quest} />}
      {!jeda &&
        !tantangan &&
        !dialog?.visible &&
        penanda.map((marker) => (
          <NpcMarker key={marker.npcId} marker={marker} />
        ))}
      {!jeda && !tantangan && <ChapterCard view={kartuChapter} />}
      {!jeda && !tantangan && <QuestToast title={toastQuest} />}
      {!jeda && !tantangan && !dialog?.visible && hint && (
        <InteractHint hint={hint} />
      )}
      {!jeda && !tantangan && dialog && (
        <DialogueBox view={dialog} onAdvance={lanjutDialog} />
      )}
      {!jeda && !tantangan && (
        <Hud
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
