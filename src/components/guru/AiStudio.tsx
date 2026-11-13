"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { SelectMenu } from "./SelectMenu";
import { GRADE_OPTIONS } from "./data";
import { checkPdfFile, defaultTitleFromFilename, formatBytes } from "./logic";
import { useToast } from "./toast";

type FormValues = {
  title: string;
  subject: string;
  gradeLevel: string;
  language: "id" | "en";
  tone: string;
};

const EMPTY_FORM: FormValues = {
  title: "",
  subject: "",
  gradeLevel: "",
  language: "id",
  tone: "hangat dan penasaran",
};

/** Batas panjang field teks, sama dengan skema `POST /api/upload`. */
const LIMITS = {
  title: { min: 3, max: 80 },
  subject: { min: 1, max: 40 },
  gradeLevel: { min: 1, max: 40 },
  tone: { min: 0, max: 200 },
} as const;

/** Pesan gagal yang tidak membocorkan detail internal. */
const GENERIC_ERROR = "Materi gagal diproses. Coba lagi beberapa saat lagi.";

function isFilled(values: FormValues, file: File | null): boolean {
  return (
    file !== null &&
    values.title.trim().length >= LIMITS.title.min &&
    values.title.trim().length <= LIMITS.title.max &&
    values.subject.trim().length >= LIMITS.subject.min &&
    values.subject.trim().length <= LIMITS.subject.max &&
    values.gradeLevel.trim().length >= LIMITS.gradeLevel.min &&
    values.gradeLevel.trim().length <= LIMITS.gradeLevel.max &&
    values.tone.trim().length <= LIMITS.tone.max
  );
}

/**
 * AI Studio: unggah PDF materi + metadata, lalu jalankan pipeline generasi.
 *
 * Form mengikuti tabel "`/guru/materi/baru` — upload" di
 * `docs/05-frontend/teacher-dashboard.md` (file, judul, mata pelajaran,
 * jenjang, bahasa, nada cerita). Kirimannya `POST /api/upload`
 * (`docs/06-backend/api-contract.md`); respons `202` membawa `storyId`, dan
 * guru langsung dipindah ke halaman status — tidak ditahan di form.
 *
 * Validasi tipe/ukuran di sini hanya penyaring awal; server memvalidasi ulang
 * magic bytes dan ukuran sebenarnya.
 */
export function AiStudio({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();
  const showToast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pdfInput = useRef<HTMLInputElement>(null);

  const valid = isFilled(values, file);

  function ubah<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function terimaBerkas(berkas: File) {
    const check = checkPdfFile(berkas, maxBytes);

    if (!check.ok) {
      showToast(check.message, "error");
      return;
    }

    setFile(berkas);
    setValues((previous) => ({
      ...previous,
      // Judul awal dari nama berkas, hanya bila guru belum mengetik judul.
      title:
        previous.title.trim() === ""
          ? defaultTitleFromFilename(berkas.name)
          : previous.title,
    }));
    showToast("Dokumen PDF siap diproses.", "success");
  }

  function hapusBerkas() {
    setFile(null);
    if (pdfInput.current) pdfInput.current.value = "";
  }

  function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
    const berkas = event.target.files?.[0];
    if (berkas) terimaBerkas(berkas);
    event.target.value = "";
  }

  function melaluiDropzone(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const berkas = event.dataTransfer.files[0];
    if (berkas) terimaBerkas(berkas);
  }

  async function kirim() {
    if (pending) return;

    if (!file) {
      showToast("Pilih berkas PDF materi terlebih dahulu.", "error");
      return;
    }

    if (!valid) {
      showToast("Lengkapi judul, mata pelajaran, dan jenjang kelas.", "error");
      return;
    }

    setPending(true);

    const form = new FormData();
    form.set("file", file);
    form.set("title", values.title.trim());
    form.set("subject", values.subject.trim());
    form.set("gradeLevel", values.gradeLevel.trim());
    form.set("language", values.language);
    form.set("tone", values.tone.trim());

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      if (response.status === 202) {
        const body: unknown = await response.json();
        const storyId =
          body !== null && typeof body === "object"
            ? (body as { storyId?: unknown }).storyId
            : null;

        if (typeof storyId === "string" && storyId !== "") {
          // Jangan reset `pending`: tombol tetap nonaktif selama navigasi.
          // Tanpa `refresh()`: `push` sudah mengambil RSC halaman tujuan,
          // menyegarkan setelahnya hanya menggandakan permintaan.
          router.push(`/guru/materi/${storyId}`);
          return;
        }

        showToast(GENERIC_ERROR, "error");
      } else if (response.status === 401) {
        showToast("Sesi Anda sudah berakhir. Silakan masuk lagi.", "error");
        // Tanpa `refresh()`: `replace` sudah mengambil RSC halaman masuk.
        router.replace("/guru/masuk");
        return;
      } else {
        // Bentuk error kontrak: `{ error: { code, message } }`. Pesannya sudah
        // statis dan aman ditampilkan; jangan menampilkan status/stack.
        const body: unknown = await response.json().catch(() => null);
        const message =
          body !== null && typeof body === "object"
            ? (body as { error?: { message?: unknown } }).error?.message
            : null;

        showToast(
          typeof message === "string" && message !== ""
            ? message
            : GENERIC_ERROR,
          "error",
        );
      }
    } catch {
      showToast(
        "Tidak bisa menghubungi server. Coba lagi sebentar lagi.",
        "error",
      );
    }

    setPending(false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            AI Studio Synthesizer
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Unggah materi referensi PDF; server menyusun cerita dan
            tantangannya.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setValues(EMPTY_FORM);
            hapusBerkas();
            showToast("Formulir berhasil dibersihkan.", "info");
          }}
          disabled={pending}
          className="guru-press flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
        >
          <i className="fa-solid fa-trash-can" aria-hidden /> Reset Form
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="guru-stagger space-y-6 lg:col-span-7">
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
                Maksimal {formatBytes(maxBytes)}
              </span>
            </h3>

            <div
              role={file ? undefined : "button"}
              tabIndex={file ? undefined : 0}
              aria-label={file ? undefined : "Pilih berkas PDF"}
              onClick={() => pdfInput.current?.click()}
              onKeyDown={(event) => {
                if (file) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pdfInput.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                // `dragleave` juga terpicu saat kursor pindah ke anak elemen;
                // abaikan bila tujuan masih di dalam area unggah.
                const next = event.relatedTarget as Node | null;
                if (!next || !event.currentTarget.contains(next)) {
                  setDragging(false);
                }
              }}
              onDrop={melaluiDropzone}
              data-dragging={dragging}
              className="guru-dropzone cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-brand-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <input
                ref={pdfInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={pilihBerkas}
              />

              {file ? (
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
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatBytes(file.size)}
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
                    Hanya PDF dengan teks yang bisa diseleksi
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

            <div>
              <label
                htmlFor="titleInput"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
              >
                Judul Materi
              </label>
              <input
                id="titleInput"
                type="text"
                value={values.title}
                onChange={(event) => ubah("title", event.target.value)}
                maxLength={LIMITS.title.max}
                placeholder="Contoh: Ekosistem Terumbu Karang"
                className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                3–{LIMITS.title.max} karakter, boleh diubah dari nama berkas.
              </p>
            </div>

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
                  value={values.subject}
                  onChange={(event) => ubah("subject", event.target.value)}
                  maxLength={LIMITS.subject.max}
                  placeholder="Contoh: Biologi"
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label
                  htmlFor="gradeSelect"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Jenjang / Kelas
                </label>
                <SelectMenu
                  id="gradeSelect"
                  value={values.gradeLevel}
                  onChange={(grade) => ubah("gradeLevel", grade)}
                  options={GRADE_OPTIONS.map((grade) => ({
                    value: grade,
                    label: grade,
                  }))}
                  placeholder="-- Pilih Tingkat Pendidikan --"
                />
              </div>
            </div>
          </section>

          {/* 3. Gaya cerita */}
          <section className="guru-pixel-card space-y-3 rounded-2xl bg-white p-5">
            <h3 className="font-pixel text-xs font-bold uppercase tracking-wider text-slate-800">
              <i
                className="fa-solid fa-masks-theater mr-1.5 text-indigo-600"
                aria-hidden
              />
              3. Bahasa dan Nada Cerita
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="languageSelect"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Bahasa
                </label>
                <SelectMenu
                  id="languageSelect"
                  value={values.language}
                  onChange={(language) =>
                    ubah("language", language === "en" ? "en" : "id")
                  }
                  options={[
                    { value: "id", label: "Bahasa Indonesia" },
                    { value: "en", label: "English" },
                  ]}
                  placeholder="Pilih bahasa"
                />
              </div>

              <div>
                <label
                  htmlFor="toneInput"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                >
                  Nada Cerita (opsional)
                </label>
                <input
                  id="toneInput"
                  type="text"
                  value={values.tone}
                  onChange={(event) => ubah("tone", event.target.value)}
                  maxLength={LIMITS.tone.max}
                  placeholder="hangat dan penasaran"
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Ringkasan + kirim */}
        <div className="lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-24">
            <h3 className="font-pixel text-sm font-bold uppercase tracking-wider text-slate-800">
              Ringkasan Unggahan
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <dl className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">Berkas</dt>
                  <dd className="max-w-[60%] truncate text-right font-bold text-slate-800">
                    {file ? file.name : "Belum dipilih"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">Judul</dt>
                  <dd className="max-w-[60%] truncate text-right font-bold text-slate-800">
                    {values.title.trim() || "-"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">
                    Mata pelajaran
                  </dt>
                  <dd className="max-w-[60%] truncate text-right font-bold text-slate-800">
                    {values.subject.trim() || "-"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">Jenjang</dt>
                  <dd className="max-w-[60%] truncate text-right font-bold text-slate-800">
                    {values.gradeLevel || "-"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-slate-500">Bahasa</dt>
                  <dd className="text-right font-bold text-slate-800">
                    {values.language === "en" ? "English" : "Indonesia"}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={kirim}
                disabled={!valid || pending}
                className="guru-press-pixel mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 py-3 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
                <span>{pending ? "MENGUNGGAH…" : "BUAT CERITA / MODUL"}</span>
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Setelah terkirim, guru langsung dipindah ke halaman status.
                Proses generasi berjalan di latar belakang dan boleh ditinggal.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-600">
              <p className="mb-1 font-bold text-slate-800">
                Yang terjadi setelah unggah
              </p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Server membaca teks PDF per halaman.</li>
                <li>AI menyusun kerangka chapter, lalu menulis cerita.</li>
                <li>Hasil divalidasi; bila gagal, dipakai cerita cadangan.</li>
                <li>Guru me-review, lalu membagikan tautannya ke siswa.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
