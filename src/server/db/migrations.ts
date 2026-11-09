/**
 * Migrasi database ClassQuest.
 *
 * Migrasi disimpan sebagai modul TypeScript, bukan file `.sql` yang dibaca dari
 * disk saat runtime. Target deploy serverless tidak menjamin file ikut
 * ter-bundle, jadi SQL harus ikut kode.
 *
 * Aturan:
 *
 * - `migrate()` tidak pernah dipanggil otomatis saat modul diimpor.
 * - Setiap migrasi dijalankan dalam satu transaksi; gagal = rollback penuh.
 * - Migrasi yang sudah tercatat di `schema_migrations` tidak dijalankan ulang.
 * - Migrasi yang sudah dijalankan tidak boleh diubah; buat migrasi baru.
 *
 * Skema tabel mengikuti `docs/06-backend/persistence.md`. Dokumen itu menulis
 * tipe Postgres (`jsonb`, `timestamptz`, `text[]`); di libSQL/SQLite padanannya
 * `text` JSON dan timestamp ISO. Nama tabel/kolom tidak diubah.
 */

import type { Client } from "@libsql/client";

import { getDb } from "./client";
import { DatabaseMigrationError } from "./errors";

export type Migration = {
  /** Identitas stabil; dipakai sebagai primary key `schema_migrations.id`. */
  id: string;
  /** Keterangan manusia. Opsional; default sama dengan `id`. */
  name?: string;
  /** Satu atau beberapa statement SQL yang dipisah titik koma. */
  sql: string;
};

export type MigrationResult = {
  /** Migrasi yang baru diterapkan pada pemanggilan ini. */
  applied: string[];
  /** Migrasi yang sudah tercatat dan tidak dijalankan ulang. */
  skipped: string[];
};

/** Tabel buku besar migrasi. Dibuat sebelum migrasi pertama dijalankan. */
const SCHEMA_MIGRATIONS_SQL = `
create table if not exists schema_migrations (
  id         text primary key,
  name       text not null,
  applied_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

/**
 * Migrasi awal: seluruh tabel di `docs/06-backend/persistence.md`.
 *
 * Padanan tipe dari Postgres ke SQLite:
 *
 * - `jsonb` → `text` berisi JSON,
 * - `timestamptz` → `text` ISO-8601 UTC,
 * - `text[]` → `text` berisi array JSON,
 * - `boolean` → `integer` 0/1.
 */
const INITIAL_SCHEMA_SQL = `
create table if not exists teachers (
  id           text primary key,
  display_name text not null,
  access_code  text,
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists stories (
  id                text primary key,
  teacher_id        text not null references teachers(id),
  title             text not null,
  subject           text not null,
  grade_level       text not null,
  language          text not null,
  status            text not null check (status in ('processing', 'draft', 'published', 'failed', 'archived')),
  published_version integer,
  source_file_name  text not null,
  source_file_path  text not null,
  source_page_count integer,
  created_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists stories_teacher_idx on stories (teacher_id, updated_at desc);
create index if not exists stories_status_idx on stories (status);

create table if not exists story_versions (
  story_id       text not null references stories(id) on delete cascade,
  version        integer not null,
  story          text not null,
  created_by     text not null,
  created_at     text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  prompt_version text,
  used_fallback  integer not null default 0 check (used_fallback in (0, 1)),
  primary key (story_id, version)
);

create table if not exists jobs (
  id          text primary key,
  story_id    text not null references stories(id) on delete cascade,
  stage       text not null,
  progress    integer not null default 0 check (progress between 0 and 100),
  message     text,
  error_code  text,
  started_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at text,
  log         text
);

create index if not exists jobs_story_idx on jobs (story_id, started_at desc);

create table if not exists play_results (
  id            text primary key,
  story_id      text not null references stories(id) on delete cascade,
  story_version integer not null,
  nickname      text,
  correct_count integer not null,
  total_count   integer not null,
  earned_points integer not null,
  weak_concepts text not null default '[]',
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists play_results_story_idx on play_results (story_id, created_at desc);
`;

/**
 * Daftar migrasi berurutan. Jangan mengubah entri yang sudah pernah dipakai;
 * tambahkan entri baru di akhir.
 */
/**
 * Migrasi 0002: melonggarkan `stories.source_file_path`.
 *
 * Keputusan produk: PDF **hanya** diproses di memori dan tidak pernah disimpan
 * (tidak ke disk, bucket, atau database). Akibatnya tidak ada path file yang
 * bisa diisi, sementara skema 0001 menetapkannya `not null`.
 *
 * Cara: kolom dihapus lalu ditambahkan kembali sebagai nullable. Ini menghindari
 * rebuild tabel (yang berisiko dengan foreign key `story_versions`/`jobs`) dan
 * tetap append-only. Kolom hasil re-add berada di posisi terakhir; urutan kolom
 * tidak pernah menjadi kontrak.
 */
const RELAX_SOURCE_FILE_PATH_SQL = `
alter table stories drop column source_file_path;
alter table stories add column source_file_path text;
`;

/**
 * Daftar migrasi berurutan. Jangan mengubah entri yang sudah pernah dipakai;
 * tambahkan entri baru di akhir.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: "0001_initial_schema",
    name: "Skema awal: teachers, stories, story_versions, jobs, play_results",
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    id: "0002_relax_source_file_path",
    name: "Lepaskan not null stories.source_file_path (PDF tidak disimpan)",
    sql: RELAX_SOURCE_FILE_PATH_SQL,
  },
];

export type MigrateOptions = {
  db?: Client;
  migrations?: readonly Migration[];
};

const isClient = (value: unknown): value is Client =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Client).execute === "function";

const validateMigrations = (migrations: readonly Migration[]): void => {
  const seen = new Set<string>();

  for (const migration of migrations) {
    if (migration.id.trim() === "") {
      throw new DatabaseMigrationError("(tanpa id)");
    }
    if (seen.has(migration.id)) {
      throw new DatabaseMigrationError(`${migration.id} (id ganda)`);
    }
    seen.add(migration.id);
  }
};

/**
 * Terapkan migrasi yang belum tercatat ke database.
 *
 * Ini inti yang bisa dipakai test dengan database in-memory. Pemanggil normal
 * memakai `migrate()`.
 */
export async function applyMigrations(
  db: Client,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<MigrationResult> {
  validateMigrations(migrations);

  await db.executeMultiple(SCHEMA_MIGRATIONS_SQL);

  const result = await db.execute(
    "select id from schema_migrations order by id",
  );
  const appliedIds = new Set(result.rows.map((row) => String(row.id)));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    const tx = await db.transaction("write");

    try {
      await tx.executeMultiple(migration.sql);
      await tx.execute({
        sql: "insert into schema_migrations (id, name, applied_at) values (?, ?, ?)",
        args: [
          migration.id,
          migration.name ?? migration.id,
          new Date().toISOString(),
        ],
      });
      await tx.commit();
      applied.push(migration.id);
    } catch {
      if (!tx.closed) {
        try {
          await tx.rollback();
        } catch {
          // Transaksi sudah tidak bisa di-rollback; error aslinya tetap
          // dilaporkan sebagai kegagalan migrasi.
        }
      }

      throw new DatabaseMigrationError(migration.id);
    }
  }

  return { applied, skipped };
}

/**
 * Jalankan migrasi pada client default atau client yang diberikan.
 *
 * Pemanggilan yang didukung:
 *
 * ```ts
 * await migrate();                                  // client singleton
 * await migrate(db);                                // client tertentu
 * await migrate({ db, migrations: customMigrations }); // untuk test
 * ```
 */
export async function migrate(
  input: Client | MigrateOptions = {},
  migrations?: readonly Migration[],
): Promise<MigrationResult> {
  const db = isClient(input) ? input : (input.db ?? getDb());
  const list =
    migrations ??
    (isClient(input) ? MIGRATIONS : (input.migrations ?? MIGRATIONS));

  return applyMigrations(db, list);
}
