// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { AiProviderError, type LlmRequest } from "../provider";
import {
  OpenAiCompatibleProvider,
  type FetchLike,
  type OpenAiCompatibleProviderConfig,
} from "./openai-compatible";

/**
 * Test provider `openai-compatible` **tanpa jaringan**. `fetch` palsu
 * disuntikkan lewat opsi konstruktor; tidak ada `vi.mock` global dan tidak ada
 * API key asli di mana pun.
 *
 * String penanda dipakai untuk membuktikan pesan error tidak membocorkan kunci,
 * URL dasar, isi prompt, atau isi respons.
 */

const FAKE_KEY = "kunci-palsu-untuk-test-9f2c";
const URL_MARKER = "URL-RAHASIA-5a1b";
const PROMPT_MARKER = "MATERI-RAHASIA-GURU-7d1e";
const RESPONSE_MARKER = "ISI-RESPONS-MODEL-4b2a";

const BASE_URL = "https://router.example.test/v1";

const config: OpenAiCompatibleProviderConfig = {
  provider: "openai-compatible",
  apiKey: FAKE_KEY,
  model: "model-contoh",
  baseUrl: BASE_URL,
  timeoutMs: 60_000,
  branching: false,
};

const request: LlmRequest = {
  system: `Kamu adalah penulis cerita. ${PROMPT_MARKER}`,
  user: `Tulis cerita dari materi ini. ${PROMPT_MARKER}`,
  temperature: 0.8,
  maxOutputTokens: 4_000,
  json: true,
};

type FetchCall = { url: string; init: RequestInit };

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const textResponse = (body: string, status = 200): Response =>
  new Response(body, { status });

type FetchImpl = (
  url: string,
  init: RequestInit,
) => Response | Promise<Response>;

const createFetch = (impl: FetchImpl) => {
  const calls: FetchCall[] = [];

  const fetchImpl = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const options = init ?? {};
    calls.push({ url, init: options });

    return impl(url, options);
  }) as FetchLike;

  return { fetch: fetchImpl, calls };
};

const providerFor = (
  impl: FetchImpl,
  overrides: Partial<OpenAiCompatibleProviderConfig> = {},
) => {
  const { fetch, calls } = createFetch(impl);
  const provider = new OpenAiCompatibleProvider(
    { ...config, ...overrides },
    { fetch },
  );

  return { provider, calls };
};

const bodyOf = (init: RequestInit): Record<string, unknown> =>
  JSON.parse(String(init.body)) as Record<string, unknown>;

const expectSafeError = (error: unknown, code: string) => {
  expect(error).toBeInstanceOf(AiProviderError);
  const providerError = error as AiProviderError;
  expect(providerError.code).toBe(code);
  expect(providerError.message).not.toContain(FAKE_KEY);
  expect(providerError.message).not.toContain(URL_MARKER);
  expect(providerError.message).not.toContain(PROMPT_MARKER);
  expect(providerError.message).not.toContain(RESPONSE_MARKER);
};

const catchError = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error("harus melempar error");
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAiCompatibleProvider — bentuk request", () => {
  it("mengirim POST ke base + /chat/completions dengan header dan body benar", async () => {
    const { provider, calls } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    );

    await provider.complete(request);

    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;

    expect(url).toBe(`${BASE_URL}/chat/completions`);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: `Bearer ${FAKE_KEY}`,
    });
    expect(bodyOf(init)).toEqual({
      model: "model-contoh",
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      max_tokens: 4_000,
      stream: false,
      temperature: 0.8,
    });
    expect(bodyOf(init)).not.toHaveProperty("response_format");
  });

  it("membuang trailing slash pada base URL", async () => {
    const { provider, calls } = providerFor(
      () => jsonResponse({ choices: [{ message: { content: "{}" } }] }),
      { baseUrl: `${BASE_URL}///` },
    );

    await provider.complete(request);

    expect(calls[0].url).toBe(`${BASE_URL}/chat/completions`);
  });

  it.each([null, ""])(
    "tidak mengirim Authorization bila API key %j",
    async (apiKey) => {
      const { provider, calls } = providerFor(
        () => jsonResponse({ choices: [{ message: { content: "{}" } }] }),
        { apiKey },
      );

      await provider.complete(request);

      expect(calls[0].init.headers).toEqual({
        "Content-Type": "application/json",
      });
    },
  );

  it("tidak mengirim temperature bila request tidak menyediakannya", async () => {
    const { provider, calls } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    );
    const withoutTemperature = {
      ...request,
      temperature: undefined,
    } as unknown as LlmRequest;

    await provider.complete(withoutTemperature);

    expect(bodyOf(calls[0].init)).not.toHaveProperty("temperature");
  });

  it("tetap mengirim temperature 0 bila diberikan", async () => {
    const { provider, calls } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    );

    await provider.complete({ ...request, temperature: 0 });

    expect(bodyOf(calls[0].init)).toHaveProperty("temperature", 0);
  });
});

describe("OpenAiCompatibleProvider — respons sukses", () => {
  it("membaca content berupa string", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }),
    );

    const response = await provider.complete(request);

    expect(response.text).toBe('{"ok":true}');
  });

  it("menggabungkan content berupa array bagian teks dan mengabaikan non-teks", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: '{"chapters":' },
                { type: "thinking", thinking: "abaikan" },
                { type: "text", text: "[]}" },
              ],
            },
          },
        ],
      }),
    );

    const response = await provider.complete(request);

    expect(response.text).toBe('{"chapters":[]}');
  });

  it("membuang blok think di awal teks", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({
        choices: [
          {
            message: {
              content: `<think>berpikir ${RESPONSE_MARKER}</think>\n{"ok":true}`,
            },
          },
        ],
      }),
    );

    const response = await provider.complete(request);

    expect(response.text).toBe('{"ok":true}');
  });

  it("membuang beberapa blok think di awal teks", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({
        choices: [
          {
            message: {
              content: `<thinking>satu</thinking><think>dua</think>{"ok":true}`,
            },
          },
        ],
      }),
    );

    const response = await provider.complete(request);

    expect(response.text).toBe('{"ok":true}');
  });

  it("tidak membuang teks yang kebetulan memuat tag think di tengah", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({
        choices: [
          {
            message: { content: '{"ok":"<think>bukan blok awal</think>"}' },
          },
        ],
      }),
    );

    const response = await provider.complete(request);

    expect(response.text).toBe('{"ok":"<think>bukan blok awal</think>"}');
  });

  it("meneruskan usage token dan memakai model dari konfigurasi", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({
        model: "model-dari-router",
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 120, completion_tokens: 45 },
      }),
    );

    const response = await provider.complete(request);

    expect(response.usage).toEqual({ input: 120, output: 45 });
    expect(response.model).toBe("model-contoh");
  });

  it("usage yang tidak ada menjadi nol", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    );

    const response = await provider.complete(request);

    expect(response.usage).toEqual({ input: 0, output: 0 });
  });
});

describe("OpenAiCompatibleProvider — output rusak", () => {
  it.each([
    ["choices kosong", { choices: [] }],
    ["choices tidak ada", {}],
    ["message tidak ada", { choices: [{}] }],
    ["content null", { choices: [{ message: { content: null } }] }],
    ["content string kosong", { choices: [{ message: { content: "" } }] }],
    ["content hanya spasi", { choices: [{ message: { content: "   " } }] }],
    ["content array tanpa teks", { choices: [{ message: { content: [] } }] }],
    [
      "content array hanya non-teks",
      {
        choices: [
          { message: { content: [{ type: "thinking", thinking: "x" }] } },
        ],
      },
    ],
  ])("%s menjadi AI_BAD_OUTPUT", async (_label, body) => {
    const { provider } = providerFor(() => jsonResponse(body));

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_BAD_OUTPUT");
  });

  it("body bukan JSON menjadi AI_BAD_OUTPUT", async () => {
    const { provider } = providerFor(() =>
      textResponse(`bukan json ${RESPONSE_MARKER}`),
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_BAD_OUTPUT");
  });

  it("HTTP 200 dengan body error menjadi AI_UNAVAILABLE", async () => {
    const { provider } = providerFor(() =>
      jsonResponse({ error: { message: RESPONSE_MARKER } }),
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_UNAVAILABLE");
  });

  it.each([
    [{ code: "invalid_api_key" }, "AI_AUTH"],
    [{ code: "unauthorized" }, "AI_AUTH"],
    [{ status: 401 }, "AI_AUTH"],
    [{ status: 403 }, "AI_AUTH"],
    [{ code: "rate_limit_exceeded" }, "AI_RATE_LIMIT"],
    [{ code: "insufficient_quota" }, "AI_RATE_LIMIT"],
    [{ status: 429 }, "AI_RATE_LIMIT"],
    [{ status: 402 }, "AI_RATE_LIMIT"],
    [{ status: 500 }, "AI_UNAVAILABLE"],
  ])("body error %j dipetakan ke %s", async (errorBody, code) => {
    const { provider } = providerFor(() =>
      jsonResponse({ error: { ...errorBody, message: RESPONSE_MARKER } }),
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, code);
  });
});

describe("OpenAiCompatibleProvider — pemetaan error HTTP", () => {
  it.each([
    [408, "AI_TIMEOUT"],
    [429, "AI_RATE_LIMIT"],
    [402, "AI_RATE_LIMIT"],
    [401, "AI_AUTH"],
    [403, "AI_AUTH"],
    [500, "AI_UNAVAILABLE"],
    [503, "AI_UNAVAILABLE"],
    [400, "AI_UNAVAILABLE"],
    [404, "AI_UNAVAILABLE"],
  ])("HTTP %i dipetakan ke %s", async (status, code) => {
    const { provider, calls } = providerFor(() =>
      textResponse(`body error ${RESPONSE_MARKER}`, status),
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, code);
    expect(calls).toHaveLength(1);
  });

  it("tidak melakukan retry saat HTTP 500", async () => {
    const { provider, calls } = providerFor(() => textResponse("gagal", 500));

    await catchError(provider.complete(request));

    expect(calls).toHaveLength(1);
  });
});

describe("OpenAiCompatibleProvider — jaringan, timeout, dan abort", () => {
  it("kegagalan jaringan dipetakan ke AI_UNAVAILABLE", async () => {
    const { provider } = providerFor(() => {
      throw new TypeError(
        `fetch failed ${FAKE_KEY} ${URL_MARKER} ${PROMPT_MARKER} ${RESPONSE_MARKER}`,
      );
    });

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_UNAVAILABLE");
  });

  it("error abort dari fetch dipetakan ke AI_TIMEOUT", async () => {
    const { provider } = providerFor(() => {
      throw new DOMException("dibatalkan", "AbortError");
    });

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_TIMEOUT");
  });

  it("timeout per panggilan membatalkan fetch dan menjadi AI_TIMEOUT", async () => {
    const { provider, calls } = providerFor(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) {
            reject(new Error("signal tidak diteruskan"));
            return;
          }
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
      { timeoutMs: 5 },
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_TIMEOUT");
    expect(calls).toHaveLength(1);
  });

  it("tidak memanggil fetch bila signal pipeline sudah abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const { provider, calls } = providerFor(() =>
      jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    );

    const error = await catchError(
      provider.complete(request, controller.signal),
    );

    expectSafeError(error, "AI_TIMEOUT");
    expect(calls).toHaveLength(0);
  });

  it("abort dari signal pipeline saat fetch berjalan menjadi AI_TIMEOUT", async () => {
    let started: (() => void) | undefined;
    const startedPromise = new Promise<void>((resolve) => {
      started = resolve;
    });

    const { provider } = providerFor(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          started?.();
          const signal = init.signal;
          if (!signal) {
            reject(new Error("signal tidak diteruskan"));
            return;
          }
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("dibatalkan", "AbortError")),
            { once: true },
          );
        }),
    );

    const controller = new AbortController();
    const result = provider.complete(request, controller.signal);
    const assertion = expect(result).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });

    await startedPromise;
    controller.abort();
    await assertion;
  });
});

describe("OpenAiCompatibleProvider — keamanan pesan", () => {
  it("pesan error tidak memuat key, URL, prompt, atau isi respons", async () => {
    const { provider } = providerFor(
      () => textResponse(`body ${RESPONSE_MARKER}`, 500),
      { baseUrl: `https://router.example.test/v1-${URL_MARKER}` },
    );

    const error = await catchError(provider.complete(request));

    expectSafeError(error, "AI_UNAVAILABLE");
    expect((error as AiProviderError).message).not.toContain(URL_MARKER);
  });

  it("tidak menulis prompt atau respons ke console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const success = providerFor(() =>
      jsonResponse({
        choices: [{ message: { content: `{"ok":"${RESPONSE_MARKER}"}` } }],
      }),
    );
    await success.provider.complete(request);

    const failure = providerFor(() =>
      textResponse(`body ${RESPONSE_MARKER}`, 500),
    );
    await catchError(failure.provider.complete(request));

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
