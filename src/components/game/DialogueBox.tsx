"use client";

import Image from "next/image";

import type { DialogueView } from "@/game/gameBus";
import {
  cqw,
  persenTinggi,
  PORTRAIT,
  TEXTBOX,
  ukuranHuruf,
} from "@/game/layout";

type DialogueBoxProps = {
  view: DialogueView;
  /** Klik panel = satu langkah dialog (selesaikan ketikan atau lanjut beat). */
  onAdvance: () => void;
};

/**
 * Kotak dialog lengkap di lapisan DOM: panel gelap membulat, potret, nama, dan
 * teks (ADR 0007 + ADR 0017). Canvas game hanya 640×360 dan di-upscale dengan
 * `image-rendering: pixelated`, jadi panel digambar React sebagai kotak CSS —
 * bukan lagi gambar `ui_textbox` — supaya sudut membulat dan warnanya tajam di
 * resolusi layar asli. Potret anime juga dirender browser, tidak ikut bergerigi.
 *
 * Bentuk panel mengikuti referensi gaya Persona: kotak navy gelap membulat tanpa
 * bingkai pixel, nama pembicara teal dengan huruf pixel kapital, isi dialog
 * putih. Potret berdiri **di atas** panel — dasar gambar sejajar tepi atasnya —
 * dengan slot tetap (`PORTRAIT`) supaya kepala tidak goyang saat ekspresi
 * berganti. Posisi memakai persen dari `TEXTBOX`/`PORTRAIT`; ukuran huruf dan
 * padding memakai `cqw` supaya ikut skala canvas.
 */
export function DialogueBox({ view, onAdvance }: DialogueBoxProps) {
  if (!view.visible) return null;

  return (
    <div
      className="absolute z-10 cursor-pointer select-none font-game"
      style={{
        // Selalu di tengah ruang game, berapa pun lebar internalnya.
        left: "50%",
        transform: "translateX(-50%)",
        top: persenTinggi(TEXTBOX.y),
        width: cqw(TEXTBOX.width),
        height: persenTinggi(TEXTBOX.height),
      }}
      onClick={() => {
        (document.activeElement as HTMLElement)?.blur?.();
        onAdvance();
      }}
      // Panel bukan tombol: keyboard sudah ditangani scene (Space/Enter), jadi
      // jangan menambah elemen fokus baru di urutan Tab.
      role="presentation"
    >
      {
        /* Potret di atas panel: `bottom-100%` menaruh dasarnya di tepi atas
            panel, `left` + `translateX(-50%)` memusatkan slot pada `centerX`.
            `object-contain` menjaga potret tetap di slot yang sama walau lebar
            kanvas beda antar-karakter, jadi kepala tidak goyang. */
        view.portrait && (
          <Image
            src={view.portrait.src}
            alt={view.portrait.alt}
            width={512}
            height={512}
            className="pointer-events-none absolute bottom-full select-none object-contain object-bottom"
            style={{
              left: cqw(PORTRAIT.centerX),
              transform: "translateX(-50%)",
              width: cqw(PORTRAIT.width),
              height: cqw(PORTRAIT.height),
            }}
          />
        )
      }

      {/* Panel dialog: kotak navy gelap membulat tanpa bingkai pixel (gaya
            Persona). Digambar CSS, bukan `ui_textbox.png`, supaya sudut dan
            warnanya tajam di resolusi layar asli. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 border border-white/5 bg-[#0f172b]/95"
        style={{ borderRadius: cqw(14) }}
      />

      <div
        className="relative z-20 h-full w-full"
        style={{
          paddingLeft: cqw(TEXTBOX.padding),
          paddingRight: cqw(TEXTBOX.padding),
          paddingTop: cqw(TEXTBOX.paddingTop),
        }}
      >
        {view.name && (
          <p
            className="font-pixel font-bold uppercase text-[#55D0A5]"
            style={{
              fontSize: ukuranHuruf(15, 11, 22),
              letterSpacing: "0.14em",
              lineHeight: 1.15,
            }}
          >
            {view.name}
          </p>
        )}

        <p
          aria-live="polite"
          className="break-words whitespace-pre-wrap text-[#EFF2F7]"
          style={{
            marginTop: cqw(4),
            fontSize: ukuranHuruf(19, 16, 30),
            lineHeight: 1.34,
          }}
        >
          {view.text}
        </p>

        {/* Segitiga lanjut dialog diposisikan di sudut kanan bawah kotak dialog */}
        {view.waiting && (
          <span
            aria-hidden="true"
            className="absolute bottom-2.5 right-4 animate-pulse select-none text-[#55D0A5] motion-reduce:animate-none"
            style={{ fontSize: ukuranHuruf(16, 14, 24) }}
          >
            ▼
          </span>
        )}
      </div>
    </div>
  );
}
