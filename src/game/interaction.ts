import type { RoomMap } from "./map";

/**
 * Zona interaksi NPC (ADR 0008): pemain yang cukup dekat dengan NPC bisa
 * memicu deretan beat scene lewat `StoryRunner.interact()`.
 * Pencarian NPC berbasis jarak — murni, tanpa fisika tambahan.
 *
 * Prompt "Space" tidak lagi digambar di canvas; modul ini hanya menghitung
 * posisinya. React (`InteractHint.tsx`) yang menggambar chip teksnya supaya
 * tajam — lihat ADR 0007.
 */

/** Jarak zona interaksi: 1,5 tile = 24 px (world-design.md § Satuan dasar). */
export const ZONA_RADIUS = 24;

/** Teks prompt; tombol yang sama dipakai `GameScene` untuk memicu dialog. */
export const PROMPT_INTERAKSI = "Space";

export type PromptHint = {
  text: string;
  /** Koordinat pusat chip dalam piksel internal 640×360. */
  x: number;
  y: number;
};

/** NPC terdekat yang berada di dalam zona; null kalau tidak ada. */
export function findNpcInZone(
  map: RoomMap,
  playerX: number,
  playerY: number,
  radius = ZONA_RADIUS,
): string | null {
  let terdekat: { id: string; jarak: number } | null = null;

  for (const npc of map.npcs) {
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
 * `12` px adalah jarak chip ke ubun-ubun sprite 24×32.
 */
export function posisiPrompt(map: RoomMap, npcId: string): PromptHint | null {
  const npc = map.npcs.find((entry) => entry.id === npcId);
  if (!npc) return null;

  return {
    text: PROMPT_INTERAKSI,
    x: npc.x,
    y: npc.y - npc.height / 2 - 12,
  };
}
