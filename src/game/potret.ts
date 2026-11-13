import type { Scene } from "@/story/schema";

/**
 * Apakah sebuah scene memberi giliran bicara kepada pemain (MC).
 *
 * Potret MC hanya menemani dialog kalau MC memang ikut bicara di scene itu.
 * Dialog antar-NPC yang tidak melibatkan pemain lebih rapi tanpa potret MC —
 * potret itu tidak sedang menanggapi apa pun. Obrolan singkat di luar cerita
 * (ADR 0016) sengaja dikecualikan pemanggilnya: di sana potret MC dipakai agar
 * layar tidak terasa sepi.
 */
export function sceneMelibatkanPemain(
  scene: Scene | null | undefined,
  playerId: string,
): boolean {
  if (!scene || !playerId) return false;
  return scene.beats.some(
    (beat) =>
      (beat.type === "dialogue" || beat.type === "narration") &&
      beat.speakerId === playerId,
  );
}
