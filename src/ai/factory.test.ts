import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAiConfig } from "../server/config";
import {
  ANTHROPIC_NOT_IMPLEMENTED_MESSAGE,
  createLlmProvider,
} from "./factory";
import { MockProvider } from "./mock-provider";
import type { LlmRequest } from "./provider";

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

  it("anthropic mengembalikan stub yang gagal dengan pesan tugas 23", async () => {
    const provider = createLlmProvider(
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
      }),
    );

    expect(provider).not.toBeInstanceOf(MockProvider);
    await expect(provider.complete(request)).rejects.toThrow(
      "Provider Anthropic belum diimplementasikan (tugas 23)",
    );
  });

  it("stub anthropic tidak memanggil jaringan", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("jaringan tidak boleh dipanggil di test");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const provider = createLlmProvider(
      loadAiConfig({
        AI_PROVIDER: "anthropic",
        AI_API_KEY: FAKE_KEY,
        AI_MODEL: "model-contoh",
      }),
    );

    await expect(provider.complete(request)).rejects.toThrow(
      ANTHROPIC_NOT_IMPLEMENTED_MESSAGE,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
