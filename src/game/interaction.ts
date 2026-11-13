import { TINGGI_KARAKTER } from "./world/karakter";
import type { WorldNpc } from "./world/types";

/**
 * Zona interaksi NPC (ADR 0008): pemain yang cukup dekat dengan NPC bisa
 * memicu deretan beat scene lewat `StoryRunner.interact()`.
 * Pencarian NPC berbasis jarak dari titik kaki — murni, tanpa fisika tambahan.
 *
 * Prompt "Space" tidak lagi digambar di canvas; modul ini hanya menghitung
 * posisinya. React (`InteractHint.tsx`) yang menggambar chip teksnya supaya
 * tajam — lihat ADR 0007.
 */

/** Jarak zona interaksi: 24 px dari titik kaki pemain ke titik kaki NPC. */
export const ZONA_RADIUS = 24;

/**
 * Jarak tambahan sebelum chip `Space` hilang lagi.
 *
 * Tanpa histeresis, pemain yang berdiri tepat di batas 24 px membuat chip
 * berkedip: satu frame di dalam zona, frame berikutnya di luar. Chip baru
 * hilang setelah jaraknya melewati 32 px, jadi tampil-hilangnya tenang.
 */
export const ZONA_HISTERESIS = 8;

/** Teks prompt; tombol yang sama dipakai `GameScene` untuk memicu dialog. */
export const PROMPT_INTERAKSI = "Space";

/**
 * Jarak chip prompt dari ubun-ubun sprite karakter, dalam piksel.
 *
 * Papan nama NPC digambar tepat di atas kepala (lihat `JARAK_NAMA` di
 * `GameScene`), jadi chip dinaikkan melewatinya: dengan 22 px chip duduk di
 * samping kotak `!` dan tidak menutupi nama.
 */
export const JARAK_PROMPT = 22;

/**
 * Geser chip ke kanan penanda `!`.
 *
 * Penanda quest tidak lagi disembunyikan saat pemain mendekat: `!` tetap di
 * atas kepala dan chip `Space` muncul di sampingnya. Dua tanda yang berdiri
 * sendiri-sendiri membuat indikator quest tidak berkedip hilang-muncul.
 */
export const GESER_PROMPT = 14;

export type PromptHint = {
  text: string;
  /** Koordinat pusat chip dalam piksel internal 640×360. */
  x: number;
  y: number;
};

/**
 * NPC terdekat yang berada di dalam zona; null kalau tidak ada.
 *
 * Yang diukur jarak antara **titik kaki** pemain dan titik kaki NPC, sama
 * seperti tabrakan, supaya pemain bisa berdiri di samping NPC yang tinggi
 * tanpa terasa "jauh".
 */
export function findNpcInZone(
  npcs: Pick<WorldNpc, "id" | "x" | "y">[],
  playerX: number,
  playerY: number,
  radius = ZONA_RADIUS,
): string | null {
  let terdekat: { id: string; jarak: number } | null = null;

  for (const npc of npcs) {
    const dx = npc.x - playerX;
    const dy = npc.y - playerY;
    const jarak = Math.hypot(dx, dy);
    if (jarak <= radius && (terdekat === null || jarak < terdekat.jarak)) {
      terdekat = { id: npc.id, jarak };
    }
  }

  return terdekat?.id ?? null;
}

/**
 * Posisi chip prompt di kanan penanda `!`, dalam koordinat internal.
 * Sprite dijangkar di titik kaki, jadi ubun-ubunnya `TINGGI_KARAKTER` px di
 * atas titik itu; chip diletakkan sedikit di atasnya dan digeser ke kanan
 * supaya tidak menutupi penanda quest.
 */
export function posisiPrompt(
  npcs: Pick<WorldNpc, "id" | "x" | "y">[],
  npcId: string,
): PromptHint | null {
  const npc = npcs.find((entry) => entry.id === npcId);
  if (!npc) return null;

  return {
    text: PROMPT_INTERAKSI,
    x: npc.x + GESER_PROMPT,
    y: npc.y - TINGGI_KARAKTER - JARAK_PROMPT,
  };
}
