import type { Scene } from "@/story/schema";

/**
 * Apakah sebuah scene memberi giliran bicara kepada pemain (MC).
 *
 * Potret MC hanya menemani dialog kalau MC memang ikut bicara di scene itu.
 * Dialog antar-NPC yang tidak melibatkan pemain — dan obrolan singkat dengan
 * NPC non-quest (ADR 0016) — tampil tanpa potret MC, karena pemain tidak
 * sedang menanggapi apa pun di situ.
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
