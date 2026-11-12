import type { ReactNode } from "react";

/**
 * Kartu angka ringkasan portal.
 *
 * Dua varian mengikuti desain asal: `StatCard` (ikon di kiri, untuk halaman
 * materi dan kelas) dan `DashboardStatCard` (angka besar dengan ikon di kanan).
 * Warna kotak ikon ditulis sebagai peta kelas statis supaya Tailwind tetap bisa
 * memindai kelasnya saat build.
 */

export type StatTone = "blue" | "indigo" | "emerald" | "purple" | "amber";

const TONE: Record<StatTone, { box: string; shadow: string }> = {
  blue: {
    box: "bg-blue-100 border-blue-300 text-brand-600",
    shadow: "shadow-[2px_2px_0px_#93c5fd]",
  },
  indigo: {
    box: "bg-indigo-100 border-indigo-300 text-indigo-600",
    shadow: "shadow-[2px_2px_0px_#a5b4fc]",
  },
  emerald: {
    box: "bg-emerald-100 border-emerald-300 text-emerald-600",
    shadow: "shadow-[2px_2px_0px_#6ee7b7]",
  },
  purple: {
    box: "bg-purple-100 border-purple-300 text-purple-600",
    shadow: "shadow-[2px_2px_0px_#d8b4fe]",
  },
  amber: {
    box: "bg-amber-100 border-amber-300 text-amber-600",
    shadow: "shadow-[2px_2px_0px_#fcd34d]",
  },
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: string;
  tone: StatTone;
};

export function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <div className="guru-pixel-card guru-lift flex items-center gap-4 rounded-2xl bg-white p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-lg ${TONE[tone].box}`}
      >
        <i className={`fa-solid ${icon}`} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-pixel text-[11px] font-semibold uppercase text-slate-500">
          {label}
        </p>
        <div className="font-heading text-2xl font-bold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

export function DashboardStatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <div className="guru-pixel-card guru-lift flex items-center justify-between rounded-2xl bg-white p-5">
      <div className="space-y-1">
        <p className="font-pixel text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="font-heading text-3xl font-extrabold text-slate-900">
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl ${TONE[tone].box} ${TONE[tone].shadow}`}
      >
        <i className={`fa-solid ${icon}`} aria-hidden />
      </div>
    </div>
  );
}
