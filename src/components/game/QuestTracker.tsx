"use client";

import { ukuranHuruf } from "@/game/layout";
import type { QuestState, QuestStatus } from "@/game/questLog";

type QuestTrackerProps = {
  /** Quest chapter aktif dari event `quest`; null sebelum game siap. */
  view: QuestState | null;
};

const IKON: Record<QuestStatus, string> = {
  selesai: "✓",
  aktif: "▶",
  terkunci: "·",
};

const LABEL: Record<QuestStatus, string> = {
  selesai: "Selesai",
  aktif: "Aktif",
  terkunci: "Terkunci",
};

/**
 * Panel quest turunan scene (bukan field baru di Story JSON).
 *
 * Satu scene = satu quest. Panel ini menggantikan teks chapter yang dulu
 * menetap di HUD, dan ikut berubah saat runner pindah scene.
 */
export function QuestTracker({ view }: QuestTrackerProps) {
  if (!view) return null;

  return (
    <aside
      aria-label="Daftar quest"
      className="pointer-events-none absolute left-2 top-2 z-20 w-[32%] max-w-[17rem] border border-[#3D4B41] bg-[#0b120e]/85 px-2 py-1.5 font-game leading-tight text-[#F7F4EC]"
    >
      <p
        aria-live="polite"
        className="uppercase tracking-[0.12em]"
        style={{ fontSize: ukuranHuruf(11, 9, 15) }}
      >
        Chapter {view.chapterNumber}/{view.chapterTotal}
      </p>
      <p
        className="mt-0.5 truncate text-[#D9E4DA]"
        style={{ fontSize: ukuranHuruf(12, 10, 17) }}
      >
        {view.sceneTitle}
      </p>

      <ol
        className="mt-1 space-y-0.5"
        style={{ fontSize: ukuranHuruf(11, 9, 15) }}
      >
        {view.quests.map((quest) => (
          <li
            key={quest.id}
            className={
              quest.status === "aktif"
                ? "text-[#F7F4EC]"
                : quest.status === "selesai"
                  ? "text-[#A9BDB0]"
                  : "text-[#7C8A80]"
            }
          >
            <span aria-hidden="true" className="mr-1">
              {IKON[quest.status]}
            </span>
            <span className="sr-only">{LABEL[quest.status]}: </span>
            <span className="break-words">{quest.title}</span>
            {quest.tantangan.total > 0 && (
              <span className="ml-1 text-[#8FA396]">
                ({quest.tantangan.dijawab}/{quest.tantangan.total})
              </span>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
