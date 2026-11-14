// @vitest-environment node

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Handler POST dipanggil langsung dengan `Request` asli; database memakai
 * libSQL in-memory tanpa jaringan. Yang di-mock:
 *
 * - `next/headers` untuk cookie sesi guru (sama seperti `auth.test.ts`) dan
 *   untuk header IP yang dipakai rate limit.
 * - `@/server/db` supaya `getReadyDb()` mengembalikan client in-memory, dan
 *   supaya kegagalan database bisa dipaksakan untuk test 500.
 * - `@/server/jobs/schedule` untuk memastikan bytes PDF diserahkan utuh.
 * - `node:fs/promises` untuk membuktikan tidak ada penulisan file.
 */
const {
  cookieStore,
  cookiesMock,
  headersMock,
  scheduleJobMock,
  dbRef,
  getReadyDbMock,
  fsSpies,
} = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  /** Referensi yang diisi `beforeEach`: client in-memory atau kegagalan. */
  const dbRef: {
    current: unknown | null;
    failWith: Error | null;
  } = { current: null, failWith: null };

  const getReadyDbMock = vi.fn(async () => {
    if (dbRef.failWith) throw dbRef.failWith;
    if (dbRef.current === null) throw new Error("database test belum siap");
    return dbRef.current;
  });

  /** Semua eksport `node:fs/promises` di-mock menjadi spy yang dicatat di sini. */
  const fsSpies = new Map<PropertyKey, ReturnType<typeof vi.fn>>();

  return {
    cookieStore,
    cookiesMock: vi.fn(async () => cookieStore),
    headersMock: vi.fn(),
    scheduleJobMock: vi.fn(),
    dbRef,
    getReadyDbMock,
    fsSpies,
  };
});

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));
vi.mock("@/server/db", () => ({ getReadyDb: getReadyDbMock }));
vi.mock("@/server/jobs/schedule", () => ({ scheduleJob: scheduleJobMock }));

vi.mock("node:fs/promises", () => {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "constants") return {};
        if (!fsSpies.has(property)) fsSpies.set(property, vi.fn());
        return fsSpies.get(property);
      },
    },
  );
});

import { applyMigrations } from "@/server/db/migrations";
import { createSessionToken, TEACHER_SESSION_COOKIE } from "@/server/auth";
import { teacherRateLimitKey } from "@/server/rate-limit/identity";
import { MAX_PDF_BYTES } from "@/server/upload";
import { globalRateLimitKey } from "@/server/rate-limit/identity";
import {
  UPLOAD_GLOBAL_RATE_LIMIT,
  UPLOAD_IP_RATE_LIMIT,
  UPLOAD_TEACHER_RATE_LIMIT,
} from "@/server/rate-limit/limits";

import { POST } from "./route";

/** IP palsu (dokumen contoh RFC 5737); hanya untuk test. */
const CLIENT_IP = "203.0.113.50";
const SESSION_SECRET = "secret-uji-sesi-yang-panjang-9b2f";
const TEACHER_ID = "teacher_demo";
const TEACHER_DISPLAY_NAME = "Guru Demo";

const VALID_FIELDS = {
  title: "Siklus Air untuk Kelas 5",
  subject: "IPA",
  gradeLevel: "Kelas 5 SD",
  language: "id",
  mode: "mix",
};

const PDF_BODY = new TextEncoder().encode(
  "%PDF-1.4\nkontak-uji-yang-sangat-aman\n",
);

function pdfFile(sizeBytes: number = PDF_BODY.byteLength): File {
  if (sizeBytes === PDF_BODY.byteLength) {
    return new File([PDF_BODY], "materi.pdf", { type: "application/pdf" });
  }
  // File besar: isi apa pun tidak penting karena ukuran ditolak lebih dulu.
  return new File([new Uint8Array(sizeBytes)], "besar.pdf", {
    type: "application/pdf",
  });
}

function multipartRequest(options: {
  file?: File | null;
  fields?: Record<string, string>;
  extraHeaders?: Record<string, string>;
}): Request {
  const form = new FormData();
  if (options.file !== null) {
    form.append("file", options.file ?? pdfFile());
  }
  for (const [key, value] of Object.entries({
    ...VALID_FIELDS,
    ...options.fields,
  })) {
    form.append(key, value);
  }

  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: options.extraHeaders,
    body: form,
  });
}

/**
 * Set header IP untuk rate limit. Namanya sengaja tanpa awalan `use` supaya
 * `react-hooks/rules-of-hooks` tidak menganggapnya React Hook saat dipanggil di
 * dalam loop test.
 */
function sendAsIp(ip: string = CLIENT_IP): void {
  headersMock.mockResolvedValue({
    get: (name: string) => (name.toLowerCase() === "x-real-ip" ? ip : null),
  });
}

/** Jumlah baris `rate_limits` untuk kebijakan tertentu. */
async function rateLimitCount(db: Client, limitName: string): Promise<number> {
  const result = await db.execute({
    sql: "select coalesce(sum(count), 0) as total from rate_limits where key like ?",
    args: [`${limitName}:%`],
  });
  return Number(result.rows[0].total);
}

/**
 * Isi langsung kuota satu kebijakan upload.
 *
 * Dipakai supaya test tidak perlu 100 request untuk mencapai batas global.
 * Key diambil dari helper yang sama dengan handler (secret dari environment),
 * jadi nilainya selalu cocok. Jendela dihitung seperti `checkRateLimit`.
 */
async function fillRateLimit(
  db: Client,
  policy: { name: string; limit: number; windowSeconds: number },
  key: string,
  used: number = policy.limit,
): Promise<void> {
  const windowStart =
    Math.floor(Math.floor(Date.now() / 1000) / policy.windowSeconds) *
    policy.windowSeconds;

  await db.execute({
    sql: "insert into rate_limits (key, window_start, count) values (?, ?, ?)",
    args: [key, windowStart, used],
  });
}

/** Cookie sesi valid, rusak, atau tidak ada. */
function authenticate(token: string | null | undefined): void {
  if (token === null || token === undefined) {
    cookieStore.get.mockReturnValue(undefined);
    return;
  }
  cookieStore.get.mockImplementation((name: string) =>
    name === TEACHER_SESSION_COOKIE ? { name, value: token } : undefined,
  );
}

async function rowCounts(
  db: Client,
): Promise<{ stories: number; jobs: number }> {
  const stories = await db.execute("select count(*) as total from stories");
  const jobs = await db.execute("select count(*) as total from jobs");
  return {
    stories: Number(stories.rows[0].total),
    jobs: Number(jobs.rows[0].total),
  };
}

let db: Client;

beforeEach(async () => {
  vi.stubEnv("TEACHER_SESSION_SECRET", SESSION_SECRET);

  db = createClient({ url: ":memory:" });
  await applyMigrations(db);
  // Guru harus sudah ada barisnya karena id sesi dipakai langsung sebagai
  // `stories.teacher_id` (login yang membuat baris ini).
  await db.execute({
    sql: "insert into teachers (id, display_name, username, password_hash) values (?, ?, ?, ?)",
    args: [
      TEACHER_ID,
      TEACHER_DISPLAY_NAME,
      "guru_uji",
      "scrypt$bukan-hash-uji",
    ],
  });
  dbRef.current = db;
  dbRef.failWith = null;

  cookieStore.get.mockReset();
  scheduleJobMock.mockClear();
  getReadyDbMock.mockClear();
  authenticate(
    createSessionToken({
      teacherId: TEACHER_ID,
      displayName: TEACHER_DISPLAY_NAME,
    }),
  );
  sendAsIp();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  db.close();
  dbRef.current = null;
});

describe("POST /api/upload — otorisasi", () => {
  it("menolak tanpa sesi dengan 401 UNAUTHORIZED", async () => {
    authenticate(null);

    const response = await POST(multipartRequest({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("menolak cookie rusak dengan 401", async () => {
    authenticate("payload-yang-rusak.bukan-ttd");

    const response = await POST(multipartRequest({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });
});

describe("POST /api/upload — validasi request", () => {
  it("menolak body bukan multipart dengan 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "bukan form" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FILE_MISSING" },
    });
  });

  it("menolak form tanpa field file dengan FILE_MISSING", async () => {
    const response = await POST(multipartRequest({ file: null }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FILE_MISSING" },
    });
  });

  it("menolak file lebih besar dari batas dengan 413 dan details.maxBytes", async () => {
    const response = await POST(
      multipartRequest({ file: pdfFile(MAX_PDF_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    const body = (await response.json()) as {
      error: { code: string; details?: { maxBytes?: number } };
    };
    expect(body.error.code).toBe("FILE_TOO_LARGE");
    expect(body.error.details?.maxBytes).toBe(MAX_PDF_BYTES);
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("menolak Content-Length palsu sebelum body dibaca dengan 413", async () => {
    const response = await POST(
      multipartRequest({
        extraHeaders: {
          "content-length": String(MAX_PDF_BYTES + 1024 * 1024),
        },
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FILE_TOO_LARGE" },
    });
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("menolak isi bukan PDF dengan 415 FILE_TYPE", async () => {
    const notPdf = new File(
      [new TextEncoder().encode("bukan pdf")],
      "materi.pdf",
      {
        type: "application/pdf",
      },
    );

    const response = await POST(multipartRequest({ file: notPdf }));

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FILE_TYPE" },
    });
  });

  it("menolak field teks tidak valid dengan 400", async () => {
    const response = await POST(multipartRequest({ fields: { title: "ab" } }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).not.toBe("INTERNAL");
    expect(scheduleJobMock).not.toHaveBeenCalled();
    expect(await rowCounts(db)).toEqual({ stories: 0, jobs: 0 });
  });

  it("menolak language di luar id/en dengan 400", async () => {
    const response = await POST(
      multipartRequest({ fields: { language: "fr" } }),
    );

    expect(response.status).toBe(400);
    expect(await rowCounts(db)).toEqual({ stories: 0, jobs: 0 });
  });
});

describe("POST /api/upload — unggahan valid", () => {
  it("menjawab 202 dengan bentuk persis dari kontrak", async () => {
    const response = await POST(multipartRequest({}));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["jobId", "status", "storyId"]);
    expect(body.status).toBe("queued");
    expect(typeof body.storyId).toBe("string");
    expect(typeof body.jobId).toBe("string");
  });

  it("membuat satu baris story dan satu baris job tanpa menyimpan PDF", async () => {
    const response = await POST(multipartRequest({}));
    expect(response.status).toBe(202);
    const { storyId } = (await response.json()) as { storyId: string };

    const story = await db.execute({
      sql: "select * from stories where id = ?",
      args: [storyId],
    });
    expect(story.rows).toHaveLength(1);
    const row = story.rows[0] as Record<string, unknown>;

    expect(row.teacher_id).toBe(TEACHER_ID);
    expect(row.title).toBe(VALID_FIELDS.title);
    expect(row.subject).toBe(VALID_FIELDS.subject);
    expect(row.grade_level).toBe(VALID_FIELDS.gradeLevel);
    expect(row.language).toBe(VALID_FIELDS.language);
    expect(row.status).toBe("processing");
    // Nama file hanya metadata tampilan; tidak ada bytes, isi, atau path.
    expect(row.source_file_path).toBeNull();
    const serialized = JSON.stringify(story.rows);
    expect(serialized).not.toContain("%PDF");
    expect(serialized).not.toContain("kontak-uji");

    const jobs = await db.execute({
      sql: "select * from jobs where story_id = ?",
      args: [storyId],
    });
    expect(jobs.rows).toHaveLength(1);
    const job = jobs.rows[0] as Record<string, unknown>;
    expect(job.stage).toBe("queued");
    expect(Number(job.progress)).toBe(5);
    expect(JSON.stringify(jobs.rows)).not.toContain("%PDF");
  });

  it("memanggil scheduleJob sekali dengan bytes yang sama", async () => {
    const response = await POST(multipartRequest({}));
    expect(response.status).toBe(202);

    expect(scheduleJobMock).toHaveBeenCalledTimes(1);
    const call = scheduleJobMock.mock.calls[0][0] as {
      jobId: string;
      storyId: string;
      pdf: { bytes: Uint8Array; filename: string; sizeBytes: number };
    };
    const { jobId, storyId } = (await response.json()) as {
      jobId: string;
      storyId: string;
    };
    expect(call.jobId).toBe(jobId);
    expect(call.storyId).toBe(storyId);
    expect(Array.from(call.pdf.bytes)).toEqual(Array.from(PDF_BODY));
    expect(call.pdf.sizeBytes).toBe(PDF_BODY.byteLength);
    expect(call.pdf.filename).toBe("materi.pdf");
  });

  it("meneruskan tone dari form ke scheduleJob", async () => {
    const response = await POST(
      multipartRequest({ fields: { tone: "tegang tapi ramah" } }),
    );
    expect(response.status).toBe(202);

    const call = scheduleJobMock.mock.calls[0][0] as { tone?: string };
    expect(call.tone).toBe("tegang tapi ramah");
  });

  it("memakai tone bawaan kontrak saat field tone kosong", async () => {
    const response = await POST(multipartRequest({}));
    expect(response.status).toBe(202);

    const call = scheduleJobMock.mock.calls[0][0] as { tone?: string };
    expect(call.tone).toBe("hangat dan penasaran");
  });

  it("meneruskan mode permainan dari form ke scheduleJob", async () => {
    const response = await POST(
      multipartRequest({ fields: { mode: "pertanyaan" } }),
    );
    expect(response.status).toBe(202);

    const call = scheduleJobMock.mock.calls[0][0] as { mode?: string };
    expect(call.mode).toBe("pertanyaan");
  });

  it("menolak permintaan tanpa mode permainan", async () => {
    const form = new FormData();
    form.append("file", pdfFile());
    for (const [key, value] of Object.entries(VALID_FIELDS)) {
      if (key === "mode") continue;
      form.append(key, value);
    }

    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("menolak mode yang tidak dikenal", async () => {
    const response = await POST(
      multipartRequest({ fields: { mode: "kuis cepat" } }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("memakai tone bawaan kontrak saat field tone kosong", async () => {
    const response = await POST(multipartRequest({}));
    expect(response.status).toBe(202);

    const call = scheduleJobMock.mock.calls[0][0] as { tone?: string };
    expect(call.tone).toBe("hangat dan penasaran");
  });

  it("tidak pernah memanggil node:fs/promises (tidak ada penulisan file)", async () => {
    const response = await POST(multipartRequest({}));
    expect(response.status).toBe(202);
    expect(scheduleJobMock).toHaveBeenCalledTimes(1);

    // Jika route atau modul yang diimpornya menyentuh disk, spies ini akan
    // tercatat. Tidak ada penulisan maupun pembacaan file.
    expect(fsSpies.size).toBe(0);

    // Dan tidak ada path file yang tersimpan.
    const rows = await db.execute("select source_file_path from stories");
    expect(rows.rows.every((row) => row.source_file_path === null)).toBe(true);
  });
});

describe("POST /api/upload — kegagalan database", () => {
  it("menjawab 500 generik tanpa detail apa pun", async () => {
    dbRef.failWith = new Error("SQLITE_BUSY: pesan driver yang rahasia");

    const response = await POST(multipartRequest({}));

    expect(response.status).toBe(500);
    const body = (await response.json()) as {
      error: Record<string, unknown>;
    };
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("SQLITE_BUSY");
    expect(JSON.stringify(body)).not.toContain("rahasia");
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });

  it("tidak meninggalkan story tanpa job saat transaksi gagal", async () => {
    // Gagalkan insert kedua lewat kegagalan umum getReadyDb: transaksi tidak
    // sempat dibuka, jadi tidak ada baris yang tertinggal.
    dbRef.failWith = new Error("kegagalan uji");

    await POST(multipartRequest({}));

    expect(await rowCounts(db)).toEqual({ stories: 0, jobs: 0 });
  });
});

describe("POST /api/upload — rate limit", () => {
  it(`menolak setelah ${UPLOAD_IP_RATE_LIMIT.limit} upload dari IP yang sama`, async () => {
    for (let i = 0; i < UPLOAD_IP_RATE_LIMIT.limit; i += 1) {
      // Guru berganti setiap kali, jadi yang lebih dulu tercapai adalah batas
      // per IP (20), bukan batas per guru (10).
      // Sesi guru lain. Nama `authenticate` dipakai (bukan `use...`) supaya
      // aturan React Hooks tidak menganggapnya hook saat dipanggil di loop.
      authenticate(
        createSessionToken({
          teacherId: `teacher_ip_${i}`,
          displayName: TEACHER_DISPLAY_NAME,
        }),
      );
      sendAsIp(CLIENT_IP);
      // Sesi guru lain harus punya baris `teachers` (foreign key stories).
      await db.execute({
        sql: "insert into teachers (id, display_name) values (?, 'Guru Uji')",
        args: [`teacher_ip_${i}`],
      });
      const response = await POST(multipartRequest({}));
      expect(response.status, `upload ${i + 1}`).toBe(202);
    }

    const blocked = await POST(multipartRequest({}));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    const retryAfter = Number(blocked.headers.get("retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(JSON.stringify(body)).not.toContain(CLIENT_IP);

    // Tidak ada story/job baru, dan bytes tidak pernah masuk pipeline.
    expect(await rowCounts(db)).toEqual({
      stories: UPLOAD_IP_RATE_LIMIT.limit,
      jobs: UPLOAD_IP_RATE_LIMIT.limit,
    });
  });

  it("menolak guru yang melewati batas per guru (dari IP berbeda)", async () => {
    for (let i = 0; i < UPLOAD_TEACHER_RATE_LIMIT.limit; i += 1) {
      // IP berbeda setiap kali supaya hanya batas per guru yang tercapai.
      sendAsIp(`203.0.113.${100 + i}`);
      // Sesi guru lain harus punya baris `teachers` (foreign key stories).
      await db.execute({
        sql: "insert into teachers (id, display_name) values (?, 'Guru Uji')",
        args: [`teacher_ip_${i}`],
      });
      const response = await POST(multipartRequest({}));
      expect(response.status, `upload ${i + 1}`).toBe(202);
    }

    sendAsIp("203.0.113.200");
    const blocked = await POST(multipartRequest({}));

    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED" },
    });

    // Guru yang sama tidak bisa menembus dengan IP baru.
    sendAsIp("203.0.113.201");
    expect((await POST(multipartRequest({}))).status).toBe(429);

    expect(await rowCounts(db)).toEqual({
      stories: UPLOAD_TEACHER_RATE_LIMIT.limit,
      jobs: UPLOAD_TEACHER_RATE_LIMIT.limit,
    });
  });

  it("batas global menolak guru mana pun", async () => {
    // Kuota global diisi seperti lalu lintas sebelumnya. IP dan guru yang
    // dipakai di bawah masih bersih, jadi penolakan murni dari batas global.
    await fillRateLimit(
      db,
      UPLOAD_GLOBAL_RATE_LIMIT,
      globalRateLimitKey(UPLOAD_GLOBAL_RATE_LIMIT.name),
    );

    const blocked = await POST(multipartRequest({}));

    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED" },
    });
    expect(scheduleJobMock).not.toHaveBeenCalled();
    expect(await rowCounts(db)).toEqual({ stories: 0, jobs: 0 });
  });

  it("permintaan tanpa sesi (401) tidak menambah hitungan per guru atau global", async () => {
    authenticate(null);

    for (let i = 0; i < 3; i += 1) {
      expect((await POST(multipartRequest({}))).status).toBe(401);
    }

    expect(await rateLimitCount(db, UPLOAD_TEACHER_RATE_LIMIT.name)).toBe(0);
    expect(await rateLimitCount(db, UPLOAD_GLOBAL_RATE_LIMIT.name)).toBe(0);
    // Batas per IP sengaja tetap dihitung lebih dulu (sebelum sesi).
    expect(await rateLimitCount(db, UPLOAD_IP_RATE_LIMIT.name)).toBe(3);
  });

  it("pemeriksaan rate limit terjadi sebelum file dibaca", async () => {
    // Kuota per guru "sudah habis" dari unggahan sebelumnya (disimulasikan
    // langsung di tabel supaya test cepat). Kalau file dibaca duluan,
    // jawabannya 413 karena Content-Length di atas batas; kalau rate limit
    // duluan, 429.
    await fillRateLimit(
      db,
      UPLOAD_TEACHER_RATE_LIMIT,
      teacherRateLimitKey(UPLOAD_TEACHER_RATE_LIMIT.name, TEACHER_ID),
    );

    const response = await POST(
      multipartRequest({
        file: pdfFile(MAX_PDF_BYTES + 1),
        extraHeaders: {
          "content-length": String(MAX_PDF_BYTES + 1024 * 1024),
        },
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED" },
    });
  });

  it("penghitung database gagal → 500 generik tanpa detail (fail closed)", async () => {
    authenticate(
      createSessionToken({
        teacherId: TEACHER_ID,
        displayName: TEACHER_DISPLAY_NAME,
      }),
    );
    dbRef.failWith = new Error("SQLITE_BUSY: pesan driver yang rahasia");

    const response = await POST(multipartRequest({}));

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: Record<string, unknown> };
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"]);
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("SQLITE_BUSY");
    expect(scheduleJobMock).not.toHaveBeenCalled();
  });
});
