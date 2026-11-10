// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { AiConfigError, loadAiConfig } from "../server/config";
import { createLlmProvider } from "./factory";
import { MockProvider } from "./mock-provider";
import { AnthropicProvider } from "./providers/anthropic";
import type { LlmRequest } from "./provider";

/**
 * Kunci palsu. Dipakai untuk memastikan pesan error tidak pernah memuat nilai
 * kunci, bukan untuk meniru format kunci provider sungguhan.
 */
const FAKE_KEY = "kunci-palsu-untuk-test-9f2c";

const request: LlmRequest = {
  system: "Kamu adalah penulis cerita.",
  user: "Tulis cerita.",
  temperature: 0.8,
  maxOutputTokens: 4_000,
  json: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLlmProvider", () => {
  it("memilih MockProvider untuk AI_PROVIDER=mock", () => {
    const provider = createLlmProvider(loadAiConfig({ AI_PROVIDER: "mock" }));

    expect(provider).toBeInstanceOf(MockProvider);
  });

  it("memakai MockProvider sebagai default saat AI_PROVIDER kosong", () => {
    const provider = createLlmProvider(loadAiConfig({}));

    expect(provider).toBeInstanceOf(MockProvider);
  });

  it("MockProvider dari factory bisa dipanggil tanpa kunci dan jaringan", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("jaringan tidak boleh dipanggil di test");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = createLlmProvider(loadAiConfig({ AI_PROVIDER: "mock" }));
    const response = await provider.complete(request);

    expect(response.model).toBe("mock");
    expect(response.text.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("memilih AnthropicProvider untuk AI_PROVIDER=anthropic dengan env lengkap", () => {
    const provider = createLlmProvider(
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
      }),
    );

    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider).not.toBeInstanceOf(MockProvider);
  });

  it("membuat provider anthropic tanpa memanggil jaringan", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("jaringan tidak boleh dipanggil di test");
    });
    vi.stubGlobal("fetch", fetchSpy);

    createLlmProvider(
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("anthropic tanpa AI_API_KEY gagal dengan error konfigurasi yang menyebut nama env", () => {
    let caught: unknown;
    try {
      createLlmProvider(
        loadAiConfig({ AI_PROVIDER: "anthropic", AI_MODEL: "model-contoh" }),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiConfigError);
    const error = caught as AiConfigError;
    expect(error.variables).toContain("AI_API_KEY");
    expect(error.message).toContain("AI_API_KEY");
    expect(error.message).not.toContain(FAKE_KEY);
  });

  it("anthropic tanpa AI_MODEL gagal dengan error konfigurasi yang menyebut nama env", () => {
    let caught: unknown;
    try {
      createLlmProvider(
        loadAiConfig({ AI_PROVIDER: "anthropic", AI_API_KEY: FAKE_KEY }),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiConfigError);
    const error = caught as AiConfigError;
    expect(error.variables).toContain("AI_MODEL");
    expect(error.message).toContain("AI_MODEL");
    expect(error.message).not.toContain(FAKE_KEY);
  });

  it("anthropic tanpa kunci dan model tidak jatuh diam-diam ke mock", () => {
    expect(() =>
      createLlmProvider(loadAiConfig({ AI_PROVIDER: "anthropic" })),
    ).toThrow(AiConfigError);
  });
});
