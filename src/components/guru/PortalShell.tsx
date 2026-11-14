"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { CURRENT_TEACHER } from "./data";
import { useToast } from "./toast";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

/**
 * Menu sidebar. Urutan mengikuti desain awal; `href` mengikuti peta route di
 * `docs/05-frontend/routes.md`.
 */
const NAV: NavItem[] = [
  { href: "/guru", label: "Dashboard", icon: "fa-border-all" },
  {
    href: "/guru/materi/baru",
    label: "AI Studio",
    icon: "fa-wand-magic-sparkles",
  },
  { href: "/guru/materi", label: "Learning Materials", icon: "fa-book-open" },
  { href: "/guru/kelas", label: "My Classes", icon: "fa-users" },
  { href: "/guru/game", label: "My Games", icon: "fa-gamepad" },
  { href: "/guru/analitik", label: "Analytics", icon: "fa-chart-column" },
];

/** Judul header per halaman; nilai sama dengan teks desain awal. */
const TITLES: { match: (path: string) => boolean; title: string }[] = [
  { match: (path) => path === "/guru", title: "Teacher Portal Overview" },
  {
    match: (path) => path.startsWith("/guru/materi/baru"),
    title: "GamED AI Studio Synthesizer",
  },
  {
    match: (path) => path.startsWith("/guru/materi"),
    title: "Learning Materials Management",
  },
  {
    match: (path) => path.startsWith("/guru/kelas"),
    title: "Classrooms & Student Management",
  },
  {
    match: (path) => path.startsWith("/guru/game"),
    title: "My Educational Games",
  },
  {
    match: (path) => path.startsWith("/guru/analitik"),
    title: "Class Analytics",
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/guru") return pathname === "/guru";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Kerangka portal guru: sidebar, header lengket, dan area konten yang
 * menggulir sendiri. Dipasang oleh `src/app/guru/(portal)/layout.tsx`, jadi
 * halaman masuk (`/guru/masuk`) tidak ikut memakai sidebar.
 *
 * Tinggi kerangka mengunci viewport (`h-dvh`, bukan `h-screen`: `dvh` mengikuti
 * tinggi yang benar-benar terlihat saat bilah alamat peramban ponsel muncul).
 * Konsekuensinya isi sidebar **wajib** punya jalur gulir sendiri: di ponsel
 * posisi mendatar (lebar ≥ 768 px, tinggi ± 375 px) menu utama lebih tinggi
 * daripada viewport, dan karena dokumen dikunci `overflow-hidden`, menu yang
 * terpotong tidak bisa dijangkau dengan menggulir halaman. Karena itu blok logo
 * + menu memakai `md:overflow-y-auto` dan kartu akun tetap di bawah.
 *
 * `teacherName` berasal dari sesi nyata (layout memanggil `requireTeacher()`).
 * Level/XP/gold masih hiasan desain karena belum ada tabel progres guru.
 */
export function PortalShell({
  children,
  teacherName,
}: {
  children: ReactNode;
  teacherName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const showToast = useToast();
  const [keluar, setKeluar] = useState(false);

  const initials = teacherName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  /** Hapus cookie sesi di server, lalu kembali ke halaman masuk. */
  async function keluarAkun() {
    if (keluar) return;
    setKeluar(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie sesi mungkin masih ada, tetapi layout (portal) akan
      // mengarahkan ulang ke halaman masuk saat sesi tidak sah.
    }

    showToast("Sesi kerja Anda telah diakhiri.", "info");
    // Cukup `replace`: navigasi sudah mengambil RSC halaman masuk. `refresh()`
    // setelah navigasi hanya menggandakan permintaan dan bisa menahan transisi
    // sampai keduanya selesai (gejala halaman terlihat beku).
    router.replace("/guru/masuk");
  }

  // Halaman paling spesifik menang: `/guru/materi/baru` bukan `/guru/materi`.
  const active = NAV.filter((item) => isActive(pathname, item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]?.href;

  const title =
    TITLES.find((entry) => entry.match(pathname))?.title ??
    "Teacher Portal Overview";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 md:h-dvh md:flex-row md:overflow-hidden">
      <aside className="z-30 flex w-full shrink-0 flex-col justify-between border-b border-slate-200 bg-white text-slate-800 shadow-md md:relative md:h-full md:min-h-0 md:w-64 md:overflow-hidden md:border-b-0 md:border-r">
        <div className="guru-scroll md:min-h-0 md:flex-1 md:overflow-y-auto">
          <div className="flex items-center border-b border-slate-200 p-4 md:p-5">
            <div>
              <Image
                src="/brand/classquest_logo.png"
                alt="Class Quest"
                width={1809}
                height={428}
                priority
                sizes="203px"
                className="h-12 w-auto"
              />
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Teacher Portal
              </p>
            </div>
          </div>

          <div className="space-y-6 px-4 py-3 md:py-6">
            <div>
              <p className="mb-3 hidden px-3 font-pixel text-[10px] font-extrabold uppercase tracking-wider text-slate-400 md:block">
                Menu Utama
              </p>
              <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:flex md:flex-col md:space-y-1.5">
                {NAV.map((item) => {
                  const selected = item.href === active;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={selected ? "page" : undefined}
                      className={`guru-press flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition md:w-full ${
                        selected
                          ? "border border-brand-500 bg-brand-600 text-white shadow-[3px_3px_0px_#172554]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <i
                        className={`fa-solid ${item.icon} w-4 shrink-0 text-sm`}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-amber-400 text-xs font-bold text-slate-900 shadow">
                {initials}
              </div>
              <div className="overflow-hidden text-left">
                <p className="truncate text-xs font-bold text-slate-900">
                  {teacherName}
                </p>
                <p className="font-pixel text-[10px] text-amber-600">
                  LVL. {CURRENT_TEACHER.level} Educator
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={keluarAkun}
              disabled={keluar}
              title="Keluar Akun"
              className="shrink-0 rounded p-1.5 text-slate-400 transition hover:text-rose-600 disabled:opacity-50"
            >
              <i
                className="fa-solid fa-arrow-right-from-bracket text-xs"
                aria-hidden
              />
              <span className="sr-only">Keluar akun</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col bg-slate-50 md:overflow-hidden">
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b-2 border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <h1
              key={title}
              className="guru-enter font-heading text-lg font-extrabold text-slate-900"
            >
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs sm:flex">
              <span className="flex items-center gap-1 font-pixel font-bold text-amber-600">
                <i className="fa-solid fa-bolt" aria-hidden />{" "}
                {CURRENT_TEACHER.xp}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-pixel font-bold text-emerald-600">
                <i className="fa-solid fa-coins" aria-hidden />{" "}
                {CURRENT_TEACHER.gold}
              </span>
            </div>

            <button
              type="button"
              onClick={() => showToast("Tidak ada notifikasi baru", "info")}
              className="guru-press relative flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-700 shadow-[2px_2px_0px_#cbd5e1] transition hover:bg-slate-50"
            >
              <i className="fa-regular fa-bell text-sm" aria-hidden />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-white bg-rose-500" />
              <span className="sr-only">Notifikasi</span>
            </button>
          </div>
        </header>

        <div className="guru-scroll flex-1 p-6 sm:p-8 md:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
