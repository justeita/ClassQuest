import Phaser from "phaser";

import type { RoomMap } from "./map";

/**
 * Zona interaksi NPC (ADR 0008): pemain yang cukup dekat dengan NPC bisa
 * memicu deretan beat scene lewat `StoryRunner.interact()`.
 * Pencarian NPC berbasis jarak — murni, tanpa fisika tambahan.
 */

/** Jarak pusat pemain ke pusat NPC untuk dianggap masuk zona (piksel). */
export const ZONA_RADIUS = 28;

const WARNA_PROMPT = "#F7F4EC";

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

export type InteractPrompt = {
  /** Tampilkan prompt di atas NPC yang sedang masuk zona. */
  showAt: (npcId: string) => void;
  hide: () => void;
};

/** Indikator "Space" kecil di atas NPC — gaya pixel ala Omori. */
export function createInteractPrompt(
  scene: Phaser.Scene,
  map: RoomMap,
): InteractPrompt {
  const prompt = scene.add
    .text(0, 0, "Space", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: WARNA_PROMPT,
      backgroundColor: "#14201a",
      padding: { x: 3, y: 2 },
    })
    .setOrigin(0.5)
    .setVisible(false)
    .setDepth(50);

  return {
    showAt(npcId) {
      const npc = map.npcs.find((entry) => entry.id === npcId);
      if (!npc) return;
      prompt.setPosition(npc.x, npc.y - npc.height / 2 - 12).setVisible(true);
    },
    hide() {
      prompt.setVisible(false);
    },
  };
}
