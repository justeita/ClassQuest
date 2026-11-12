"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useToast } from "./toast";

/**
 * Form masuk guru.
 *
 * **Belum tersambung ke autentikasi.** Desain asalnya hanya berpindah layar di
 * browser; di sini tombolnya menuju `/guru`. Saat wiring dikerjakan, ganti
 * `router.push` dengan pemanggilan `POST /api/auth/login` (lihat
 * `docs/06-backend/api-contract.md`) supaya cookie sesi benar-benar dipasang.
 */
export function LoginForm() {
  const router = useRouter();
  const showToast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);

  function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      showToast("Masukkan alamat email akademik yang sah.", "error");
      return;
    }

    showToast(
      "Otentikasi berhasil. Selamat datang di Class Quest Teacher Portal.",
      "success",
    );
    router.push("/guru");
  }

  return (
    <div className="relative z-10 flex w-full items-center justify-center bg-white p-6 sm:p-10 lg:w-5/12 lg:bg-slate-50 lg:p-14">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-left">
          <div className="mb-1 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 shadow-sm">
            <span className="font-pixel text-xs uppercase tracking-wide text-brand-700">
              Otentikasi Pengajar
            </span>
          </div>

          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Masuk Portal{" "}
            <span className="font-pixel text-brand-600">Class Quest</span>
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Silakan masukkan kredensial akun akademik Anda untuk mengelola kelas
            dan misi pembelajaran.
          </p>
        </div>

        <form onSubmit={kirim} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="loginEmail"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Alamat Email Akademik
            </label>
            <div className="relative">
              <i
                className="fa-regular fa-envelope absolute left-4 top-3.5 text-sm text-slate-400"
                aria-hidden
              />
              <input
                id="loginEmail"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@institusi.ac.id"
                className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="loginPassword"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <i
                className="fa-solid fa-key absolute left-4 top-3.5 text-xs text-slate-400"
                aria-hidden
              />
              <input
                id="loginPassword"
                type={lihatSandi ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setLihatSandi((nilai) => !nilai)}
                aria-label={
                  lihatSandi ? "Sembunyikan sandi" : "Tampilkan sandi"
                }
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <i
                  className={`fa-solid ${lihatSandi ? "fa-eye-slash" : "fa-eye"} text-sm`}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-slate-700">
                Ingat Sesi Saya
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                showToast(
                  "Silakan hubungi Unit IT Institusi untuk reset sandi.",
                  "info",
                )
              }
              className="font-semibold text-brand-600 hover:underline"
            >
              Bantuan Sandi?
            </button>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-slate-900 bg-brand-600 px-6 py-3.5 font-pixel text-sm font-bold text-white shadow-[4px_4px_0px_#1e3a8a] transition hover:bg-brand-700 active:translate-y-1"
          >
            <span>MASUK KE PORTAL</span>
            <i className="fa-solid fa-arrow-right text-xs" aria-hidden />
          </button>
        </form>

        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Belum memiliki akun pengajar?{" "}
          <button
            type="button"
            onClick={() =>
              showToast("Hubungi Administrator Kurikulum Sekolah.", "info")
            }
            className="ml-1 font-bold text-brand-700 hover:underline"
          >
            Daftar Akses Baru
          </button>
        </div>
      </div>
    </div>
  );
}
