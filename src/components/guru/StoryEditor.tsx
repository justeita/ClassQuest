"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { toAssetManifest } from "@/assets/manifest";
import { saveStoryDraft } from "@/app/guru/actions";
import type { StoryStatus } from "@/server/contracts";
import type { Story } from "@/story/schema";
import { validateStory, type ValidationIssue } from "@/story/validate";

import { EditorSidebar } from "./EditorSidebar";
import { Modal } from "./Modal";
import { SceneEditor } from "./SceneEditor";
import { StoryMetaPanel } from "./StoryMetaPanel";
import { ValidationPanel } from "./ValidationPanel";
import { useToast } from "./toast";
import {
  describeIssuePath,
  splitIssues,
  type EditorSelection,
} from "./storyEditorState";

/** Manifest dihitung sekali; isinya statis dan aman dipakai di browser. */
const MANIFEST = toAssetManifest();
const UNDO_LIMIT = 20;

type EditorDoc = {
  story: Story;
  /** JSON cerita saat terakhir tersimpan; pembanding status "belum disimpan". */
  savedSnapshot: string;
  undo: Story[];
  redo: Story[];
};

type EditorAction =
  | { type: "change"; story: Story }
  | { type: "restore"; story: Story }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; snapshot: string };

function reducer(doc: EditorDoc, action: EditorAction): EditorDoc {
  switch (action.type) {
    case "change":
    case "restore": {
      if (action.story === doc.story) return doc;
      return {
        ...doc,
        story: action.story,
        undo: [...doc.undo, doc.story].slice(-UNDO_LIMIT),
        redo: [],
      };
    }
    case "undo": {
      const previous = doc.undo.at(-1);
      if (!previous) return doc;
      return {
        ...doc,
        story: previous,
        undo: doc.undo.slice(0, -1),
        redo: [doc.story, ...doc.redo].slice(0, UNDO_LIMIT),
      };
    }
    case "redo": {
      const next = doc.redo[0];
      if (!next) return doc;
      return {
        ...doc,
        story: next,
        undo: [...doc.undo, doc.story].slice(-UNDO_LIMIT),
        redo: doc.redo.slice(1),
      };
    }
    case "saved": {
      return {
        ...doc,
        savedSnapshot: action.snapshot,
        undo: [],
        redo: [],
      };
    }
  }
}

const statusLabel: Record<StoryStatus, string> = {
  processing: "sedang diproses",
  draft: "draft",
  published: "sudah dibagikan",
  failed: "gagal dibuat",
  archived: "diarsipkan",
};

/**
 * Editor cerita guru.
 *
 * Kontrak: `docs/05-frontend/story-editor.md`. Tiga hal yang membuat editor ini
 * aman dipakai guru non-teknis:
 *
 * 1. **Tidak ada JSON.** Semua lewat form; dropdown aset/konsep hanya berisi
 *    nilai yang dikenal validator.
 * 2. **Validasi berjalan di client dengan fungsi yang sama dengan server**
 *    (`validateStory`), 300 ms setelah berhenti mengetik. Error tidak
 *    menghalangi mengetik, hanya menghalangi publish (server memvalidasi ulang
 *    saat `publishStory`).
 * 3. **Simpan eksplisit.** Perubahan disimpan sebagai versi baru lewat
 *    `saveStoryDraft`; `localStorage` hanya untuk pemulihan darurat.
 */
export function StoryEditor({
  storyId,
  initialStory,
  initialVersion,
  status,
}: {
  storyId: string;
  initialStory: Story;
  initialVersion: number;
  status: StoryStatus;
}) {
  const router = useRouter();
  const showToast = useToast();
  const storageKey = `classquest:editor:${storyId}`;

  const [doc, dispatch] = useReducer(reducer, {
    story: initialStory,
    savedSnapshot: JSON.stringify(initialStory),
    undo: [],
    redo: [],
  });
  const [baseVersion, setBaseVersion] = useState(initialVersion);
  const [selection, setSelection] = useState<EditorSelection>({
    chapterIndex: 0,
    sceneIndex: 0,
  });
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [checkedSnapshot, setCheckedSnapshot] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ latestVersion: number } | null>(
    null,
  );
  const [recovery, setRecovery] = useState<{
    story: Story;
    baseVersion: number;
  } | null>(null);

  const snapshot = useMemo(() => JSON.stringify(doc.story), [doc.story]);
  const dirty = snapshot !== doc.savedSnapshot;
  const counts = splitIssues(issues);
  /** `true` selama hasil validasi untuk isi terbaru belum selesai dihitung. */
  const checking = checkedSnapshot !== snapshot;

  const change = useCallback((next: Story) => {
    setServerIssues([]);
    dispatch({ type: "change", story: next });
  }, []);

  /* --- validasi (debounce 300 ms, fungsi sama dengan server) -------------- */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = validateStory(doc.story, { manifest: MANIFEST });
      setIssues([...result.errors, ...result.warnings]);
      setCheckedSnapshot(JSON.stringify(doc.story));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [doc.story]);

  /* --- pemulihan darurat dari localStorage -------------------------------- */
  useEffect(() => {
    // Dibaca di dalam timeout: `localStorage` tidak ada saat render server, dan
    // setState sinkron di badan effect memicu render berantai.
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          story?: unknown;
          baseVersion?: unknown;
        };
        if (parsed.baseVersion !== initialVersion || !parsed.story) return;
        if (JSON.stringify(parsed.story) === JSON.stringify(initialStory)) {
          return;
        }

        setRecovery({
          story: parsed.story as Story,
          baseVersion: initialVersion,
        });
      } catch {
        // Data rusak/format lama: abaikan, jangan menghalangi editor.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [storageKey, initialVersion, initialStory]);

  useEffect(() => {
    if (snapshot === doc.savedSnapshot) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            story: doc.story,
            baseVersion,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // Penyimpanan penuh/diblokir bukan alasan kehilangan editor.
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [snapshot, doc.savedSnapshot, doc.story, baseVersion, storageKey]);

  /* --- peringatan meninggalkan halaman ------------------------------------ */
  useEffect(() => {
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* --- Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z --------------------------------------- */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "z") return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true
      ) {
        // Biarkan undo bawaan kotak isian; menimpanya membuat guru kehilangan
        // undo per-karakter yang sudah dia kenal.
        return;
      }

      event.preventDefault();
      dispatch({ type: event.shiftKey ? "redo" : "undo" });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* --- simpan ------------------------------------------------------------- */
  const simpan = useCallback(
    async (versionToUse = baseVersion) => {
      if (saving) return;
      setSaving(true);

      // Cerita yang benar-benar dikirim disimpan di sini: guru mungkin masih
      // mengetik saat permintaan berjalan.
      const sent = doc.story;

      try {
        const result = await saveStoryDraft({
          storyId,
          story: sent,
          baseVersion: versionToUse,
        });

        if (result.ok) {
          setBaseVersion(result.version);
          setServerIssues([]);
          dispatch({ type: "saved", snapshot: JSON.stringify(sent) });
          showToast(
            `Draft tersimpan sebagai versi ${result.version}.`,
            "success",
          );
          router.refresh();
        } else if ("conflict" in result) {
          setConflict({ latestVersion: result.latestVersion });
        } else {
          setServerIssues(result.errors);
          showToast(
            result.errors[0]?.message ?? "Cerita belum bisa disimpan.",
            "error",
          );
        }
      } catch {
        showToast("Gagal menyimpan cerita. Coba lagi.", "error");
      } finally {
        setSaving(false);
      }
    },
    [baseVersion, doc.story, router, saving, showToast, storyId],
  );

  /* --- lompat ke lokasi masalah ------------------------------------------ */
  const focusIssue = (issue: ValidationIssue) => {
    const location = describeIssuePath(doc.story, issue.path);

    if (location.chapterIndex !== null) {
      setSelection({
        chapterIndex: location.chapterIndex,
        sceneIndex: location.sceneIndex ?? 0,
      });
    } else {
      setSelection(null);
    }

    window.setTimeout(() => {
      const id =
        location.chapterIndex !== null && location.sceneIndex !== null
          ? location.beatIndex !== null
            ? `beat-${location.chapterIndex}-${location.sceneIndex}-${location.beatIndex}`
            : `scene-${location.chapterIndex}-${location.sceneIndex}`
          : "editor-meta";

      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element
        ?.querySelector<HTMLElement>("input, textarea, button")
        ?.focus({ preventScroll: true });
    }, 80);
  };

  const statusText = saving
    ? "Menyimpan draft…"
    : dirty
      ? "Ada perubahan yang belum disimpan."
      : "Semua perubahan sudah tersimpan.";

  return (
    <div
      className="mx-auto max-w-7xl space-y-4 pb-10"
      data-testid="story-editor"
    >
      <header className="sticky top-0 z-20 -mx-1 space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href={`/guru/materi/${storyId}`}
              className="inline-flex w-fit items-center gap-1.5 text-[11px] font-bold text-slate-500 transition hover:text-brand-600"
            >
              <i className="fa-solid fa-arrow-left" aria-hidden /> Kembali ke
              materi
            </Link>
            <h1 className="truncate font-heading text-xl font-extrabold text-slate-900">
              {doc.story.meta.title}
            </h1>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {doc.story.chapters.length} chapter •{" "}
              {doc.story.challenges.length} soal • versi {baseVersion} •{" "}
              {statusLabel[status]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "undo" })}
              disabled={doc.undo.length === 0}
              className="guru-press flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className="fa-solid fa-rotate-left" aria-hidden />
              Urungkan
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "redo" })}
              disabled={doc.redo.length === 0}
              className="guru-press flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <i className="fa-solid fa-rotate-right" aria-hidden />
              Ulangi
            </button>
            <button
              type="button"
              onClick={() => void simpan()}
              disabled={saving || !dirty}
              className="guru-press-pixel flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-floppy-disk" aria-hidden />
              <span>{saving ? "MENYIMPAN…" : "SIMPAN DRAFT"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              dirty
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
            }`}
          >
            <i
              className={`fa-solid ${dirty ? "fa-circle-dot" : "fa-circle-check"}`}
              aria-hidden
            />
            {statusText}
          </span>

          {counts.errors.length > 0 ? (
            <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-rose-700">
              {counts.errors.length} error — publish akan diblokir
            </span>
          ) : null}
          {counts.warnings.length > 0 ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800">
              {counts.warnings.length} saran
            </span>
          ) : null}
        </div>

        {status === "published" ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-800">
            Cerita ini sudah dibagikan. Menyimpan membuat versi draft baru;
            siswa tetap memakai versi yang sedang terbit sampai kamu menekan
            &ldquo;Bagikan ke siswa&rdquo; di halaman materi.
          </p>
        ) : null}
      </header>

      {recovery ? (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <i className="fa-solid fa-clock-rotate-left mr-1" aria-hidden />
            Ada perubahan yang belum tersimpan dari sesi sebelumnya di peramban
            ini.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "restore", story: recovery.story });
                setRecovery(null);
                showToast("Perubahan dari sesi sebelumnya dipulihkan.", "info");
              }}
              className="guru-press rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900 transition hover:bg-slate-100"
            >
              Pulihkan
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(storageKey);
                setRecovery(null);
              }}
              className="guru-press rounded-lg border-2 border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
            >
              Buang
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="space-y-3">
          <EditorSidebar
            story={doc.story}
            issues={issues}
            selection={selection}
            onSelect={setSelection}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div id="editor-meta" className="scroll-mt-28">
            {selection === null ? (
              <StoryMetaPanel
                story={doc.story}
                issues={issues}
                onChange={change}
              />
            ) : null}
          </div>

          {selection !== null ? (
            <SceneEditor
              story={doc.story}
              chapterIndex={selection.chapterIndex}
              sceneIndex={selection.sceneIndex}
              issues={issues}
              onChange={change}
            />
          ) : null}
        </div>
      </div>

      <ValidationPanel
        story={doc.story}
        issues={issues}
        serverIssues={serverIssues}
        checking={checking}
        onFocusIssue={focusIssue}
      />

      <Modal
        open={conflict !== null}
        onClose={() => setConflict(null)}
        labelledBy="konflik-versi"
        width="max-w-lg"
      >
        <div className="space-y-3 p-6">
          <h2
            id="konflik-versi"
            className="font-heading text-base font-bold text-slate-900"
          >
            Cerita sudah berubah di tempat lain
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            Versi terbaru di server adalah versi{" "}
            <strong>{conflict?.latestVersion ?? "?"}</strong>, bukan versi yang
            kamu buka. Pilih cara melanjutkan:
          </p>
          <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-500">
            <li>
              <strong>Muat versi terbaru</strong> membuang perubahan di tab ini
              (salinannya masih tersimpan sementara di peramban).
            </li>
            <li>
              <strong>Timpa dengan versi saya</strong> menyimpan perubahan tab
              ini sebagai versi baru di atas versi terbaru.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => setConflict(null)}
            className="guru-press rounded-xl border-2 border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="guru-press rounded-xl border-2 border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Muat versi terbaru
          </button>
          <button
            type="button"
            onClick={() => {
              if (conflict === null) return;
              const latest = conflict.latestVersion;
              setConflict(null);
              void simpan(latest);
            }}
            className="guru-press rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            Timpa dengan versi saya
          </button>
        </div>
      </Modal>
    </div>
  );
}
