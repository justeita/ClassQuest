/**
 * Keputusan kamera dunia (world-design.md § Kamera, ADR 0010).
 *
 * Modul murni supaya keputusannya bisa dites tanpa Phaser. GameScene yang
 * menerapkannya lewat `setBounds`, `startFollow`, `setDeadzone`, dan
 * `centerOn`.
 */

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/** Ukuran dunia dalam piksel (bentuknya dari `WorldData`). */
export type UkuranDunia = { width: number; height: number };

/** Dead zone: kamera diam selama pemain masih di dalam kotak 128×96 px. */
export const DEADZONE_PX = { width: 128, height: 96 };

/** Pergerakan kamera halus, tidak menempel kaku (world-design.md § Kamera). */
export const CAMERA_LERP = 0.12;

export type CameraMode = "lock" | "follow";

/**
 * Dunia yang muat satu layar dikunci ke tengah; dunia lebih luas dari layar
 * mengikuti pemain dengan batas map. Dunia desa selalu lebih luas, tetapi
 * aturannya tetap ada supaya peta kecil kelak tidak goyang.
 */
export function kameraMode(dunia: UkuranDunia): CameraMode {
  return dunia.width <= GAME_WIDTH && dunia.height <= GAME_HEIGHT
    ? "lock"
    : "follow";
}

/** Dead zone efektif dalam piksel, disalin supaya pemanggil tidak bisa mengubah. */
export function deadzonePx(): { width: number; height: number } {
  return { ...DEADZONE_PX };
}
