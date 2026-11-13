"use client";

import { KotakSpace } from "@/components/game/KotakSpace";
import type { PromptView } from "@/game/gameBus";
import { persenTinggi, persenLebar } from "@/game/layout";

type InteractHintProps = {
  hint: PromptView;
};

/**
 * Kotak `Space` berdiri sendiri di atas NPC yang bisa diajak bicara. Dulu
 * digambar Phaser; sekarang DOM supaya tajam (ADR 0007) dan bisa dibaca screen
 * reader.
 *
 * Komponen ini **hanya** dipakai saat kotak tidak menempel pada penanda quest:
 *
 * - **Obrolan singkat** (`menempel: false`): NPC tidak punya `!`, jadi kotak
 *   muncul halus seperti pop-up (`animate-quest-pop`) — tanpa meluncur ke
 *   kanan, karena tidak ada penanda untuk dituju. Kotak dipusatkan di atas
 *   papan nama NPC (`-translate-x-1/2`).
 * - **Pemberi quest di luar area aman** (`menempel: true`, penanda jadi beacon
 *   tepi layar): kotak tetap meluncur keluar dari `!` (`animate-quest-slide-in`).
 *
 * Saat pemberi quest ada di layar, kotak `Space` **bukan** dirender di sini:
 * `NpcMarker` menggabungkannya menjadi satu paket dengan `!` supaya keduanya
 * naik-turun bersama. `hint.x`/`hint.y` adalah sudut kiri-bawah kotak dalam
 * piksel internal ruang game (lihat `posisiPrompt` di `interaction.ts`).
 *
 * Animasi hanya berjalan sekali per kemunculan: React memakai ulang elemen
 * yang sama saat koordinat berubah tiap frame, jadi kotak tidak berkedip
 * mengulang animasi selama pemain berjalan.
 */
export function InteractHint({ hint }: InteractHintProps) {
  const animasi = hint.menempel
    ? "origin-left animate-quest-slide-in"
    : "animate-quest-pop";
  // Prompt obrolan singkat dipusatkan pada titik kaki NPC supaya sejajar
  // dengan papan nama di bawahnya.
  const jangkar = hint.menempel ? "" : "-translate-x-1/2";

  return (
    <div
      data-prompt={hint.menempel ? "quest" : "obrolan"}
      className={`pointer-events-none absolute z-10 -translate-y-full font-game ${jangkar}`}
      style={{ left: persenLebar(hint.x), top: persenTinggi(hint.y) }}
    >
      <KotakSpace text={hint.text} className={animasi} />
    </div>
  );
}
