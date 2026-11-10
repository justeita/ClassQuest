/**
 * Client database libSQL.
 *
 * Modul ini **tidak** membuka koneksi saat diimpor. Client baru dibuat saat
 * `getDb()` pertama kali dipanggil, lalu dipakai ulang (singleton). Dengan
 * begitu `bun run build` tetap lolos tanpa `DATABASE_URL` sama sekali.
 *
 * Semua pembacaan environment lewat `loadDatabaseConfig()` di
 * `src/server/config.ts`. Jangan membaca `process.env` di modul lain.
 *
 * `import "server-only"` membuat impor dari komponen client gagal saat build.
 */

import "server-only";

import { createClient, type Client } from "@libsql/client";

import { loadDatabaseConfig } from "../config";
import {
  classifyDatabaseError,
  DatabaseConnectionError,
  DatabaseQueryError,
} from "./errors";

let db: Client | null = null;

/**
 * Metode client yang menyentuh database. Error-nya dibungkus supaya pesan
 * mentah driver (yang bisa memuat URL) tidak bocor ke pemanggil.
 */
const DB_METHODS = new Set<PropertyKey>([
  "execute",
  "batch",
  "executeMultiple",
  "migrate",
  "transaction",
  "sync",
  "reconnect",
]);

/**
 * Bungkus client asli dengan proxy tipis. Tujuannya hanya menyeragamkan error:
 * kegagalan koneksi/query menjadi `DatabaseConnectionError` atau
 * `DatabaseQueryError` tanpa membawa pesan driver.
 */
function wrapClient(client: Client): Client {
  return new Proxy(client, {
    get(target, property) {
      // `target` sebagai receiver penting: beberapa getter memakai private
      // field dan akan gagal bila receiver-nya proxy.
      const value = Reflect.get(target, property, target);

      if (typeof value !== "function") return value;
      if (!DB_METHODS.has(property)) return value.bind(target);

      return (...args: unknown[]) => {
        const fail = (error: unknown): never => {
          if (property === "transaction") {
            throw new DatabaseConnectionError(
              undefined,
              classifyDatabaseError(error, "NETWORK"),
            );
          }

          throw new DatabaseQueryError(
            undefined,
            classifyDatabaseError(error, "QUERY"),
          );
        };

        let result: unknown;
        try {
          result = value.apply(target, args);
        } catch (error) {
          fail(error);
        }

        if (
          result !== null &&
          typeof (result as { then?: unknown }).then === "function"
        ) {
          return (result as Promise<unknown>).catch(fail);
        }

        return result;
      };
    },
  });
}

/**
 * Ambil client database singleton.
 *
 * Pertama kali dipanggil, client dibuat dari `DATABASE_URL` /
 * `DATABASE_AUTH_TOKEN`. Pemanggilan berikutnya mengembalikan instance yang
 * sama. Tidak ada koneksi jaringan atau file yang dibuka saat modul diimpor.
 *
 * @throws {DatabaseConnectionError} bila client tidak bisa dibuat (mis. URL
 * tidak sah).
 */
export function getDb(): Client {
  if (db !== null) return db;

  const config = loadDatabaseConfig();

  try {
    const client = createClient({
      url: config.url,
      ...(config.authToken === null ? {} : { authToken: config.authToken }),
    });
    db = wrapClient(client);
    return db;
  } catch (error) {
    // Pesan asli driver bisa memuat URL. Hanya kodenya yang dipetakan.
    throw new DatabaseConnectionError(
      undefined,
      classifyDatabaseError(error, "CONFIG"),
    );
  }
}

/**
 * Tutup client yang sedang aktif, bila ada. Aman dipanggil berkali-kali.
 * Dipakai saat shutdown dan sebagai reset untuk test.
 */
export function closeDb(): void {
  const current = db;
  db = null;

  if (current === null) return;

  try {
    current.close();
  } catch {
    // Menutup client yang sudah tertutup bukan kegagalan yang perlu dilaporkan.
  }
}

/** Alias eksplisit untuk test; sama dengan `closeDb()`. */
export const resetDbForTests = closeDb;

/** Alias lain yang lebih pendek, untuk kenyamanan test. */
export const resetDb = closeDb;
