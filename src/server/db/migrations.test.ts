// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDbForTests } from "./client";
import {
  applyMigrations,
  migrate,
  MIGRATIONS,
  type Migration,
} from "./migrations";
import { DatabaseMigrationError } from "./errors";

const openDb = () => createClient({ url: ":memory:" });

const closeQuietly = (db: Client) => {
  try {
    db.close();
  } catch {
    // In-memory database; tidak ada yang perlu diselamatkan.
  }
};

const tableNames = async (db: Client): Promise<string[]> => {
  const result = await db.execute(
    "select name from sqlite_master where type = 'table' order by name",
  );
  return result.rows.map((row) => String(row.name));
};

let active: Client | null = null;

const useDb = (): Client => {
  active = openDb();
  return active;
};

afterEach(() => {
  if (active !== null) closeQuietly(active);
  active = null;
  resetDbForTests();
  vi.unstubAllEnvs();
});

describe("migrate — skema awal", () => {
  it("membuat schema_migrations dan semua tabel dari docs", async () => {
    const db = useDb();

    const result = await migrate(db);

    expect(result.applied).toEqual(MIGRATIONS.map((migration) => migration.id));
    expect(await tableNames(db)).toEqual(
      expect.arrayContaining([
        "schema_migrations",
        "teachers",
        "stories",
        "story_versions",
        "jobs",
        "play_results",
        "rate_limits",
      ]),
    );
  });

  it("migrasi 0003 membuat rate_limits dengan primary key (key, window_start)", async () => {
    const db = useDb();
    await migrate(db);

    const columns = await db.execute("pragma table_info(rate_limits)");
    expect(
      columns.rows.map((row) => [String(row.name), String(row.type)]),
    ).toEqual([
      ["key", "TEXT"],
      ["window_start", "INTEGER"],
      ["count", "INTEGER"],
    ]);

    const pk = await db.execute("pragma table_info(rate_limits)");
    expect(
      pk.rows
        .filter((row) => Number(row.pk) > 0)
        .map((row) => String(row.name)),
    ).toEqual(["key", "window_start"]);

    // `count` wajib terisi.
    await expect(
      db.execute(
        "insert into rate_limits (key, window_start) values ('tanpa-count', 1)",
      ),
    ).rejects.toBeTruthy();

    // Pasangan (key, window_start) unik.
    await db.execute(
      "insert into rate_limits (key, window_start, count) values ('k', 10, 1)",
    );
    await expect(
      db.execute(
        "insert into rate_limits (key, window_start, count) values ('k', 10, 1)",
      ),
    ).rejects.toBeTruthy();
  });

  it("migrasi 0003 hanya menambah tabel, tidak mengubah migrasi lama", async () => {
    const db = useDb();
    const initial = MIGRATIONS.filter((migration) =>
      ["0001_initial_schema", "0002_relax_source_file_path"].includes(
        migration.id,
      ),
    );

    await applyMigrations(db, initial);
    expect(await tableNames(db)).not.toContain("rate_limits");

    const result = await migrate(db);
    expect(result.applied).toEqual([
      "0003_rate_limits",
      "0004_accounts",
      "0005_classrooms_students",
    ]);
    expect(await tableNames(db)).toContain("rate_limits");
  });

  it("migrasi 0004 menambah akun guru dan tabel students", async () => {
    const db = useDb();
    const before = MIGRATIONS.filter((migration) =>
      [
        "0001_initial_schema",
        "0002_relax_source_file_path",
        "0003_rate_limits",
      ].includes(migration.id),
    );

    await applyMigrations(db, before);
    expect(await tableNames(db)).not.toContain("students");

    // Hanya sampai 0004: 0005 membangun ulang tabel `students`, jadi kolom
    // bentuk 0004 harus diperiksa sebelum migrasi itu ikut dijalankan.
    const upTo0004 = MIGRATIONS.filter(
      (migration) => migration.id !== "0005_classrooms_students",
    );
    const result = await applyMigrations(db, upTo0004);
    expect(result.applied).toEqual(["0004_accounts"]);
    expect(await tableNames(db)).toContain("students");

    const teachers = await db.execute("pragma table_info(teachers)");
    const teacherColumns = teachers.rows.map((row) => String(row.name));
    expect(teacherColumns).toEqual(
      expect.arrayContaining([
        "id",
        "display_name",
        "username",
        "password_hash",
      ]),
    );
    // Kode akses lama dihapus supaya tidak ada dua sumber kebenaran.
    expect(teacherColumns).not.toContain("access_code");

    const students = await db.execute("pragma table_info(students)");
    expect(students.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "id",
        "teacher_id",
        "display_name",
        "username",
        "password_hash",
        "created_at",
      ]),
    );
  });

  it("migrasi 0005 menambah classrooms dan membangun ulang students", async () => {
    const db = useDb();
    const before = MIGRATIONS.filter(
      (migration) => migration.id !== "0005_classrooms_students",
    );

    await applyMigrations(db, before);
    // Baris lama (mis. akun `siswa` hasil seed) harus selamat melewati rebuild.
    await db.execute(
      "insert into teachers (id, display_name, username) values ('t1', 'Guru 1', 'guru')",
    );
    await db.execute(
      "insert into students (id, teacher_id, display_name, username, password_hash) values ('s1', 't1', 'Siswa Sebelumnya', 'siswa', 'hash')",
    );

    const result = await migrate(db);
    expect(result.applied).toEqual(["0005_classrooms_students"]);

    expect(await tableNames(db)).toContain("classrooms");
    expect(await tableNames(db)).not.toContain("students_next");

    const classrooms = await db.execute("pragma table_info(classrooms)");
    expect(classrooms.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "id",
        "teacher_id",
        "name",
        "subject",
        "grade_level",
        "code",
        "academic_year",
        "created_at",
      ]),
    );

    const students = await db.execute("pragma table_info(students)");
    const columns = students.rows.map((row) => String(row.name));
    expect(columns).toEqual(
      expect.arrayContaining(["classroom_id", "nis", "display_name"]),
    );

    const kept = await db.execute(
      "select id, username, password_hash, classroom_id, nis from students",
    );
    expect(kept.rows).toHaveLength(1);
    expect(kept.rows[0]).toMatchObject({
      id: "s1",
      username: "siswa",
      password_hash: "hash",
      classroom_id: null,
      nis: null,
    });

    // Siswa baru tidak butuh akun: cukup nama.
    await db.execute(
      "insert into students (id, teacher_id, display_name) values ('s2', 't1', 'Siswa Tanpa Akun')",
    );
  });

  it("kode kelas unik dan NIS unik per guru", async () => {
    const db = useDb();
    await migrate(db);

    await db.execute(
      "insert into teachers (id, display_name) values ('t1', 'Guru 1'), ('t2', 'Guru 2')",
    );
    await db.execute(
      "insert into classrooms (id, teacher_id, name, subject, grade_level, code, academic_year) values ('c1', 't1', 'A', 'Mtk', 'SMA Grade 10', 'QST-AAAA', '2026/2027')",
    );
    await expect(
      db.execute(
        "insert into classrooms (id, teacher_id, name, subject, grade_level, code, academic_year) values ('c2', 't2', 'B', 'Mtk', 'SMA Grade 11', 'QST-AAAA', '2026/2027')",
      ),
    ).rejects.toBeTruthy();

    await db.execute(
      "insert into students (id, teacher_id, classroom_id, nis, display_name) values ('s1', 't1', 'c1', '1001', 'Ani')",
    );
    await expect(
      db.execute(
        "insert into students (id, teacher_id, classroom_id, nis, display_name) values ('s2', 't1', 'c1', '1001', 'Budi')",
      ),
    ).rejects.toBeTruthy();

    // NIS yang sama boleh di guru lain.
    await db.execute(
      "insert into students (id, teacher_id, nis, display_name) values ('s3', 't2', '1001', 'Cici')",
    );
    // NIS `null` tidak dihitung duplikat.
    await db.execute(
      "insert into students (id, teacher_id, nis, display_name) values ('s4', 't1', null, 'Dodi'), ('s5', 't1', null, 'Eka')",
    );

    // Menghapus kelas tidak menghapus siswanya.
    await db.execute("delete from classrooms where id = 'c1'");
    const orphan = await db.execute(
      "select classroom_id from students where id = 's1'",
    );
    expect(orphan.rows[0]?.classroom_id).toBeNull();
  });

  it("username guru dan siswa unik", async () => {
    const db = useDb();
    await migrate(db);

    await db.execute(
      "insert into teachers (id, display_name, username) values ('t1', 'Guru 1', 'guru')",
    );
    await expect(
      db.execute(
        "insert into teachers (id, display_name, username) values ('t2', 'Guru 2', 'guru')",
      ),
    ).rejects.toBeTruthy();

    await db.execute(
      "insert into students (id, teacher_id, display_name, username, password_hash) values ('s1', 't1', 'Siswa 1', 'siswa', 'x')",
    );
    await expect(
      db.execute(
        "insert into students (id, teacher_id, display_name, username, password_hash) values ('s2', 't1', 'Siswa 2', 'siswa', 'x')",
      ),
    ).rejects.toBeTruthy();

    // `null` tetap boleh untuk baris lama tanpa akun.
    await db.execute(
      "insert into teachers (id, display_name) values ('t3', 'Guru Lama')",
    );
    await db.execute(
      "insert into teachers (id, display_name) values ('t4', 'Guru Lama 2')",
    );
  });

  it("membuat kolom yang diwajibkan docs", async () => {
    const db = useDb();
    await migrate(db);

    const stories = await db.execute("pragma table_info(stories)");
    const storyColumns = stories.rows.map((row) => String(row.name));
    expect(storyColumns).toEqual(
      expect.arrayContaining([
        "id",
        "teacher_id",
        "title",
        "subject",
        "grade_level",
        "language",
        "status",
        "published_version",
        "source_file_name",
        "source_file_path",
        "source_page_count",
        "created_at",
        "updated_at",
      ]),
    );

    const versions = await db.execute("pragma table_info(story_versions)");
    expect(versions.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "story_id",
        "version",
        "story",
        "created_by",
        "created_at",
        "prompt_version",
        "used_fallback",
      ]),
    );

    const results = await db.execute("pragma table_info(play_results)");
    expect(results.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "id",
        "story_id",
        "story_version",
        "nickname",
        "correct_count",
        "total_count",
        "earned_points",
        "weak_concepts",
        "created_at",
      ]),
    );
  });
});

describe("migrate — idempotensi", () => {
  it("dijalankan dua kali tanpa error dan tidak menerapkan ulang", async () => {
    const db = useDb();

    const first = await migrate(db);
    const second = await migrate(db);

    expect(first.applied).toEqual(MIGRATIONS.map((migration) => migration.id));
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(MIGRATIONS.map((migration) => migration.id));

    const count = await db.execute(
      "select count(*) as total from schema_migrations",
    );
    expect(Number(count.rows[0].total)).toBe(MIGRATIONS.length);
  });

  it("menerima daftar migrasi khusus lewat opsi", async () => {
    const db = useDb();
    const migrations: Migration[] = [
      {
        id: "0001_probe",
        name: "Tabel probe",
        sql: "create table probe (id text primary key);",
      },
    ];

    const first = await migrate({ db, migrations });
    const second = await migrate({ db, migrations });

    expect(first.applied).toEqual(["0001_probe"]);
    expect(second).toEqual({ applied: [], skipped: ["0001_probe"] });
    expect(await tableNames(db)).toContain("probe");
  });

  it("tanpa argumen memakai client singleton dari konfigurasi env", async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");

    const result = await migrate();

    expect(result.applied).toEqual(MIGRATIONS.map((migration) => migration.id));
  });
});

describe("migrate — atomik", () => {
  it("migrasi gagal tidak meninggalkan tabel setengah jadi", async () => {
    const db = useDb();
    const broken: Migration[] = [
      {
        id: "0002_rusak",
        sql: [
          "create table atomic_probe (id text primary key);",
          "insert into tabel_yang_tidak_ada (id) values ('x');",
        ].join("\n"),
      },
    ];

    await expect(applyMigrations(db, broken)).rejects.toBeInstanceOf(
      DatabaseMigrationError,
    );

    expect(await tableNames(db)).not.toContain("atomic_probe");

    const ledger = await db.execute("select id from schema_migrations");
    expect(ledger.rows).toEqual([]);
  });

  it("migrasi gagal tidak membatalkan migrasi yang sudah sukses", async () => {
    const db = useDb();
    const migrations: Migration[] = [
      { id: "0001_ok", sql: "create table tetap_ada (id text);" },
      { id: "0002_rusak", sql: "bukan sql yang sah;" },
    ];

    await expect(applyMigrations(db, migrations)).rejects.toBeInstanceOf(
      DatabaseMigrationError,
    );

    expect(await tableNames(db)).toContain("tetap_ada");

    const ledger = await db.execute(
      "select id from schema_migrations order by id",
    );
    expect(ledger.rows.map((row) => String(row.id))).toEqual(["0001_ok"]);
  });

  it("pesan error hanya menyebut id migrasi, bukan SQL mentah", async () => {
    const db = useDb();
    const migrations: Migration[] = [
      { id: "0003_rusak", sql: "select * from tabel_tidak_ada;" },
    ];

    try {
      await applyMigrations(db, migrations);
      expect.unreachable("migrasi rusak harus gagal");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("0003_rusak");
      expect(message).not.toContain("tabel_tidak_ada");
      expect(message).not.toContain("select");
      expect((error as DatabaseMigrationError).migrationId).toBe("0003_rusak");
    }
  });
});
