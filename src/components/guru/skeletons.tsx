/**
 * Kerangka (skeleton) halaman portal guru.
 *
 * Satu tempat untuk semua bentuk "isi sedang dimuat" supaya:
 *
 * 1. `loading.tsx` per segmen dan `Suspense` di dalam halaman memakai bentuk
 *    yang **sama**. Kalau berbeda, guru melihat dua kerangka berkedip beruntun
 *    saat pindah halaman.
 * 2. Bentuk kerangka ikut berubah bersama halamannya, bukan tertinggal di dua
 *    tempat.
 *
 * Aturan yang dipegang:
 *
 * - Kerangka **meniru tata letak akhir** (jumlah kartu, tinggi baris), supaya
 *   tidak ada lompatan saat konten asli masuk.
 * - Semua blok memakai `guru-skeleton` (`src/app/globals.css`): kilaunya hanya
 *   berjalan saat pengguna tidak meminta gerak dikurangi.
 * - `aria-hidden` di akar kerangka; pembaca layar cukup mendengar konten asli
 *   saat selesai dimuat, bukan tumpukan kotak kosong.
 */

/** Kerangka dashboard: empat kartu statistik + kartu aktivitas terbaru. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-[104px] rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
      <div className="guru-skeleton h-64 rounded-2xl border-2 border-slate-200" />
    </div>
  );
}

/** Kerangka daftar materi: judul, empat kartu ringkasan, tiga kartu materi. */
export function MaterialsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-hidden>
      <div className="guru-skeleton h-12 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-[84px] rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-48 rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

/** Kerangka koleksi game: judul + tiga kartu game. */
export function GamesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-hidden>
      <div className="guru-skeleton h-12 rounded-xl" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-40 rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

/** Kerangka detail materi: judul, ringkasan, dan panel aksi di kanan. */
export function MateriDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 pb-10"
      aria-hidden
      data-testid="materi-detail-skeleton"
    >
      <div className="space-y-3 border-b-2 border-slate-200 pb-4">
        <div className="guru-skeleton h-3 w-24 rounded" />
        <div className="guru-skeleton h-6 w-2/3 rounded" />
        <div className="guru-skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="guru-skeleton h-64 rounded-2xl border-2 border-slate-200 lg:col-span-2" />
        <div className="guru-skeleton h-64 rounded-2xl border-2 border-slate-200" />
      </div>
    </div>
  );
}

/** Kerangka daftar kelas: header, dua kartu statistik, dua kartu kelas. */
export function ClassesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-hidden>
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="guru-skeleton h-7 w-40 rounded-lg" />
          <div className="guru-skeleton h-3 w-56 rounded" />
        </div>
        <div className="guru-skeleton h-10 w-44 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-[76px] rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
      <div className="space-y-4">
        <div className="guru-skeleton h-4 w-40 rounded" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="guru-skeleton h-40 rounded-2xl border-2 border-slate-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Kerangka AI Studio: header, tiga kartu form di kiri, ringkasan di kanan. */
export function StudioSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-hidden>
      <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="guru-skeleton h-7 w-64 rounded-lg" />
          <div className="guru-skeleton h-3 w-72 rounded" />
        </div>
        <div className="guru-skeleton h-8 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="guru-skeleton h-56 rounded-2xl border-2 border-slate-200" />
          <div className="guru-skeleton h-64 rounded-2xl border-2 border-slate-200" />
          <div className="guru-skeleton h-44 rounded-2xl border-2 border-slate-200" />
        </div>
        <div className="lg:col-span-5">
          <div className="guru-skeleton h-80 rounded-2xl border-2 border-slate-200" />
        </div>
      </div>
    </div>
  );
}

/** Kerangka analytics: header, dua penyaring, empat kartu ringkasan, tabel. */
export function AnalyticsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-hidden>
      <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="guru-skeleton h-7 w-48 rounded-lg" />
          <div className="guru-skeleton h-3 w-64 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="guru-skeleton h-20 rounded-2xl border-2 border-slate-200" />
        <div className="guru-skeleton h-20 rounded-2xl border-2 border-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="guru-skeleton h-[88px] rounded-2xl border-2 border-slate-200"
          />
        ))}
      </div>
      <div className="guru-skeleton h-72 rounded-2xl border-2 border-slate-200" />
    </div>
  );
}
