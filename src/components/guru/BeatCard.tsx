"use client";

import type { Beat, Expression, Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

import { ChallengeForm } from "./ChallengeForm";
import {
  CharCount,
  Field,
  FieldError,
  MiniButton,
  MoveButton,
  fieldClass,
} from "./EditorField";
import { SelectMenu } from "./SelectMenu";
import {
  BEAT_TEXT_MAX,
  BEAT_TYPE_LABELS,
  CHALLENGE_TYPE_LABELS,
  EXPRESSION_LABELS,
  challengeById,
  createChallengeForBeat,
  issuesAt,
  moveBeat,
  removeBeat,
  selectableChallenges,
  setBeatChallenge,
  updateBeat,
} from "./storyEditorState";

/**
 * Satu beat di dalam scene.
 *
 * Field yang bisa diedit mengikuti tabel "Edit beat" di
 * `docs/05-frontend/story-editor.md`. Field lain yang dibuat AI (mis.
 * `textVariants`, `onWrong`, `maxAttempts`) **tidak dihapus** saat teks diubah:
 * guru hanya menyunting yang dia pahami, sisanya tetap utuh sampai AI atau
 * versi berikutnya menggantinya.
 */
export function BeatCard({
  story,
  chapterIndex,
  sceneIndex,
  beatIndex,
  beat,
  issues,
  canMoveUp,
  canMoveDown,
  canDelete,
  onChange,
}: {
  story: Story;
  chapterIndex: number;
  sceneIndex: number;
  beatIndex: number;
  beat: Beat;
  issues: readonly ValidationIssue[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onChange: (story: Story) => void;
}) {
  const prefix = `chapters[${chapterIndex}].scenes[${sceneIndex}].beats[${beatIndex}]`;
  const beatIssues = issuesAt(issues, prefix);
  const errorsFor = (path: string): string[] =>
    issues
      .filter((issue) => issue.severity === "error" && issue.path === path)
      .map((issue) => issue.message);

  const setBeat = (next: Beat) =>
    onChange(updateBeat(story, chapterIndex, sceneIndex, beatIndex, next));

  const currentBeat =
    story.chapters[chapterIndex]?.scenes[sceneIndex]?.beats[beatIndex];
  const beatChallengeId =
    currentBeat?.type === "challenge" ? currentBeat.challengeId : undefined;

  const speakerOptions = story.cast.map((character) => ({
    value: character.id,
    label: character.name,
    hint: character.role,
  }));

  const expressionOptions = Object.entries(EXPRESSION_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  const challengeOptions = selectableChallenges(
    story,
    beatChallengeId ?? "",
  ).map((challenge) => ({
    value: challenge.id,
    label:
      challenge.prompt.length > 56
        ? `${challenge.prompt.slice(0, 56)}…`
        : challenge.prompt,
    hint: CHALLENGE_TYPE_LABELS[challenge.type],
  }));

  return (
    <article
      id={`beat-${chapterIndex}-${sceneIndex}-${beatIndex}`}
      data-testid="beat-card"
      className={`scroll-mt-24 space-y-2 rounded-xl border-2 bg-white p-3 ${
        beatIssues.some((issue) => issue.severity === "error")
          ? "border-rose-300"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-pixel text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Beat {beatIndex + 1}
          </span>
          <span className="rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
            {BEAT_TYPE_LABELS[beat.type]}
          </span>
          {beatIssues.some((issue) => issue.severity === "error") ? (
            <span className="rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              perlu diperbaiki
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <MoveButton
            label={`Pindahkan beat ${beatIndex + 1} ke atas`}
            icon="fa-arrow-up"
            disabled={!canMoveUp}
            onClick={() =>
              onChange(moveBeat(story, chapterIndex, sceneIndex, beatIndex, -1))
            }
          />
          <MoveButton
            label={`Pindahkan beat ${beatIndex + 1} ke bawah`}
            icon="fa-arrow-down"
            disabled={!canMoveDown}
            onClick={() =>
              onChange(moveBeat(story, chapterIndex, sceneIndex, beatIndex, 1))
            }
          />
          <button
            type="button"
            onClick={() =>
              onChange(removeBeat(story, chapterIndex, sceneIndex, beatIndex))
            }
            disabled={!canDelete}
            aria-label={`Hapus beat ${beatIndex + 1}`}
            className="guru-press flex h-6 w-6 items-center justify-center rounded-lg border-2 border-rose-200 text-[10px] text-rose-500 transition hover:border-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="fa-solid fa-trash-can" aria-hidden />
          </button>
        </div>
      </div>

      {beat.type === "narration" ? (
        <Field
          id={`${prefix}-text`}
          label="Teks narasi"
          problem={errorsFor(`${prefix}.text`).length > 0}
          count={<CharCount value={beat.text} max={BEAT_TEXT_MAX} />}
        >
          <textarea
            id={`${prefix}-text`}
            rows={3}
            value={beat.text}
            onChange={(event) => setBeat({ ...beat, text: event.target.value })}
            className={fieldClass(errorsFor(`${prefix}.text`).length > 0)}
          />
          <FieldError messages={errorsFor(`${prefix}.text`)} />
          {beat.speakerId ? (
            <p className="text-[10px] text-slate-400">
              Narasi ini menampilkan potret{" "}
              {story.cast.find((character) => character.id === beat.speakerId)
                ?.name ?? beat.speakerId}
              .
            </p>
          ) : null}
        </Field>
      ) : null}

      {beat.type === "dialogue" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor={`${prefix}-speaker`}
                className="text-[11px] font-bold text-slate-700"
              >
                Pembicara
              </label>
              <SelectMenu
                id={`${prefix}-speaker`}
                value={beat.speakerId}
                options={speakerOptions}
                onChange={(speakerId) => setBeat({ ...beat, speakerId })}
              />
              <FieldError messages={errorsFor(`${prefix}.speakerId`)} />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${prefix}-expression`}
                className="text-[11px] font-bold text-slate-700"
              >
                Ekspresi
              </label>
              <SelectMenu
                id={`${prefix}-expression`}
                value={beat.expression ?? "neutral"}
                options={expressionOptions}
                onChange={(value) =>
                  setBeat({ ...beat, expression: value as Expression })
                }
              />
            </div>
          </div>

          <Field
            id={`${prefix}-text`}
            label="Teks dialog"
            problem={errorsFor(`${prefix}.text`).length > 0}
            count={<CharCount value={beat.text} max={BEAT_TEXT_MAX} />}
          >
            <textarea
              id={`${prefix}-text`}
              rows={3}
              value={beat.text}
              onChange={(event) =>
                setBeat({ ...beat, text: event.target.value })
              }
              className={fieldClass(errorsFor(`${prefix}.text`).length > 0)}
            />
            <FieldError messages={errorsFor(`${prefix}.text`)} />
          </Field>

          {beat.textVariants && beat.textVariants.length > 0 ? (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-800">
              Dialog ini punya {beat.textVariants.length} varian teks dari AI
              untuk jawaban tertentu. Varian tetap dipakai; yang diubah di sini
              adalah teks utamanya.
            </p>
          ) : null}
        </div>
      ) : null}

      {beat.type === "transition" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="space-y-1">
            <label
              htmlFor={`${prefix}-effect`}
              className="text-[11px] font-bold text-slate-700"
            >
              Efek
            </label>
            <SelectMenu
              id={`${prefix}-effect`}
              value={beat.effect}
              options={[
                { value: "fade", label: "Pudar (fade)" },
                { value: "cut", label: "Potong (cut)" },
              ]}
              onChange={(effect) =>
                setBeat({ ...beat, effect: effect as "fade" | "cut" })
              }
            />
          </div>

          <Field
            id={`${prefix}-text`}
            label="Teks transisi (opsional)"
            count={<CharCount value={beat.text ?? ""} max={BEAT_TEXT_MAX} />}
          >
            <input
              id={`${prefix}-text`}
              value={beat.text ?? ""}
              onChange={(event) => {
                const text = event.target.value;
                // `strictObject` + JSON tidak punya `undefined`: teks kosong
                // berarti field dihapus, bukan disimpan sebagai string kosong
                // (schema meminta minimal 1 karakter).
                setBeat({
                  type: "transition",
                  effect: beat.effect,
                  ...(text === "" ? {} : { text }),
                });
              }}
              className={fieldClass()}
            />
          </Field>
        </div>
      ) : null}

      {beat.type === "challenge" ? (
        <ChallengeBeatFields
          story={story}
          chapterIndex={chapterIndex}
          sceneIndex={sceneIndex}
          beatIndex={beatIndex}
          challengeId={beat.challengeId}
          challengeOptions={challengeOptions}
          issues={issues}
          errorsFor={errorsFor}
          onChange={onChange}
        />
      ) : null}
    </article>
  );
}

/**
 * Isi beat `challenge`: pilih soal yang ada, buat soal baru, lalu sunting.
 *
 * Soal yang tidak ditemukan (mis. id yatim dari cerita lama) tetap ditampilkan
 * sebagai masalah, bukan membuat editor crash — guru bisa langsung memilih soal
 * lain lewat dropdown yang sama.
 */
function ChallengeBeatFields({
  story,
  chapterIndex,
  sceneIndex,
  beatIndex,
  challengeId,
  challengeOptions,
  issues,
  errorsFor,
  onChange,
}: {
  story: Story;
  chapterIndex: number;
  sceneIndex: number;
  beatIndex: number;
  challengeId: string;
  challengeOptions: { value: string; label: string; hint: string }[];
  issues: readonly ValidationIssue[];
  errorsFor: (path: string) => string[];
  onChange: (story: Story) => void;
}) {
  const challenge = challengeById(story, challengeId);
  const prefix = `chapters[${chapterIndex}].scenes[${sceneIndex}].beats[${beatIndex}]`;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label
          htmlFor={`${prefix}-challenge`}
          className="text-[11px] font-bold text-slate-700"
        >
          Soal yang dipakai
        </label>
        <SelectMenu
          id={`${prefix}-challenge`}
          value={challengeId}
          options={challengeOptions}
          placeholder="Pilih soal…"
          onChange={(next) =>
            onChange(
              setBeatChallenge(
                story,
                chapterIndex,
                sceneIndex,
                beatIndex,
                next,
              ),
            )
          }
        />
        <FieldError messages={errorsFor(`${prefix}.challengeId`)} />
        <MiniButton
          icon="fa-wand-magic-sparkles"
          onClick={() => {
            const result = createChallengeForBeat(
              story,
              chapterIndex,
              sceneIndex,
              beatIndex,
            );
            if (result.challengeId !== null) onChange(result.story);
          }}
        >
          Buat soal baru
        </MiniButton>
      </div>

      {challenge === null ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold leading-relaxed text-rose-700">
          Soal “{challengeId}” tidak ditemukan di cerita ini. Pilih soal lain
          atau buat soal baru.
        </p>
      ) : (
        <ChallengeForm
          story={story}
          challenge={challenge}
          issues={issues}
          onChange={onChange}
        />
      )}
    </div>
  );
}
