"use client";

import type { Challenge, Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

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
  CHALLENGE_EXPLANATION_MAX,
  CHALLENGE_ITEM_TEXT_MAX,
  CHALLENGE_OPTIONS_MAX,
  CHALLENGE_OPTIONS_MIN,
  CHALLENGE_PROMPT_MAX,
  CHALLENGE_STATEMENT_MAX,
  CHALLENGE_TYPE_LABELS,
  DIFFICULTY_LABELS,
  SHORT_ANSWER_TEXT_MAX,
  SHORT_ANSWERS_MAX,
  addAcceptedAnswer,
  addOption,
  addOrderingItem,
  changeChallengeType,
  moveOrderingItem,
  orderingSequence,
  removeAcceptedAnswer,
  removeOption,
  removeOrderingItem,
  setAcceptedAnswer,
  setOptionText,
  setOrderingText,
  setTrueFalseAnswer,
  updateChallenge,
  updateChallengeBase,
} from "./storyEditorState";

const TYPES: Challenge["type"][] = [
  "multiple_choice",
  "true_false",
  "ordering",
  "short_answer",
];

/**
 * Form satu soal, apa pun tipenya.
 *
 * Bentuk form mengikuti `docs/05-frontend/story-editor.md` bagian "Edit
 * tantangan". Yang dijaga:
 *
 * - **Tidak ada input bebas untuk id.** Konsep dipilih dari konsep materi,
 *   tipe dari empat tipe yang dikenal schema.
 * - **Batas jumlah terlihat sebagai tombol nonaktif**, bukan pesan error baru
 *   setelah menekan: guru tahu kenapa tombolnya mati.
 * - **Mengganti tipe diberi peringatan** karena isian khusus tipe lama tidak
 *   bisa dipertahankan.
 */
export function ChallengeForm({
  story,
  challenge,
  issues,
  onChange,
}: {
  story: Story;
  challenge: Challenge;
  issues: readonly ValidationIssue[];
  onChange: (story: Story) => void;
}) {
  const index = story.challenges.findIndex((item) => item.id === challenge.id);
  const prefix = `challenges[${index}]`;

  const errorsFor = (path: string): string[] =>
    issues
      .filter((issue) => issue.severity === "error" && issue.path === path)
      .map((issue) => issue.message);

  const conceptOptions = story.source.concepts.map((concept) => ({
    value: concept,
    label: concept,
  }));

  const difficultyOptions = ([1, 2, 3] as const).map((value) => ({
    value: String(value),
    label: DIFFICULTY_LABELS[value],
  }));

  const setBase = (patch: Parameters<typeof updateChallengeBase>[2]) =>
    onChange(updateChallengeBase(story, challenge.id, patch));

  return (
    <div className="space-y-3 rounded-xl border-2 border-slate-200 bg-slate-50/60 p-3">
      <Field
        id={`${prefix}-prompt`}
        label="Pertanyaan"
        problem={errorsFor(`${prefix}.prompt`).length > 0}
        count={
          <CharCount value={challenge.prompt} max={CHALLENGE_PROMPT_MAX} />
        }
      >
        <textarea
          id={`${prefix}-prompt`}
          rows={2}
          value={challenge.prompt}
          onChange={(event) => setBase({ prompt: event.target.value })}
          className={fieldClass(errorsFor(`${prefix}.prompt`).length > 0)}
        />
        <FieldError messages={errorsFor(`${prefix}.prompt`)} />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor={`${prefix}-concept`}
            className="text-[11px] font-bold text-slate-700"
          >
            Konsep
          </label>
          <SelectMenu
            id={`${prefix}-concept`}
            value={challenge.conceptTag}
            options={conceptOptions}
            onChange={(conceptTag) => setBase({ conceptTag })}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`${prefix}-difficulty`}
            className="text-[11px] font-bold text-slate-700"
          >
            Kesulitan
          </label>
          <SelectMenu
            id={`${prefix}-difficulty`}
            value={String(challenge.difficulty)}
            options={difficultyOptions}
            onChange={(value) =>
              setBase({ difficulty: Number(value) as 1 | 2 | 3 })
            }
          />
        </div>

        <Field id={`${prefix}-points`} label="Poin (opsional)">
          <input
            id={`${prefix}-points`}
            type="number"
            min={0}
            step={1}
            value={challenge.points ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              setBase({
                points: raw === "" ? undefined : Math.max(0, Number(raw)),
              });
            }}
            className={fieldClass()}
          />
        </Field>
      </div>

      <Field
        id={`${prefix}-explanation`}
        label="Penjelasan jawaban"
        problem={errorsFor(`${prefix}.explanation`).length > 0}
        count={
          <CharCount
            value={challenge.explanation}
            max={CHALLENGE_EXPLANATION_MAX}
          />
        }
      >
        <textarea
          id={`${prefix}-explanation`}
          rows={2}
          value={challenge.explanation}
          onChange={(event) => setBase({ explanation: event.target.value })}
          className={fieldClass(errorsFor(`${prefix}.explanation`).length > 0)}
        />
        <FieldError messages={errorsFor(`${prefix}.explanation`)} />
      </Field>

      <div className="space-y-1">
        <label
          htmlFor={`${prefix}-type`}
          className="text-[11px] font-bold text-slate-700"
        >
          Jenis soal
        </label>
        <SelectMenu
          id={`${prefix}-type`}
          value={challenge.type}
          options={TYPES.map((type) => ({
            value: type,
            label: CHALLENGE_TYPE_LABELS[type],
          }))}
          onChange={(type) =>
            onChange(
              updateChallenge(story, challenge.id, (current) =>
                changeChallengeType(current, type as Challenge["type"]),
              ),
            )
          }
        />
        <p className="text-[10px] leading-relaxed text-slate-400">
          Mengganti jenis soal mengosongkan isian khusus jenis sebelumnya.
        </p>
      </div>

      {challenge.type === "multiple_choice" ? (
        <MultipleChoiceFields
          challenge={challenge}
          story={story}
          prefix={prefix}
          errorsFor={errorsFor}
          onChange={onChange}
        />
      ) : null}

      {challenge.type === "true_false" ? (
        <TrueFalseFields
          challenge={challenge}
          story={story}
          prefix={prefix}
          errorsFor={errorsFor}
          onChange={onChange}
        />
      ) : null}

      {challenge.type === "ordering" ? (
        <OrderingFields
          challenge={challenge}
          story={story}
          prefix={prefix}
          onChange={onChange}
        />
      ) : null}

      {challenge.type === "short_answer" ? (
        <ShortAnswerFields
          challenge={challenge}
          story={story}
          prefix={prefix}
          onChange={onChange}
        />
      ) : null}

      {challenge.hints && challenge.hints.length > 0 ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-800">
          Soal ini punya {challenge.hints.length} petunjuk dari AI. Petunjuk
          tidak diubah dari editor ini.
        </p>
      ) : null}
    </div>
  );
}

type Common = {
  story: Story;
  prefix: string;
  onChange: (story: Story) => void;
};

type WithErrors = Common & { errorsFor: (path: string) => string[] };

function MultipleChoiceFields({
  story,
  challenge,
  prefix,
  errorsFor,
  onChange,
}: WithErrors & {
  challenge: Extract<Challenge, { type: "multiple_choice" }>;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[11px] font-bold text-slate-700">
        Pilihan jawaban
      </legend>

      {challenge.options.map((option, index) => {
        const path = `${prefix}.options[${index}].text`;
        return (
          <div key={option.id} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`benar-${challenge.id}`}
                checked={challenge.correctOptionId === option.id}
                onChange={() =>
                  onChange(
                    updateChallenge(story, challenge.id, (current) =>
                      current.type === "multiple_choice"
                        ? { ...current, correctOptionId: option.id }
                        : current,
                    ),
                  )
                }
                aria-label={`Tandai pilihan ${index + 1} sebagai jawaban benar`}
                className="h-4 w-4 shrink-0 accent-emerald-600"
              />
              <input
                id={`${prefix}-opt-${option.id}`}
                value={option.text}
                onChange={(event) =>
                  onChange(
                    updateChallenge(story, challenge.id, (current) =>
                      current.type === "multiple_choice"
                        ? setOptionText(current, index, event.target.value)
                        : current,
                    ),
                  )
                }
                aria-label={`Teks pilihan ${index + 1}`}
                className={fieldClass(errorsFor(path).length > 0)}
              />
              <CharCount value={option.text} max={CHALLENGE_ITEM_TEXT_MAX} />
              <button
                type="button"
                onClick={() =>
                  onChange(
                    updateChallenge(story, challenge.id, (current) =>
                      current.type === "multiple_choice"
                        ? removeOption(current, index)
                        : current,
                    ),
                  )
                }
                disabled={challenge.options.length <= CHALLENGE_OPTIONS_MIN}
                aria-label={`Hapus pilihan ${index + 1}`}
                className="guru-press flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-rose-200 text-[10px] text-rose-500 transition hover:border-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className="fa-solid fa-xmark" aria-hidden />
              </button>
            </div>
            <FieldError messages={errorsFor(path)} />
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2">
        <MiniButton
          icon="fa-plus"
          onClick={() =>
            onChange(
              updateChallenge(story, challenge.id, (current) =>
                current.type === "multiple_choice"
                  ? addOption(current)
                  : current,
              ),
            )
          }
          disabled={challenge.options.length >= CHALLENGE_OPTIONS_MAX}
        >
          Tambah pilihan
        </MiniButton>
        <span className="text-[10px] text-slate-400">
          {challenge.options.length}/{CHALLENGE_OPTIONS_MAX} pilihan
        </span>
      </div>

      <FieldError messages={errorsFor(`${prefix}.correctOptionId`)} />
    </fieldset>
  );
}

function TrueFalseFields({
  story,
  challenge,
  prefix,
  errorsFor,
  onChange,
}: WithErrors & { challenge: Extract<Challenge, { type: "true_false" }> }) {
  return (
    <div className="space-y-2">
      <Field
        id={`${prefix}-statement`}
        label="Pernyataan"
        problem={errorsFor(`${prefix}.statement`).length > 0}
        count={
          <CharCount
            value={challenge.statement}
            max={CHALLENGE_STATEMENT_MAX}
          />
        }
      >
        <textarea
          id={`${prefix}-statement`}
          rows={2}
          value={challenge.statement}
          onChange={(event) =>
            onChange(
              updateChallenge(story, challenge.id, (current) =>
                current.type === "true_false"
                  ? { ...current, statement: event.target.value }
                  : current,
              ),
            )
          }
          className={fieldClass(errorsFor(`${prefix}.statement`).length > 0)}
        />
        <FieldError messages={errorsFor(`${prefix}.statement`)} />
      </Field>

      <fieldset className="space-y-1">
        <legend className="text-[11px] font-bold text-slate-700">
          Jawaban benar
        </legend>
        <div className="flex gap-2">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={challenge.correctAnswer === value}
              onClick={() =>
                onChange(
                  updateChallenge(story, challenge.id, (current) =>
                    current.type === "true_false"
                      ? setTrueFalseAnswer(current, value)
                      : current,
                  ),
                )
              }
              className={`guru-press rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold transition ${
                challenge.correctAnswer === value
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 text-slate-600 hover:border-slate-900"
              }`}
            >
              {value ? "Benar" : "Salah"}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function OrderingFields({
  story,
  challenge,
  prefix,
  onChange,
}: Common & { challenge: Extract<Challenge, { type: "ordering" }> }) {
  const sequence = orderingSequence(challenge);

  return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed text-slate-500">
        Susun item dalam urutan yang benar. Siswa akan melihatnya dalam urutan
        acak.
      </p>

      {sequence.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-center font-pixel text-[10px] font-bold text-slate-400">
            {index + 1}
          </span>
          <input
            id={`${prefix}-item-${item.id}`}
            value={item.text}
            onChange={(event) =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "ordering"
                    ? setOrderingText(current, item.id, event.target.value)
                    : current,
                ),
              )
            }
            aria-label={`Teks item urutan ${index + 1}`}
            className={fieldClass()}
          />
          <CharCount value={item.text} max={CHALLENGE_ITEM_TEXT_MAX} />
          <MoveButton
            label={`Pindahkan item ${index + 1} ke atas`}
            icon="fa-arrow-up"
            disabled={index === 0}
            onClick={() =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "ordering"
                    ? moveOrderingItem(current, item.id, -1)
                    : current,
                ),
              )
            }
          />
          <MoveButton
            label={`Pindahkan item ${index + 1} ke bawah`}
            icon="fa-arrow-down"
            disabled={index === sequence.length - 1}
            onClick={() =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "ordering"
                    ? moveOrderingItem(current, item.id, 1)
                    : current,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "ordering"
                    ? removeOrderingItem(current, item.id)
                    : current,
                ),
              )
            }
            disabled={challenge.items.length <= CHALLENGE_OPTIONS_MIN}
            aria-label={`Hapus item ${index + 1}`}
            className="guru-press flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-rose-200 text-[10px] text-rose-500 transition hover:border-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <MiniButton
          icon="fa-plus"
          onClick={() =>
            onChange(
              updateChallenge(story, challenge.id, (current) =>
                current.type === "ordering"
                  ? addOrderingItem(current)
                  : current,
              ),
            )
          }
          disabled={challenge.items.length >= CHALLENGE_OPTIONS_MAX}
        >
          Tambah item
        </MiniButton>
        <span className="text-[10px] text-slate-400">
          {challenge.items.length}/{CHALLENGE_OPTIONS_MAX} item
        </span>
      </div>
    </div>
  );
}

function ShortAnswerFields({
  story,
  challenge,
  onChange,
}: Common & { challenge: Extract<Challenge, { type: "short_answer" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed text-amber-700">
        Jawaban singkat sulit dinilai otomatis. Pertimbangkan menambah soal
        pilihan di chapter yang sama.
      </p>

      {challenge.acceptedAnswers.map((answer, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={answer}
            onChange={(event) =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "short_answer"
                    ? setAcceptedAnswer(current, index, event.target.value)
                    : current,
                ),
              )
            }
            aria-label={`Jawaban diterima ${index + 1}`}
            className={fieldClass()}
          />
          <CharCount value={answer} max={SHORT_ANSWER_TEXT_MAX} />
          <button
            type="button"
            onClick={() =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "short_answer"
                    ? removeAcceptedAnswer(current, index)
                    : current,
                ),
              )
            }
            disabled={challenge.acceptedAnswers.length <= 1}
            aria-label={`Hapus jawaban ${index + 1}`}
            className="guru-press flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-rose-200 text-[10px] text-rose-500 transition hover:border-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <MiniButton
          icon="fa-plus"
          onClick={() =>
            onChange(
              updateChallenge(story, challenge.id, (current) =>
                current.type === "short_answer"
                  ? addAcceptedAnswer(current)
                  : current,
              ),
            )
          }
          disabled={challenge.acceptedAnswers.length >= SHORT_ANSWERS_MAX}
        >
          Tambah jawaban
        </MiniButton>

        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={challenge.caseSensitive ?? false}
            onChange={(event) =>
              onChange(
                updateChallenge(story, challenge.id, (current) =>
                  current.type === "short_answer"
                    ? { ...current, caseSensitive: event.target.checked }
                    : current,
                ),
              )
            }
            className="h-3.5 w-3.5 accent-brand-600"
          />
          Bedakan huruf besar/kecil
        </label>
      </div>
    </div>
  );
}
