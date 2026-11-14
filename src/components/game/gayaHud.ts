/**
 * Gaya tombol HUD dipakai bersama `Hud`, `QuestTracker`, dan `TombolLayarPenuh`
 * supaya ketiganya tampak satu keluarga (docs/05-frontend/game-player.md).
 *
 * Desainnya mengikuti **panel kotak dialog** (`DialogueBox`): latar navy gelap
 * `#0f172b`, bingkai tipis putih transparan, sudut membulat, dan teks terang
 * `#EFF2F7`. Jadi tombol HUD dan kotak dialog terbaca sebagai satu bahasa
 * visual — berlaku di desktop maupun HP.
 *
 * Ada dua varian ukuran:
 * - `overlay`: di dalam bingkai kanvas. Di **desktop** (`lg`, ≥1024px) tombol
 *   sengaja diperbesar supaya nyaman diklik; di HP tetap seperti semula.
 * - `bar`: bar bawah di luar kanvas saat layar potret. Ukurannya tetap di HP.
 */
export type LetakHud = "overlay" | "bar";

/** Desain bersama semua tombol HUD (mengikuti panel kotak dialog). */
const DESAIN_HUD =
  "flex items-center rounded-lg border border-white/10 bg-[#0f172b]/95 uppercase tracking-wide text-[#EFF2F7] transition-colors hover:border-white/25 hover:bg-[#16223d] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D0A5]";

/** Tombol HUD yang menempel di atas kanvas; membesar hanya di desktop. */
export const KELAS_TOMBOL_HUD = `${DESAIN_HUD} gap-1.5 px-2.5 py-1.5 lg:gap-2 lg:px-4 lg:py-2.5 lg:text-lg`;

/** Tombol HUD di bar bawah (layar potret): desain sama, ukuran HP tetap. */
export const KELAS_TOMBOL_HUD_BAR = `${DESAIN_HUD} gap-1.5 px-3 py-2`;

/** Tombol HUD sesuai letaknya. */
export function kelasTombolHud(letak: LetakHud): string {
  return letak === "bar" ? KELAS_TOMBOL_HUD_BAR : KELAS_TOMBOL_HUD;
}
