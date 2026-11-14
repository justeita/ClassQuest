// @vitest-environment node

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { AiProviderError } from "../provider";
import {
  AnthropicProvider,
  mapAnthropicError,
  type AnthropicMessagesClient,
  type AnthropicProviderConfig,
} from "./anthropic";

/**
 * Test provider Anthropic **tanpa jaringan**. Klien SDK diganti objek palsu
 * lewat opsi konstruktor; tidak ada `fetch` yang dipanggil dan tidak ada API key
 * asli di mana pun.
 *
 * String penanda dipakai untuk membuktikan pesan error tidak membocorkan kunci,
 * isi prompt, atau isi respons.
 */

const FAKE_KEY = "kunci-palsu-untuk-test-9f2c";
const PROMPT_MARKER = "MATERI-RAHASIA-GURU-7d1e";
const RESPONSE_MARKER = "ISI-RESPONS-MODEL-4b2a";

const config: AnthropicProviderConfig = {
  provider: "anthropic",
  apiKey: FAKE_KEY,
  model: "model-contoh",
  baseUrl: null,
  timeoutMs: 60_000,
  branching: false,
};

const request = {
  system: `Kamu adalah penulis cerita. ${PROMPT_MARKER}`,
  user: `Tulis cerita dari materi ini. ${PROMPT_MARKER}`,
  temperature: 0.8,
  maxOutputTokens: 4_000,
  json: true as const,
};

type CreateArgs = [
  params: Anthropic.MessageCreateParamsNonStreaming,
  options?: Anthropic.RequestOptions,
];

const messageOf = (
  content: Anthropic.ContentBlock[],
  usage: { input_tokens: number; output_tokens: number } = {
    input_tokens: 120,
    output_tokens: 45,
  },
): Anthropic.Message =>
  ({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "model-contoh",
    content,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage,
  }) as unknown as Anthropic.Message;

const textBlock = (text: string): Anthropic.ContentBlock =>
  ({ type: "text", text, citations: null }) as Anthropic.ContentBlock;

const fakeClient = (
  create: (...args: CreateArgs) => Promise<Anthropic.Message>,
): { client: AnthropicMessagesClient; create: ReturnType<typeof vi.fn> } => {
  const spy = vi.fn(create);
  return {
    client: { messages: { create: spy } } as unknown as AnthropicMessagesClient,
    create: spy,
  };
};

const sdkError = (name: string, status?: number): Error => {
  const error = new Error(
    `pesan mentah SDK ${PROMPT_MARKER} ${RESPONSE_MARKER}`,
  );
  error.name = name;
  if (status !== undefined) {
    Object.defineProperty(error, "status", { value: status });
  }
  return error;
};

const expectSafeError = (error: unknown, code: string) => {
  expect(error).toBeInstanceOf(AiProviderError);
  const providerError = error as AiProviderError;
  expect(providerError.code).toBe(code);
  expect(providerError.message).not.toContain(FAKE_KEY);
  expect(providerError.message).not.toContain(PROMPT_MARKER);
  expect(providerError.message).not.toContain(RESPONSE_MARKER);
};

describe("AnthropicProvider — sukses", () => {
  it("menggabungkan teks dari beberapa blok, bukan hanya blok pertama", async () => {
    const { client } = fakeClient(async () =>
      messageOf([
        textBlock('{"chapters":'),
        textBlock("[]}"),
        { type: "thinking", thinking: "abaikan", signature: "x" } as never,
        textBlock(""),
      ]),
    );

    const provider = new AnthropicProvider(config, { client });
    const response = await provider.complete(request);

    expect(response.text).toBe('{"chapters":[]}');
  });

  it("meneruskan usage token dan model", async () => {
    const { client } = fakeClient(async () =>
      messageOf([textBlock("{}")], { input_tokens: 321, output_tokens: 12 }),
    );

    const provider = new AnthropicProvider(config, { client });
    const response = await provider.complete(request);

    expect(response.usage).toEqual({ input: 321, output: 12 });
    expect(response.model).toBe("model-contoh");
  });

  it("mengirim model, system, pesan user, dan max_tokens yang benar", async () => {
    const { client, create } = fakeClient(async () =>
      messageOf([textBlock("{}")]),
    );

    const provider = new AnthropicProvider(config, { client });
    await provider.complete(request);

    expect(create).toHaveBeenCalledTimes(1);
    const [params] = create.mock.calls[0] as CreateArgs;

    expect(params.model).toBe("model-contoh");
    expect(params.system).toBe(request.system);
    expect(params.messages).toEqual([{ role: "user", content: request.user }]);
    expect(params.max_tokens).toBe(4_000);
    expect(params.stream).toBeUndefined();
  });

  it("memaksa maxRetries 0 dan timeout dari config pada setiap request", async () => {
    const { client, create } = fakeClient(async () =>
      messageOf([textBlock("{}")]),
    );

    const provider = new AnthropicProvider(
      { ...config, timeoutMs: 12_345 },
      { client },
    );
    await provider.complete(request);

    const [, options] = create.mock.calls[0] as CreateArgs;
    expect(options?.maxRetries).toBe(0);
    expect(options?.timeout).toBe(12_345);
  });

  it("meneruskan AbortSignal dari pipeline ke SDK", async () => {
    const { client, create } = fakeClient(async () =>
      messageOf([textBlock("{}")]),
    );
    const controller = new AbortController();

    const provider = new AnthropicProvider(config, { client });
    await provider.complete(request, controller.signal);

    const [, options] = create.mock.calls[0] as CreateArgs;
    expect(options?.signal).toBe(controller.signal);
  });

  it("tidak memanggil SDK bila signal sudah abort", async () => {
    const { client, create } = fakeClient(async () =>
      messageOf([textBlock("{}")]),
    );
    const controller = new AbortController();
    controller.abort();

    const provider = new AnthropicProvider(config, { client });

    await expect(
      provider.complete(request, controller.signal),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("AnthropicProvider — pemetaan error", () => {
  it.each([
    ["abort", sdkError("AbortError"), "AI_TIMEOUT"],
    ["timeout koneksi", sdkError("APIConnectionTimeoutError"), "AI_TIMEOUT"],
    ["HTTP 408", sdkError("APIError", 408), "AI_TIMEOUT"],
    ["HTTP 429", sdkError("RateLimitError", 429), "AI_RATE_LIMIT"],
    ["HTTP 401", sdkError("AuthenticationError", 401), "AI_AUTH"],
    ["HTTP 403", sdkError("PermissionDeniedError", 403), "AI_AUTH"],
    ["HTTP 500", sdkError("InternalServerError", 500), "AI_UNAVAILABLE"],
    ["HTTP 529 overloaded", sdkError("OverloadedError", 529), "AI_UNAVAILABLE"],
    ["kegagalan koneksi", sdkError("APIConnectionError"), "AI_UNAVAILABLE"],
    ["HTTP 400", sdkError("BadRequestError", 400), "AI_UNAVAILABLE"],
    ["error tak dikenal", new Error("apa saja"), "AI_UNAVAILABLE"],
  ])("%s dipetakan ke %s", async (_label, error, code) => {
    const { client } = fakeClient(async () => {
      throw error;
    });

    const provider = new AnthropicProvider(config, { client });

    let caught: unknown;
    try {
      await provider.complete(request);
    } catch (thrown) {
      caught = thrown;
    }

    expectSafeError(caught, code);
  });

  it("respons tanpa blok teks menjadi AI_BAD_OUTPUT", async () => {
    const { client } = fakeClient(async () =>
      messageOf([
        {
          type: "thinking",
          thinking: "hanya berpikir",
          signature: "x",
        } as never,
      ]),
    );

    const provider = new AnthropicProvider(config, { client });

    let caught: unknown;
    try {
      await provider.complete(request);
    } catch (thrown) {
      caught = thrown;
    }

    expectSafeError(caught, "AI_BAD_OUTPUT");
  });

  it("respons dengan teks kosong menjadi AI_BAD_OUTPUT", async () => {
    const { client } = fakeClient(async () => messageOf([textBlock("   ")]));

    const provider = new AnthropicProvider(config, { client });

    await expect(provider.complete(request)).rejects.toMatchObject({
      code: "AI_BAD_OUTPUT",
    });
  });

  it("mapAnthropicError meneruskan AiProviderError apa adanya", () => {
    const original = new AiProviderError("AI_RATE_LIMIT", "pesan aman");

    expect(mapAnthropicError(original)).toBe(original);
  });
});
