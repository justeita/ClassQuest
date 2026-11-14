"use client";

import type { Story } from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

import { describeIssuePath, splitIssues } from "./storyEditorState";

/**
 * Panel bawah: hasil validasi yang sama dengan server.
 *
 * Error dan warning dipisah karena efeknya berbeda — error memblokir publish,
 * warning tidak (`docs/02-data-model/validation-rules.md`). Pesan memakai
 * lokasi bahasa manusia ("Chapter 2 · Scene 1 · beat 3 · teks"), bukan path
 * JSON, sesuai `docs/05-frontend/story-editor.md`.
 */
export function ValidationPanel({
  story,
  issues,
  serverIssues,
  checking,
  onFocusIssue,
}: {
  story: Story;
  issues: readonly ValidationIssue[];
  serverIssues: readonly ValidationIssue[];
  checking: boolean;
  onFocusIssue: (issue: ValidationIssue) => void;
}) {
  const { errors, warnings } = splitIssues(issues);
  const ordered = [...errors, ...warnings];
  const all = [...serverIssues, ...ordered];

  return (
    <section
      aria-labelledby="panel-validasi"
      className="rounded-2xl border-2 border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 px-4 py-2.5">
        <h2
          id="panel-validasi"
          className="font-pixel text-[10px] font-bold uppercase tracking-wider text-slate-500"
        >
          Pemeriksaan cerita
        </h2>

        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span
            className={`rounded-full border px-2 py-0.5 ${
              errors.length > 0
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errors.length} error
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 ${
              warnings.length > 0
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {warnings.length} saran
          </span>
          {checking ? (
            <span className="flex items-center gap-1 text-slate-400">
              <i className="fa-solid fa-spinner animate-spin" aria-hidden />
              memeriksa…
            </span>
          ) : null}
        </div>
      </div>

      {all.length === 0 ? (
        <p className="px-4 py-3 text-[11px] font-semibold text-emerald-700">
          <i className="fa-solid fa-circle-check mr-1" aria-hidden />
          Cerita lolos pemeriksaan. Perubahan tetap perlu disimpan agar dipakai
          siswa.
        </p>
      ) : (
        <ul className="guru-scroll max-h-56 space-y-1 overflow-y-auto p-2">
          {serverIssues.length > 0 ? (
            <li className="px-2 pt-1 font-pixel text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Dari server (simpan terakhir)
            </li>
          ) : null}

          {all.map((issue, index) => {
            const location = describeIssuePath(story, issue.path);
            const fromServer = index < serverIssues.length;

            return (
              <li key={`${issue.code}-${issue.path}-${index}`}>
                <button
                  type="button"
                  onClick={() => onFocusIssue(issue)}
                  className="guru-press flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 font-pixel text-[9px] font-bold uppercase ${
                      issue.severity === "error"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-amber-300 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {issue.severity === "error" ? "Error" : "Saran"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold leading-relaxed text-slate-700">
                      {location.label}
                      {fromServer ? " (server)" : ""}
                    </span>
                    <span className="block text-[10px] leading-relaxed text-slate-500">
                      {issue.message}
                    </span>
                    {issue.hint && issue.severity === "error" ? (
                      <span className="block text-[10px] leading-relaxed text-slate-400">
                        {issue.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
