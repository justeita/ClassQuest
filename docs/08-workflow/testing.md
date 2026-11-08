---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Testing

## Filosofi

Waktu hackathon pendek. Test diarahkan ke tempat yang **paling sering rusak** dan
**paling mahal kalau rusak**:

1. **Validator dan schema** — kalau salah, seluruh produk salah.
2. **Scoring** — kalau salah, siswa dinilai tidak adil.
3. **Story runner** — kalau salah, cerita macet.
4. **Pipeline (dengan mock)** — kalau salah, demo gagal.
5. **Komponen UI penting** — form upload dan editor.

Yang **tidak** dites di MVP:

- Render Phaser di jsdom (tidak realistis).
- Kualitas cerita hasil LLM (subjektif, butuh manusia).
- End-to-end browser penuh (waktu tidak cukup).

## Konfigurasi

`vitest.config.mjs`:

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "docs/**/*.test.ts"],
  },
});
```

Dua folder ikut dites:

- `src/**` — kode aplikasi.
- `docs/**` — tes yang menjaga dokumentasi tetap jujur. Lihat bagian
  [Tes dokumentasi](#tes-dokumentasi) di bawah.

- Test kode diletakkan **di sebelah** file yang dites: `validate.ts` → `validate.test.ts`.
- Tidak ada folder `__tests__` terpisah (kecuali fixture).
- Nama test dalam bahasa Indonesia, menjelaskan perilaku:
  `it("menolak aset yang tidak ada di manifest", ...)`.

## Lapisan dan target

| Lapisan          | Yang dites                                     | Alat          |
| ---------------- | ---------------------------------------------- | ------------- |
| `src/story`      | schema, validator, scoring, runner, fallback   | Vitest murni  |
| `src/ai`         | prompt builder, parser, pipeline dengan mock   | Vitest + mock |
| `src/assets`     | manifest vs file, keunikan id                  | Vitest + `fs` |
| `src/components` | form, overlay, editor (perilaku, bukan markup) | RTL           |
| `src/app`        | route handler dengan `Request` palsu           | Vitest        |
| `src/game`       | fungsi murni (mapping, resolve look)           | Vitest        |

## Yang wajib ada test-nya

- [ ] `story.example.json` lolos validator.
- [ ] Setiap kode error punya test yang memicunya.
- [ ] `scoring.isCorrect` untuk keempat tipe tantangan.
- [ ] `scoreStory` menghitung `weakConcepts` dengan benar.
- [ ] `StoryRunner.advance` tidak melewati chapter.
- [ ] `resolveSceneLook` memakai override scene.
- [ ] `buildFallbackStory` lolos validator.
- [ ] Pipeline memanggil repair saat ada error.
- [ ] Pipeline memakai fallback setelah batas repair.
- [ ] Manifest: semua file ada, id unik, prefix benar.
- [ ] `ChallengeOverlay` tidak menerima jawaban benar di props.

## Contoh: validator

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateStory } from "./validate";

const example = JSON.parse(
  readFileSync(
    new URL("../../docs/02-data-model/story.example.json", import.meta.url),
    "utf8",
  ),
);

describe("validateStory", () => {
  it("menerima cerita contoh", () => {
    const result = validateStory(example);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("menolak aset yang tidak ada di manifest", () => {
    const broken = structuredClone(example);
    broken.chapters[0].backgroundId = "bg_tidak_ada";
    const result = validateStory(broken);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "E_UNKNOWN_ASSET" }),
    );
  });
});
```

## Contoh: scoring

```ts
it("menilai short_answer tanpa membedakan huruf besar", () => {
  const challenge = {
    id: "chl_03_01",
    type: "short_answer",
    acceptedAnswers: ["infiltrasi"],
    caseSensitive: false,
  } as const;

  expect(
    isCorrect(challenge as never, {
      challengeId: "chl_03_01",
      type: "short_answer",
      text: "  Infiltrasi ",
    }),
  ).toBe(true);
});
```

## Contoh: komponen

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("menampilkan penjelasan setelah menjawab", async () => {
  const user = userEvent.setup();
  render(<ChallengeOverlay challenge={view} onResolve={vi.fn()} />);

  await user.click(screen.getByLabelText("Menguap menjadi uap air"));
  await user.click(screen.getByRole("button", { name: "Jawab" }));

  expect(screen.getByRole("status")).toHaveTextContent(/panas matahari/i);
});
```

Catatan: `@testing-library/user-event` belum terpasang. Kalau menambahkannya,
tambahkan di PR yang sama dengan test pertama yang memakainya.

## Menguji pipeline tanpa LLM

Jangan pernah memanggil provider nyata di test.

```ts
const provider: LlmProvider = {
  async complete() {
    return {
      text: JSON.stringify(brokenStory),
      usage: { input: 0, output: 0 },
      model: "mock",
    };
  },
};
```

Pola:

1. Mock mengembalikan fixture (valid atau rusak).
2. Jalankan pipeline.
3. Periksa jumlah panggilan, `usedFallback`, dan error yang dilaporkan.

## Menguji komponen game

Phaser **tidak** dirender di jsdom. Yang dites adalah:

- `resolveSceneLook` (murni).
- `StoryRunner` (murni).
- `ChallengeOverlay` (DOM).
- `GameShell` dengan `GameCanvas` di-mock.

```ts
vi.mock("@/components/game/GameCanvas", () => ({
  GameCanvas: () => <div data-testid="canvas" />,
}));
```

## Setup global

`vitest.setup.ts` saat ini hanya mengimpor `@testing-library/jest-dom/vitest`
(specifier `/vitest`, bukan yang lama). Tambahkan polyfill di sini bila perlu:

```ts
import "@testing-library/jest-dom/vitest";

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

## Anti-pattern

| Jangan                                        | Kenapa                                 |
| --------------------------------------------- | -------------------------------------- |
| Menguji teks internal komponen                | Rapuh, berubah setiap redesign         |
| Menguji implementasi (nama fungsi privat)     | Menghambat refactor                    |
| Memanggil LLM nyata di CI                     | Lambat, mahal, tidak deterministik     |
| `await new Promise(r => setTimeout(r, 1000))` | Test flaky; pakai `findBy*`/fake timer |
| Snapshot seluruh halaman                      | Sulit dibaca, sering di-update asal    |
| Menonaktifkan test yang gagal                 | Menyembunyikan bug                     |

## Tes dokumentasi

Docs punya tes sendiri, dan itu disengaja. Docs yang tidak dicek akan berbohong
dalam satu atau dua minggu.

| File                                      | Yang dijaga                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/docs.test.ts`                       | Kepala dokumen lengkap dan tanggalnya wajar (dokumen `stable` maksimal 6 bulan, `draft`/`tbd` maksimal 1 tahun), tidak ada tautan rusak, indeks di `docs/README.md` lengkap, klaim "ada/rencana" sesuai isi folder |
| `docs/02-data-model/story-schema.test.ts` | `story.schema.json` menerima contoh cerita, menolak cerita rusak, field-nya sama dengan `story-schema.md`, aset yang dipakai ada di inventory                                                                      |

Yang perlu kamu lakukan kalau tes ini gagal:

1. **"indeks dokumen tidak lengkap"** — kamu menambah dokumen baru. Tambahkan satu
   baris di tabel dalam blok `<!-- docs-index:start -->` di `docs/README.md`.
2. **"status di indeks berbeda"** — kamu mengubah `status` di kepala dokumen.
   Samakan dengan baris di indeks.
3. **"klaim ada/rencana tidak sesuai"** — kamu baru membuat file yang masih
   ditandai `rencana`, atau menghapus file yang ditandai `ya`. Perbarui tabel di
   [`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md#status-kode-sekarang).
4. **"field story berbeda"** — kamu mengubah schema. Perbarui `story-schema.md`
   **dan** `story.schema.json` di PR yang sama.

Jangan melemahkan tes ini untuk membuat CI hijau. Kalau tes ini menghalangi
pekerjaan sah, itu tanda dokumennya perlu diubah, bukan tesnya.

## Menjalankan

```bash
bun run test
bun run test:watch
bun run test src/story/validate.test.ts
bun run test -t "menolak"
```

## Definition of done untuk test

- Test baru gagal sebelum perbaikan, lolos sesudahnya (untuk bug fix).
- Tidak ada `test.skip` tanpa komentar alasan.
- Waktu total `bun run test` < 30 detik di mesin pengembang.
- Test tidak bergantung pada urutan eksekusi.
