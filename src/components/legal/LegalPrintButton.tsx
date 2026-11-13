"use client";

/**
 * Tombol cetak dokumen legal.
 *
 * Satu-satunya bagian halaman legal yang butuh JavaScript; sisanya Server
 * Component. Tombol disembunyikan saat halaman dicetak (`print:hidden`) supaya
 * tidak muncul sebagai tombol mati di kertas.
 */
export function LegalPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 font-pixel text-[11px] font-bold uppercase tracking-wide text-slate-600 transition hover:text-guru-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guru-700 print:hidden"
    >
      <i className="fa-solid fa-print" aria-hidden="true" />
      Cetak
    </button>
  );
}
