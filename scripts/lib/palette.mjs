/**
 * Palet ClassQuest dan turunannya.
 *
 * Sembilan warna inti berasal dari docs/04-game/game-design.md. Nilai turunan
 * **bukan warna baru**: semuanya hasil `mix()` dua warna palet atau `shade()`
 * dari satu warna palet dengan faktor tetap. Daftar lengkapnya wajib sama
 * dengan tabel "Ramp turunan" di docs/04-game/game-design.md.
 */

import { mix, shade } from "./pixel.mjs";

/** Sembilan warna resmi. Jangan menambah entri di sini. */
export const PALETTE = {
  paper: "#F4EFE6",
  bone: "#F7F4EC",
  ink: "#1F1E28",
  night: "#14201A",
  warm: "#E8A87C",
  cool: "#7FA6C9",
  moss: "#6F9B7A",
  gold: "#C9A227",
  blush: "#D98FA3",
};

/** Warna turunan yang dipakai aset dan komponen DOM. */
export const RAMP = {
  /** Latar lebih dalam dari `night` (0.55×). Sudah dipakai ResultScreen. */
  deep: shade(PALETTE.night, 0.55),
  /** Satu tingkat di atas `deep` (0.72×). */
  nightMid: shade(PALETTE.night, 0.72),
  /** Netral gelap: `night` dicampur netral500 sepertiga. */
  neutral700: mix(PALETTE.night, "#8FA396", 1 / 3),
  /** Netral sedang — dipakai teks sekunder di overlay DOM. */
  neutral500: [143, 163, 150],
  /** Netral terang — dipakai teks isi di panel gelap. */
  neutral300: [217, 228, 218],

  /** Langit malam: biru air dicampur malam. */
  skyNight: mix(PALETTE.night, PALETTE.cool, 0.22),
  /** Langit senja: jingga pasir dicampur malam. */
  skyDusk: mix(PALETTE.night, PALETTE.warm, 0.3),
  /** Langit siang: biru air muda di atas kertas. */
  skyDay: mix(PALETTE.paper, PALETTE.cool, 0.45),
  /** Siluet jauh di kedalaman. */
  far: mix(PALETTE.night, PALETTE.cool, 0.12),
  /** Siluet tengah. */
  mid: mix(PALETTE.night, PALETTE.cool, 0.2),
  /** Siluet dekat. */
  near: mix(PALETTE.night, PALETTE.ink, 0.45),

  /** Kulit: jingga pasir dicampur kertas. */
  skin: mix(PALETTE.warm, PALETTE.paper, 0.55),
  /** Kulit dalam bayangan. */
  skinShade: mix(PALETTE.warm, PALETTE.night, 0.35),
  /** Air: biru dingin dengan malam. */
  water: mix(PALETTE.cool, PALETTE.night, 0.25),
  /** Air dalam. */
  waterDeep: mix(PALETTE.cool, PALETTE.night, 0.55),
  /** Daun/rumput. */
  leaf: mix(PALETTE.moss, PALETTE.night, 0.25),
  /** Daun terang. */
  leafLight: mix(PALETTE.moss, PALETTE.paper, 0.35),
  /** Cahaya lampu di jendela. */
  glow: mix(PALETTE.gold, PALETTE.paper, 0.4),
  /** Rosa terang untuk kilau rambut karakter. */
  blushLight: mix(PALETTE.blush, PALETTE.paper, 0.45),
  /** Rosa dalam untuk bayangan rambut karakter. */
  blushShade: mix(PALETTE.blush, PALETTE.night, 0.3),
};

/** Nama warna turunan yang dipakai di kode game/komponen, untuk dokumentasi. */
export const RAMP_NAMES = Object.keys(RAMP);

/** `#rrggbb` dari array kanal; dipakai bila butuh string CSS. */
export function toHex(channels) {
  return `#${channels
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
