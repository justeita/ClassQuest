"use client";

import { BACKGROUNDS, MUSIC } from "@/assets/manifest";
import type { Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

import { BeatCard } from "./BeatCard";
import {
  CharCount,
  Field,
  FieldError,
  MiniButton,
  fieldClass,
} from "./EditorField";
import { SelectMenu } from "./SelectMenu";
import {
  BEATS_PER_SCENE_MAX,
  BEATS_PER_SCENE_MIN,
  CHAPTER_SUMMARY_MAX,
  addBeat,
  addChallengeBeat,
  canAddBeat,
  issuesAt,
  moveScene,
  updateChapter,
  updateScene,
} from "./storyEditorState";

/**
 * Panel kanan editor: pengaturan chapter (dilipat) + scene yang sedang dipilih.
 *
 * Yang bisa diubah di sini sengaja dibatasi pada **isi**: judul, ringkasan,
 * latar/musik, dan beat. Menambah/menghapus chapter atau scene tidak ada di
 * MVP (`docs/05-frontend/story-editor.md` bagian "Yang tidak dikerjakan"),
 * karena struktur itu ditentukan AI dan mengubahnya butuh penataan ulang soal.
 */
export function SceneEditor({
  story,
  chapterIndex,
  sceneIndex,
  issues,
  onChange,
}: {
  story: Story;
  chapterIndex: number;
  sceneIndex: number;
  issues: readonly ValidationIssue[];
  onChange: (story: Story) => void;
}) {
  const chapter = story.chapters[chapterIndex];
  const scene = chapter?.scenes[sceneIndex];
  if (!chapter || !scene) return null;

  const scenePrefix = `chapters[${chapterIndex}].scenes[${sceneIndex}]`;
  const chapterPrefix = `chapters[${chapterIndex}]`;

  const errorsFor = (path: string): string[] =>
    issues
      .filter((issue) => issue.severity === "error" && issue.path === path)
      .map((issue) => issue.message);

  const sceneErrors = issuesAt(issues, scenePrefix).filter(
    (issue) => issue.severity === "error" && !issue.path.includes(".beats["),
  );

  const backgroundOptions = [
    {
      value: "",
      label: "Ikut chapter",
      hint:
        BACKGROUNDS.find((asset) => asset.id === chapter.backgroundId)?.label ??
        chapter.backgroundId,
    },
    ...BACKGROUNDS.map((asset) => ({
      value: asset.id,
      label: asset.label,
      hint: asset.id,
    })),
  ];

  const musicOptions = [
    {
      value: "",
      label: "Ikut chapter",
      hint:
        MUSIC.find((asset) => asset.id === chapter.musicId)?.label ??
        chapter.musicId,
    },
    ...MUSIC.map((asset) => ({
      value: asset.id,
      label: asset.label,
      hint: asset.id,
    })),
  ];

  return (
    <div
      id={`scene-${chapterIndex}-${sceneIndex}`}
      className="scroll-mt-24 space-y-4"
    >
      <details className="rounded-2xl border-2 border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-slate-700">
          Pengaturan chapter {chapterIndex + 1}: {chapter.title}
        </summary>

        <div className="space-y-3 border-t-2 border-slate-100 p-4">
          <Field
            id={`${chapterPrefix}-title`}
            label="Judul chapter"
            problem={errorsFor(`${chapterPrefix}.title`).length > 0}
            count={<CharCount value={chapter.title} max={60} />}
          >
            <input
              id={`${chapterPrefix}-title`}
              value={chapter.title}
              onChange={(event) =>
                onChange(
                  updateChapter(story, chapterIndex, {
                    title: event.target.value,
                  }),
                )
              }
              className={fieldClass(
                errorsFor(`${chapterPrefix}.title`).length > 0,
              )}
            />
            <FieldError messages={errorsFor(`${chapterPrefix}.title`)} />
          </Field>

          <Field
            id={`${chapterPrefix}-summary`}
            label="Ringkasan chapter"
            problem={errorsFor(`${chapterPrefix}.summary`).length > 0}
            count={
              <CharCount value={chapter.summary} max={CHAPTER_SUMMARY_MAX} />
            }
          >
            <textarea
              id={`${chapterPrefix}-summary`}
              rows={2}
              value={chapter.summary}
              onChange={(event) =>
                onChange(
                  updateChapter(story, chapterIndex, {
                    summary: event.target.value,
                  }),
                )
              }
              className={fieldClass(
                errorsFor(`${chapterPrefix}.summary`).length > 0,
              )}
            />
            <FieldError messages={errorsFor(`${chapterPrefix}.summary`)} />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor={`${chapterPrefix}-concept`}
                className="text-[11px] font-bold text-slate-700"
              >
                Konsep chapter
              </label>
              <SelectMenu
                id={`${chapterPrefix}-concept`}
                value={chapter.concept}
                options={story.source.concepts.map((concept) => ({
                  value: concept,
                  label: concept,
                }))}
                onChange={(concept) =>
                  onChange(updateChapter(story, chapterIndex, { concept }))
                }
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${chapterPrefix}-background`}
                className="text-[11px] font-bold text-slate-700"
              >
                Latar chapter
              </label>
              <SelectMenu
                id={`${chapterPrefix}-background`}
                value={chapter.backgroundId}
                options={backgroundOptions.filter(
                  (option) => option.value !== "",
                )}
                onChange={(backgroundId) =>
                  onChange(updateChapter(story, chapterIndex, { backgroundId }))
                }
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${chapterPrefix}-music`}
                className="text-[11px] font-bold text-slate-700"
              >
                Musik chapter
              </label>
              <SelectMenu
                id={`${chapterPrefix}-music`}
                value={chapter.musicId}
                options={musicOptions.filter((option) => option.value !== "")}
                onChange={(musicId) =>
                  onChange(updateChapter(story, chapterIndex, { musicId }))
                }
              />
            </div>
          </div>
        </div>
      </details>

      <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
          <div>
            <p className="font-pixel text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Scene {sceneIndex + 1} dari {chapter.scenes.length}
            </p>
            <h3 className="font-heading text-base font-bold text-slate-900">
              {scene.title ?? `Scene ${sceneIndex + 1}`}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <MiniButton
              icon="fa-arrow-up"
              disabled={sceneIndex === 0}
              onClick={() =>
                onChange(moveScene(story, chapterIndex, sceneIndex, -1))
              }
            >
              Naik
            </MiniButton>
            <MiniButton
              icon="fa-arrow-down"
              disabled={sceneIndex === chapter.scenes.length - 1}
              onClick={() =>
                onChange(moveScene(story, chapterIndex, sceneIndex, 1))
              }
            >
              Turun
            </MiniButton>
          </div>
        </div>

        <Field
          id={`${scenePrefix}-title`}
          label="Judul scene (opsional)"
          count={<CharCount value={scene.title ?? ""} max={60} />}
        >
          <input
            id={`${scenePrefix}-title`}
            value={scene.title ?? ""}
            onChange={(event) => {
              const title = event.target.value;
              onChange(
                updateScene(story, chapterIndex, sceneIndex, {
                  title: title === "" ? undefined : title,
                }),
              );
            }}
            className={fieldClass()}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor={`${scenePrefix}-background`}
              className="text-[11px] font-bold text-slate-700"
            >
              Latar scene
            </label>
            <SelectMenu
              id={`${scenePrefix}-background`}
              value={scene.backgroundId ?? ""}
              options={backgroundOptions}
              onChange={(value) =>
                onChange(
                  updateScene(story, chapterIndex, sceneIndex, {
                    backgroundId: value === "" ? undefined : value,
                  }),
                )
              }
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`${scenePrefix}-music`}
              className="text-[11px] font-bold text-slate-700"
            >
              Musik scene
            </label>
            <SelectMenu
              id={`${scenePrefix}-music`}
              value={scene.musicId ?? ""}
              options={musicOptions}
              onChange={(value) =>
                onChange(
                  updateScene(story, chapterIndex, sceneIndex, {
                    musicId: value === "" ? undefined : value,
                  }),
                )
              }
            />
          </div>
        </div>

        {sceneErrors.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-2.5">
            {sceneErrors.map((issue) => (
              <li
                key={`${issue.code}-${issue.path}`}
                className="text-[10px] font-semibold leading-relaxed text-rose-700"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Isi scene
            </h4>
            <span className="text-[10px] text-slate-400">
              {scene.beats.length}/{BEATS_PER_SCENE_MAX} beat
            </span>
          </div>

          {scene.beats.map((beat, beatIndex) => (
            <BeatCard
              key={`${scene.id}-beat-${beatIndex}`}
              story={story}
              chapterIndex={chapterIndex}
              sceneIndex={sceneIndex}
              beatIndex={beatIndex}
              beat={beat}
              issues={issues}
              canMoveUp={beatIndex > 0}
              canMoveDown={beatIndex < scene.beats.length - 1}
              canDelete={scene.beats.length > BEATS_PER_SCENE_MIN}
              onChange={onChange}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t-2 border-slate-100 pt-3">
          <MiniButton
            icon="fa-align-left"
            disabled={!canAddBeat(scene)}
            onClick={() =>
              onChange(addBeat(story, chapterIndex, sceneIndex, "narration"))
            }
          >
            Narasi
          </MiniButton>
          <MiniButton
            icon="fa-comment"
            disabled={!canAddBeat(scene)}
            onClick={() =>
              onChange(addBeat(story, chapterIndex, sceneIndex, "dialogue"))
            }
          >
            Dialog
          </MiniButton>
          <MiniButton
            icon="fa-circle-question"
            disabled={!canAddBeat(scene)}
            onClick={() => {
              const result = addChallengeBeat(story, chapterIndex, sceneIndex);
              if (result.challengeId !== null) onChange(result.story);
            }}
          >
            Soal
          </MiniButton>
          <MiniButton
            icon="fa-right-left"
            disabled={!canAddBeat(scene)}
            onClick={() =>
              onChange(addBeat(story, chapterIndex, sceneIndex, "transition"))
            }
          >
            Transisi
          </MiniButton>
          {!canAddBeat(scene) ? (
            <span className="text-[10px] text-amber-700">
              Batas {BEATS_PER_SCENE_MAX} beat per scene sudah tercapai.
            </span>
          ) : null}
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          Menambah atau menghapus chapter dan scene belum ada di editor ini.
          Kalau strukturnya perlu berubah, buat ulang materi lewat AI Studio.
        </p>
      </div>
    </div>
  );
}
