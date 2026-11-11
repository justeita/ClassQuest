/**
 * Penghitung rate limit di database (fixed window).
 *
 * Deploy serverless punya banyak instance dan memori tidak dipakai bersama,
 * jadi penghitung untuk endpoint sensitif (login, upload, hasil bermain) harus
 * disimpan di database. Deploy seperti itu juga tidak punya startup hook yang
 * bisa membersihkan tabel, karena itu pembersihan bersifat oportunistik.
 *
 * Aturan yang dipegang:
 *
 * - **Satu statement atomik per hitungan.**
 *   `insert ... on conflict(key, window_start) do update set count = count + 1
 *   returning count` dijalankan tanpa transaksi terpisah. Jangan memakai
 *   `rowsAffected`: libSQL hanya melaporkan jumlah baris statement terakhir,
 *   sedangkan `insert ... on conflict` melaporkan 0 untuk jalur update. Nilai
 *   yang dipakai selalu baris hasil `returning`.
 * - **Fixed window.** `windowStart = floor(now / window) * window`, sehingga
 *   hitungan otomatis berulang di jendela berikutnya tanpa reset eksplisit.
 * - **Kegagalan diputuskan pemanggil.** Fungsi ini meneruskan error database
 *   apa adanya; pemanggil memilih fail closed (login, upload) atau fail open
 *   (hasil bermain).
 * - **Tanpa data pribadi.** `key` sudah berupa `"<nama-limit>:<hash>"` dari
 *   `identity.ts`; modul ini tidak pernah melihat IP.
 * - **Tanpa log.** Tidak ada `console.*` di jalur ini, termasuk saat
 *   pembersihan gagal.
 */

import "server-only";

import type { Client } from "@libsql/client";

import { getReadyDb } from "../db";

import {
  RATE_LIMIT_CLEANUP_PROBABILITY,
  RATE_LIMIT_ROW_RETENTION_SECONDS,
  type RateLimitPolicy,
} from "./limits";

export type RateLimitResult = {
  /** `true` bila permintaan masih dalam batas (dan sudah dihitung). */
  allowed: boolean;
  /** Sisa kuota **setelah** permintaan ini dihitung; tidak pernah negatif. */
  remaining: number;
  /** Detik sampai jendela berikutnya; 0 bila `allowed` (tidak perlu menunggu). */
  retryAfterSeconds: number;
};

export type CheckRateLimitInput = {
  /** Key lengkap `"<nama-limit>:<hash>"`. */
  key: string;
  /** Jumlah maksimum permintaan per jendela. */
  limit: number;
  /** Panjang jendela dalam detik. */
  windowSeconds: number;
  /** Waktu sekarang dalam milidetik; diinjeksi supaya test deterministik. */
  now?: number | (() => number);
  /** Client database; default `getReadyDb()`. */
  getDb?: () => Promise<Client>;
  /**
   * Sumber angka acak 0..1 untuk pembersihan oportunistik. Diinjeksi test
   * supaya pembersihan bisa dipaksa jalan atau dipastikan tidak jalan.
   */
  random?: () => number;
  /** Matikan pembersihan oportunistik (test yang menghitung statement). */
  cleanup?: boolean;
};

/** Awal jendela untuk waktu tertentu, dalam detik. */
export function windowStartOf(nowMs: number, windowSeconds: number): number {
  const nowSeconds = Math.floor(nowMs / 1000);
  return Math.floor(nowSeconds / windowSeconds) * windowSeconds;
}

const INCREMENT_SQL = `insert into rate_limits (key, window_start, count)
  values (?, ?, 1)
  on conflict (key, window_start) do update set count = count + 1
  returning count`;

const CLEANUP_SQL = "delete from rate_limits where window_start < ?";

const resolveNow = (now: CheckRateLimitInput["now"]): number => {
  if (typeof now === "function") return now();
  return now ?? Date.now();
};

/**
 * Hitung satu permintaan pada `key`, lalu laporkan apakah masih diizinkan.
 *
 * Pemanggil **wajib** memanggil ini sebelum pekerjaan mahal (verifikasi kode,
 * membaca file) supaya permintaan yang ditolak tidak memakan biaya.
 *
 * @throws error apa pun dari database — keputusan fail open/closed milik
 * pemanggil (`docs/06-backend/api-contract.md`).
 */
export async function checkRateLimit(
  input: CheckRateLimitInput,
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = input;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit harus bilangan bulat >= 1");
  }
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new RangeError("windowSeconds harus bilangan bulat >= 1");
  }

  const nowMs = resolveNow(input.now);
  const windowStart = windowStartOf(nowMs, windowSeconds);
  const db = await (input.getDb ?? getReadyDb)();

  const result = await db.execute({
    sql: INCREMENT_SQL,
    args: [key, windowStart],
  });

  const rawCount = result.rows[0]?.count;
  if (rawCount === undefined || rawCount === null) {
    // Tidak seharusnya terjadi: `returning count` selalu menghasilkan satu baris.
    // Diperlakukan sebagai kegagalan limiter, bukan sebagai izin.
    throw new Error("rate limit: tidak ada baris hasil returning");
  }

  const count = Number(rawCount);
  const allowed = count <= limit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, windowStart + windowSeconds - Math.floor(nowMs / 1000));

  await maybeCleanup(db, windowStart, input);

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

/**
 * Hapus baris yang jendelanya sudah lewat lebih dari
 * `RATE_LIMIT_ROW_RETENTION_SECONDS`.
 *
 * Dipanggil kira-kira 1% permintaan. Kegagalan diabaikan sepenuhnya: tabel yang
 * agak kotor lebih baik daripada permintaan guru yang gagal.
 */
async function maybeCleanup(
  db: Client,
  windowStart: number,
  input: CheckRateLimitInput,
): Promise<void> {
  if (input.cleanup === false) return;

  const random = input.random ?? Math.random;
  if (random() >= RATE_LIMIT_CLEANUP_PROBABILITY) return;

  try {
    await db.execute({
      sql: CLEANUP_SQL,
      args: [windowStart - RATE_LIMIT_ROW_RETENTION_SECONDS],
    });
  } catch {
    // Sengaja tanpa log: pesan driver bisa memuat detail database.
  }
}

/**
 * Jalankan `checkRateLimit` untuk satu kebijakan dan key mentah yang sudah
 * di-hash. Pembungkus tipis supaya pemanggil tidak perlu menyebut ulang
 * `limit`/`windowSeconds`.
 */
export function checkPolicy(
  policy: RateLimitPolicy,
  key: string,
  options: Omit<CheckRateLimitInput, "key" | "limit" | "windowSeconds"> = {},
): Promise<RateLimitResult> {
  return checkRateLimit({
    key,
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
    ...options,
  });
}
