/**
 * Metadata frame spritesheet karakter — **dibangkitkan**, jangan disunting tangan.
 *
 * Sumber dan cara membuatnya: `scripts/import-characters.mjs`. Setiap karakter
 * punya satu spritesheet 8 arah: satu baris per arah (urut `FRAME_ARAH`) dan
 * kolomnya idle lebih dulu, baru walk. Indeks frame arah `d` pada animasi idle
 * adalah `d * (idleFrames + walkFrames) + f`; pada walk ditambah `idleFrames`.
 *
 * Dipakai dua tempat: `manifest.ts` (untuk `frameWidth`/`frameHeight` yang
 * dipakai `PreloadScene`) dan `GameScene` (untuk mendaftarkan animasi dan
 * memilih frame arah hadap).
 */

export type CharacterFrames = {
  /** Id manifest, mis. `char_mc`. */
  id: string;
  /** Nama tanpa prefix, mis. `mc`; sama dengan nama berkas sprite. */
  name: string;
  frameWidth: number;
  frameHeight: number;
  /** Jumlah frame idle per arah. */
  idleFrames: number;
  /** Jumlah frame walk per arah; `0` berarti karakter hanya punya idle. */
  walkFrames: number;
};

export const CHARACTER_FRAMES: readonly CharacterFrames[] = [
  {
    id: "char_mc",
    name: "mc",
    frameWidth: 38,
    frameHeight: 66,
    idleFrames: 4,
    walkFrames: 8,
  },
  {
    id: "char_npc_1",
    name: "npc_1",
    frameWidth: 33,
    frameHeight: 61,
    idleFrames: 4,
    walkFrames: 0,
  },
  {
    id: "char_npc_3",
    name: "npc_3",
    frameWidth: 33,
    frameHeight: 62,
    idleFrames: 8,
    walkFrames: 0,
  },
  {
    id: "char_npc_4",
    name: "npc_4",
    frameWidth: 34,
    frameHeight: 62,
    idleFrames: 4,
    walkFrames: 0,
  },
  {
    id: "char_npc_5",
    name: "npc_5",
    frameWidth: 40,
    frameHeight: 62,
    idleFrames: 4,
    walkFrames: 0,
  },
  {
    id: "char_npc_6",
    name: "npc_6",
    frameWidth: 36,
    frameHeight: 61,
    idleFrames: 8,
    walkFrames: 0,
  },
  {
    id: "char_npc_7",
    name: "npc_7",
    frameWidth: 52,
    frameHeight: 63,
    idleFrames: 4,
    walkFrames: 0,
  },
  {
    id: "char_npc_8",
    name: "npc_8",
    frameWidth: 48,
    frameHeight: 62,
    idleFrames: 8,
    walkFrames: 0,
  },
  {
    id: "char_npc_9",
    name: "npc_9",
    frameWidth: 44,
    frameHeight: 61,
    idleFrames: 4,
    walkFrames: 0,
  },
  {
    id: "char_npc_10",
    name: "npc_10",
    frameWidth: 37,
    frameHeight: 63,
    idleFrames: 8,
    walkFrames: 0,
  },
];
