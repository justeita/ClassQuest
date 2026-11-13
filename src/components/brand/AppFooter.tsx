/**
 * Kaki halaman bertema halaman peran (`/`).
 *
 * Dipakai halaman pemilihan peran dan halaman 404 global. Sama seperti
 * `AppHeader`: satu sumber markah supaya kedua halaman tidak perlahan berbeda.
 */
export function AppFooter() {
  return (
    <footer className="relative z-20 w-full shrink-0 border-t-2 border-slate-900 bg-white px-6 py-3 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        {/* Di ponsel kalimat panjang dipecah di titik yang masuk akal, bukan
            di tengah frasa ("...Formal Learning / System."). */}
        <p className="text-center sm:text-left">
          <span className="block sm:inline">
            © 2026 <b className="text-slate-800">Class Quest Engine</b>.
          </span>{" "}
          <span className="block sm:inline">
            Gamified Formal Learning System.
          </span>
        </p>
        <div className="flex items-center gap-4 font-medium text-slate-600">
          <span>Panduan</span>
          <span aria-hidden="true">•</span>
          <span>Pusat Bantuan</span>
        </div>
      </div>
    </footer>
  );
}
