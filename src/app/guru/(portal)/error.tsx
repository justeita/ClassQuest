"use client";

import { useEffect } from "react";

/**
 * Batas error segmen portal guru.
 *
 * Pesan tidak pernah menampilkan `error.message` atau stack trace: kegagalan
 * database/pipeline adalah detail internal (`docs/05-frontend/routes.md`
 * bagian "Status dan error"). Guru hanya mendapat penjelasan singkat dan tombol
 * coba lagi.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tidak ada detail error yang dikirim ke klien; cukup catat di console
    // server/browser untuk debugging lokal.
    console.error(error);
  }, [error]);

  return (
    <div className="guru-pop mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-rose-200 bg-white p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-600">
        <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden />
      </div>
      <h2 className="font-heading text-lg font-bold text-slate-900">
        Halaman gagal dimuat
      </h2>
      <p className="text-xs leading-relaxed text-slate-600">
        Ada gangguan saat mengambil data. Coba muat ulang halaman ini; kalau
        masih gagal, tunggu beberapa saat lagi.
      </p>
      <button
        type="button"
        onClick={reset}
        className="guru-press-pixel mt-1 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
      >
        COBA LAGI
      </button>
    </div>
  );
}
