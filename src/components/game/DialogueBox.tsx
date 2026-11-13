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
 * Kotak dialog lengkap di lapisan DOM: panel pixel, potret, nama, dan teks
 * (ADR 0007 + ADR 0017). Canvas game hanya 640×360 dan di-upscale dengan
 * `image-rendering: pixelated`, jadi panel digambar di sini (dengan
 * `image-rendering: pixelated` juga) dan potret serta huruf dirender browser
 * pada resolusi layar asli — potret anime tidak ikut bergerigi.
 *
 * Gaya Persona: potret **tidak** dibungkus bingkai. Ia berdiri di belakang
 * panel, dasar gambar sejajar dasar panel, jadi dadanya tertutup panel dan
 * kepalanya menjulang di atasnya. Posisi memakai persen dari `TEXTBOX` dan
 * `PORTRAIT` (sumber angka sama dengan `layout.ts`); ukuran huruf dan padding
 * memakai `cqw` supaya ikut skala canvas.
 */
export function DialogueBox({ view, onAdvance }: DialogueBoxProps) {
  if (!view.visible) return null;

  return (
    <div
      className="absolute z-10 cursor-pointer select-none font-game text-[#D9E4DA]"
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
        /* Potret dulu supaya panel (z-10) menutupi bagian bawahnya. Tinggi
            memakai `cqw` (skala seragam ruang game), bukan persen tinggi:
            persen akan dihitung terhadap tinggi panel, bukan tinggi kanvas. */
        view.portrait && (
          <Image
            src={view.portrait.src}
            alt={view.portrait.alt}
            width={512}
            height={512}
            className="pointer-events-none absolute bottom-0 select-none"
            style={{
              left: cqw(PORTRAIT.insetX),
              height: cqw(PORTRAIT.height),
              width: "auto",
            }}
          />
        )
      }

      <Image
        src="/assets/ui/textbox.png"
        alt=""
        fill
        sizes="(min-width: 640px) 608px, 100vw"
        className="pointer-events-none absolute inset-0 z-10 select-none object-fill"
        style={{ imageRendering: "pixelated" }}
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
            className="text-[#F7F4EC]"
            style={{ fontSize: ukuranHuruf(18, 14, 26), lineHeight: 1.2 }}
          >
            {view.name}
          </p>
        )}

        <p
          aria-live="polite"
          className="break-words whitespace-pre-wrap"
          style={{
            marginTop: cqw(3),
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
            className="absolute bottom-2.5 right-4 animate-pulse select-none text-[#E8A87C] motion-reduce:animate-none"
            style={{ fontSize: ukuranHuruf(16, 14, 24) }}
          >
            ▼
          </span>
        )}
      </div>
    </div>
  );
}
