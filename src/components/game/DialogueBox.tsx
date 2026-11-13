"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { DialogueView } from "@/game/gameBus";
import {
  cqw,
  persenTinggi,
  PORTRAIT,
  PORTRAIT_SOURCE,
  TEXTBOX,
  ukuranHuruf,
} from "@/game/layout";
import type { PortraitView } from "@/game/textbox";
import { EXPRESSIONS } from "@/story/expression";

type DialogueBoxProps = {
  view: DialogueView;
  /** Klik panel = satu langkah dialog (selesaikan ketikan atau lanjut beat). */
  onAdvance: () => void;
};

type PortraitSlotProps = {
  portrait: PortraitView;
  /** Pembicara menyala; lawan bicaranya meredup. */
  bicara: boolean;
  /** Dialog sedang menutup: potret ikut tenggelam di belakang panel. */
  menutup: boolean;
};

/**
 * Lamanya animasi tutup (`crt-keluar` di `globals.css`). Komponen tetap
 * ter-mount selama ini supaya panel dan potret sempat beranimasi keluar.
 */
const DURASI_KELUAR = 360;

/** Potret yang sudah diminta; cegah permintaan ganda antar-beat. */
const potretDiminta = new Set<string>();

/**
 * Muat keenam ekspresi satu karakter di latar belakang. Game hanya meminta
 * potret saat beat-nya tampil, jadi tanpa ini pergantian ekspresi menunggu
 * unduhan; setelah dipanaskan, semua ekspresi langsung muncul dari cache.
 */
function muatPotretKarakter(src: string) {
  if (typeof window === "undefined") return;
  const folder = src.slice(0, src.lastIndexOf("/"));
  for (const ekspresi of EXPRESSIONS) {
    const url = `${folder}/${ekspresi}.png`;
    if (potretDiminta.has(url)) continue;
    potretDiminta.add(url);
    const gambar = new window.Image();
    gambar.decoding = "async";
    gambar.src = url;
  }
}

/**
 * Satu potret di atas panel: NPC menempel pojok kiri, MC dicerminkan di pojok
 * kanan. Pembicara menyala dengan glow teal; yang sedang tidak bicara tetap
 * tampil tetapi dibuat gelap, jadi pemain selalu tahu siapa yang bicara.
 *
 * `overflow-hidden` + animasi masuk yang menggeser ke bawah membuat potret
 * seolah terbit dari balik panel, bukan muncul mendadak; saat menutup, animasi
 * sebaliknya menenggelamkannya lagi.
 */
function PortraitSlot({ portrait, bicara, menutup }: PortraitSlotProps) {
  const mc = portrait.src.includes("/mc/");

  return (
    <div
      data-slot="potret"
      className="pointer-events-none absolute bottom-full select-none overflow-hidden"
      style={{
        left: mc ? undefined : 0,
        right: mc ? 0 : undefined,
        width: cqw(PORTRAIT.width),
        height: cqw(PORTRAIT.height),
        transform: mc ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        className={`h-full w-full ${
          menutup ? "animate-potret-keluar" : "animate-potret-masuk"
        }`}
      >
        <Image
          src={portrait.src}
          alt={portrait.alt}
          width={PORTRAIT_SOURCE.width}
          height={PORTRAIT_SOURCE.height}
          // Berkas potret sudah dioptimalkan importer (±130 KB, filter PNG
          // adaptif), jadi lebih cepat memuat PNG langsung daripada menunggu
          // optimizer Next mengolah ulang setiap berkas di dev server.
          unoptimized
          loading="eager"
          fetchPriority={bicara ? "high" : "auto"}
          className={`h-full w-full object-contain object-bottom transition-[filter,opacity] duration-300 ${
            bicara
              ? "animate-portrait-bicara"
              : "opacity-90 brightness-50 saturate-75"
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Kotak dialog lengkap di lapisan DOM: panel gelap membulat, potret, nama, dan
 * teks (ADR 0007 + ADR 0017). Canvas game hanya 640×360 dan di-upscale dengan
 * `image-rendering: pixelated`, jadi panel digambar React sebagai kotak CSS —
 * bukan lagi gambar `ui_textbox` — supaya sudut membulat dan warnanya tajam di
 * resolusi layar asli. Potret anime juga dirender browser, tidak ikut bergerigi.
 *
 * Bentuk panel mengikuti referensi gaya Persona: kotak navy gelap membulat tanpa
 * bingkai pixel, nama pembicara teal dengan huruf pixel kapital, isi dialog
 * putih. Dua potret berdiri **di atas** panel dengan dasar menempel tepi
 * atasnya: NPC di pojok kiri, MC dicerminkan di pojok kanan. Pembicara menyala
 * dan lawan bicaranya meredup, jadi giliran bicara selalu terbaca. Posisi
 * memakai persen dari `TEXTBOX`/`PORTRAIT`; ukuran huruf dan padding memakai
 * `cqw` supaya ikut skala canvas.
 *
 * Panel menyala seperti TV tabung (melebar dari garis tipis di tengah) saat
 * dialog dibuka, dan menutup kembali ke tengah saat selesai. Komponen tetap
 * ter-mount sampai animasi tutup selesai — `GameCanvas` menahan view terakhir
 * walau `visible` sudah false.
 */
export function DialogueBox({ view, onAdvance }: DialogueBoxProps) {
  // View terakhir yang terlihat. State dialog dikosongkan begitu `visible` jadi
  // false (`textbox.ts`), jadi isi terakhir ini yang dipertahankan selama
  // animasi tutup.
  const [terakhir, setTerakhir] = useState<DialogueView | null>(
    view.visible ? view : null,
  );
  const [hilang, setHilang] = useState(!view.visible);

  // Sesuaikan state saat props berubah (pola resmi React: "menyesuaikan state
  // ketika prop berubah"), bukan di dalam effect — jadi dialog yang dibuka lagi
  // di tengah animasi tutup langsung berbalik masuk.
  if (view.visible) {
    if (terakhir !== view) setTerakhir(view);
    if (hilang) setHilang(false);
  }

  const tampil = view.visible ? view : terakhir;
  const menutup = !view.visible && !hilang;
  const sumberPotret = tampil?.portrait?.src ?? null;
  const sumberPendamping = tampil?.pendamping?.src ?? null;

  useEffect(() => {
    if (sumberPotret) muatPotretKarakter(sumberPotret);
  }, [sumberPotret]);

  useEffect(() => {
    if (sumberPendamping) muatPotretKarakter(sumberPendamping);
  }, [sumberPendamping]);

  // Tutup: tahan view terakhir di DOM sampai animasi keluar selesai. Bila
  // dialog dibuka lagi sebelum jeda usai, effect dibersihkan dan timer batal.
  useEffect(() => {
    if (view.visible || terakhir === null) return;
    const timer = setTimeout(() => setHilang(true), DURASI_KELUAR);
    return () => clearTimeout(timer);
  }, [view.visible, terakhir]);

  if (hilang || !tampil) return null;

  const mc = tampil.portrait?.src.includes("/mc/") ?? false;

  return (
    <div
      className={`absolute z-10 select-none font-game ${
        menutup ? "pointer-events-none" : "cursor-pointer"
      }`}
      style={{
        // Selalu di tengah ruang game, berapa pun lebar internalnya.
        left: "50%",
        transform: "translateX(-50%)",
        top: persenTinggi(TEXTBOX.y),
        width: cqw(TEXTBOX.width),
        height: persenTinggi(TEXTBOX.height),
      }}
      onClick={() => {
        if (menutup) return;
        (document.activeElement as HTMLElement)?.blur?.();
        onAdvance();
      }}
      // Panel bukan tombol: keyboard sudah ditangani scene (Space/Enter), jadi
      // jangan menambah elemen fokus baru di urutan Tab.
      role="presentation"
      aria-hidden={menutup || undefined}
    >
      {
        /* Dua potret di atas panel: lawan bicara diredupkan lebih dulu, lalu
            pembicara yang menyala. `bottom-full` menaruh dasar keduanya di tepi
            atas panel; NPC menempel pojok kiri, MC pojok kanan. Lebar slot
            setengah panel dan isi potret sudah mentok tepi di kanvasnya, jadi
            karakternya sejajar dengan sisi kotak dialog. Key per sisi menjaga
            animasi masuk tidak terulang saat ekspresi berganti. */
        tampil.portrait &&
          tampil.pendamping &&
          tampil.pendamping.src !== tampil.portrait.src && (
            <PortraitSlot
              key={mc ? "npc" : "mc"}
              portrait={tampil.pendamping}
              bicara={false}
              menutup={menutup}
            />
          )
      }
      {tampil.portrait && (
        <PortraitSlot
          key={mc ? "mc" : "npc"}
          portrait={tampil.portrait}
          bicara
          menutup={menutup}
        />
      )}

      {/* Panel + teks beranimasi seperti TV tabung: melebar dari garis tipis di
            tengah saat muncul, lalu mengecil kembali ke tengah saat ditutup.
            Potret sengaja di luar wadah ini supaya punya animasi sendiri. */}
      <div
        className={`absolute inset-0 ${
          menutup ? "animate-crt-keluar" : "animate-crt-masuk"
        }`}
      >
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
          {tampil.name && (
            <p
              className="font-pixel font-bold uppercase text-[#55D0A5]"
              style={{
                fontSize: ukuranHuruf(15, 11, 22),
                letterSpacing: "0.14em",
                lineHeight: 1.15,
              }}
            >
              {tampil.name}
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
            {tampil.text}
          </p>

          {/* Segitiga lanjut dialog diposisikan di sudut kanan bawah kotak dialog */}
          {tampil.waiting && (
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
    </div>
  );
}
