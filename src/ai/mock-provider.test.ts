import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { validateStory } from "../story/validate";
import { MOCK_ASSET_MANIFEST } from "./__fixtures__/manifest";
import { MockProvider, type MockScenario } from "./mock-provider";
import type { LlmRequest } from "./provider";

/**
 * Kontrak MockProvider: `docs/03-ai-pipeline/provider-setup.md` dan
 * `docs/03-ai-pipeline/validation-and-repair.md`.
 *
 * Test ini tidak boleh menyentuh jaringan. Fixture rusak diuji lewat validator
 * yang sama dengan yang dipakai pipeline, bukan dengan membandingkan teks.
 */

const output = (path: string) =>
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "__fixtures__",
      "outputs",
      path,
    ),
    "utf8",
  );

const request = (overrides: Partial<LlmRequest> = {}): LlmRequest => ({
  system: "Kamu adalah penulis cerita.",
  user: "Tulis cerita.",
  temperature: 0.8,
  maxOutputTokens: 4_000,
  json: true,
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MockProvider — skenario valid", () => {
  it("mengembalikan fixture Story yang lolos validator", async () => {
    const provider = new MockProvider({ scenario: "valid", stage: "story" });
    const response = await provider.complete(request());

    expect(response.model).toBe("mock");
    expect(response.usage).toEqual({ input: 0, output: 0 });

    const result = validateStory(response.text, {
      manifest: MOCK_ASSET_MANIFEST,
    });

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("mengembalikan keluaran chapter, bukan Story utuh, untuk tahap chapter", async () => {
    const provider = new MockProvider({ scenario: "valid", stage: "chapter" });
    const response = await provider.complete(request());
    const payload = JSON.parse(response.text) as Record<string, unknown>;

    expect(payload).toHaveProperty("chapter");
    expect(payload).toHaveProperty("challenges");
    expect(payload).toHaveProperty("continuity");
    expect(payload).not.toHaveProperty("schemaVersion");
    expect(response.text).toBe(output("chapter/valid.json"));
  });

  it("mengembalikan Outline untuk tahap outline", async () => {
    const provider = new MockProvider({ scenario: "valid", stage: "outline" });
    const response = await provider.complete(request());
    const outline = JSON.parse(response.text) as Record<string, unknown>;

    expect(outline).toHaveProperty("title");
    expect(outline).toHaveProperty("concepts");
    expect(outline).toHaveProperty("chapters");
    expect(response.text).toBe(output("outline/valid.json"));
  });

  it("mengembalikan draft perbaikan untuk tahap repair", async () => {
    const provider = new MockProvider({ scenario: "valid", stage: "repair" });
    const response = await provider.complete(request());

    expect(response.text).toBe(output("repair/valid.json"));
    expect(response.text).not.toBe(output("chapter/valid.json"));
  });
});

describe("MockProvider — fixture rusak", () => {
  it.each([
    ["unknown-asset", "E_UNKNOWN_ASSET"],
    ["text-too-long", "E_TEXT_TOO_LONG"],
    ["unknown-speaker", "E_UNKNOWN_SPEAKER"],
  ] as const)(
    "skenario %s memicu %s",
    async (scenario: MockScenario, code: string) => {
      const provider = new MockProvider({ scenario, stage: "story" });
      const response = await provider.complete(request());
      const result = validateStory(response.text, {
        manifest: MOCK_ASSET_MANIFEST,
      });

      expect(result.ok).toBe(false);
      expect([...new Set(result.errors.map((issue) => issue.code))]).toEqual([
        code,
      ]);
    },
  );

  it("skenario malformed-json memicu E_JSON_PARSE", async () => {
    const provider = new MockProvider({
      scenario: "malformed-json",
      stage: "story",
    });
    const response = await provider.complete(request());

    expect(() => JSON.parse(response.text)).toThrow();

    const result = validateStory(response.text, {
      manifest: MOCK_ASSET_MANIFEST,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "E_JSON_PARSE" }),
    );
  });

  it("memakai fixture rusak tahap story bila tahap itu tidak punya fixture sendiri", async () => {
    const provider = new MockProvider({
      stages: { chapter: "unknown-speaker" },
    });
    const response = await provider.complete(request());

    const result = validateStory(response.text, {
      manifest: MOCK_ASSET_MANIFEST,
    });

    expect(result.errors.map((issue) => issue.code)).toContain(
      "E_UNKNOWN_SPEAKER",
    );
  });
});

describe("MockProvider — pemilihan tahap", () => {
  it("menyimpulkan tahap chapter dari penanda prompt", async () => {
    const provider = new MockProvider();
    const response = await provider.complete(
      request({ user: "SCHEMA CHAPTER (ringkas)\n{ ... }" }),
    );

    expect(response.text).toBe(output("chapter/valid.json"));
  });

  it("menyimpulkan tahap outline dari blok OUTLINE", async () => {
    const provider = new MockProvider();
    const response = await provider.complete(
      request({ user: 'OUTLINE\n{ "chapters": [] }' }),
    );

    expect(response.text).toBe(output("outline/valid.json"));
  });

  it("menyimpulkan tahap repair dari awal prompt repair", async () => {
    const provider = new MockProvider();
    const response = await provider.complete(
      request({
        user: "Perbaiki JSON berikut. Jangan mengubah bagian yang tidak dilaporkan.\n\nERRORS\n1. ...\n\nDRAFT\n{ ... }",
      }),
    );

    expect(response.text).toBe(output("repair/valid.json"));
  });

  it("opsi stage eksplisit menang atas penanda prompt", async () => {
    const provider = new MockProvider({ stage: "outline" });
    const response = await provider.complete(
      request({ user: "SCHEMA CHAPTER (ringkas)\n{ ... }" }),
    );

    expect(response.text).toBe(output("outline/valid.json"));
  });
});

describe("MockProvider — timeout", () => {
  it("skenario timeout melempar AiProviderError AI_TIMEOUT", async () => {
    const provider = new MockProvider({ scenario: "timeout" });

    await expect(provider.complete(request())).rejects.toMatchObject({
      name: "AiProviderError",
      code: "AI_TIMEOUT",
      retryable: true,
    });
  });

  it("signal yang sudah abort juga menghasilkan AI_TIMEOUT", async () => {
    const controller = new AbortController();
    controller.abort();

    const provider = new MockProvider({ scenario: "valid", stage: "story" });

    await expect(
      provider.complete(request(), controller.signal),
    ).rejects.toMatchObject({
      name: "AiProviderError",
      code: "AI_TIMEOUT",
    });
  });
});

describe("MockProvider — determinisme dan jaringan", () => {
  it("dua panggilan pada provider yang sama menghasilkan respons identik", async () => {
    const provider = new MockProvider({ scenario: "valid", stage: "story" });

    const first = await provider.complete(request());
    const second = await provider.complete(request());

    expect(second).toEqual(first);
  });

  it("dua provider berbeda menghasilkan respons identik", async () => {
    const first = await new MockProvider({
      scenario: "unknown-asset",
      stage: "story",
    }).complete(request());
    const second = await new MockProvider({
      scenario: "unknown-asset",
      stage: "story",
    }).complete(request());

    expect(second).toEqual(first);
  });

  it("tidak memanggil fetch", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("jaringan tidak boleh dipanggil di test");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new MockProvider({ scenario: "valid", stage: "story" });
    await provider.complete(request());

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
