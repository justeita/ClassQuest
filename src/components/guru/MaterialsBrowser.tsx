"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Modal } from "./Modal";
import { StatCard } from "./StatCard";
import {
  GRADE_OPTIONS,
  MATERIALS,
  PORTAL_STATS,
  SUBJECT_OPTIONS,
  type Material,
  type MaterialFormat,
} from "./data";
import {
  EMPTY_FILTER,
  filterMaterials,
  writeAiStudioSeed,
  type MaterialFilter,
} from "./logic";
import { useToast } from "./toast";

/** Gaya lencana format berkas; ditulis statis agar terbaca Tailwind. */
const FORMAT_STYLE: Record<MaterialFormat, string> = {
  PDF: "border-rose-200 bg-rose-50 text-rose-600",
  DOCX: "border-blue-200 bg-blue-50 text-blue-600",
};

const FORMAT_ICON: Record<MaterialFormat, string> = {
  PDF: "fa-file-pdf",
  DOCX: "fa-file-word",
};

/**
 * Daftar materi + penyaring + kartu detail.
 *
 * Data masih `MATERIALS` statis. Tombol "Use in AI Studio" menulis materi
 * terpilih ke `sessionStorage` lalu pindah ke `/guru/materi/baru`, meniru
 * perpindahan layar pada prototipe HTML.
 */
export function MaterialsBrowser() {
  const router = useRouter();
  const showToast = useToast();

  const [filter, setFilter] = useState<MaterialFilter>(EMPTY_FILTER);
  const [selected, setSelected] = useState<Material | null>(null);

  const items = useMemo(() => filterMaterials(MATERIALS, filter), [filter]);

  function ubahFilter<K extends keyof MaterialFilter>(
    key: K,
    value: MaterialFilter[K],
  ) {
    setFilter((previous) => ({ ...previous, [key]: value }));
  }

  function unggahMateriBaru() {
    showToast("Fitur unggah berkas baru diaktifkan.", "info");
    router.push("/guru/materi/baru");
  }

  function pakaiDiAiStudio(material: Material) {
    writeAiStudioSeed({
      subject: material.subject,
      grade: material.grade,
      objective: material.objectives,
      file: { name: material.name, size: material.size },
    });
    setSelected(null);
    showToast(`Materi "${material.name}" dimuat ke AI Studio!`, "success");
    router.push("/guru/materi/baru");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900">
            Learning Materials
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage and organize your teaching resources.
          </p>
        </div>
        <button
          type="button"
          onClick={unggahMateriBaru}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
        >
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden />
          <span>UPLOAD NEW MATERIAL</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Materials"
          value={PORTAL_STATS.materials}
          icon="fa-folder-closed"
          tone="blue"
        />
        <StatCard
          label="Total Subjects"
          value={PORTAL_STATS.totalSubjects}
          icon="fa-book-bookmark"
          tone="indigo"
        />
        <StatCard
          label="Recently Uploaded"
          value={
            <>
              <span className="block max-w-[140px] truncate text-xs font-bold text-slate-900">
                {PORTAL_STATS.recentUpload.name}
              </span>
              <span className="block text-[10px] font-normal text-slate-400">
                {PORTAL_STATS.recentUpload.when}
              </span>
            </>
          }
          icon="fa-clock-rotate-left"
          tone="emerald"
        />
        <StatCard
          label="Storage Used"
          value={PORTAL_STATS.storageUsed}
          icon="fa-hard-drive"
          tone="amber"
        />
      </div>

      <div className="guru-pixel-card space-y-3 rounded-2xl bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-xs text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={filter.query}
              onChange={(event) => ubahFilter("query", event.target.value)}
              placeholder="Cari berdasarkan nama file..."
              aria-label="Cari materi"
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="matFilterSubject" className="sr-only">
              Mata pelajaran
            </label>
            <select
              id="matFilterSubject"
              value={filter.subject}
              onChange={(event) => ubahFilter("subject", event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Mata Pelajaran</option>
              {SUBJECT_OPTIONS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="matFilterGrade" className="sr-only">
              Tingkat kelas
            </label>
            <select
              id="matFilterGrade"
              value={filter.grade}
              onChange={(event) => ubahFilter("grade", event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Kelas</option>
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="matFilterFormat" className="sr-only">
              Format berkas
            </label>
            <select
              id="matFilterFormat"
              value={filter.format}
              onChange={(event) =>
                ubahFilter(
                  "format",
                  event.target.value as MaterialFilter["format"],
                )
              }
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Format</option>
              <option value="PDF">PDF (.pdf)</option>
              <option value="DOCX">DOCX (.docx)</option>
            </select>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-white py-12 text-center">
          <i
            className="fa-solid fa-folder-open mb-2 text-3xl text-slate-300"
            aria-hidden
          />
          <p className="text-xs font-bold text-slate-700">
            Materi tidak ditemukan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="guru-pixel-card group flex flex-col justify-between space-y-4 rounded-2xl bg-white p-5 text-left"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-lg border px-2.5 py-1 font-pixel text-[10px] font-bold ${FORMAT_STYLE[item.format]}`}
                  >
                    <i
                      className={`fa-solid ${FORMAT_ICON[item.format]} mr-1`}
                      aria-hidden
                    />{" "}
                    {item.format}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {item.size}
                  </span>
                </div>

                <div>
                  <h3 className="truncate font-heading text-sm font-bold text-slate-900 transition group-hover:text-brand-600">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {item.subject} • {item.grade}
                  </p>
                </div>

                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                <span className="text-slate-400">
                  <i className="fa-regular fa-calendar mr-1" aria-hidden />{" "}
                  {item.uploadDate}
                </span>
                <span className="font-bold text-brand-600 group-hover:underline">
                  Detail &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        labelledBy="material-modal-title"
        width="max-w-3xl"
      >
        {selected ? (
          <>
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white ${
                    selected.format === "PDF" ? "bg-rose-500" : "bg-blue-500"
                  }`}
                >
                  {selected.format}
                </div>
                <div>
                  <h3
                    id="material-modal-title"
                    className="max-w-md truncate font-heading text-base font-bold text-white"
                  >
                    {selected.name}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {selected.subject} • {selected.grade}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <i className="fa-solid fa-xmark text-sm" aria-hidden />
                <span className="sr-only">Tutup</span>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3.5 sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Ukuran File
                  </span>
                  <span className="font-bold text-slate-800">
                    {selected.size}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Format Berkas
                  </span>
                  <span className="font-bold text-slate-800">
                    {selected.format} Document
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Tanggal Upload
                  </span>
                  <span className="font-bold text-slate-800">
                    {selected.uploadDate}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    Status
                  </span>
                  <span className="font-bold text-emerald-600">
                    Siap Digunakan
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-900">
                  Deskripsi Materi
                </h4>
                <p className="leading-relaxed text-slate-600">
                  {selected.description}
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-900">
                  Capaian Pembelajaran
                </h4>
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 leading-relaxed text-slate-800">
                  {selected.objectives}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border-2 border-slate-300 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => pakaiDiAiStudio(selected)}
                className="flex items-center gap-2 rounded-xl border border-slate-900 bg-brand-600 px-5 py-2.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
              >
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
                <span>Use in AI Studio</span>
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
