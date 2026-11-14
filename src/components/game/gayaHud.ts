/**
 * Gaya tombol HUD dipakai bersama `Hud`, `QuestTracker`, dan `TombolLayarPenuh`
 * supaya ketiganya tampak satu keluarga (docs/05-frontend/game-player.md).
 *
 * Ada dua varian:
 * - `overlay`: di dalam bingkai kanvas, di atas dunia bergelap — latar gelap
 *   tembus pandang dengan teks terang.
 * - `bar`: di bar bawah di luar kanvas saat layar potret. Latar halaman di sana
 *   hitam, jadi tombolnya dibuat **cerah** (kertas terang + teks gelap) supaya
 *   tetap kontras dan mudah dibaca.
 */
export type LetakHud = "overlay" | "bar";

/** Tombol HUD yang menempel di atas kanvas. */
export const KELAS_TOMBOL_HUD =
  "flex items-center gap-1.5 border border-[#3D4B41] bg-[#0b120e]/85 px-2.5 py-1.5 uppercase tracking-wide text-[#F7F4EC] hover:border-[#8FA396] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]";

/** Tombol HUD di bar bawah (latar hitam): cerah, kontras tinggi. */
export const KELAS_TOMBOL_HUD_CERAH =
  "flex items-center gap-1.5 border border-[#F7F4EC] bg-[#F7F4EC] px-3 py-2 text-[#14201a] uppercase tracking-wide hover:bg-[#E8A87C] hover:border-[#E8A87C] active:bg-[#E8A87C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A87C]";

/** Tombol HUD sesuai letaknya. */
export function kelasTombolHud(letak: LetakHud): string {
  return letak === "bar" ? KELAS_TOMBOL_HUD_CERAH : KELAS_TOMBOL_HUD;
}
