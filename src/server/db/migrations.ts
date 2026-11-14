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
 * Migrasi 0003: tabel penghitung rate limit.
 *
 * Deploy serverless tidak bisa memakai memori proses bersama, jadi batas untuk
 * endpoint sensitif (login, upload, hasil bermain) dihitung di database.
 *
 * Bentuk kolom sengaja minimal supaya tidak ada data pribadi:
 *
 * - `key` berisi `"<nama-limit>:<HMAC-SHA256(IP)>"` — IP mentah tidak pernah
 *   masuk tabel;
 * - `window_start` adalah awal jendela fixed window dalam detik epoch;
 * - `count` dinaikkan dengan satu statement atomik
 *   (`insert ... on conflict do update set count = count + 1`).
 *
 * Baris lama dihapus oportunistik oleh `src/server/rate-limit/check.ts` (sekitar
 * 1% panggilan), jadi index pada `window_start` ikut disediakan untuk itu.
 */
const RATE_LIMITS_SQL = `
create table if not exists rate_limits (
  key          text not null,
  window_start integer not null,
  count        integer not null,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);
`;

/**
 * Migrasi 0004: akun guru dan siswa.
 *
 * Sebelumnya guru masuk dengan satu `TEACHER_ACCESS_CODE` dari environment.
 * Sekarang setiap guru punya baris `teachers` dengan `username` unik dan
 * `password_hash` scrypt (`src/server/password.ts`). Kolom `access_code` lama
 * dihapus supaya tidak ada dua sumber kebenaran yang bisa berbeda.
 *
 * Tabel `students` disiapkan untuk akun siswa (username + password hash).
 * Halaman `/play/[storyId]` **belum** memakai login siswa: siswa tetap membuka
 * tautan/QR, sesuai `docs/00-product/personas-and-roles.md`. Kolom
 * `teacher_id` menautkan siswa ke guru pemilik kelasnya dan boleh kosong untuk
 * akun demo yang belum punya kelas.
 *
 * `username` disimpan huruf kecil (dinormalisasi di `normalizeUsername()`);
 * index unik memakai kolom itu, dan `null` tetap diizinkan untuk baris lama.
 */
const ACCOUNTS_SQL = `
alter table teachers add column username text;
alter table teachers add column password_hash text;
alter table teachers drop column access_code;

create unique index if not exists teachers_username_idx on teachers (username);

create table if not exists students (
  id            text primary key,
  teacher_id    text references teachers(id),
  display_name  text not null,
  username      text not null,
  password_hash text not null,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index if not exists students_username_idx on students (username);
create index if not exists students_teacher_idx on students (teacher_id);
`;

/**
 * Migrasi 0005: kelas dan siswa yang bisa dikelola guru.
 *
 * Halaman `/guru/kelas` sebelumnya hanya memakai data contoh di
 * `src/components/guru/data.ts` (4 kelas, 30/28/32/30 siswa). Sekarang kelas
 * disimpan di tabel `classrooms` dan siswa di `students`, sehingga daftar siswa
 * mulai **kosong**: guru membuat kelas, lalu menambahkan siswa satu per satu.
 *
 * Tabel `students` dibangun ulang karena tiga hal yang tidak bisa dilakukan
 * `alter table` di SQLite: menghapus `not null` dari `username`/`password_hash`,
 * menambah `classroom_id`, dan menambah `nis`. Rebuild dilakukan dalam satu
 * transaksi migrasi; tidak ada tabel lain yang mereferensikan `students`,
 * jadi `drop`/`rename` aman.
 *
 * Aturan yang dipegang:
 *
 * - `classroom_id` boleh `null` (siswa belum masuk kelas) dan `on delete set
 *   null`: menghapus kelas tidak boleh menghapus identitas siswa.
 * - `username`/`password_hash` boleh `null` karena akun login siswa **belum**
 *   dipakai; `/play/[storyId]` tetap berbasis tautan. Seed `siswa` tetap
 *   menyimpan keduanya.
 * - `nis` unik per guru (`students_nis_idx`); NIS sama di sekolah lain boleh.
 * - `code` kelas unik dan hanya label tampilan: belum ada alur siswa memasukkan
 *   kode kelas (`docs/00-product/mvp-scope.md` masih menaruhnya di backlog).
 */
const CLASSROOMS_SQL = `
create table if not exists classrooms (
  id            text primary key,
  teacher_id    text not null references teachers(id),
  name          text not null,
  subject       text not null,
  grade_level   text not null,
  code          text not null,
  academic_year text not null,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create unique index if not exists classrooms_code_idx on classrooms (code);
create index if not exists classrooms_teacher_idx on classrooms (teacher_id, created_at desc);

create table students_next (
  id            text primary key,
  teacher_id    text not null references teachers(id),
  classroom_id  text references classrooms(id) on delete set null,
  nis           text,
  display_name  text not null,
  username      text,
  password_hash text,
  created_at    text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

insert into students_next (id, teacher_id, display_name, username, password_hash, created_at)
  select id, teacher_id, display_name, username, password_hash, created_at from students;

drop table students;
alter table students_next rename to students;

create unique index if not exists students_username_idx on students (username);
create index if not exists students_teacher_idx on students (teacher_id);
create index if not exists students_classroom_idx on students (classroom_id);
create unique index if not exists students_nis_idx on students (teacher_id, nis);
`;

/**
 * Migrasi 0006: hasil bermain terhubung ke kelas dan siswa.
 *
 * Sebelumnya `play_results` hanya menyimpan `nickname` opsional, sehingga guru
 * tidak bisa melihat hasil per kelas. Sekarang setiap hasil bisa menunjuk
 * `students` (siswa yang dipilih di layar masuk) dan `classrooms` (kelas dari
 * tautan yang dibagikan guru).
 *
 * Aturan yang dipegang:
 *
 * - Kedua kolom boleh `null`: tautan lama tanpa `?kelas=` dan `/game` (demo)
 *   tetap bisa menyimpan hasil, hanya tidak masuk analytics kelas.
 * - `on delete set null`: menghapus kelas/siswa tidak boleh menghapus riwayat
 *   hasil main. `nickname` tetap menyimpan nama saat bermain sebagai salinan.
 * - `total_points` disimpan supaya analytics tidak perlu membuka JSON cerita;
 *   nilai lama diisi 0 (tidak ada data untuk dihitung ulang).
 * - Index per kelas+cerita mempercepat query halaman `/guru/analitik`.
 */
const PLAY_RESULTS_CLASSROOM_SQL = `
alter table play_results add column classroom_id text references classrooms(id) on delete set null;
alter table play_results add column student_id text references students(id) on delete set null;
alter table play_results add column total_points integer not null default 0;

create index if not exists play_results_classroom_idx
  on play_results (classroom_id, story_id, created_at desc);
create index if not exists play_results_student_idx
  on play_results (student_id, created_at desc);
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
  {
    id: "0003_rate_limits",
    name: "Tabel penghitung rate limit (key hash, window_start, count)",
    sql: RATE_LIMITS_SQL,
  },
  {
    id: "0004_accounts",
    name: "Akun guru (username/password) dan tabel students",
    sql: ACCOUNTS_SQL,
  },
  {
    id: "0005_classrooms_students",
    name: "Kelas dan siswa yang dikelola guru (students: classroom_id, nis, akun opsional)",
    sql: CLASSROOMS_SQL,
  },
  {
    id: "0006_play_results_classroom",
    name: "Hasil bermain terhubung ke kelas/siswa + total_points",
    sql: PLAY_RESULTS_CLASSROOM_SQL,
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
