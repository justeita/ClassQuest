import type { Chapter, Scene, Story } from "@/story/schema";

import type { WorldNpc } from "./world/types";
import type { StoryRunnerState } from "./StoryRunner";

/**
 * Quest diturunkan dari scene, bukan field baru di Story JSON.
 *
 * Satu scene = satu quest. Urutan quest mengikuti urutan scene di chapter,
 * sesuai alur linear ADR 0008. Status dihitung dari posisi runner, sedangkan
 * jumlah tantangan yang sudah dijawab diambil dari `AnswerLog`.
 */

export type QuestStatus = "selesai" | "aktif" | "terkunci";

export type QuestTantangan = {
  total: number;
  dijawab: number;
};

export type QuestView = {
  id: string;
  title: string;
  status: QuestStatus;
  tantangan: QuestTantangan;
};

export type QuestState = {
  chapterNumber: number;
  chapterTotal: number;
  chapterTitle: string;
  sceneTitle: string;
  quests: QuestView[];
  activeQuestId: string | null;
};

/** Judul quest: judul scene, atau judul chapter bila scene tidak punya judul. */
export function judulQuest(scene: Scene, chapter: Chapter): string {
  return scene.title?.trim() || chapter.title;
}

/** Id tantangan yang muncul di beat sebuah scene. */
function tantanganScene(scene: Scene): string[] {
  return scene.beats
    .filter((beat) => beat.type === "challenge")
    .map((beat) => beat.challengeId);
}

/**
 * Bangun daftar quest untuk chapter aktif, atau `null` saat cerita selesai.
 *
 * @param terjawab Predikat "tantangan ini sudah pernah dijawab" dari AnswerLog.
 */
export function buildQuestState(
  story: Story,
  state: StoryRunnerState,
  terjawab: (challengeId: string) => boolean,
): QuestState | null {
  const chapter = state.chapter;
  if (!chapter) return null;

  const diAkhirBab = state.phase === "chapter_end" || state.sceneIndex === -1;

  const quests: QuestView[] = chapter.scenes.map((scene, index) => {
    const ids = tantanganScene(scene);
    const status: QuestStatus = diAkhirBab
      ? "selesai"
      : index < state.sceneIndex
        ? "selesai"
        : index === state.sceneIndex
          ? "aktif"
          : "terkunci";

    return {
      id: scene.id,
      title: judulQuest(scene, chapter),
      status,
      tantangan: {
        total: ids.length,
        dijawab: ids.filter((id) => terjawab(id)).length,
      },
    };
  });

  const sceneAktif =
    !diAkhirBab && state.sceneIndex >= 0
      ? chapter.scenes[state.sceneIndex]
      : null;

  return {
    chapterNumber: state.chapterNumber,
    chapterTotal: state.chapterTotal,
    chapterTitle: chapter.title,
    sceneTitle: sceneAktif ? judulQuest(sceneAktif, chapter) : chapter.title,
    quests,
    activeQuestId: sceneAktif?.id ?? null,
  };
}

/**
 * NPC yang memegang quest aktif.
 *
 * Pilih pembicara dialog pertama di scene yang benar-benar ada di ruangan.
 * Kalau scene hanya berisi narasi/tantangan, atau pembicaranya tidak hadir,
 * pakai NPC pertama supaya pemain tidak pernah buntu.
 */
export function pilihPemberiQuest(
  scene: Scene | null | undefined,
  npcs: Pick<WorldNpc, "id">[],
): string | null {
  if (npcs.length === 0) return null;
  if (!scene) return npcs[0]!.id;

  const hadir = new Set(npcs.map((npc) => npc.id));
  for (const beat of scene.beats) {
    if (beat.type !== "dialogue") continue;
    if (hadir.has(beat.speakerId)) return beat.speakerId;
  }

  return npcs[0]!.id;
}
