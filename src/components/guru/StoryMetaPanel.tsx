"use client";

import type { Story, StoryMode } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

import { CharCount, Field, FieldError, fieldClass } from "./EditorField";
import { SelectMenu } from "./SelectMenu";
import { STORY_SYNOPSIS_MAX, issuesAt, updateMeta } from "./storyEditorState";

const MODE_LABELS: Record<StoryMode, { label: string; hint: string }> = {
  menjelaskan: { label: "Menjelaskan", hint: "cerita utuh" },
  pertanyaan: { label: "Pertanyaan", hint: "kuis padat" },
  mix: { label: "Campuran", hint: "cerita + soal" },
};

/**
 * Panel "Pengaturan cerita": meta yang aman diubah guru.
 *
 * `meta.id` **tidak** ditampilkan sebagai field: id cerita dipakai tautan siswa
 * dan hasil bermain, dan `docs/05-frontend/story-editor.md` melarang
 * mengubahnya dari client. `source` (nama PDF, jumlah halaman, konsep) juga
 * hanya dibaca, karena itu jejak materi asli.
 */
export function StoryMetaPanel({
  story,
  issues,
  onChange,
}: {
  story: Story;
  issues: readonly ValidationIssue[];
  onChange: (story: Story) => void;
}) {
  const errorsFor = (path: string): string[] =>
    issues
      .filter((issue) => issue.severity === "error" && issue.path === path)
      .map((issue) => issue.message);

  const metaIssues = issuesAt(issues, "meta").filter(
    (issue) => issue.severity === "error",
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
        <div>
          <p className="font-pixel text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pengaturan cerita
          </p>
          <h3 className="font-heading text-base font-bold text-slate-900">
            Yang dilihat siswa
          </h3>
        </div>

        {metaIssues.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-2.5">
            {metaIssues.map((issue) => (
              <li
                key={`${issue.code}-${issue.path}`}
                className="text-[10px] font-semibold leading-relaxed text-rose-700"
              >
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        <Field
          id="meta-title"
          label="Judul cerita"
          problem={errorsFor("meta.title").length > 0}
          count={<CharCount value={story.meta.title} max={80} />}
        >
          <input
            id="meta-title"
            value={story.meta.title}
            onChange={(event) =>
              onChange(updateMeta(story, { title: event.target.value }))
            }
            className={fieldClass(errorsFor("meta.title").length > 0)}
          />
          <FieldError messages={errorsFor("meta.title")} />
        </Field>

        <Field
          id="meta-synopsis"
          label="Sinopsis"
          problem={errorsFor("meta.synopsis").length > 0}
          count={
            <CharCount value={story.meta.synopsis} max={STORY_SYNOPSIS_MAX} />
          }
        >
          <textarea
            id="meta-synopsis"
            rows={4}
            value={story.meta.synopsis}
            onChange={(event) =>
              onChange(updateMeta(story, { synopsis: event.target.value }))
            }
            className={fieldClass(errorsFor("meta.synopsis").length > 0)}
          />
          <FieldError messages={errorsFor("meta.synopsis")} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            id="meta-subject"
            label="Mata pelajaran"
            problem={errorsFor("meta.subject").length > 0}
          >
            <input
              id="meta-subject"
              value={story.meta.subject}
              onChange={(event) =>
                onChange(updateMeta(story, { subject: event.target.value }))
              }
              className={fieldClass(errorsFor("meta.subject").length > 0)}
            />
          </Field>

          <Field
            id="meta-grade"
            label="Kelas"
            problem={errorsFor("meta.gradeLevel").length > 0}
          >
            <input
              id="meta-grade"
              value={story.meta.gradeLevel}
              onChange={(event) =>
                onChange(updateMeta(story, { gradeLevel: event.target.value }))
              }
              className={fieldClass(errorsFor("meta.gradeLevel").length > 0)}
            />
          </Field>

          <Field
            id="meta-tone"
            label="Nada cerita"
            problem={errorsFor("meta.tone").length > 0}
            count={<CharCount value={story.meta.tone} max={60} />}
          >
            <input
              id="meta-tone"
              value={story.meta.tone}
              onChange={(event) =>
                onChange(updateMeta(story, { tone: event.target.value }))
              }
              className={fieldClass(errorsFor("meta.tone").length > 0)}
            />
          </Field>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="meta-mode"
            className="text-[11px] font-bold text-slate-700"
          >
            Mode permainan
          </label>
          <SelectMenu
            id="meta-mode"
            value={story.meta.mode ?? "mix"}
            options={(Object.keys(MODE_LABELS) as StoryMode[]).map((mode) => ({
              value: mode,
              label: MODE_LABELS[mode].label,
              hint: MODE_LABELS[mode].hint,
            }))}
            onChange={(mode) =>
              onChange(updateMeta(story, { mode: mode as StoryMode }))
            }
          />
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h3 className="font-pixel text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Materi sumber (hanya baca)
        </h3>
        <dl className="space-y-1 text-[11px] text-slate-600">
          <div className="flex justify-between gap-3">
            <dt className="font-semibold">Berkas</dt>
            <dd className="truncate font-bold text-slate-800">
              {story.source.fileName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold">Halaman</dt>
            <dd className="font-bold text-slate-800">
              {story.source.pageCount}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 font-semibold">Id cerita</dt>
            <dd className="truncate font-mono text-[10px] text-slate-500">
              {story.meta.id}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {story.source.concepts.map((concept) => (
            <span
              key={concept}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
            >
              {concept}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
