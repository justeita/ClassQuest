/**
 * Error database yang aman ditampilkan.
 *
 * `message` sengaja tidak memuat nilai `DATABASE_URL`, `DATABASE_AUTH_TOKEN`,
 * atau pesan mentah dari driver. Detail koneksi hanya boleh hidup di environment
 * server; pesan ini dibuat supaya aman masuk log maupun respons API
 * (`docs/06-backend/api-contract.md`).
 *
 * `code` adalah nilai terbatas yang aman dipakai program lain (mis. untuk
 * memutuskan apakah pengguna perlu memperbaiki kredensial atau mencoba lagi).
 * Pemetaan dari error driver dilakukan oleh `classifyDatabaseError()`; pesan
 * driver itu sendiri tidak pernah ikut keluar.
 */

/** Semua nilai `code` yang boleh muncul di `DatabaseError`. */
export const DATABASE_ERROR_CODES = [
  "AUTH",
  "NETWORK",
  "CONFIG",
  "QUERY",
  "MIGRATION",
  "UNKNOWN",
] as const;

export type DatabaseErrorCode = (typeof DATABASE_ERROR_CODES)[number];

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;

  constructor(code: DatabaseErrorCode, message: string) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
  }
}

/** Client gagal dibuat, mis. `DATABASE_URL` tidak berbentuk URL yang sah. */
export class DatabaseConnectionError extends DatabaseError {
  constructor(
    message = "Gagal terhubung ke database. Periksa DATABASE_URL (dan DATABASE_AUTH_TOKEN bila memakai database remote).",
    code: DatabaseErrorCode = "UNKNOWN",
  ) {
    super(code, message);
    this.name = "DatabaseConnectionError";
  }
}

/** Query atau operasi gagal setelah koneksi dibuat. */
export class DatabaseQueryError extends DatabaseError {
  constructor(
    message = "Operasi database gagal. Periksa konfigurasi DATABASE_URL dan DATABASE_AUTH_TOKEN di server.",
    code: DatabaseErrorCode = "QUERY",
  ) {
    super(code, message);
    this.name = "DatabaseQueryError";
  }
}

/**
 * Satu migrasi gagal. Pesannya hanya menyebut id migrasi, bukan SQL mentah,
 * URL, atau token.
 */
export class DatabaseMigrationError extends DatabaseError {
  readonly migrationId: string;

  constructor(migrationId: string) {
    super(
      "MIGRATION",
      `Migrasi "${migrationId}" gagal dan dibatalkan. Tidak ada perubahan dari migrasi ini yang disimpan.`,
    );
    this.name = "DatabaseMigrationError";
    this.migrationId = migrationId;
  }
}

const AUTH_CODE =
  /AUTH|UNAUTHORI[SZ]ED|FORBIDDEN|ACCESS_DENIED|INVALID_TOKEN|TOKEN_INVALID|PERMISSION_DENIED/i;
const AUTH_MESSAGE =
  /unauthori[sz]ed|forbidden|authentication|auth(?:entication)?\s+token|invalid\s+token|access\s+denied|permission\s+denied|\b40[13]\b/i;

const NETWORK_CODE =
  /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ENETDOWN|EPIPE|UND_ERR_/i;
const NETWORK_MESSAGE =
  /fetch failed|network|getaddrinfo|connection (?:refused|reset|closed)|socket hang up|timed? ?out|tls handshake|unreachable/i;

const CONFIG_CODE =
  /URL_INVALID|CONFIG|INVALID_ARGUMENT|ENCRYPTION_KEY_NOT_SUPPORTED|UNSUPPORTED_URL/i;
const CONFIG_MESSAGE =
  /invalid (?:url|configuration)|url (?:is )?invalid|unsupported url|missing (?:database|url|token)|database_url|database_auth_token/i;

const QUERY_CODE =
  /^SQLITE_|TRANSACTION_CLOSED|CLIENT_CLOSED|BATCH_ERROR|SERVER_ERROR|HTTP_ERROR|SYNC_NOT_SUPPORTED|VALUE_TOO_/i;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const readText = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const readStatus = (record: Record<string, unknown>): number | null => {
  for (const key of ["status", "statusCode"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

/**
 * Petakan error apa pun (biasanya dari driver libSQL) ke `DatabaseErrorCode`.
 *
 * Hanya `code`, `status`, `name`, dan `message` yang dibaca untuk mengenali
 * jenisnya. Nilai-nilai itu tidak pernah dikembalikan atau dicetak, sehingga
 * URL dan token yang mungkin ada di pesan driver tidak ikut bocor.
 *
 * @param error error mentah dari driver atau error lain.
 * @param fallback kode bila jenis error tidak dikenali.
 */
export function classifyDatabaseError(
  error: unknown,
  fallback: DatabaseErrorCode = "UNKNOWN",
): DatabaseErrorCode {
  if (error instanceof DatabaseError) return error.code;

  const record = asRecord(error);
  if (record === null) return fallback;

  const status = readStatus(record);
  const code = readText(record, "code") ?? "";
  const name = readText(record, "name") ?? "";
  const message = readText(record, "message") ?? "";
  const text = `${code} ${name} ${message}`;

  if (
    status === 401 ||
    status === 403 ||
    AUTH_CODE.test(code) ||
    AUTH_CODE.test(name) ||
    AUTH_MESSAGE.test(message)
  ) {
    return "AUTH";
  }

  if (
    NETWORK_CODE.test(code) ||
    NETWORK_CODE.test(name) ||
    NETWORK_MESSAGE.test(text)
  ) {
    return "NETWORK";
  }

  if (
    CONFIG_CODE.test(code) ||
    CONFIG_CODE.test(name) ||
    CONFIG_MESSAGE.test(message)
  ) {
    return "CONFIG";
  }

  if (QUERY_CODE.test(code) || QUERY_CODE.test(name)) return "QUERY";

  return fallback;
}
