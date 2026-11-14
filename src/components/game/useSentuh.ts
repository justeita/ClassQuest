"use client";

import { useCallback, useSyncExternalStore } from "react";

import { perangkatSentuh } from "@/game/sentuh";

/**
 * Hook deteksi perangkat sentuh dan kueri media, dipakai `GameCanvas`, `HUD`,
 * dan `KotakSpace` untuk menyesuaikan tata letak serta label.
 *
 * Dibangun di atas `useSyncExternalStore`, bukan `useState` + `useEffect`:
 * dengan begitu render pertama (server dan saat hidrasi) memakai snapshot
 * "desktop" yang sama, lalu React menyusul begitu snapshot klien terbaca — tanpa
 * peringatan hidrasi dan tanpa `setState` di dalam effect.
 */

function media(query: string): MediaQueryList | null {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  return window.matchMedia(query);
}

/** Kueri media reaktif; `false` bila `matchMedia` tidak tersedia (mis. uji). */
export function useMediaQuery(query: string): boolean {
  const langganan = useCallback(
    (onChange: () => void) => {
      const mql = media(query);
      if (!mql) return () => {};
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const snapshot = useCallback(() => media(query)?.matches ?? false, [query]);

  return useSyncExternalStore(langganan, snapshot, () => false);
}

function snapshotSentuh(): boolean {
  return perangkatSentuh({
    maxTouchPoints:
      typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
    pointerCoarse: media("(pointer: coarse)")?.matches ?? false,
    hoverNone: media("(hover: none)")?.matches ?? false,
    mediaQuery:
      typeof window !== "undefined" && typeof window.matchMedia === "function",
  });
}

function langgananSentuh(onChange: () => void): () => void {
  const daftar = [media("(pointer: coarse)"), media("(hover: none)")].filter(
    (mql): mql is MediaQueryList => mql !== null,
  );
  for (const mql of daftar) mql.addEventListener("change", onChange);
  return () => {
    for (const mql of daftar) mql.removeEventListener("change", onChange);
  };
}

/** `true` bila perangkat saat ini harus memakai kontrol sentuh. */
export function useSentuh(): boolean {
  return useSyncExternalStore(langgananSentuh, snapshotSentuh, () => false);
}

/** Layar lebih tinggi daripada lebar; dipakai memilih tata letak dek kontrol. */
export function useLayarPotret(): boolean {
  return useMediaQuery("(orientation: portrait)");
}
