import Link from "next/link";

/**
 * Navigasi antar dokumen legal.
 *
 * Desain asalnya (`ai_studio_code (11).html`) memakai SPA satu halaman dengan
 * tombol `onclick`. Di repo ini setiap dokumen punya route sendiri, jadi
 * navigasinya berupa tautan biasa: bisa dibuka di tab baru, dibagikan, dan
 * tetap bekerja tanpa JavaScript.
 *
 * `aktif` diisi halaman yang sedang dibuka. Halaman aktif ditandai
 * `aria-current="page"` supaya pembaca layar tidak bergantung pada warna saja.
 */
export type LegalKey = "privasi" | "syarat" | "penafian" | "cookie";

const DOKUMEN = [
  {
    kunci: "privasi",
    href: "/privasi",
    label: "Privasi",
    ikon: "fa-user-shield",
  },
  {
    kunci: "syarat",
    href: "/syarat",
    label: "Syarat & Ketentuan",
    ikon: "fa-file-contract",
  },
  {
    kunci: "penafian",
    href: "/penafian",
    label: "Penafian",
    ikon: "fa-triangle-exclamation",
  },
  {
    kunci: "cookie",
    href: "/cookie",
    label: "Cookie",
    ikon: "fa-cookie-bite",
  },
] as const;

export function LegalNav({
  aktif,
  className = "",
}: {
  aktif: LegalKey;
  className?: string;
}) {
  return (
    <nav
      aria-label="Dokumen legal"
      className={`landing-pixel-shadow flex flex-wrap items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white p-1.5 ${className}`}
    >
      {DOKUMEN.map((dokumen) => {
        const terpilih = dokumen.kunci === aktif;

        return (
          <Link
            key={dokumen.kunci}
            href={dokumen.href}
            aria-current={terpilih ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-pixel text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guru-700 ${
              terpilih
                ? "landing-pixel-shadow bg-guru-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <i
              className={`fa-solid ${dokumen.ikon} ${terpilih ? "text-white" : "text-guru-600"}`}
              aria-hidden="true"
            />
            <span>{dokumen.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
