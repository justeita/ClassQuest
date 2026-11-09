---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Struktur Repo

## Kondisi saat ini

```text
classquest/
├── .github/                 # CI, CODEOWNERS, template issue/PR
├── docs/                    # dokumentasi proyek (baca docs/README.md)
├── public/                  # aset statis (masih placeholder Next)
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── game/
│   │   │   └── page.tsx     # halaman dev Phaser, bukan route siswa
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.test.tsx
│   │   └── page.tsx         # masih halaman starter
│   ├── components/
│   │   └── game/
│   │       └── GameCanvas.tsx
│   └── game/
│       ├── config.ts
│       ├── createGame.ts
│       ├── types.ts
│       └── scenes/
│           ├── GameScene.ts
│           └── PreloadScene.ts
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
├── .env.example
├── .gitignore
├── .prettierrc
├── bun.lock
├── bunfig.toml
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.mjs
└── vitest.setup.ts
```

## Status kode sekarang

Banyak dokumen menyebut file yang **belum ada**. Ini daftar jujurnya. Tabel ini
dicek otomatis oleh `docs/docs.test.ts`: kalau kamu membuat file yang masih
ditandai `rencana` (atau sebaliknya), tes akan gagal sampai tabel ini diperbarui.
Itu disengaja — supaya docs dan kode tidak berbeda cerita.

Tabel ini **tidak** mendaftar setiap file; ia mendaftar file yang paling sering
ditanyakan "sudah ada atau belum". Folder `docs/` sendiri tidak diulang di sini —
isinya sudah ada di [`../README.md`](../README.md).

| Path                                      | Ada?    | Isi                                                 |
| ----------------------------------------- | ------- | --------------------------------------------------- |
| `src/app/page.tsx`                        | ya      | Halaman starter, masih placeholder                  |
| `src/app/layout.tsx`                      | ya      | Layout global                                       |
| `src/app/page.test.tsx`                   | ya      | Contoh test komponen pertama                        |
| `docs/02-data-model/story.example.json`   | ya      | Cerita contoh (fixture)                             |
| `docs/02-data-model/story.schema.json`    | ya      | Kontrak cerita versi mesin                          |
| `docs/02-data-model/story-schema.test.ts` | ya      | Tes schema vs dokumen                               |
| `docs/docs.test.ts`                       | ya      | Tes kerapian docs                                   |
| `src/story/schema.ts`                     | ya      | Tipe `Story` (bentuk mengikuti `story.schema.json`) |
| `src/story/schema.test.ts`                | ya      | Tes schema TypeScript vs `story.schema.json`        |
| `src/story/validate.ts`                   | ya      | Validator semantik                                  |
| `src/story/scoring.ts`                    | ya      | Penilaian jawaban, fungsi murni                     |
| `src/story/fallback.ts`                   | ya      | Cerita cadangan (deterministik, selalu valid)       |
| `src/assets/manifest.ts`                  | ya      | Daftar resmi aset + `toAssetManifest()`             |
| `src/assets/manifest.test.ts`             | ya      | Tes id, path, tag, fallback, dan file aset          |
| `src/ai/provider.ts`                      | ya      | Antarmuka `LlmProvider` + error provider            |
| `src/ai/mock-provider.ts`                 | ya      | Provider mock deterministik dari fixture            |
| `src/ai/factory.ts`                       | ya      | `createLlmProvider` dari konfigurasi env AI         |
| `src/ai/__fixtures__/outputs`             | ya      | Fixture keluaran mock (valid, rusak, timeout)       |
| `src/ai/pipeline.ts`                      | rencana | Outline → generate → repair                         |
| `src/game/config.ts`                      | ya      | Konfigurasi Phaser (480×270)                        |
| `src/game/createGame.ts`                  | ya      | Entry `createGame(parent)`, dipanggil React         |
| `src/game/types.ts`                       | ya      | `GameHandle` untuk menutup instance Phaser          |
| `src/game/scenes`                         | ya      | `PreloadScene` + `GameScene` (masih placeholder)    |
| `src/game/StoryRunner.ts`                 | ya      | State machine pemutar cerita (murni, tanpa Phaser)  |
| `src/game/map.ts`                         | ya      | Data map dummy per scene: spawn, dinding, NPC       |
| `src/game/movement.ts`                    | ya      | Gerak pemain 4 arah + collision top-down (ADR 0008) |
| `src/game/fixture`                        | ya      | Cerita demo untuk pengembangan frontend game        |
| `src/components/game/GameCanvas.tsx`      | ya      | Host Phaser di React (client-only, dynamic import)  |
| `src/components/game/GameShell.tsx`       | rencana | Shell fullscreen halaman game                       |
| `src/app/play`                            | rencana | Halaman siswa                                       |
| `src/server/config.ts`                    | ya      | Konfigurasi env AI (satu-satunya pembaca)           |
| `src/server/config.test.ts`               | ya      | Tes konfigurasi env AI                              |
| `src/server/stories.ts`                   | rencana | Query cerita (butuh DB, ADR 0005)                   |
| `src/app/guru`                            | rencana | Halaman guru                                        |
| `src/app/api`                             | ya      | Route handler                                       |
| `src/app/api/health/route.ts`             | ya      | `GET /api/health`: cek hidup + versi build          |
| `src/app/api/health/route.test.ts`        | ya      | Tes kontrak respons health                          |
| `public/assets`                           | rencana | File aset game                                      |

## Struktur target

Dibuat bertahap. Jangan membuat folder kosong hanya demi "rapi"; buat saat ada
isi pertamanya.

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                       # landing + penjelasan singkat
│   ├── guru/
│   │   ├── layout.tsx                 # shell dashboard guru
│   │   ├── masuk/page.tsx             # kode akses guru
│   │   ├── page.tsx                   # daftar materi
│   │   ├── materi/
│   │   │   ├── baru/page.tsx          # upload
│   │   │   └── [storyId]/
│   │   │       ├── page.tsx           # status + ringkasan
│   │   │       ├── edit/page.tsx      # story editor
│   │   │       └── preview/page.tsx   # preview game
│   │   └── actions.ts                 # server actions guru
│   ├── play/
│   │   └── [storyId]/
│   │       └── page.tsx               # shell game + layar hasil (overlay)
│   └── api/
│       ├── upload/route.ts
│       ├── stories/[storyId]/route.ts # GET cerita untuk game
│       ├── jobs/[jobId]/route.ts      # status generasi
│       └── health/route.ts
│
├── components/
│   ├── ui/                            # Button, Field, Dialog, Badge, Toast
│   ├── teacher/
│   │   ├── UploadForm.tsx
│   │   ├── GenerationProgress.tsx
│   │   ├── ChapterList.tsx
│   │   ├── BeatEditor.tsx
│   │   └── ChallengeEditor.tsx
│   └── game/
│       ├── GameShell.tsx              # shell fullscreen halaman game
│       ├── GameCanvas.tsx             # host Phaser (client-only)
│       ├── ChallengeOverlay.tsx
│       ├── HUD.tsx
│       └── ResultScreen.tsx
│
├── story/                             # domain murni, tanpa React/DB
│   ├── schema.ts                      # tipe Story
│   ├── validate.ts                    # validasi semantik
│   ├── errors.ts                      # kode error
│   ├── scoring.ts                     # penilaian tantangan
│   ├── fallback.ts                    # cerita cadangan
│   └── *.test.ts
│
├── ai/
│   ├── prompt.ts                      # system prompt + builder
│   ├── provider.ts                    # client LLM (server-only)
│   ├── pipeline.ts                    # outline → generate → repair
│   └── *.test.ts
│
├── assets/
│   ├── manifest.ts                    # SUMBER KEBENARAN id aset
│   └── manifest.test.ts               # cek file benar-benar ada
│
├── game/
│   ├── config.ts                      # Phaser.GameConfig
│   ├── createGame.ts                  # entry, dipanggil dari React
│   ├── types.ts                       # tipe data game
│   ├── scenes/
│   │   ├── PreloadScene.ts            # muat aset + progress
│   │   ├── GameScene.ts               # tampilkan cerita
│   │   └── ResultScene.ts             # (opsional) transisi akhir
│   ├── systems/
│   │   ├── story-runner.ts            # state machine beat
│   │   ├── dialog-box.ts
│   │   └── asset-loader.ts
│   └── bridge.ts                      # event bus Phaser ↔ React
│
├── server/
│   ├── db.ts                          # client DB (TBD)
│   ├── storage.ts                     # simpan PDF (TBD)
│   ├── stories.ts                     # query/mutation cerita
│   ├── jobs.ts                        # status job generasi
│   └── auth.ts                        # sesi guru (TBD)
│
└── lib/
    ├── env.ts                         # validasi env server
    └── utils.ts
```

## Konvensi

### Penamaan file

| Jenis              | Konvensi               | Contoh                 |
| ------------------ | ---------------------- | ---------------------- |
| Komponen React     | `PascalCase.tsx`       | `ChallengeOverlay.tsx` |
| Modul non-komponen | `kebab-case.ts`        | `story-runner.ts`      |
| Route (Next)       | `kebab-case` folder    | `materi/baru`          |
| Tipe/interface     | `PascalCase`           | `Story`, `Challenge`   |
| Konstanta          | `SCREAMING_SNAKE_CASE` | `MAX_PDF_BYTES`        |
| Aset               | `snake_case` + prefix  | `bg_classroom_day.png` |
| Test               | colocated `*.test.ts`  | `validate.test.ts`     |

> Pengecualian: file Phaser scene memakai `PascalCase` (`PreloadScene.ts`) karena
> isinya satu class yang diekspor. Modul pendukungnya tetap `kebab-case`.

### Batasan impor

- `src/story` dan `src/assets` **tidak boleh** mengimpor React, Next, atau DB.
  Ini menjaga domain bisa dites tanpa browser/server.
- `src/ai` dan `src/server` hanya boleh diimpor dari server code.
  Tambahkan `import "server-only"` di modul yang memegang kredensial.
- `src/game` hanya diimpor lewat dynamic import di client component.

### Alias

`@/*` → `./src/*` (lihat `tsconfig.json`). Selalu pakai alias, jangan `../../../`.

### Aset

- File aset di `public/assets/...`, dirujuk lewat id manifest, **bukan** path langsung.
- Path langsung di kode game dianggap bug (kecuali di `AssetLoader`).

## Di mana meletakkan sesuatu

| Kalau kamu menulis...          | Taruh di                  |
| ------------------------------ | ------------------------- |
| Aturan validasi cerita         | `src/story/validate.ts`   |
| Prompt AI                      | `src/ai/prompt.ts`        |
| Panggilan HTTP ke provider LLM | `src/ai/provider.ts`      |
| Query database                 | `src/server/stories.ts`   |
| Komponen form guru             | `src/components/teacher/` |
| Logika Phaser                  | `src/game/`               |
| Teks UI yang dipakai berulang  | `src/components/ui/`      |
| Fungsi murni umum              | `src/lib/utils.ts`        |
