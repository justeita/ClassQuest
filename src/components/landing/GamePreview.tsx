/**
 * Jendela "tangkapan layar" game di hero halaman peran (`/`).
 *
 * Halaman `/` adalah kesan pertama juri, dan produk ini game pixel — jadi panel
 * ini memutar **rekaman permainan yang benar-benar jalan**, bukan satu gambar
 * diam. Isinya potongan 30 detik dari desa: pemain berjalan melewati jalan
 * setapak, lalu berdialog dengan warga.
 *
 * Berkasnya ada di `public/menu/`, **di luar** `public/assets/`: ia bukan aset
 * yang dipilih cerita dan tidak punya `id` manifest (lihat
 * `docs/07-assets/asset-guide.md`), sama seperti latar menu utama. Karena itu
 * panel ini tidak menyentuh manifest aset sama sekali.
 *
 * Soal loop: rekaman ini tidak bisa dipotong begitu saja — potongan 0–30 detik
 * berakhir di adegan yang berbeda dari awalnya, jadi menyambungnya mentah
 * terlihat seperti lompatan. Karena itu awal dan akhir rekaman dibuat memudar
 * ke gelap (0,5 detik di ffmpeg) sehingga `loop` terbaca sebagai transisi, bukan
 * lompatan. Memudar ke gelap, bukan potongan keras, juga membuat latar gelap
 * bingkai pixel tidak terasa berkedip.
 *
 * `muted` wajib supaya autoplay diizinkan browser; `playsInline` mencegah iOS
 * membuka pemutar layar penuh. `poster` memakai frame dari video yang sama agar
 * tidak ada kotak kosong sebelum byte pertama selesai diunduh.
 *
 * Gerak video ini mengikuti aturan halaman: bila pengguna memilih
 * `prefers-reduced-motion: reduce`, videonya dijeda di frame poster dan tombol
 * putar disediakan — CSS saja tidak cukup untuk menghentikan `<video>`.
 */
"use client";

import { useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/components/game/useSentuh";

/**
 * `HTMLMediaElement.play()` mengembalikan promise di browser, tapi `undefined` di
 * jsdom. Penolakan autoplay juga wajar (mis. penghemat daya) dan bukan kegagalan:
 * poster tetap tampil dan tombol putar tetap tersedia, jadi hasilnya sengaja
 * tidak ditunggu.
 */
function putar(el: HTMLVideoElement) {
  void el.play()?.catch(() => {});
}

export function GamePreview() {
  const video = useRef<HTMLVideoElement>(null);
  const kurangiGerak = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [dijeda, setDijeda] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;

    if (kurangiGerak) {
      el.pause();
      return;
    }

    putar(el);
  }, [kurangiGerak]);

  const mainkan = () => {
    const el = video.current;
    if (!el) return;
    putar(el);
    setDijeda(false);
  };

  return (
    <div className="landing-pixel-frame landing-bob relative overflow-hidden rounded-2xl bg-slate-900">
      <div className="relative aspect-video">
        <video
          ref={video}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src="/menu/hero_loop.mp4"
          poster="/menu/hero_loop.jpg"
          aria-label="Rekaman permainan ClassQuest: pemain berjalan di desa lalu berdialog dengan warga."
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onPlay={() => setDijeda(false)}
          onPause={() => setDijeda(true)}
        />

        {/* Garis pindai tipis supaya panel ini tetap terasa satu keluarga dengan
            bingkai pixel lain di halaman. */}
        <div
          aria-hidden="true"
          className="landing-scanlines pointer-events-none absolute inset-0"
        />

        {dijeda ? (
          <button
            type="button"
            onClick={mainkan}
            className="absolute inset-0 flex items-center justify-center bg-slate-900/35 text-white transition hover:bg-slate-900/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="landing-pixel-shadow flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900">
              <i className="fa-solid fa-play" aria-hidden="true" />
            </span>
            <span className="sr-only">Putar rekaman permainan</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
