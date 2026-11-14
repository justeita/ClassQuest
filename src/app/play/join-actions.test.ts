// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test Server Action `masukKelas` (gerbang kode kelas `/play`).
 *
 * Yang dijaga: rate limit kode dipanggil paling awal (30 percobaan / 10 menit
 * per IP, di memori), input rusak dijawab `invalid_code`, NIS yang tidak
 * terdaftar ditolak `nis_not_found`, dan permintaan sah diteruskan apa adanya
 * dari `src/server/play/join.ts` (kode → kelas → NIS → game terbit guru itu). Database tetap libSQL in-memory dengan migrasi
 * asli; hanya `@/server/db` dan `next/headers` yang di-mock.
 */

const { dbRef, getReadyDbMock, headersMock } = vi.hoisted(() => {
  const dbRef: { current: Client | null } = { current: null };
  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });
  return { dbRef, getReadyDbMock, headersMock: vi.fn() };
});

vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));
vi.mock("next/headers", () => ({ headers: headersMock, cookies: vi.fn() }));

import { applyMigrations } from "@/server/db/migrations";
import { memoryRateLimits } from "@/server/rate-limit/memory";
import { JOIN_RATE_LIMIT } from "@/server/rate-limit/limits";
import { buildFallbackStory } from "@/story/fallback";

import { masukKelas } from "./join-actions";

const TEACHER_ID = "teacher_join_action";
const CLASS_CODE = "QST-7K3M";
const STORY_ID = "st_join_action";
/** IP palsu (RFC 5737); hanya untuk test. */
const CLIENT_IP = "203.0.113.90";

const useClientIp = (ip: string = CLIENT_IP): void => {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === "x-real-ip" ? ip : null),
  });
};

let db: Client;

async function seed(): Promise<void> {
  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, 'Guru')",
    args: [TEACHER_ID],
  });
  await db.execute({
    sql: `insert into classrooms
            (id, teacher_id, name, subject, grade_level, code, academic_year)
          values ('cls_join_action', ?, 'Kelas 5A', 'IPA', 'Kelas 5', ?, '2026/2027')`,
    args: [TEACHER_ID, CLASS_CODE],
  });
  await db.execute({
    sql: `insert into students (id, teacher_id, classroom_id, display_name, nis)
          values ('stu_join_action', ?, 'cls_join_action', 'Andi Pratama', '1001')`,
    args: [TEACHER_ID],
  });

  const fallback = buildFallbackStory();
  // Isi cerita yang tersimpan membawa `meta.id` sendiri, jadi samakan dengan
  // id barisnya supaya asersi bisa memastikan cerita yang benar termuat.
  const story = { ...fallback, meta: { ...fallback.meta, id: STORY_ID } };
  await db.execute({
    sql: `insert into stories
            (id, teacher_id, title, subject, grade_level, language, status, published_version, source_file_name)
          values (?, ?, 'Siklus Air', 'IPA', 'Kelas 5', 'id', 'published', 1, 'materi.pdf')`,
    args: [STORY_ID, TEACHER_ID],
  });
  await db.execute({
    sql: `insert into story_versions
            (story_id, version, story, created_by, prompt_version, used_fallback)
          values (?, 1, ?, 'system', 'story-v1', 0)`,
    args: [STORY_ID, JSON.stringify(story)],
  });
}

beforeEach(async () => {
  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  dbRef.current = db;
  getReadyDbMock.mockClear();
  memoryRateLimits.clear();
  useClientIp();
  vi.stubEnv("TEACHER_SESSION_SECRET", "secret-uji-kode-kelas-7f21");

  await seed();
});

afterEach(() => {
  db.close();
  dbRef.current = null;
  memoryRateLimits.clear();
});

describe("masukKelas", () => {
  it("meneruskan permintaan sah: kode + NIS → langsung main", async () => {
    const hasil = await masukKelas({
      kode: CLASS_CODE,
      nis: "1001",
    });

    expect(hasil.ok).toBe(true);
    if (!hasil.ok || hasil.jenis !== "main") throw new Error("harus main");
    expect(hasil.story.meta.id).toBe(STORY_ID);
    expect(hasil.classroom.code).toBe(CLASS_CODE);
    expect(hasil.pemain).toEqual({
      studentId: "stu_join_action",
      name: "Andi Pratama",
    });
  });

  it("menolak input null atau bukan objek sebagai kode tidak sah", async () => {
    expect(await masukKelas(null)).toEqual({
      ok: false,
      reason: "invalid_code",
    });
    expect(await masukKelas("bukan objek")).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("kode berbentuk salah dijawab invalid_code", async () => {
    expect(await masukKelas({ kode: "QST-12", nis: "1001" })).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("NIS yang tidak ada di daftar guru ditolak nis_not_found", async () => {
    expect(await masukKelas({ kode: CLASS_CODE, nis: "9999" })).toEqual({
      ok: false,
      reason: "nis_not_found",
    });

    // Nama tidak lagi dipakai untuk masuk: tanpa NIS pun ditolak.
    expect(
      await masukKelas({ kode: CLASS_CODE, nama: "Andi Pratama" }),
    ).toEqual({ ok: false, reason: "invalid_nis" });
  });
});

describe("masukKelas — rate limit", () => {
  it("melebihi batas menghasilkan reason rate_limited", async () => {
    for (let i = 0; i < JOIN_RATE_LIMIT.limit; i += 1) {
      const hasil = await masukKelas({ kode: CLASS_CODE, nis: "1001" });
      expect(hasil.ok, `percobaan ${i + 1}`).toBe(true);
    }

    const blocked = await masukKelas({ kode: CLASS_CODE, nis: "1001" });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });

    // Penolakan tidak memuat IP atau hash.
    expect(JSON.stringify(blocked)).not.toContain(CLIENT_IP);
    expect(JSON.stringify(blocked)).not.toMatch(/[0-9a-f]{64}/);
  });

  it("IP lain tidak ikut kena batas", async () => {
    for (let i = 0; i < JOIN_RATE_LIMIT.limit; i += 1) {
      await masukKelas({ kode: CLASS_CODE, nis: "1001" });
    }

    useClientIp("203.0.113.91");
    await expect(
      masukKelas({ kode: CLASS_CODE, nis: "1001" }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("kegagalan penghitung diproses (fail open)", async () => {
    // Header IP tidak terbaca → kunci limiter gagal dibuat; permintaan sah
    // tetap dilanjutkan supaya siswa tidak tertahan karena masalah limiter.
    headersMock.mockResolvedValue({
      get: () => {
        throw new Error("header IP tidak terbaca");
      },
    });

    await expect(
      masukKelas({ kode: CLASS_CODE, nis: "1001" }),
    ).resolves.toMatchObject({ ok: true });
  });
});
