import type { Story } from "@/story/schema";

import { bacaProgres, kunciProgres, type KursorProgres } from "./progress";

/**
 * Jembatan React ↔ `localStorage` untuk progres main.
 *
 * `src/game/progress.ts` sengaja murni (storage disuntik), sedangkan React
 * butuh nilai progres yang **stabil antar-render** dan aman untuk render
 * server. Modul ini menyediakan keduanya untuk `useSyncExternalStore`:
 *
 * - `bacaKursorProgres()` mengembalikan objek yang sama selama isi
 *   `localStorage` tidak berubah (di-cache per kunci + isi mentah), jadi React
 *   tidak melihat "snapshot baru" di setiap render.
 * - `langgananProgres()` + `kabariProgres()` memberi tahu React setelah progres
 *   disimpan atau dihapus.
 *
 * Pola ini dipilih supaya `GameShell` tidak perlu `setState` di dalam effect:
 * hydration pertama memakai snapshot server (`null`), lalu React membaca
 * `localStorage` setelah mount. Tanpa itu, menu "Lanjutkan" akan berbeda antara
 * HTML server dan render klien pertama.
 */

type Penyimpanan = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Nilai cache terakhir; `mentah` membuat snapshot stabil antar-render. */
type CacheKursor = {
  kunci: string;
  mentah: string | null;
  kursor: KursorProgres | null;
};

const pendengar = new Set<() => void>();
let cache: CacheKursor | null = null;

function penyimpanan(): Penyimpanan | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function bacaMentah(kunci: string): string | null {
  try {
    return penyimpanan()?.getItem(kunci) ?? null;
  } catch {
    // Storage ditolak (mode privat): diperlakukan seperti belum ada progres.
    return null;
  }
}

/**
 * Kursor yang bisa dilanjutkan, atau `null`. Simpanan kedaluwarsa juga
 * menghasilkan `null`; pembersihannya dilakukan `GameShell` di effect.
 */
export function bacaKursorProgres(story: Story): KursorProgres | null {
  const kunci = kunciProgres(story.meta.id);
  const mentah = bacaMentah(kunci);
  if (cache !== null && cache.kunci === kunci && cache.mentah === mentah) {
    return cache.kursor;
  }

  const hasil = bacaProgres(penyimpanan(), story);
  const kursor =
    hasil.status === "siap"
      ? {
          chapterIndex: hasil.progres.chapterIndex,
          sceneIndex: hasil.progres.sceneIndex,
          beatIndex: hasil.progres.beatIndex,
          answers: hasil.progres.answers,
        }
      : null;

  cache = { kunci, mentah, kursor };
  return kursor;
}

/** Berlangganan perubahan progres; dipakai `useSyncExternalStore`. */
export function langgananProgres(pendengarBaru: () => void): () => void {
  pendengar.add(pendengarBaru);
  return () => {
    pendengar.delete(pendengarBaru);
  };
}

/** Kabari React bahwa progres baru saja disimpan atau dihapus. */
export function kabariProgres(): void {
  cache = null;
  for (const satuPendengar of pendengar) satuPendengar();
}
