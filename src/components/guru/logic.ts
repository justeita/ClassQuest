/**
 * Logika murni Portal Guru.
 *
 * Dipisahkan dari komponen supaya bisa diuji tanpa DOM: penyaringan daftar
 * cerita, label status, format ukuran/tanggal, dan validasi berkas unggahan.
 * Semua fungsi di sini deterministik dan tidak menyentuh jaringan atau
 * database, jadi aman dipanggil dari komponen client.
 */

import type { StoryListItem, StoryStatus } from "@/server/contracts";

/* -------------------------------------------------------------------------- */
/* Penyaringan daftar materi                                                  */
/* -------------------------------------------------------------------------- */

export type StoryFilter = {
  query: string;
  subject: string;
  status: "" | StoryStatus;
};

export const EMPTY_STORY_FILTER: StoryFilter = {
  query: "",
  subject: "",
  status: "",
};

/**
 * Saring daftar cerita. Kueri dicocokkan ke judul **dan** mata pelajaran;
 * filter kosong berarti "semua". Urutan masukan dipertahankan (server sudah
 * mengurutkan `updated_at` terbaru).
 */
export function filterStories(
  items: readonly StoryListItem[],
  filter: StoryFilter,
): StoryListItem[] {
  const query = filter.query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery =
      query === "" ||
      item.title.toLowerCase().includes(query) ||
      item.subject.toLowerCase().includes(query);
    const matchesSubject =
      filter.subject === "" || item.subject === filter.subject;
    const matchesStatus = filter.status === "" || item.status === filter.status;

    return matchesQuery && matchesSubject && matchesStatus;
  });
}

/* -------------------------------------------------------------------------- */
/* Status cerita                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Label dan warna lencana per status, mengikuti tabel di
 * `docs/05-frontend/teacher-dashboard.md`. Kelas Tailwind ditulis utuh supaya
 * tetap terbaca saat build.
 */
export const STORY_STATUS_META: Record<
  StoryStatus,
  { label: string; badge: string }
> = {
  processing: {
    label: "Sedang dibuat…",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  draft: {
    label: "Perlu direview",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  published: {
    label: "Sudah dibagikan",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Gagal dibuat",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
  archived: {
    label: "Diarsipkan",
    badge: "border-slate-300 bg-slate-100 text-slate-600",
  },
};

export function storyStatusLabel(status: StoryStatus): string {
  return STORY_STATUS_META[status].label;
}

/* -------------------------------------------------------------------------- */
/* Format tampilan                                                            */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/**
 * Ukuran berkas untuk manusia, memakai koma desimal seperti contoh pesan error
 * di `docs/05-frontend/teacher-dashboard.md` ("4,5 MB").
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Tanggal `updated_at` (ISO UTC) menjadi `12 Nov 2026`.
 *
 * Memakai bagian UTC supaya hasil render server dan klien selalu sama; zona
 * waktu pengguna belum diputuskan di docs.
 */
export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/* -------------------------------------------------------------------------- */
/* Unggahan PDF                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Judul awal form unggahan: nama berkas tanpa `.pdf`, dengan garis bawah dan
 * strip dirapikan. Guru tetap bisa mengubahnya.
 */
export function defaultTitleFromFilename(name: string): string {
  const withoutExtension = name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ");
  return withoutExtension.trim().slice(0, 80);
}

export type UploadFileCheck = { ok: true } | { ok: false; message: string };

/**
 * Validasi berkas **sebelum** unggah (tipe dan ukuran). Server tetap
 * memvalidasi ulang; ini hanya supaya guru tidak menunggu unggahan yang pasti
 * ditolak. Pesan mengikuti tabel "Pesan error yang baik" di
 * `docs/05-frontend/teacher-dashboard.md`.
 */
export function checkPdfFile(
  file: { name: string; type: string; size: number },
  maxBytes: number,
): UploadFileCheck {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return { ok: false, message: "File ini bukan PDF. Pilih file .pdf ya." };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `PDF-nya ${formatBytes(file.size)}, batasnya ${formatBytes(maxBytes)}. Coba kompres dulu.`,
    };
  }

  return { ok: true };
}
