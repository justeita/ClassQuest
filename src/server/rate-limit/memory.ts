/**
 * Penghitung rate limit **di memori** untuk endpoint baca publik.
 *
 * `GET /api/stories/[storyId]` dipanggil setiap siswa membuka game. Menulis
 * satu baris database untuk setiap permintaan baca akan lebih mahal daripada
 * yang dilindungi, jadi endpoint ini memakai `Map` per proses (fixed window).
 *
 * Konsekuensi yang diterima:
 *
 * - Batas berlaku **per instance**, bukan per deploy: N instance berarti N kali
 *   batas efektif. Untuk perlindungan dasar terhadap skrip ini cukup.
 * - Hitungan hilang saat instance didaur ulang. Itu wajar untuk baca.
 * - Map dibersihkan dari entri jendela lama supaya proses yang hidup lama tidak
 *   tumbuh tanpa batas (`docs/06-backend/api-contract.md`, bagian Rate limit).
 *
 * Modul ini tidak menyentuh database dan tidak membaca environment.
 */

import type { RateLimitResult } from "./check";

type Entry = {
  /** Awal jendela (detik), hasil `floor(now / window) * window`. */
  windowStart: number;
  /** Panjang jendela milik entri ini; disimpan agar pembersihan tidak salah. */
  windowSeconds: number;
  count: number;
};

/**
 * Batas jumlah entri yang disimpan sebelum pembersihan paksa. Satu entri per
 * IP per proses; 10.000 kira-kira cukup untuk satu sekolah besar dan tetap
 * kecil di memori.
 */
export const MEMORY_RATE_LIMIT_MAX_ENTRIES = 10_000;

export type MemoryRateLimitStore = {
  check: (input: {
    key: string;
    limit: number;
    windowSeconds: number;
    now?: number | (() => number);
  }) => RateLimitResult;
  /** Jumlah entri saat ini; untuk test dan pemantauan. */
  size: () => number;
  clear: () => void;
};

/**
 * Buat penyimpanan penghitung di memori untuk **satu** proses.
 *
 * `now` diinjeksi supaya test bisa memindahkan jendela tanpa menunggu.
 */
export function createMemoryRateLimitStore(): MemoryRateLimitStore {
  const entries = new Map<string, Entry>();

  const prune = (nowSeconds: number): void => {
    for (const [key, entry] of entries) {
      if (entry.windowStart + entry.windowSeconds <= nowSeconds) {
        entries.delete(key);
      }
    }
  };

  return {
    check({ key, limit, windowSeconds, now }) {
      if (!Number.isInteger(limit) || limit < 1) {
        throw new RangeError("limit harus bilangan bulat >= 1");
      }
      if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
        throw new RangeError("windowSeconds harus bilangan bulat >= 1");
      }

      const nowMs = typeof now === "function" ? now() : (now ?? Date.now());
      const nowSeconds = Math.floor(nowMs / 1000);
      const windowStart =
        Math.floor(nowSeconds / windowSeconds) * windowSeconds;

      const existing = entries.get(key);
      const count =
        existing !== undefined && existing.windowStart === windowStart
          ? existing.count + 1
          : 1;

      entries.set(key, { windowStart, windowSeconds, count });

      // Pembersihan: setiap kali map melewati batas, dan sesekali di bawahnya.
      if (
        entries.size > MEMORY_RATE_LIMIT_MAX_ENTRIES ||
        entries.size % 1000 === 0
      ) {
        prune(nowSeconds);
      }

      const allowed = count <= limit;
      const result: RateLimitResult = {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: allowed
          ? 0
          : Math.max(1, windowStart + windowSeconds - nowSeconds),
      };

      return result;
    },

    size() {
      return entries.size;
    },

    clear() {
      entries.clear();
    },
  };
}

/**
 * Penyimpanan bawaan proses ini. Server Action, route handler, dan test
 * berbagi map yang sama — test wajib memanggil `clear()` di `beforeEach`.
 */
export const memoryRateLimits = createMemoryRateLimitStore();
