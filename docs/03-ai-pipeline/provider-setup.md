---
status: tbd
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Provider AI

> **Status: belum diputuskan.** Dokumen ini berisi opsi dan kriteria. Keputusan
> final dicatat di [ADR 0006](../09-decisions/0006-ai-provider.md).

## Kebutuhan

| Kebutuhan                      | Mengapa penting                                |
| ------------------------------ | ---------------------------------------------- |
| Output JSON yang bisa dipaksa  | Pipeline bergantung pada JSON valid            |
| Konteks ≥ 32k token            | Materi + schema + aset + kontinuitas           |
| Latensi wajar (< 60 s/chapter) | Demo tidak boleh menunggu terlalu lama         |
| Harga terprediksi              | Hackathon punya budget terbatas                |
| Tersedia dari Node runtime     | Next.js server, tanpa SDK browser              |
| Bisa dipanggil lewat `fetch`   | Tidak perlu SDK berat, mudah di-mock saat test |

## Opsi

| Opsi                            | Kelebihan                                 | Kekurangan                                    | Cocok bila                      |
| ------------------------------- | ----------------------------------------- | --------------------------------------------- | ------------------------------- |
| **Google Gemini**               | Free tier, JSON mode, konteks besar       | Kuota/limit bisa berubah, kualitas bervariasi | Ingin cepat & gratis untuk demo |
| **OpenAI**                      | Structured Outputs sangat baik, stabil    | Berbayar                                      | Butuh reliabilitas JSON         |
| **Anthropic Claude**            | Kualitas narasi bagus, instruksi dipatuhi | Berbayar, format JSON lewat tool/instruksi    | Kualitas cerita prioritas       |
| **OpenRouter / gateway serupa** | Satu API untuk banyak model, mudah ganti  | Ada lapisan tambahan, biaya markup            | Ingin eksperimen banyak model   |
| **Ollama / model lokal**        | Gratis, privat, offline                   | Lambat, kualitas JSON lebih lemah             | Demo offline / tanpa kunci      |

**Rekomendasi awal (belum final):** satu provider cloud dengan JSON mode untuk
demo, plus `MockProvider` untuk pengembangan dan test.

## Variabel lingkungan

Nama generik, supaya provider bisa diganti tanpa mengubah kode:

```bash
# .env.local (jangan commit)
AI_PROVIDER=mock            # mock | gemini | openai | anthropic | openrouter | ollama
AI_API_KEY=...
AI_MODEL=...
AI_BASE_URL=...             # opsional, untuk gateway/self-hosted
AI_TIMEOUT_MS=60000
AI_BRANCHING=               # opsional: "on" = konsekuensi jawaban salah; kosong = mati
AI_DISABLE_THINKING=on      # default "on" untuk model reasoning; kosong = biarkan hidup
```

Aturan:

- **Jangan** memakai prefix `NEXT_PUBLIC_`.
- Validasi di `src/server/config.ts` (satu-satunya pembaca env AI, lihat
  [`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md));
  kalau `AI_PROVIDER` tidak dikenal → gagal saat start, bukan saat demo.
- `AI_BRANCHING` hanya nilai `"on"` yang menyalakan; kosong, `off`, atau nilai
  lain mematikan. Saat mati, prompt chapter persis seperti sebelum fitur
  percabangan ada (`prompt.test.ts`).
- `AI_DISABLE_THINKING` hanya `"on"` yang menyalakan. Saat menyala, provider
  `openai-compatible` mengirim `thinking: { type: "disabled" }`. Untuk model
  reasoning (mis. `deepseek-*`) ini **default yang dipakai**: reasoning memakai
  25–45 detik per panggilan, sedangkan deadline pipeline 240 detik dan batas
  fungsi hosting 300 detik
  ([ADR 0018](../09-decisions/0018-plafon-output-thinking.md)). Kosongkan hanya
  bila batas fungsi hosting >300 detik (mis. Fluid compute); pipeline sudah
  menyiapkan plafon 8.000 untuk itu. Parameter ini ekstensi gateway, bukan
  spesifikasi chat completions; kosongkan bila gateway tidak mengenalnya.
- Nilai default adalah `mock` — provider nyata belum diputuskan (ADR 0006).
  Jangan menaruh nama provider sungguhan sebagai contoh default, karena itu
  terbaca seperti keputusan.
- `.env.example` memuat nama semua variabel yang dibaca server, tanpa nilai.
  Kalau kamu menambah variabel baru, tambahkan juga namanya di sana tanpa nilai.

## Antarmuka provider

Satu antarmuka kecil, banyak implementasi. Ini yang membuat test tidak butuh
jaringan.

```ts
// src/ai/provider.ts
import "server-only";

export type LlmRequest = {
  system: string;
  user: string;
  temperature: number;
  maxOutputTokens: number;
  json: true;
};

export type LlmResponse = {
  text: string;
  usage: { input: number; output: number };
  model: string;
};

export interface LlmProvider {
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}
```

Implementasi:

- `GeminiProvider`, `OpenAiProvider`, `AnthropicProvider`, `OpenRouterProvider`,
  `OllamaProvider` — satu kelas per nilai `AI_PROVIDER` yang sah.
- `MockProvider` — membaca fixture dari `src/ai/__fixtures__/outputs/`, dipakai
  di test dan saat `AI_PROVIDER=mock`.

## Sketsa implementasi (gaya OpenAI-compatible)

```ts
async function complete(req: LlmRequest, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(
    Number(process.env.AI_TIMEOUT_MS ?? 60000),
  );
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      temperature: req.temperature,
      max_tokens: req.maxOutputTokens,
      response_format: { type: "json_object" },
    }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!res.ok) throw mapProviderError(res.status, await res.text());
  const json = await res.json();
  return {
    text: json.choices[0].message.content,
    usage: {
      input: json.usage?.prompt_tokens ?? 0,
      output: json.usage?.completion_tokens ?? 0,
    },
    model: json.model ?? process.env.AI_MODEL!,
  };
}
```

Catatan:

- `response_format: json_object` tidak menjamin schema. Validator tetap wajib.
- Kalau provider memakai nama field berbeda (`max_output_tokens`, `contents`),
  adaptasi **hanya** di provider masing-masing, jangan di pipeline.

## Pemetaan error

| Kondisi HTTP / jaringan | Kode internal    | Perilaku                  |
| ----------------------- | ---------------- | ------------------------- |
| 401/403                 | `AI_AUTH`        | Gagal cepat, jangan retry |
| 429                     | `AI_RATE_LIMIT`  | Backoff 1x, lalu fallback |
| 5xx                     | `AI_UNAVAILABLE` | Retry 1x, lalu fallback   |
| Timeout / abort         | `AI_TIMEOUT`     | Retry 1x, lalu fallback   |
| Respons bukan JSON      | `AI_BAD_OUTPUT`  | Repair/generate ulang     |
| Safety block            | `AI_REFUSED`     | Fallback + catat alasan   |

Jangan menampilkan pesan mentah provider ke guru.

## Retry dan backoff

- Retry hanya untuk error **transien** (429, 5xx, timeout).
- Maksimal 1 retry per panggilan, jeda 1–2 detik (jangan `sleep` panjang di server).
- Retry tidak dihitung sebagai percobaan repair.
- Kalau `signal` sudah abort (klien pergi), jangan retry.

## Batas biaya

- Maksimal 18 panggilan LLM per cerita (lihat
  [`validation-and-repair.md`](./validation-and-repair.md)).
- Batas halaman dan karakter materi (lihat
  [`../06-backend/jobs-and-limits.md`](../06-backend/jobs-and-limits.md)).
- Catat `tokenUsage` per generasi; tampilkan total di log server.
- Untuk demo, siapkan kuota cadangan dan **fallback story** yang sudah tersimpan.

## Pengembangan tanpa kunci API

Wajib bisa:

```bash
AI_PROVIDER=mock bun dev
```

`MockProvider` mengembalikan fixture JSON yang sudah valid (dan beberapa fixture
rusak untuk menguji repair). Dalam mode bawaan, tahap chapter memilih fixture
sesuai id yang diminta prompt (`ch_02` → `chapter/ch_02.json`) supaya outline
tiga chapter tidak menerima fixture yang sama tiga kali. Ini membuat:

- onboarding anggota tim baru tidak terhalang kunci API,
- test CI deterministik,
- demo tetap jalan walau provider down.

## Checklist saat menetapkan provider

- [ ] Bisa memaksa output JSON.
- [ ] Konteks cukup untuk materi 10 halaman + schema + aset.
- [ ] Latensi < 60 detik untuk 1 chapter.
- [ ] Ada cara memantau pemakaian token/biaya.
- [ ] Tidak memerlukan SDK yang tidak kompatibel dengan Node runtime Next.
- [ ] Kunci hanya dibaca di server.
- [ ] `MockProvider` tersedia untuk test.
- [ ] Keputusan dicatat di ADR 0006 beserta alasannya.
