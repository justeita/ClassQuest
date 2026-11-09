/**
 * Database yang sudah siap dipakai.
 *
 * Deploy serverless tidak punya langkah startup yang bisa memanggil migrasi.
 * `getReadyDb()` menutup celah itu: pemanggil pertama menjalankan `migrate()`
 * sekali, lalu semua pemanggil (termasuk yang datang bersamaan) memakai client
 * yang sama.
 *
 * Aturan:
 *
 * - Tidak ada migrasi atau koneksi yang dibuka saat modul diimpor.
 * - Satu promise di-memoize per proses; panggilan bersamaan berbagi migrasi.
 * - Kegagalan **tidak** di-cache: promise di-reset supaya panggilan berikutnya
 *   mencoba lagi.
 * - Migrasi yang sudah pernah sukses juga tidak dijalankan ulang.
 */

import type { Client } from "@libsql/client";

import { getDb } from "./client";
import { migrate } from "./migrations";

let ready: Promise<Client> | null = null;

/**
 * Ambil client database yang migrasinya sudah dijalankan.
 *
 * Pemanggilan pertama memicu `migrate()`; pemanggilan berikutnya mengembalikan
 * promise yang sama. Bila migrasi gagal, promise di-reset dan error asli
 * diteruskan ke pemanggil — pemanggilan berikutnya akan mencoba lagi.
 */
export function getReadyDb(): Promise<Client> {
  if (ready !== null) return ready;

  const current = migrate().then(() => getDb());
  ready = current;

  // Reset hanya bila promise ini yang masih aktif. Dengan begitu kegagalan
  // lama tidak menghapus percobaan baru yang dimulai setelah reset.
  void current.catch(() => {
    if (ready === current) ready = null;
  });

  return current;
}

/**
 * Lupakan status siap untuk test. Tidak menutup client; pakai `resetDb()` bila
 * test juga ingin client baru.
 */
export function resetReadyDbForTests(): void {
  ready = null;
}
