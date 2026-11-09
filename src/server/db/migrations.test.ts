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
      ]),
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
