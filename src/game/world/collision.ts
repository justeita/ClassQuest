/**
 * Tabrakan dunia desa — salinan rumus editor peta, tanpa fisika Phaser.
 *
 * Editor memakai satu sel grid kecil dan satu kotak kaki; rumusnya dites apa
 * adanya di sini supaya "nabrak benda tak terlihat" tidak mungkin muncul:
 * yang memblok hanya sel yang benar-benar dicat padat di editor, ditambah NPC
 * yang ditandai solid.
 *
 * Semua perhitungan memakai **titik kaki** pemain (`x`, `y`), bukan pusat
 * sprite. Kotak kakinya 16×9 px yang membentang **ke atas** dari titik itu:
 * `x ± 8` dan `y - 9 … y`.
 */

import type { WorldData, WorldNpc } from "./types";

/** Setengah lebar kotak kaki pemain (editor: `HW0 = 8`). */
export const KAKI_SETENGAH_LEBAR = 8;

/** Kedalaman kotak kaki pemain ke atas (editor: `HD0 = 9`). */
export const KAKI_DALAM = 9;

/** Titik kaki pemain menabrak sesuatu? */
export type Tabrakan = (x: number, y: number) => boolean;

/** Kotak kaki pemain menabrak kotak kaki sebuah NPC? (editor: `nHit`). */
function menabrakNpc(
  npc: Pick<WorldNpc, "x" | "y" | "solid">,
  x: number,
  y: number,
): boolean {
  return (
    x - KAKI_SETENGAH_LEBAR < npc.x + KAKI_SETENGAH_LEBAR &&
    x + KAKI_SETENGAH_LEBAR > npc.x - KAKI_SETENGAH_LEBAR &&
    y - KAKI_DALAM < npc.y &&
    y > npc.y - KAKI_DALAM
  );
}

/**
 * Bangun predikat tabrakan dari data dunia. Hasilnya fungsi murni dan murah:
 * satu `Set` sel padat dan satu daftar NPC solid, dihitung sekali.
 */
export function buatTabrakan(dunia: WorldData): Tabrakan {
  const padat = new Set(dunia.blocked);
  const npcPadat = dunia.npcs.filter((npc) => npc.solid === 1);

  return (x, y) => {
    const kolom0 = Math.floor((x - KAKI_SETENGAH_LEBAR) / dunia.cell.width);
    const kolom1 = Math.floor(
      (x + KAKI_SETENGAH_LEBAR - 0.01) / dunia.cell.width,
    );
    const baris0 = Math.floor((y - KAKI_DALAM) / dunia.cell.height);
    const baris1 = Math.floor((y - 0.01) / dunia.cell.height);

    for (let baris = baris0; baris <= baris1; baris += 1) {
      for (let kolom = kolom0; kolom <= kolom1; kolom += 1) {
        if (padat.has(`${kolom},${baris}`)) return true;
      }
    }

    return npcPadat.some((npc) => menabrakNpc(npc, x, y));
  };
}
