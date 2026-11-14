import {
  KOTAK_DIALOG,
  KOTAK_DIALOG_FOKUS,
  KOTAK_DIALOG_HOVER,
} from "@/components/game/gayaDialog";

/**
 * Gaya tombol HUD dipakai bersama `Hud`, `QuestTracker`, dan `TombolLayarPenuh`
 * supaya ketiganya tampak satu keluarga (docs/05-frontend/game-player.md).
 *
 * Desainnya mengikuti **panel kotak dialog** (`DialogueBox`) lewat token di
 * `gayaDialog.ts`: latar hijau-gelap `#0b120e`, bingkai tipis aksen oranye
 * `#E8A87C`, sudut membulat, dan teks krem terang `#F7F4EC`. Jadi tombol HUD,
 * kotak dialog, dan kotak pilihan tantangan terbaca sebagai satu bahasa visual
 * — di desktop maupun HP (ADR 0029).
 *
 * Ada dua varian ukuran:
 * - `overlay`: di dalam bingkai kanvas. Di **desktop** (`lg`, ≥1024px) tombol
 *   sengaja diperbesar supaya nyaman diklik; di HP tetap seperti semula.
 * - `bar`: bar bawah di luar kanvas saat layar potret. Ukurannya tetap di HP.
 */
export type LetakHud = "overlay" | "bar";

/** Desain bersama semua tombol HUD (mengikuti panel kotak dialog). */
const DESAIN_HUD = `${KOTAK_DIALOG} flex items-center uppercase tracking-wide transition-colors ${KOTAK_DIALOG_HOVER} ${KOTAK_DIALOG_FOKUS}`;

/** Tombol HUD yang menempel di atas kanvas; membesar hanya di desktop. */
export const KELAS_TOMBOL_HUD = `${DESAIN_HUD} gap-1.5 px-2.5 py-1.5 lg:gap-2 lg:px-4 lg:py-2.5 lg:text-lg`;

/** Tombol HUD di bar bawah (layar potret): desain sama, ukuran HP tetap. */
export const KELAS_TOMBOL_HUD_BAR = `${DESAIN_HUD} gap-1.5 px-3 py-2`;

/** Tombol HUD sesuai letaknya. */
export function kelasTombolHud(letak: LetakHud): string {
  return letak === "bar" ? KELAS_TOMBOL_HUD_BAR : KELAS_TOMBOL_HUD;
}
