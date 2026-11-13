import type { Character } from "@/story/schema";

import type { WorldNpc } from "./world/types";

/**
 * Obrolan singkat NPC (ADR 0016).
 *
 * Di fase `explore`, NPC yang **bukan** pemberi quest scene aktif tetap bisa
 * diajak bicara bila `story.cast` memberi mereka `smallTalk`. Baris itu tidak
 * mengubah posisi cerita — hanya satu kalimat yang muncul di textbox, lalu
 * pemain lanjut berjalan.
 *
 * Modul ini murni: menyiapkan peta id → baris obrolan dan menyaring NPC mana
 * yang punya sesuatu untuk dikatakan. `GameScene` yang memutuskan kapan
 * prompt dan textbox muncul.
 */

/** Karakter dengan baris obrolan; hanya `smallTalk` yang tidak kosong. */
export function petaObrolan(
  cast: readonly Pick<Character, "id" | "smallTalk">[],
): Map<string, string> {
  const peta = new Map<string, string>();

  for (const karakter of cast) {
    const teks = karakter.smallTalk?.trim();
    if (teks) peta.set(karakter.id, teks);
  }

  return peta;
}

/**
 * NPC yang punya sesuatu untuk dikatakan: pemberi quest aktif, atau karakter
 * dengan baris obrolan. NPC lain tetap berdiri sebagai penghalang, tetapi
 * tidak memunculkan prompt.
 */
export function npcBisaDiajak<T extends Pick<WorldNpc, "id">>(
  npcs: readonly T[],
  pemberiQuest: string | null,
  obrolan: ReadonlyMap<string, string>,
): T[] {
  return npcs.filter((npc) => npc.id === pemberiQuest || obrolan.has(npc.id));
}
