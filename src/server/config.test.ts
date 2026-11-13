import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AiConfigError,
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_DATABASE_URL,
  loadAiConfig,
  loadDatabaseConfig,
  loadSeedConfig,
  loadTeacherAuthConfig,
  SeedConfigError,
} from "./config";

/**
 * Kunci palsu. Dipakai untuk memastikan pesan error tidak pernah memuat nilai
 * kunci, bukan untuk meniru format kunci provider sungguhan.
 */
const FAKE_KEY = "kunci-palsu-untuk-test-9f2c";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadAiConfig — default", () => {
  it("memakai mock saat AI_PROVIDER tidak diset", () => {
    const config = loadAiConfig({});

    expect(config.provider).toBe("mock");
    expect(config.timeoutMs).toBe(DEFAULT_AI_TIMEOUT_MS);
  });

  it("memakai mock saat AI_PROVIDER kosong atau hanya spasi", () => {
    expect(loadAiConfig({ AI_PROVIDER: "" }).provider).toBe("mock");
    expect(loadAiConfig({ AI_PROVIDER: "   " }).provider).toBe("mock");
  });

  it("mode mock tidak memakai kunci dan model walau variabelnya terisi", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "mock",
      AI_API_KEY: FAKE_KEY,
      AI_MODEL: "model-tidak-dipakai",
      AI_BASE_URL: "https://gateway.example.test",
    });

    expect(config).toEqual({
      provider: "mock",
      apiKey: null,
      model: null,
      baseUrl: null,
      timeoutMs: DEFAULT_AI_TIMEOUT_MS,
      branching: false,
    });
  });

  it("timeout default 60000 dan bisa diubah", () => {
    expect(loadAiConfig({}).timeoutMs).toBe(60_000);
    expect(loadAiConfig({ AI_TIMEOUT_MS: "15000" }).timeoutMs).toBe(15_000);
  });

  it("membaca process.env bila sumber tidak diberikan", () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("AI_TIMEOUT_MS", "30000");

    const config = loadAiConfig();

    expect(config.provider).toBe("mock");
    expect(config.timeoutMs).toBe(30_000);
  });
});

describe("loadAiConfig — anthropic", () => {
  it("menerima konfigurasi lengkap", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "anthropic",
      AI_API_KEY: FAKE_KEY,
      AI_MODEL: "model-contoh",
      AI_BASE_URL: "https://gateway.example.test",
      AI_TIMEOUT_MS: "45000",
    });

    expect(config).toEqual({
      provider: "anthropic",
      apiKey: FAKE_KEY,
      model: "model-contoh",
      baseUrl: "https://gateway.example.test",
      timeoutMs: 45_000,
      branching: false,
    });
  });

  it("AI_BASE_URL opsional", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "anthropic",
      AI_API_KEY: FAKE_KEY,
      AI_MODEL: "model-contoh",
    });

    expect(config.baseUrl).toBeNull();
  });

  it("menerima nama provider dengan huruf besar", () => {
    expect(
      loadAiConfig({
        AI_PROVIDER: "Anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
      }).provider,
    ).toBe("anthropic");
  });

  it("gagal dengan menyebut AI_API_KEY saat kunci kosong", () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: "",
        AI_MODEL: "model-contoh",
      }),
    ).toThrow(/AI_API_KEY/);
  });

  it("gagal dengan menyebut AI_MODEL saat model kosong", () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "  ",
      }),
    ).toThrow(/AI_MODEL/);
  });

  it("gagal menyebut kedua variabel bila dua-duanya kosong", () => {
    expect(() => loadAiConfig({ AI_PROVIDER: "anthropic" })).toThrow(
      /AI_API_KEY dan AI_MODEL/,
    );
  });

  it("melempar AiConfigError dengan daftar variabel yang hilang", () => {
    try {
      loadAiConfig({ AI_PROVIDER: "anthropic", AI_MODEL: "model-contoh" });
      expect.unreachable("harus melempar AiConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(AiConfigError);
      expect((error as AiConfigError).variables).toEqual(["AI_API_KEY"]);
    }
  });
});

describe("loadAiConfig — openai-compatible", () => {
  it("menerima konfigurasi lengkap dengan kunci", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: FAKE_KEY,
      AI_MODEL: "model-contoh",
      AI_BASE_URL: "https://router.example.test/v1",
      AI_TIMEOUT_MS: "45000",
    });

    expect(config).toEqual({
      provider: "openai-compatible",
      apiKey: FAKE_KEY,
      model: "model-contoh",
      baseUrl: "https://router.example.test/v1",
      timeoutMs: 45_000,
      branching: false,
    });
  });

  it("AI_API_KEY opsional untuk server lokal tanpa kunci", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_MODEL: "model-contoh",
      AI_BASE_URL: "http://localhost:20128/v1",
    });

    expect(config).toEqual({
      provider: "openai-compatible",
      apiKey: null,
      model: "model-contoh",
      baseUrl: "http://localhost:20128/v1",
      timeoutMs: DEFAULT_AI_TIMEOUT_MS,
      branching: false,
    });
  });

  it("kunci kosong atau hanya spasi diperlakukan sebagai tidak ada", () => {
    for (const value of ["", "   "]) {
      const config = loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_API_KEY: value,
        AI_MODEL: "model-contoh",
        AI_BASE_URL: "https://router.example.test/v1",
      });

      expect(config.apiKey).toBeNull();
    }
  });

  it("membuang trailing slash dari AI_BASE_URL", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_MODEL: "model-contoh",
      AI_BASE_URL: "https://router.example.test/v1///",
    });

    expect(config.baseUrl).toBe("https://router.example.test/v1");
  });

  it("menerima nama provider dengan huruf besar", () => {
    expect(
      loadAiConfig({
        AI_PROVIDER: "OpenAI-Compatible",
        AI_MODEL: "model-contoh",
        AI_BASE_URL: "https://router.example.test/v1",
      }).provider,
    ).toBe("openai-compatible");
  });

  it("gagal menyebut AI_BASE_URL saat base URL kosong", () => {
    try {
      loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "model-contoh",
      });
      expect.unreachable("harus melempar AiConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(AiConfigError);
      expect((error as AiConfigError).variables).toEqual(["AI_BASE_URL"]);
      expect((error as Error).message).toContain("AI_BASE_URL");
    }
  });

  it("gagal menyebut AI_MODEL saat model kosong", () => {
    try {
      loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "  ",
        AI_BASE_URL: "https://router.example.test/v1",
      });
      expect.unreachable("harus melempar AiConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(AiConfigError);
      expect((error as AiConfigError).variables).toEqual(["AI_MODEL"]);
      expect((error as Error).message).toContain("AI_MODEL");
    }
  });

  it("gagal menyebut kedua variabel bila dua-duanya kosong", () => {
    expect(() => loadAiConfig({ AI_PROVIDER: "openai-compatible" })).toThrow(
      /AI_BASE_URL dan AI_MODEL/,
    );
  });

  it.each([
    "bukan-url",
    "ftp://router.example.test/v1",
    "mailto:guru@example.test",
    "//router.example.test/v1",
    "http://",
  ])("menolak AI_BASE_URL %j", (value) => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "model-contoh",
        AI_BASE_URL: value,
      }),
    ).toThrow(/AI_BASE_URL/);
  });

  it("pesan error AI_BASE_URL tidak memuat nilai URL", () => {
    let message = "";

    try {
      loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "model-contoh",
        AI_BASE_URL: "bukan-url-RAHASIA-5a1b",
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("AI_BASE_URL");
    expect(message).not.toContain("RAHASIA-5a1b");
  });
});

describe("loadAiConfig — provider tidak didukung", () => {
  it.each(["gemini", "openai", "openrouter", "ollama", "groq"])(
    "menolak %s dengan pesan 'belum didukung'",
    (provider) => {
      expect(() => loadAiConfig({ AI_PROVIDER: provider })).toThrow(
        /belum didukung/,
      );
    },
  );

  it("menyebut nilai yang sah di pesan error", () => {
    expect(() => loadAiConfig({ AI_PROVIDER: "gemini" })).toThrow(
      /mock, anthropic/,
    );
    expect(() => loadAiConfig({ AI_PROVIDER: "gemini" })).toThrow(
      /openai-compatible/,
    );
  });

  it("pesan error tidak memuat AI_API_KEY walau variabelnya terisi", () => {
    expect(() =>
      loadAiConfig({ AI_PROVIDER: "gemini", AI_API_KEY: FAKE_KEY }),
    ).toThrow(AiConfigError);
    expect(() =>
      loadAiConfig({ AI_PROVIDER: "gemini", AI_API_KEY: FAKE_KEY }),
    ).not.toThrow(new RegExp(FAKE_KEY));
  });

  it("pesan error tidak memuat nilai AI_PROVIDER yang tidak dikenal", () => {
    let message = "";

    try {
      loadAiConfig({ AI_PROVIDER: "provider-rahasia-5a1b" });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("AI_PROVIDER");
    expect(message).not.toContain("provider-rahasia-5a1b");
  });
});

describe("loadAiConfig — AI_TIMEOUT_MS", () => {
  it.each(["0", "-1", "1.5", "60s", "6e4", "abc", "NaN", "Infinity"])(
    "menolak nilai %j",
    (value) => {
      expect(() =>
        loadAiConfig({ AI_PROVIDER: "mock", AI_TIMEOUT_MS: value }),
      ).toThrow(/AI_TIMEOUT_MS/);
    },
  );

  it("memakai default saat AI_TIMEOUT_MS kosong atau hanya spasi", () => {
    expect(loadAiConfig({ AI_TIMEOUT_MS: "" }).timeoutMs).toBe(60_000);
    expect(loadAiConfig({ AI_TIMEOUT_MS: "  " }).timeoutMs).toBe(60_000);
  });

  it("menerima timeout lebih besar dari anggaran satu cerita", () => {
    // 60 s per panggilan dan 120 s total adalah dua batas berbeda; tidak ada
    // batas atas per variabel yang dikarang di sini.
    expect(loadAiConfig({ AI_TIMEOUT_MS: "120001" }).timeoutMs).toBe(120_001);
  });

  it("melempar AiConfigError yang menyebut AI_TIMEOUT_MS", () => {
    try {
      loadAiConfig({ AI_PROVIDER: "mock", AI_TIMEOUT_MS: "0" });
      expect.unreachable("harus melempar AiConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(AiConfigError);
      expect((error as AiConfigError).variables).toEqual(["AI_TIMEOUT_MS"]);
    }
  });
});

describe("loadAiConfig — AI_BRANCHING", () => {
  it('mati saat tidak diset, kosong, atau bukan "on"', () => {
    expect(loadAiConfig({}).branching).toBe(false);
    expect(loadAiConfig({ AI_BRANCHING: "" }).branching).toBe(false);
    expect(loadAiConfig({ AI_BRANCHING: "   " }).branching).toBe(false);
    expect(loadAiConfig({ AI_BRANCHING: "off" }).branching).toBe(false);
    expect(loadAiConfig({ AI_BRANCHING: "true" }).branching).toBe(false);
    expect(loadAiConfig({ AI_BRANCHING: "1" }).branching).toBe(false);
  });

  it('hidup hanya saat bernilai "on" (tanpa peduli huruf besar)', () => {
    expect(loadAiConfig({ AI_BRANCHING: "on" }).branching).toBe(true);
    expect(loadAiConfig({ AI_BRANCHING: "ON" }).branching).toBe(true);
    expect(loadAiConfig({ AI_BRANCHING: "  On  " }).branching).toBe(true);
  });

  it("berlaku untuk semua provider", () => {
    expect(
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
        AI_BRANCHING: "on",
      }).branching,
    ).toBe(true);
    expect(
      loadAiConfig({
        AI_PROVIDER: "openai-compatible",
        AI_MODEL: "model-contoh",
        AI_BASE_URL: "https://router.example.test/v1",
        AI_BRANCHING: "on",
      }).branching,
    ).toBe(true);
  });
});

describe("loadAiConfig — kunci tidak bocor di pesan error", () => {
  const cases: Array<[string, Record<string, string | undefined>]> = [
    ["model kosong", { AI_PROVIDER: "anthropic", AI_API_KEY: FAKE_KEY }],
    [
      "provider tidak didukung",
      { AI_PROVIDER: "gemini", AI_API_KEY: FAKE_KEY, AI_MODEL: "m" },
    ],
    [
      "timeout tidak sah",
      { AI_PROVIDER: "anthropic", AI_API_KEY: FAKE_KEY, AI_TIMEOUT_MS: "0" },
    ],
  ];

  it.each(cases)("%s: pesan tidak memuat nilai AI_API_KEY", (_label, env) => {
    let message = "";
    try {
      loadAiConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toBe("");
    expect(message).not.toContain(FAKE_KEY);
  });
});

describe("loadDatabaseConfig", () => {
  it("memakai file lokal saat DATABASE_URL kosong atau tidak diset", () => {
    expect(loadDatabaseConfig({})).toEqual({
      url: DEFAULT_DATABASE_URL,
      authToken: null,
    });
    expect(loadDatabaseConfig({ DATABASE_URL: "" }).url).toBe(
      DEFAULT_DATABASE_URL,
    );
    expect(loadDatabaseConfig({ DATABASE_URL: "   " }).url).toBe(
      DEFAULT_DATABASE_URL,
    );
  });

  it("membaca DATABASE_URL dan DATABASE_AUTH_TOKEN lalu memangkas spasi", () => {
    expect(
      loadDatabaseConfig({
        DATABASE_URL: "  libsql://contoh.turso.io  ",
        DATABASE_AUTH_TOKEN: "  token-contoh  ",
      }),
    ).toEqual({
      url: "libsql://contoh.turso.io",
      authToken: "token-contoh",
    });
  });

  it("auth token opsional dan kosong berarti null", () => {
    expect(
      loadDatabaseConfig({ DATABASE_URL: "file:./data/test.db" }).authToken,
    ).toBeNull();
    expect(
      loadDatabaseConfig({
        DATABASE_URL: "file:./data/test.db",
        DATABASE_AUTH_TOKEN: "  ",
      }).authToken,
    ).toBeNull();
  });

  it("membaca process.env bila sumber tidak diberikan", () => {
    vi.stubEnv("DATABASE_URL", "file:./data/dari-env.db");
    vi.stubEnv("DATABASE_AUTH_TOKEN", "token-dari-env");

    expect(loadDatabaseConfig()).toEqual({
      url: "file:./data/dari-env.db",
      authToken: "token-dari-env",
    });
  });
});

describe("loadTeacherAuthConfig", () => {
  it("mengembalikan null saat secret belum diisi", () => {
    expect(loadTeacherAuthConfig({})).toEqual({ sessionSecret: null });
    expect(loadTeacherAuthConfig({ TEACHER_SESSION_SECRET: "   " })).toEqual({
      sessionSecret: null,
    });
  });

  it("membaca secret dan memangkas spasi", () => {
    expect(
      loadTeacherAuthConfig({ TEACHER_SESSION_SECRET: "  secret-demo  " }),
    ).toEqual({ sessionSecret: "secret-demo" });
  });

  it("membaca process.env bila sumber tidak diberikan", () => {
    vi.stubEnv("TEACHER_SESSION_SECRET", "secret-dari-env");

    expect(loadTeacherAuthConfig()).toEqual({
      sessionSecret: "secret-dari-env",
    });
  });
});

describe("loadSeedConfig", () => {
  it("menolak environment kosong dan menyebut variabel yang kurang", () => {
    let caught: unknown;
    try {
      loadSeedConfig({});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SeedConfigError);
    const error = caught as SeedConfigError;
    expect(error.variables).toEqual([
      "TEACHER_SEED_USERNAME",
      "TEACHER_SEED_PASSWORD",
      "STUDENT_SEED_USERNAME",
      "STUDENT_SEED_PASSWORD",
    ]);
    expect(error.message).toContain("TEACHER_SEED_PASSWORD");
    expect(error.message).toContain("STUDENT_SEED_PASSWORD");
  });

  it("menolak sandi yang kosong meski username terisi", () => {
    expect(() =>
      loadSeedConfig({
        TEACHER_SEED_USERNAME: "bu-guru",
        TEACHER_SEED_PASSWORD: "   ",
        STUDENT_SEED_USERNAME: "siswa-a",
        STUDENT_SEED_PASSWORD: "",
      }),
    ).toThrow(SeedConfigError);
  });

  it("membaca dan memangkas nilai dari environment", () => {
    expect(
      loadSeedConfig({
        TEACHER_SEED_USERNAME: "  bu-guru  ",
        TEACHER_SEED_PASSWORD: "  sandi-baru  ",
        STUDENT_SEED_USERNAME: "  siswa-a  ",
        STUDENT_SEED_PASSWORD: "  sandi-siswa  ",
      }),
    ).toEqual({
      teacherUsername: "bu-guru",
      teacherPassword: "sandi-baru",
      studentUsername: "siswa-a",
      studentPassword: "sandi-siswa",
    });
  });
});
