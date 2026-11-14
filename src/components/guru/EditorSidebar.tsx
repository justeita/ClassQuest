"use client";

import type { Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

import { type EditorSelection, issuesAt } from "./storyEditorState";

/**
 * Panel kiri editor: pohon chapter → scene.
 *
 * Kenapa pohon, bukan daftar datar: guru mencari "dialog di scene 2 chapter 3",
 * bukan "beat ke-17". Badge jumlah masalah di tiap chapter dan scene membuat
 * lokasi masalah terlihat tanpa membuka semuanya.
 *
 * Tombol "Pengaturan cerita" di atas pohon memilih `null`, yaitu panel meta.
 */
export function EditorSidebar({
  story,
  issues,
  selection,
  onSelect,
}: {
  story: Story;
  issues: readonly ValidationIssue[];
  selection: EditorSelection;
  onSelect: (selection: EditorSelection) => void;
}) {
  const metaErrors = issuesAt(issues, "meta").filter(
    (issue) => issue.severity === "error",
  ).length;

  return (
    <nav
      aria-label="Struktur cerita"
      className="guru-scroll space-y-1 rounded-2xl border-2 border-slate-200 bg-white p-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={selection === null ? "true" : undefined}
        className={`guru-press flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
          selection === null
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <i className="fa-solid fa-sliders w-3.5 text-[11px]" aria-hidden />
        <span className="flex-1">Pengaturan cerita</span>
        {metaErrors > 0 ? (
          <span className="rounded-full bg-rose-600 px-1.5 py-0.5 font-pixel text-[9px] text-white">
            {metaErrors}
          </span>
        ) : null}
      </button>

      {story.chapters.map((chapter, chapterIndex) => {
        const chapterIssues = issuesAt(issues, `chapters[${chapterIndex}]`);
        const chapterErrors = chapterIssues.filter(
          (issue) => issue.severity === "error",
        ).length;

        return (
          <div key={chapter.id} className="space-y-1">
            <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Chapter {chapterIndex + 1}
              {chapterErrors > 0 ? (
                <span className="ml-1.5 inline-block rounded-full bg-rose-100 px-1.5 py-0.5 font-pixel text-[9px] text-rose-700">
                  {chapterErrors}
                </span>
              ) : null}
            </p>
            <p className="truncate px-3 text-[11px] font-semibold text-slate-500">
              {chapter.title}
            </p>

            {chapter.scenes.map((scene, sceneIndex) => {
              const scenePath = `chapters[${chapterIndex}].scenes[${sceneIndex}]`;
              const sceneErrors = issuesAt(issues, scenePath).filter(
                (issue) => issue.severity === "error",
              ).length;
              const isActive =
                selection !== null &&
                selection.chapterIndex === chapterIndex &&
                selection.sceneIndex === sceneIndex;

              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => onSelect({ chapterIndex, sceneIndex })}
                  aria-current={isActive ? "true" : undefined}
                  className={`guru-press flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-brand-50 text-slate-900 ring-2 ring-inset ring-brand-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="w-3.5 shrink-0 text-center font-pixel text-[9px] text-slate-400">
                    {sceneIndex + 1}
                  </span>
                  <span className="flex-1 truncate">
                    {scene.title ?? `Scene ${sceneIndex + 1}`}
                  </span>
                  {sceneErrors > 0 ? (
                    <span className="shrink-0 rounded-full bg-rose-100 px-1.5 font-pixel text-[9px] text-rose-700">
                      {sceneErrors}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
