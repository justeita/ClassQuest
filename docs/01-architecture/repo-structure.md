---
status: draft
last_reviewed: 2026-11-11
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

| Path                                          | Ada? | Isi                                                   |
| --------------------------------------------- | ---- | ----------------------------------------------------- |
| `src/app/page.tsx`                            | ya   | Halaman starter, masih placeholder                    |
| `src/app/layout.tsx`                          | ya   | Layout global                                         |
| `src/app/page.test.tsx`                       | ya   | Contoh test komponen pertama                          |
| `docs/02-data-model/story.example.json`       | ya   | Cerita contoh (fixture)                               |
| `docs/02-data-model/story.schema.json`        | ya   | Kontrak cerita versi mesin                            |
| `docs/02-data-model/story-schema.test.ts`     | ya   | Tes schema vs dokumen                                 |
| `docs/docs.test.ts`                           | ya   | Tes kerapian docs                                     |
| `src/story/schema.ts`                         | ya   | Tipe `Story` (bentuk mengikuti `story.schema.json`)   |
| `src/story/schema.test.ts`                    | ya   | Tes schema TypeScript vs `story.schema.json`          |
| `src/story/validate.ts`                       | ya   | Validator semantik                                    |
| `src/story/validate-parts.ts`                 | ya   | `validateOutline` dan `validateChapter`               |
| `src/story/validate-parts.test.ts`            | ya   | Tes validasi outline dan chapter                      |
| `src/story/scoring.ts`                        | ya   | Penilaian jawaban, fungsi murni                       |
| `src/story/fallback.ts`                       | ya   | Cerita cadangan (deterministik, selalu valid)         |
| `src/assets/manifest.ts`                      | ya   | Daftar resmi aset + `toAssetManifest()`               |
| `src/assets/manifest.test.ts`                 | ya   | Tes id, path, tag, fallback, dan file aset            |
| `src/ai/provider.ts`                          | ya   | Antarmuka `LlmProvider` + error provider              |
| `src/ai/mock-provider.ts`                     | ya   | Provider mock deterministik dari fixture              |
| `src/ai/factory.ts`                           | ya   | `createLlmProvider` dari konfigurasi env AI           |
| `src/ai/prompt.ts`                            | ya   | Prompt builder: outline, chapter, repair              |
| `src/ai/prompt.test.ts`                       | ya   | Tes kontrak prompt builder                            |
| `src/ai/__fixtures__/outputs`                 | ya   | Fixture keluaran mock (valid, rusak, timeout)         |
| `src/ai/pipeline.ts`                          | ya   | Outline → generate → repair                           |
| `src/ai/pipeline.test.ts`                     | ya   | Tes pipeline: repair, anggaran, fallback              |
| `src/game/config.ts`                          | ya   | Konfigurasi Phaser (640×360, ADR 0009)                |
| `src/game/createGame.ts`                      | ya   | Entry `createGame(parent)`, dipanggil React           |
| `src/game/types.ts`                           | ya   | `GameHandle` untuk menutup instance Phaser            |
| `src/game/scenes`                             | ya   | `PreloadScene` (muat aset) + `GameScene` (cerita)     |
| `src/game/sceneAssets.ts`                     | ya   | Resolusi background/musik + daftar aset preload       |
| `src/game/sceneAssets.test.ts`                | ya   | Tes resolusi look dan pemilihan aset cerita           |
| `src/game/StoryRunner.ts`                     | ya   | State machine pemutar cerita (murni, tanpa Phaser)    |
| `src/game/typewriter.ts`                      | ya   | Efek ketik murni (30–40 karakter/detik)               |
| `src/game/textbox.ts`                         | ya   | Panel + portrait dialog; state typewriter → DOM       |
| `src/game/layout.ts`                          | ya   | Geometri UI 640×360 untuk Phaser dan DOM              |
| `src/game/font.ts`                            | ya   | Nama keluarga font game untuk Phaser                  |
| `src/game/text.ts`                            | ya   | `teksTajam()` untuk label kecil di canvas             |
| `src/game/interaction.ts`                     | ya   | Zona interaksi NPC + posisi prompt (ADR 0008)         |
| `src/game/map.ts`                             | ya   | Konverter RoomData (tile) → peta runtime piksel       |
| `src/game/maps`                               | ya   | Data ruangan per `roomId` + template (ADR 0010)       |
| `src/game/map.test.ts`                        | ya   | Tes resolver map dan konverter collider               |
| `src/game/layar.ts`                           | ya   | Konversi koordinat dunia → layar untuk overlay DOM    |
| `src/game/layar.test.ts`                      | ya   | Tes konversi kamera dan batas layar                   |
| `src/game/questLog.ts`                        | ya   | Quest turunan scene + pemilihan pemberi quest         |
| `src/game/questLog.test.ts`                   | ya   | Tes status quest dan fallback pemberi quest           |
| `src/game/camera.ts`                          | ya   | Keputusan kamera per ruangan: lock/follow (ADR 0010)  |
| `src/game/camera.test.ts`                     | ya   | Tes mode kamera, dead zone, dan lerp                  |
| `src/game/constants.ts`                       | ya   | Konstanta resolusi + tile tanpa dependensi            |
| `src/game/movement.ts`                        | ya   | Gerak pemain 4 arah + collision top-down (ADR 0008)   |
| `src/game/movement.test.ts`                   | ya   | Tes arah gerak dan layout frame animasi               |
| `src/game/gameBus.ts`                         | ya   | Bridge bertipe Phaser ↔ React (event + command)       |
| `src/game/challengeView.ts`                   | ya   | Data tantangan aman untuk overlay (tanpa jawaban)     |
| `src/game/answerLog.ts`                       | ya   | Catatan jawaban percobaan pertama + ringkasan hasil   |
| `src/game/demoStory.ts`                       | ya   | Akses cerita demo untuk halaman siswa dan dev         |
| `src/game/fixture`                            | ya   | Cerita demo untuk pengembangan frontend game          |
| `src/components/game/GameCanvas.tsx`          | ya   | Host Phaser + overlay tantangan di React              |
| `src/components/game/ChallengeOverlay.tsx`    | ya   | Overlay tantangan DOM di atas canvas                  |
| `src/components/game/DialogueBox.tsx`         | ya   | Teks dialog DOM di atas panel Phaser (ADR 0007)       |
| `src/components/game/InteractHint.tsx`        | ya   | Chip prompt "Space" DOM di atas canvas                |
| `src/components/game/Keycap.tsx`              | ya   | Keycap tombol keyboard yang seragam di semua tombol   |
| `src/components/game/SkipHint.tsx`            | ya   | Petunjuk "tahan Tab" di atas panel dialog             |
| `src/components/game/SpeedLines.tsx`          | ya   | Garis kecepatan tepi layar saat percepat berjalan     |
| `src/components/game/NpcMarker.tsx`           | ya   | Penanda "!" NPC pemberi quest (koordinat layar)       |
| `src/components/game/QuestTracker.tsx`        | ya   | Panel quest chapter turunan scene                     |
| `src/components/game/ChapterCard.tsx`         | ya   | Kartu judul chapter saat bab berganti                 |
| `src/components/game/QuestToast.tsx`          | ya   | Notifikasi "Quest baru" saat scene berganti           |
| `src/components/game/GameShell.tsx`           | ya   | Shell halaman game + state layar judul/main/hasil     |
| `src/components/game/TitleScreen.tsx`         | ya   | Layar judul: ringkasan cerita + menu Mulai            |
| `src/components/game/HUD.tsx`                 | ya   | HUD: percepat, catatan, musik, jeda                   |
| `src/components/game/PauseMenu.tsx`           | ya   | Menu jeda: lanjut, ulangi chapter, suara, keluar      |
| `src/components/game/ResultScreen.tsx`        | ya   | Layar hasil: skor, jawaban tepat, konsep lemah        |
| `src/app/play`                                | ya   | Halaman siswa dari cerita demo                        |
| `src/server/config.ts`                        | ya   | Konfigurasi env server (satu-satunya pembaca)         |
| `src/server/config.test.ts`                   | ya   | Tes konfigurasi env                                   |
| `src/server/auth.ts`                          | ya   | Auth guru: kode akses, token cookie, `requireTeacher` |
| `src/server/auth.test.ts`                     | ya   | Tes kode akses, token, cookie, dan sesi guru          |
| `src/server/stories`                          | ya   | Logika inti manajemen cerita guru                     |
| `src/server/stories/core.ts`                  | ya   | Logika inti manajemen cerita guru                     |
| `src/server/stories/core.test.ts`             | ya   | Tes logika inti cerita                                |
| `src/app/guru`                                | ya   | Halaman guru dan Server Actions                       |
| `src/app/api`                                 | ya   | Route handler                                         |
| `src/app/api/health/route.ts`                 | ya   | `GET /api/health`: cek hidup + versi build            |
| `src/app/api/health/route.test.ts`            | ya   | Tes kontrak respons health                            |
| `src/app/api/upload/route.ts`                 | ya   | `POST /api/upload`: validasi PDF + buat story & job   |
| `src/app/api/upload/route.test.ts`            | ya   | Tes route upload (libSQL in-memory)                   |
| `src/server/api-error.ts`                     | ya   | Helper respons error bentuk `ApiError`                |
| `src/server/jobs/run.ts`                      | ya   | Job runner: ekstraksi → pipeline → simpan versi       |
| `src/server/jobs/run.test.ts`                 | ya   | Tes job runner (libSQL in-memory, provider mock)      |
| `src/server/jobs/schedule.ts`                 | ya   | `scheduleJob()`: jalankan runner lewat `after()`      |
| `src/server/jobs/schedule.test.ts`            | ya   | Tes penjadwalan `after()` dan penanganan kegagalan    |
| `public/assets`                               | ya   | File aset game (dibuat `bun run assets:generate`)     |
| `public/fonts`                                | ya   | Font Patrick Hand (OFL) + lisensi untuk `next/font`   |
| `scripts/generate-assets.mjs`                 | ya   | Generator aset pixel + audio, tanpa dependensi        |
| `src/server/contracts.ts`                     | ya   | Kontrak tipe bersama server ↔ client                  |
| `src/server/play-results`                     | ya   | Modul penyimpanan hasil bermain siswa                 |
| `src/server/play-results/save.ts`             | ya   | Validasi, scoring, dan simpan hasil bermain           |
| `src/server/play-results/save.test.ts`        | ya   | Tes simpan hasil bermain                              |
| `src/app/guru/actions.ts`                     | ya   | Server Actions mutasi cerita guru                     |
| `src/app/guru/actions.test.ts`                | ya   | Tes Server Actions guru                               |
| `src/app/play/actions.ts`                     | ya   | Server Action simpan hasil bermain                    |
| `src/app/play/actions.test.ts`                | ya   | Tes Action hasil bermain                              |
| `src/app/api/stories/[storyId]/route.ts`      | ya   | `GET /api/stories/[storyId]`: cerita versi terbit     |
| `src/app/api/stories/[storyId]/route.test.ts` | ya   | Tes endpoint cerita publik                            |
| `scripts/dev-publish.ts`                      | ya   | Script dev penerbit cerita                            |

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
│       ├── TitleScreen.tsx            # layar judul sebelum game dimulai
│       ├── GameCanvas.tsx             # host Phaser (client-only)
│       ├── ChallengeOverlay.tsx
│       ├── NpcMarker.tsx
│       ├── QuestTracker.tsx
│       ├── ChapterCard.tsx
│       ├── QuestToast.tsx
│       ├── HUD.tsx
│       ├── PauseMenu.tsx
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
