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

/** Teks prompt; tombol yang sama dipakai `GameScene` untuk memicu dialog. */
export const PROMPT_INTERAKSI = "Space";

/** Jarak chip prompt dari ubun-ubun sprite karakter, dalam piksel. */
export const JARAK_PROMPT = 8;

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
 * Posisi chip prompt di atas kepala NPC, dalam koordinat internal.
 * Sprite dijangkar di titik kaki, jadi ubun-ubunnya `TINGGI_KARAKTER` px di
 * atas titik itu; chip diletakkan sedikit di atasnya.
 */
export function posisiPrompt(
  npcs: Pick<WorldNpc, "id" | "x" | "y">[],
  npcId: string,
): PromptHint | null {
  const npc = npcs.find((entry) => entry.id === npcId);
  if (!npc) return null;

  return {
    text: PROMPT_INTERAKSI,
    x: npc.x,
    y: npc.y - TINGGI_KARAKTER - JARAK_PROMPT,
  };
}
