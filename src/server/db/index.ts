/**
 * Entry point modul database server.
 *
 * Impor dari sini, bukan dari file dalam:
 *
 * ```ts
 * import { getDb, migrate } from "@/server/db";
 * ```
 *
 * Modul ini tidak membuka koneksi saat diimpor. Koneksi baru dibuat saat
 * `getDb()` dipanggil.
 */

export { closeDb, getDb, resetDb, resetDbForTests } from "./client";
export {
  DatabaseConnectionError,
  DatabaseError,
  DatabaseMigrationError,
  DatabaseQueryError,
  type DatabaseErrorCode,
} from "./errors";
export {
  applyMigrations,
  migrate,
  MIGRATIONS,
  type Migration,
  type MigrationResult,
  type MigrateOptions,
} from "./migrations";
