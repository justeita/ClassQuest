"use client";

import { useEffect } from "react";

/**
 * Penghalang ringan untuk gambar tampilan: mencegah klik-kanan ("Simpan gambar
 * sebagai...") dan seret-lepas pada `<img>` mana pun.
 *
 * **Ini bukan pengamanan.** Gambar tetap bisa diambil lewat DevTools, membuka
 * URL `public/` secara langsung, atau screenshot. Tujuannya hanya menutup jalan
 * cepat bagi pengguna awam. Pasangannya adalah aturan `img` di `globals.css`
 * (`-webkit-user-drag`, `user-select`, `-webkit-touch-callout`).
 *
 * Dipasang sekali di root layout dan memeriksa di level dokumen, bukan per
 * gambar, supaya gambar yang dirender belakangan (termasuk oleh komponen
 * client) ikut terlindungi tanpa menambahkan prop di tiap `<Image>`. Kanvas
 * game (Phaser) sengaja tidak disentuh karena bukan `<img>`.
 */
export function ImageGuard() {
  useEffect(() => {
    function cegahKonteks(event: MouseEvent) {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    }

    function cegahSeret(event: DragEvent) {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    }

    document.addEventListener("contextmenu", cegahKonteks);
    document.addEventListener("dragstart", cegahSeret);

    return () => {
      document.removeEventListener("contextmenu", cegahKonteks);
      document.removeEventListener("dragstart", cegahSeret);
    };
  }, []);

  return null;
}
