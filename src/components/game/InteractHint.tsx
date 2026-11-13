"use client";

import { KotakSpace } from "@/components/game/KotakSpace";
import type { PromptView } from "@/game/gameBus";
import { persenTinggi, persenLebar } from "@/game/layout";

type InteractHintProps = {
  hint: PromptView;
  /** Kotak sedang beranimasi keluar; `NpcHintLayer` menahannya sampai selesai. */
  keluar?: boolean;
};

/**
 * Kotak `Space` berdiri sendiri di atas NPC yang bisa diajak bicara. Dulu
 * digambar Phaser; sekarang DOM supaya tajam (ADR 0007) dan bisa dibaca screen
 * reader.
 *
 * Komponen ini **hanya** dipakai saat kotak tampil sendiri, bukan menempel pada
 * penanda quest:
 *
 * - **Obrolan singkat** (`menempel: false`): NPC tidak punya `!`, jadi kotak
 *   muncul halus seperti pop-up (`animate-quest-pop`) — tanpa meluncur ke
 *   kanan, karena tidak ada penanda untuk dituju.
 * - **Pemberi quest di luar area aman** (`menempel: true`, penanda jadi beacon
 *   tepi layar): kotak tetap meluncur keluar dari `!` (`animate-quest-slide-in`).
 *
 * Keduanya **dipusatkan** di titik kaki NPC (`-translate-x-1/2`), jadi kotak
 * selalu lurus vertikal dengan papan nama dan karakter di bawahnya.
 *
 * Saat pemberi quest ada di layar, kotak `Space` **bukan** dirender di sini:
 * `NpcMarker` menggabungkannya menjadi satu paket dengan `!` supaya keduanya
 * naik-turun bersama, dan menaruhnya relatif terhadap `!` (`left-full`).
 * `hint.x`/`hint.y` adalah sudut kiri-bawah kotak dalam piksel internal ruang
 * game (lihat `posisiPrompt` di `interaction.ts`).
 *
 * Saat pemain keluar zona, `NpcHintLayer` tidak langsung melepas kotak: ia
 * menahannya sebentar dan mengirim `keluar: true`, jadi kotak memudar/menyusut
 * dengan mulus (`animate-quest-pop-out`, atau meluncur masuk ke `!` untuk kotak
 * quest yang tampil sendiri) sebelum hilang.
 *
 * Animasi masuk hanya berjalan sekali per kemunculan: React memakai ulang
 * elemen yang sama saat koordinat berubah tiap frame, jadi kotak tidak berkedip
 * mengulang animasi selama pemain berjalan.
 */
export function InteractHint({ hint, keluar = false }: InteractHintProps) {
  // Kotak quest yang tampil sendiri tetap meluncur masuk/keluar dari `!`;
  // obrolan singkat memakai pop-up halus karena tidak ada penanda untuk dituju.
  let animasi: string;
  if (hint.menempel) {
    animasi = keluar
      ? "origin-left animate-quest-slide-out"
      : "origin-left animate-quest-slide-in";
  } else {
    animasi = keluar ? "animate-quest-pop-out" : "animate-quest-pop";
  }

  return (
    <div
      data-prompt={hint.menempel ? "quest" : "obrolan"}
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(hint.x), top: persenTinggi(hint.y) }}
    >
      <KotakSpace text={hint.text} className={animasi} />
    </div>
  );
}
