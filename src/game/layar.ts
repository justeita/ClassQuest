import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

/**
 * Konversi koordinat dunia ke ruang layar internal 640×360.
 *
 * Prompt interaksi dan penanda NPC adalah DOM di atas canvas, sedangkan posisi
 * NPC berada di koordinat dunia. Kalau kamera bergeser (ruangan lebih besar
 * dari layar), koordinat dunia tidak boleh dipakai langsung sebagai persen
 * layar — hasilnya chip meleset dari NPC.
 */

export type KameraView = {
  scrollX: number;
  scrollY: number;
};

export type TitikLayar = { x: number; y: number };

/** Titik dunia → titik layar. Nilai boleh pecahan; pembulatan di pemanggil. */
export function duniaKeLayar(
  kamera: KameraView,
  x: number,
  y: number,
): TitikLayar {
  return {
    x: x - kamera.scrollX,
    y: y - kamera.scrollY,
  };
}

/** Apakah titik masih berada di dalam area permainan yang terlihat. */
export function dalamLayar(
  titik: TitikLayar,
  lebar = GAME_WIDTH,
  tinggi = GAME_HEIGHT,
): boolean {
  return titik.x >= 0 && titik.x <= lebar && titik.y >= 0 && titik.y <= tinggi;
}
