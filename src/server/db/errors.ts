/**
 * Error database yang aman ditampilkan.
 *
 * `message` sengaja tidak memuat `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, atau
 * pesan mentah dari driver. Detail koneksi hanya boleh hidup di environment
 * server; pesan ini dibuat supaya aman masuk log maupun respons API
 * (`docs/06-backend/api-contract.md`).
 */

export type DatabaseErrorCode =
  "DATABASE_CONNECTION" | "DATABASE_QUERY" | "DATABASE_MIGRATION";

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
  ) {
    super("DATABASE_CONNECTION", message);
    this.name = "DatabaseConnectionError";
  }
}

/** Query atau operasi gagal setelah koneksi dibuat. */
export class DatabaseQueryError extends DatabaseError {
  constructor(
    message = "Operasi database gagal. Periksa konfigurasi DATABASE_URL dan DATABASE_AUTH_TOKEN di server.",
  ) {
    super("DATABASE_QUERY", message);
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
      "DATABASE_MIGRATION",
      `Migrasi "${migrationId}" gagal dan dibatalkan. Tidak ada perubahan dari migrasi ini yang disimpan.`,
    );
    this.name = "DatabaseMigrationError";
    this.migrationId = migrationId;
  }
}
