/**
 * Jalankan migrasi database dari environment.
 *
 * Pemakaian:
 *
 * ```bash
 * bun run db:migrate
 * ```
 *
 * Database dipilih lewat `DATABASE_URL` (dan `DATABASE_AUTH_TOKEN` bila remote).
 * Script ini sengaja hanya mencetak jumlah migrasi yang diterapkan/dilewati.
 * URL dan token tidak pernah dicetak, termasuk saat terjadi error.
 */

import { DatabaseError, migrate } from "../src/server/db";

async function main(): Promise<void> {
  try {
    const result = await migrate();
    console.log(
      `Migrasi database selesai: ${result.applied.length} diterapkan, ${result.skipped.length} dilewati.`,
    );
  } catch (error) {
    // Hanya pesan DatabaseError yang sudah dijamin bebas URL/token. Error lain
    // bisa memuat detail koneksi mentah, jadi jangan dicetak.
    const message =
      error instanceof DatabaseError
        ? error.message
        : "Migrasi database gagal. Periksa konfigurasi DATABASE_URL dan DATABASE_AUTH_TOKEN di server.";

    console.error(message);
    process.exitCode = 1;
  }
}

await main();
