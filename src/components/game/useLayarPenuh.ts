"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  dukungLayarPenuh,
  layarPenuhAktif,
  masukLayarPenuhLanskap,
} from "@/game/layarPenuh";

/**
 * Status layar penuh dan aksi masuk/keluar, dipakai `TombolLayarPenuh`.
 *
 * Dibangun di atas `useSyncExternalStore`, bukan `useState` + `useEffect`:
 * snapshot server dan render hidrasi sama-sama `false`, lalu React menyusul
 * setelah `document` terbaca — tanpa peringatan hidrasi. Berlangganan
 * `fullscreenchange` juga membuat label tombol ikut berubah saat pengguna
 * keluar layar penuh lewat tombol sistem, bukan hanya lewat tombol kita.
 */
function langganan(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

export function useLayarPenuh(): {
  aktif: boolean;
  didukung: boolean;
  toggle: () => Promise<void>;
} {
  const aktif = useSyncExternalStore(
    langganan,
    () => layarPenuhAktif(document),
    () => false,
  );
  const didukung = useSyncExternalStore(
    langganan,
    () => dukungLayarPenuh(document),
    () => false,
  );

  const toggle = useCallback(async () => {
    if (typeof document === "undefined") return;

    try {
      if (document.fullscreenElement) {
        // Lepas kunci orientasi lebih dulu supaya ponsel boleh kembali tegak
        // begitu keluar dari permainan.
        try {
          screen.orientation?.unlock?.();
        } catch {
          // Peramban tanpa Orientation API: tidak ada yang perlu dilepas.
        }
        await document.exitFullscreen();
        return;
      }

      // Sama dengan yang dipakai tautan siswa di halaman utama.
      await masukLayarPenuhLanskap();
    } catch {
      // Peramban menolak (izin, bukan dari gestur): biarkan UI seperti semula.
    }
  }, []);

  return { aktif, didukung, toggle };
}
