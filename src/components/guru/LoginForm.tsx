"use client";

import { useState, type FormEvent } from "react";

import { hardNavigate } from "./navigation";
import { useToast } from "./toast";

/**
 * Form masuk guru.
 *
 * Tersambung ke `POST /api/auth/login` (`docs/06-backend/api-contract.md`):
 * username + password akun guru, bukan kode akses bersama. Cookie sesi dipasang
 * oleh route handler, lalu guru diarahkan ke `/guru` dengan **muat ulang
 * penuh** (`hardNavigate`), bukan navigasi client — lihat catatan di `kirim()`
 * soal kenapa.
 *
 * Aturan pesan:
 *
 * - Username tidak dikenal, password salah, dan server yang belum dikonfigurasi
 *   dijawab sama oleh server (`401`). Klien **tidak** mencoba membedakannya.
 * - `429` berarti batas percobaan per IP terlampaui; tampilkan pesan "coba lagi
 *   nanti", bukan detail limit.
 * - Masalah jaringan/pemasangan env tidak pernah menampilkan teks internal.
 */
export function LoginForm() {
  const showToast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [pending, setPending] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const nama = username.trim();
    if (nama === "" || password === "") {
      showToast("Masukkan username dan sandi guru terlebih dahulu.", "error");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: nama, password }),
      });

      if (response.ok) {
        showToast(
          "Otentikasi berhasil. Selamat datang di Class Quest Teacher Portal.",
          "success",
        );
        // Muat ulang penuh, bukan `router.replace()` + `router.refresh()`.
        // Keduanya berjalan dalam satu transisi React, jadi layar login baru
        // berganti setelah KEDUA permintaan RSC selesai. Bila salah satunya
        // lambat/menggantung (instance dingin, database jauh), halaman terlihat
        // beku dan guru harus memuat ulang manual. Muat ulang penuh memakai
        // cookie sesi yang baru dan menampilkan progres dari browser.
        // `pending` sengaja tidak direset: tombol tetap nonaktif sampai
        // dokumen baru dimuat.
        hardNavigate("/guru");
        return;
      }

      if (response.status === 429) {
        showToast(
          "Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.",
          "error",
        );
      } else {
        showToast(
          "Username atau sandi tidak dikenali. Periksa lagi atau hubungi admin sekolah.",
          "error",
        );
      }
    } catch {
      showToast(
        "Tidak bisa menghubungi server. Coba lagi sebentar lagi.",
        "error",
      );
    }

    setPending(false);
  }

  return (
    <div className="relative z-10 flex w-full items-center justify-center bg-white p-6 sm:p-10 lg:w-5/12 lg:bg-slate-50 lg:p-14">
      <div className="guru-enter w-full max-w-md space-y-6">
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
            Masuk dengan akun guru untuk mengelola materi dan misi pembelajaran.
          </p>
        </div>

        <form onSubmit={kirim} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="loginUsername"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Username
            </label>
            <div className="relative">
              <i
                className="fa-solid fa-user absolute left-4 top-3.5 text-xs text-slate-400"
                aria-hidden
              />
              <input
                id="loginUsername"
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username guru"
                aria-describedby="loginUsernameHint"
                disabled={pending}
                className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 pl-11 pr-3 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
              />
            </div>
            <p
              id="loginUsernameHint"
              className="mt-1.5 text-[11px] text-slate-500"
            >
              Akun guru dibuat oleh admin sekolah. Belum ada pendaftaran
              mandiri.
            </p>
          </div>

          <div>
            <label
              htmlFor="loginPassword"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Sandi
            </label>
            <div className="relative">
              <i
                className="fa-solid fa-lock absolute left-4 top-3.5 text-xs text-slate-400"
                aria-hidden
              />
              <input
                id="loginPassword"
                type={lihatSandi ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                aria-describedby="loginPasswordHint"
                disabled={pending}
                className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 pl-11 pr-11 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
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
            <p
              id="loginPasswordHint"
              className="mt-1.5 text-[11px] text-slate-500"
            >
              Sandi tidak bisa direset sendiri; hubungi admin sekolah bila lupa.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="guru-press-pixel flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-slate-900 bg-brand-600 px-6 py-3.5 font-pixel text-sm font-bold text-white shadow-[4px_4px_0px_#1e3a8a] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{pending ? "MEMERIKSA…" : "MASUK KE PORTAL"}</span>
            <i className="fa-solid fa-arrow-right text-xs" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
