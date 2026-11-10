"use client";

import type { DialogueView } from "@/game/gameBus";
import { cqw, kotakPersen, TEXTBOX, ukuranHuruf } from "@/game/layout";

type DialogueBoxProps = {
  view: DialogueView;
  /** Klik panel = satu langkah dialog (selesaikan ketikan atau lanjut beat). */
  onAdvance: () => void;
};

/**
 * Teks dialog di lapisan DOM, di atas panel pixel yang digambar Phaser
 * (ADR 0007). Canvas game hanya 640×360 dan di-upscale dengan
 * `image-rendering: pixelated`, jadi teks yang digambar di dalamnya selalu
 * bergerigi — di sini huruf dirender browser pada resolusi layar asli.
 *
 * Posisi memakai persen dari `TEXTBOX` (sumber angka sama dengan `textbox.ts`),
 * ukuran huruf dan padding memakai `cqw` supaya ikut skala canvas.
 */
export function DialogueBox({ view, onAdvance }: DialogueBoxProps) {
  if (!view.visible) return null;

  return (
    <div
      className="absolute z-10 cursor-pointer select-none font-game text-[#D9E4DA]"
      style={{
        ...kotakPersen(TEXTBOX),
        paddingLeft: cqw(TEXTBOX.padding),
        paddingRight: cqw(TEXTBOX.padding),
        paddingTop: cqw(TEXTBOX.paddingTop),
      }}
      onClick={onAdvance}
      // Panel bukan tombol: keyboard sudah ditangani scene (Space/Enter), jadi
      // jangan menambah elemen fokus baru di urutan Tab.
      role="presentation"
    >
      {view.name && (
        <p
          className="text-[#F7F4EC]"
          style={{ fontSize: ukuranHuruf(15, 12, 22), lineHeight: 1.2 }}
        >
          {view.name}
        </p>
      )}

      <p
        aria-live="polite"
        className="break-words whitespace-pre-wrap"
        style={{
          marginTop: cqw(3),
          fontSize: ukuranHuruf(15, 13, 26),
          lineHeight: 1.32,
        }}
      >
        {view.text}
        {view.waiting && (
          <span
            aria-hidden="true"
            className="ml-1 inline-block animate-pulse text-[#E8A87C] motion-reduce:animate-none"
          >
            ▼
          </span>
        )}
      </p>
    </div>
  );
}
