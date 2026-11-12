"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { GRADE_OPTIONS, THEMES, THEME_KEYS, type ThemeKey } from "./data";
import {
  EMPTY_AI_STUDIO_DRAFT,
  MAX_FILE_SIZE_MB,
  buildStructuredPrompt,
  clearAiStudioDraft,
  formatFileSize,
  readAiStudioDraft,
  takeAiStudioSeed,
  validateJsonText,
  writeAiStudioDraft,
  type AiStudioDraft,
} from "./logic";
import { useToast } from "./toast";

type AiMode = "internal" | "external";

type JsonStatus = {
  ok: boolean;
  detail: string;
};

type Preview =
  | { kind: "empty" }
  | { kind: "loading" }
  | {
      kind: "content";
      subject: string;
      grade: string;
      objective: string;
      theme: ThemeKey;
    };

/**
 * AI Studio: form materi referensi + pratinjau modul.
 *
 * Seluruh alurnya masih lokal — tidak ada unggahan atau panggilan model.
 * "Buat Cerita" hanya menunggu satu detik lalu menyusun pratinjau dari isian
 * form, persis seperti prototipe HTML asalnya. Titik sambung ke Server Action
 * `publishStory` ada di `generateStoryInternal` saat wiring dikerjakan.
 *
 * Draf disimpan di `localStorage`; materi yang dipilih dari halaman Learning
 * Materials masuk lewat `sessionStorage` (lihat `writeAiStudioSeed`).
 */
export function AiStudio() {
  const showToast = useToast();

  const [draft, setDraft] = useState<AiStudioDraft>(EMPTY_AI_STUDIO_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("internal");
  const [jsonStatus, setJsonStatus] = useState<JsonStatus | null>(null);
  const [preview, setPreview] = useState<Preview>({ kind: "empty" });

  const pdfInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const generateTimer = useRef<number | null>(null);
  const bootstrapped = useRef(false);

  // Muat draf/seed sekali. Ref mencegah efek ganda StrictMode menghapus seed
  // sebelum sempat dipakai.
  //
  // `set-state-in-effect` dimatikan khusus di sini: ini hidrasi awal dari
  // penyimpanan browser (sistem eksternal) dan tidak bisa dipindahkan ke
  // inisialisasi `useState` tanpa membuat hasil render server berbeda dari
  // render klien (hydration mismatch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const seed = takeAiStudioSeed();
    const saved = readAiStudioDraft();

    if (seed) {
      setDraft((previous) => ({ ...previous, ...seed }));
      showToast(`Materi "${seed.file.name}" dimuat ke AI Studio!`, "success");
    } else if (saved) {
      setDraft(saved);
    }

    setHydrated(true);
  }, [showToast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    writeAiStudioDraft(draft);
  }, [draft, hydrated]);

  useEffect(
    () => () => {
      if (generateTimer.current !== null) {
        window.clearTimeout(generateTimer.current);
      }
    },
    [],
  );

  function ubah<K extends keyof AiStudioDraft>(
    key: K,
    value: AiStudioDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function terimaBerkas(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      showToast("Format berkas harus berupa dokumen PDF (.pdf)", "error");
      return;
    }

    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      showToast(
        `Ukuran berkas melebihi batas maksimum ${MAX_FILE_SIZE_MB}MB.`,
        "error",
      );
      return;
    }

    ubah("file", { name: file.name, size: formatFileSize(file.size) });
    showToast("Dokumen PDF berhasil diunggah.", "success");
  }

  function hapusBerkas() {
    ubah("file", null);
    if (pdfInput.current) pdfInput.current.value = "";
  }

  function melaluiDropzone(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) terimaBerkas(file);
  }

  function bukaDialogBerkas(event: KeyboardEvent<HTMLDivElement>) {
    if (draft.file) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pdfInput.current?.click();
    }
  }

  function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) terimaBerkas(file);
    event.target.value = "";
  }

  function resetForm() {
    if (generateTimer.current !== null) {
      window.clearTimeout(generateTimer.current);
      generateTimer.current = null;
    }

    setDraft(EMPTY_AI_STUDIO_DRAFT);
    setJsonStatus(null);
    setPreview({ kind: "empty" });
    clearAiStudioDraft();
    if (pdfInput.current) pdfInput.current.value = "";
    if (jsonInput.current) jsonInput.current.value = "";
    showToast("Formulir berhasil dibersihkan.", "info");
  }

  function generateStoryInternal() {
    const subject = draft.subject.trim() || "Metodologi Umum";
    const grade = draft.grade || "Tingkat Umum";
    const objective =
      draft.objective.trim() ||
      "Memahami prinsip mendasar materi pembelajaran.";

    setPreview({ kind: "loading" });

    if (generateTimer.current !== null) {
      window.clearTimeout(generateTimer.current);
    }

    generateTimer.current = window.setTimeout(() => {
      generateTimer.current = null;
      setPreview({
        kind: "content",
        subject,
        grade,
        objective,
        theme: draft.theme,
      });
      showToast("Sintesis modul pembelajaran selesai.", "success");
    }, 1000);
  }

  async function copyGeneratedPrompt() {
    const prompt = buildStructuredPrompt({
      subject: draft.subject,
      grade: draft.grade,
      objective: draft.objective,
      theme: draft.theme,
    });

    try {
      await navigator.clipboard.writeText(prompt);
      showToast("Prompt berhasil disalin ke papan klip.", "success");
    } catch {
      showToast("Gagal menyalin prompt ke papan klip.", "error");
    }
  }

  async function validateJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = validateJsonText(await file.text());

    if (result.ok) {
      setJsonStatus({
        ok: true,
        detail: `Sintaks terverifikasi dengan sukses (${result.keys} atribut terdeteksi).`,
      });
      showToast("Validasi Berkas JSON Berhasil.", "success");
    } else {
      setJsonStatus({
        ok: false,
        detail: `SyntaxError: ${result.message}.`,
      });
      showToast("Format Berkas JSON Tidak Valid!", "error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            AI Studio Synthesizer
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Konversikan materi referensi menjadi bahan studi instruksional
            formal.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
        >
          <i className="fa-solid fa-trash-can" aria-hidden /> Reset Form
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Dokumen referensi */}
          <section className="guru-pixel-card space-y-3 rounded-2xl bg-white p-5">
            <h3 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800">
              <span>
                <i
                  className="fa-solid fa-file-pdf mr-1.5 text-rose-500"
                  aria-hidden
                />
                1. Dokumen Referensi PDF
              </span>
              <span className="text-[10px] font-normal normal-case text-slate-400">
                Maksimal {MAX_FILE_SIZE_MB}MB
              </span>
            </h3>

            <div
              role={draft.file ? undefined : "button"}
              tabIndex={draft.file ? undefined : 0}
              aria-label={draft.file ? undefined : "Pilih berkas PDF"}
              onClick={() => pdfInput.current?.click()}
              onKeyDown={bukaDialogBerkas}
              onDragOver={(event) => event.preventDefault()}
              onDrop={melaluiDropzone}
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-brand-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <input
                ref={pdfInput}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={pilihBerkas}
              />

              {draft.file ? (
                <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
                      <i
                        className="fa-solid fa-file-pdf text-base"
                        aria-hidden
                      />
                    </div>
                    <div className="overflow-hidden text-left">
                      <p className="truncate text-xs font-bold text-slate-800">
                        {draft.file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {draft.file.size}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      hapusBerkas();
                    }}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                  >
                    <i className="fa-solid fa-xmark text-sm" aria-hidden />
                    <span className="sr-only">Hapus berkas</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-600 shadow-sm">
                    <i className="fa-solid fa-upload text-sm" aria-hidden />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    Pilih berkas PDF atau seret berkas ke sini
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mendukung silabus &amp; modul (.pdf)
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 2. Parameter akademik */}
          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="font-pixel text-xs font-bold uppercase tracking-wider text-slate-800">
              <i
                className="fa-solid fa-sliders mr-1.5 text-brand-600"
                aria-hidden
              />
              2. Parameter Akademik
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="subjectInput"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Mata Pelajaran
                </label>
                <input
                  id="subjectInput"
                  type="text"
                  value={draft.subject}
                  onChange={(event) => ubah("subject", event.target.value)}
                  placeholder="Contoh: Biologi Lingkungan"
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label
                  htmlFor="gradeSelect"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Tingkat Kelas
                </label>
                <select
                  id="gradeSelect"
                  value={draft.grade}
                  onChange={(event) => ubah("grade", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Pilih Tingkat Pendidikan --</option>
                  {GRADE_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="objectiveInput"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
              >
                Capaian Pembelajaran (Learning Objectives)
              </label>
              <textarea
                id="objectiveInput"
                rows={3}
                value={draft.objective}
                onChange={(event) => ubah("objective", event.target.value)}
                placeholder="Jelaskan indikator pencapaian kompetensi..."
                className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </section>

          {/* 3. Pendekatan metode */}
          <section className="guru-pixel-card space-y-3 rounded-2xl bg-white p-5">
            <h3 className="font-pixel text-xs font-bold uppercase tracking-wider text-slate-800">
              <i
                className="fa-solid fa-sitemap mr-1.5 text-indigo-600"
                aria-hidden
              />
              3. Pendekatan Metode Pembelajaran
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_KEYS.map((key) => {
                const theme = THEMES[key];
                const selected = draft.theme === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => ubah("theme", key)}
                    className={`rounded-xl border-2 p-3 text-left transition hover:border-brand-500 ${
                      selected
                        ? "guru-theme-selected"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="mb-0.5 text-xs font-bold text-slate-900">
                      {theme.label}
                    </div>
                    <p className="text-[10px] leading-tight text-slate-500">
                      {theme.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Engine AI */}
          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="font-pixel text-xs font-bold uppercase tracking-wider text-slate-800">
              <i
                className="fa-solid fa-microchip mr-1.5 text-emerald-600"
                aria-hidden
              />
              4. Pemrosesan Engine AI
            </h3>

            <div className="grid grid-cols-2 rounded-xl border-2 border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                aria-pressed={aiMode === "internal"}
                onClick={() => setAiMode("internal")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                  aiMode === "internal"
                    ? "bg-white font-bold text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <i
                  className="fa-solid fa-laptop-code text-brand-600"
                  aria-hidden
                />
                <span>AI Website Ini</span>
              </button>
              <button
                type="button"
                aria-pressed={aiMode === "external"}
                onClick={() => setAiMode("external")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
                  aiMode === "external"
                    ? "bg-white font-bold text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <i
                  className="fa-solid fa-cloud-arrow-up text-indigo-600"
                  aria-hidden
                />
                <span>AI Luar Website</span>
              </button>
            </div>

            {aiMode === "internal" ? (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] text-slate-500">
                  Sintesis materi secara otomatis langsung menggunakan engine
                  internal Class Quest.
                </p>
                <button
                  type="button"
                  onClick={generateStoryInternal}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 py-3 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700 active:translate-y-1"
                >
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
                  <span>BUAT CERITA / MODUL</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] text-slate-500">
                  Salin prompt instruksional untuk digunakan pada LLM eksternal
                  (ChatGPT/Claude), lalu unggah berkas JSON untuk divalidasi.
                </p>

                <button
                  type="button"
                  onClick={copyGeneratedPrompt}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <i className="fa-regular fa-copy" aria-hidden />
                  <span>Copy Prompt</span>
                </button>

                <div className="pt-2">
                  <label
                    htmlFor="jsonFileInput"
                    className="mb-1 block text-[11px] font-bold text-slate-700"
                  >
                    Unggah Berkas JSON (.json)
                  </label>
                  <input
                    ref={jsonInput}
                    id="jsonFileInput"
                    type="file"
                    accept=".json,application/json"
                    onChange={validateJsonFile}
                    className="w-full cursor-pointer rounded-xl border-2 border-slate-300 bg-slate-50 p-1 text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-700 hover:file:bg-brand-100"
                  />

                  {jsonStatus ? (
                    <div
                      role="status"
                      className={`mt-3 rounded-xl border-2 p-3 text-xs ${
                        jsonStatus.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      <div className="mb-0.5 flex items-center gap-2 font-bold">
                        <i
                          className={`fa-solid text-sm ${
                            jsonStatus.ok
                              ? "fa-circle-check text-emerald-600"
                              : "fa-triangle-exclamation text-rose-600"
                          }`}
                          aria-hidden
                        />
                        <span>
                          {jsonStatus.ok
                            ? "Struktur Berkas JSON Valid"
                            : "Kesalahan Sintaks JSON"}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {jsonStatus.detail}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Pratinjau */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <h3 className="mb-2 font-pixel text-sm font-bold uppercase tracking-wider text-slate-800">
              Pratinjau Modul (Live View)
            </h3>

            <div className="flex min-h-[460px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {preview.kind === "empty" ? (
                <div className="my-auto space-y-2 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    <i className="fa-solid fa-file-lines text-xl" aria-hidden />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Dokumen Belum Digenere
                  </p>
                  <p className="mx-auto max-w-xs text-[11px] text-slate-500">
                    Klik &quot;Buat Cerita&quot; atau unggah JSON valid untuk
                    menampilkan draf akhir.
                  </p>
                </div>
              ) : null}

              {preview.kind === "loading" ? (
                <div className="my-auto space-y-3 py-10 text-center">
                  <div
                    className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600"
                    aria-hidden
                  />
                  <p className="font-pixel text-xs font-bold text-slate-700">
                    Class Quest AI sedang menyusun materi...
                  </p>
                </div>
              ) : null}

              {preview.kind === "content" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                      {THEMES[preview.theme].name}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {preview.grade}
                    </span>
                  </div>

                  <h3 className="font-heading text-base font-bold leading-snug text-slate-900">
                    Modul Instruktur: Sintesis {preview.subject}
                  </h3>

                  <div className="space-y-2 text-xs leading-relaxed text-slate-600">
                    <p>
                      <b>Rancangan Pembelajaran:</b> Menggunakan{" "}
                      <b>{THEMES[preview.theme].name}</b>, modul ini disusun
                      dengan {THEMES[preview.theme].style} untuk topik{" "}
                      <b>{preview.subject}</b>.
                    </p>
                    <p>
                      <b>Capaian Utama:</b> {preview.objective}
                    </p>
                    <p>
                      Struktur materi disesuaikan untuk tingkat{" "}
                      <b>{preview.grade}</b> guna memastikan relevansi akademis
                      dan pemikiran tingkat tinggi (HOTS).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-1 font-pixel text-[11px] font-bold text-slate-800">
                      Evaluasi HOTS:
                    </p>
                    <p className="text-[11px] text-slate-600">
                      &quot;Bagaimanakah variabel materi {preview.subject}{" "}
                      berpengaruh secara signifikan terhadap studi kasus yang
                      diberikan?&quot;
                    </p>
                  </div>
                </div>
              ) : null}

              {preview.kind === "content" ? (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      showToast("Modul disimpan ke repositori.", "success")
                    }
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    <i className="fa-solid fa-bookmark mr-1" aria-hidden />{" "}
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-xs font-bold text-slate-600 hover:underline"
                  >
                    <i className="fa-solid fa-print mr-1" aria-hidden /> Cetak
                    PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
