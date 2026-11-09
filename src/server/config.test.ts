import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AiConfigError,
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_DATABASE_URL,
  loadAiConfig,
  loadDatabaseConfig,
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
  });

  it("pesan error tidak memuat AI_API_KEY walau variabelnya terisi", () => {
    expect(() =>
      loadAiConfig({ AI_PROVIDER: "gemini", AI_API_KEY: FAKE_KEY }),
    ).toThrow(AiConfigError);
    expect(() =>
      loadAiConfig({ AI_PROVIDER: "gemini", AI_API_KEY: FAKE_KEY }),
    ).not.toThrow(new RegExp(FAKE_KEY));
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
