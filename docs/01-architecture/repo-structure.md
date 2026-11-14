---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Struktur Repo

## Kondisi saat ini

```text
classquest/
├── .github/                 # CI, CODEOWNERS, template issue/PR
├── docs/                    # dokumentasi proyek (baca docs/README.md)
├── public/                  # aset statis: aset game (public/assets) + font
├── scripts/                 # generator aset, migrasi/seed DB, publish dev
├── src/
│   ├── app/                 # route & layout App Router (rincian di tabel bawah)
│   ├── components/          # komponen React: guru/ (portal) + game/ (shell)
│   ├── ai/                  # prompt builder, provider LLM, pipeline
│   ├── assets/              # manifest aset (sumber kebenaran id aset)
│   ├── game/                # Phaser: scene, dunia desa, gerak, bridge React
│   ├── lib/                 # utilitas murni (mis. aturan tahun ajaran)
│   ├── server/              # auth, db, cerita, job, kelas, hasil main, rate limit
│   ├── story/               # schema, validator, scoring, fallback
│   ├── proxy.ts             # gerbang 404 /play/[storyId]
│   └── test/                # setup/helper test
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── bun.lock
├── bunfig.toml
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── tsconfig.json
├── vercel.json
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

| Path                                                      | Ada? | Isi                                                                |
| --------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| `src/app/(landing)/page.tsx`                              | ya   | Landing: pilih peran guru/siswa                                    |
| `src/app/(landing)/layout.tsx`                            | ya   | Font + ikon halaman pemilihan peran                                |
| `src/app/layout.tsx`                                      | ya   | Layout global                                                      |
| `src/app/not-found.tsx`                                   | ya   | Halaman 404 global, tema halaman peran (`/`)                       |
| `src/app/not-found.test.tsx`                              | ya   | Tes halaman 404 (judul + tautan keluar)                            |
| `src/components/brand/AppHeader.tsx`                      | ya   | Kepala halaman bersama `/` dan 404                                 |
| `src/components/brand/AppFooter.tsx`                      | ya   | Kaki halaman bersama `/` dan 404                                   |
| `src/components/landing/GamePreview.tsx`                  | ya   | Jendela cuplikan game di hero halaman peran                        |
| `src/app/(landing)/page.test.tsx`                         | ya   | Test halaman pemilihan peran                                       |
| `src/app/(landing)/privasi`                               | ya   | Halaman kebijakan privasi                                          |
| `src/app/(landing)/syarat`                                | ya   | Halaman syarat & ketentuan                                         |
| `src/app/(landing)/penafian`                              | ya   | Halaman penafian AI dan skor                                       |
| `src/app/(landing)/cookie`                                | ya   | Halaman cookie dan penyimpanan lokal                               |
| `src/app/(landing)/legal.test.tsx`                        | ya   | Tes empat dokumen legal                                            |
| `src/components/legal`                                    | ya   | Kerangka halaman legal                                             |
| `src/components/legal/LegalPage.tsx`                      | ya   | Kerangka dokumen legal + navigasi                                  |
| `src/components/legal/LegalNav.tsx`                       | ya   | Navigasi antar dokumen legal                                       |
| `src/components/legal/LegalPrintButton.tsx`               | ya   | Tombol cetak dokumen legal                                         |
| `docs/02-data-model/story.example.json`                   | ya   | Cerita contoh (fixture)                                            |
| `docs/02-data-model/story.schema.json`                    | ya   | Kontrak cerita versi mesin                                         |
| `docs/02-data-model/story-schema.test.ts`                 | ya   | Tes schema vs dokumen                                              |
| `docs/docs.test.ts`                                       | ya   | Tes kerapian docs                                                  |
| `src/story/schema.ts`                                     | ya   | Tipe `Story` (bentuk mengikuti `story.schema.json`)                |
| `src/story/schema.test.ts`                                | ya   | Tes schema TypeScript vs `story.schema.json`                       |
| `src/story/validate.ts`                                   | ya   | Validator semantik                                                 |
| `src/story/validate-parts.ts`                             | ya   | `validateOutline` dan `validateChapter`                            |
| `src/story/validate-parts.test.ts`                        | ya   | Tes validasi outline dan chapter                                   |
| `src/story/scoring.ts`                                    | ya   | Penilaian jawaban, fungsi murni                                    |
| `src/story/expression.ts`                                 | ya   | Daftar ekspresi potret (tanpa dependensi)                          |
| `src/story/fallback.ts`                                   | ya   | Cerita cadangan (deterministik, selalu valid)                      |
| `src/story/cast.ts`                                       | ya   | Roster karakter tetap: nama, sprite, deskripsi, obrolan            |
| `src/assets/manifest.ts`                                  | ya   | Daftar resmi aset + `toAssetManifest()`                            |
| `src/assets/manifest.test.ts`                             | ya   | Tes id, path, tag, fallback, dan file aset                         |
| `src/assets/worldAssets.ts`                               | ya   | Entri manifest kind `world` (peta + objek desa), dibangkitkan      |
| `src/ai/provider.ts`                                      | ya   | Antarmuka `LlmProvider` + error provider                           |
| `src/ai/mock-provider.ts`                                 | ya   | Provider mock deterministik dari fixture                           |
| `src/ai/factory.ts`                                       | ya   | `createLlmProvider` dari konfigurasi env AI                        |
| `src/ai/prompt.ts`                                        | ya   | Prompt builder: outline, chapter, repair                           |
| `src/ai/prompt.test.ts`                                   | ya   | Tes kontrak prompt builder                                         |
| `src/ai/__fixtures__/outputs`                             | ya   | Fixture keluaran mock (valid, rusak, timeout)                      |
| `src/ai/pipeline.ts`                                      | ya   | Outline → generate → repair                                        |
| `src/ai/pipeline.test.ts`                                 | ya   | Tes pipeline: repair, anggaran, fallback                           |
| `src/game/config.ts`                                      | ya   | Konfigurasi Phaser (640×360, ADR 0009)                             |
| `src/game/createGame.ts`                                  | ya   | Entry `createGame(parent)`, dipanggil React                        |
| `src/game/types.ts`                                       | ya   | `GameHandle` untuk menutup instance Phaser                         |
| `src/game/scenes`                                         | ya   | `PreloadScene` (muat aset) + `GameScene` (cerita)                  |
| `src/game/sceneAssets.ts`                                 | ya   | Resolusi background/musik + daftar aset preload                    |
| `src/game/sceneAssets.test.ts`                            | ya   | Tes resolusi look dan pemilihan aset cerita                        |
| `src/game/StoryRunner.ts`                                 | ya   | State machine pemutar cerita (murni, tanpa Phaser)                 |
| `src/game/typewriter.ts`                                  | ya   | Efek ketik murni (30–40 karakter/detik)                            |
| `src/game/textbox.ts`                                     | ya   | Textbox dialog sesuai scene-format.md                              |
| `src/game/interaction.ts`                                 | ya   | Zona interaksi NPC + prompt (ADR 0008)                             |
| `src/game/world`                                          | ya   | Data dunia desa: tipe, peta, arah & animasi karakter, tabrakan     |
| `src/game/world/village.json`                             | ya   | Peta desa + objek + NPC hasil impor editor peta                    |
| `src/game/world/collision.test.ts`                        | ya   | Tes grid tabrakan sel tertutup dan kotak kaki NPC                  |
| `src/game/camera.ts`                                      | ya   | Kamera mengikuti pemain dengan dead zone di dunia desa             |
| `src/game/camera.test.ts`                                 | ya   | Tes mode kamera, dead zone, dan lerp                               |
| `src/game/constants.ts`                                   | ya   | Konstanta resolusi tanpa dependensi                                |
| `src/game/movement.ts`                                    | ya   | Gerak pemain 8 arah + tabrakan grid manual (ADR 0008)              |
| `src/game/movement.test.ts`                               | ya   | Tes arah gerak dan langkah per sumbu                               |
| `src/game/gameBus.ts`                                     | ya   | Bridge bertipe Phaser ↔ React (event + command)                    |
| `src/game/challengeView.ts`                               | ya   | Data tantangan aman untuk overlay (tanpa jawaban)                  |
| `src/game/answerLog.ts`                                   | ya   | Catatan jawaban percobaan pertama + ringkasan hasil                |
| `src/game/branching.ts`                                   | ya   | Flag cerita, varian teks, dan rencana detour jawaban salah         |
| `src/game/branching.test.ts`                              | ya   | Tes percobaan ulang, flag, dan varian teks                         |
| `src/game/demoStory.ts`                                   | ya   | Akses cerita demo untuk halaman siswa dan dev                      |
| `src/game/fixture`                                        | ya   | Cerita demo untuk pengembangan frontend game                       |
| `src/components/game/GameCanvas.tsx`                      | ya   | Host Phaser + overlay tantangan di React                           |
| `src/components/game/LoadingScreen.tsx`                   | ya   | Layar muat DOM: progres aset, batal, dan jalan keluar gagal        |
| `src/components/game/LoadingScreen.test.tsx`              | ya   | Tes layar muat: tak tentu, persen, pudar, gagal, batal             |
| `src/components/game/DialogueBox.tsx`                     | ya   | Panel dialog + potret berekspresi (DOM, ADR 0023)                  |
| `src/components/game/ChallengeOverlay.tsx`                | ya   | Overlay tantangan DOM di atas canvas                               |
| `src/components/game/EntryScreen.tsx`                     | ya   | Layar masuk: pilih nama dari daftar kelas atau nama bebas          |
| `src/components/game/EntryScreen.test.tsx`                | ya   | Tes pilih nama, pencarian, nama bebas, tautan kelas salah          |
| `src/components/game/PlayGate.tsx`                        | ya   | Gerbang `/play`: kode kelas + NIS → konfirmasi nama → game         |
| `src/components/game/PlayGate.test.tsx`                   | ya   | Tes gerbang: urutan kolom, satu/banyak game, pesan penolakan       |
| `src/components/game/GameShell.tsx`                       | ya   | Shell halaman game + state layar masuk/menu/main/hasil             |
| `src/components/game/MainMenu.tsx`                        | ya   | Menu utama `/demo` & `/play`: pilihan, audio, kredit, keluar       |
| `src/components/game/MainMenu.test.tsx`                   | ya   | Tes keyboard menu, dialog pengaturan, simpan volume                |
| `src/components/game/HUD.tsx`                             | ya   | HUD: chapter aktif, tombol suara, tombol jeda                      |
| `src/components/game/PauseMenu.tsx`                       | ya   | Menu jeda: lanjut, ulangi chapter, suara, keluar                   |
| `src/components/game/ResultScreen.tsx`                    | ya   | Layar hasil: skor, jawaban tepat, konsep lemah, status simpan      |
| `src/app/play`                                            | ya   | Halaman siswa dari cerita terbit (fallback demo)                   |
| `src/proxy.ts`                                            | ya   | Gerbang 404 `/play/<id>` sebelum halaman dirender                  |
| `src/proxy.test.ts`                                       | ya   | Tes gerbang 404 halaman siswa                                      |
| `src/server/config.ts`                                    | ya   | Konfigurasi env server (satu-satunya pembaca)                      |
| `src/server/config.test.ts`                               | ya   | Tes konfigurasi env                                                |
| `src/server/auth.ts`                                      | ya   | Auth guru: akun username+sandi, token cookie, `requireTeacher`     |
| `src/server/auth.test.ts`                                 | ya   | Tes login akun, token, cookie, dan sesi guru                       |
| `src/server/password.ts`                                  | ya   | Hash scrypt password guru/siswa                                    |
| `src/server/password.test.ts`                             | ya   | Tes hash, verifikasi, dan hash rusak                               |
| `src/server/contracts.ts`                                 | ya   | Kontrak tipe bersama server ↔ client                               |
| `src/server/stories`                                      | ya   | Logika inti manajemen cerita guru                                  |
| `src/server/stories/core.ts`                              | ya   | Logika inti manajemen cerita guru                                  |
| `src/server/stories/core.test.ts`                         | ya   | Tes logika inti cerita                                             |
| `src/server/stories/playable.ts`                          | ya   | Cerita yang boleh dimainkan (terbit + demo)                        |
| `src/server/stories/playable.test.ts`                     | ya   | Tes sumber cerita halaman siswa                                    |
| `src/server/play`                                         | ya   | Data layar masuk siswa (cerita + kelas + daftar siswa)             |
| `src/server/play/entry.ts`                                | ya   | `getPlayEntry`: validasi kode kelas milik guru cerita              |
| `src/server/play/entry.test.ts`                           | ya   | Tes tautan kelas sah/salah/bukan milik guru                        |
| `src/server/play/join.ts`                                 | ya   | Gerbang `/play`: kode → kelas → game terbit → identitas pemain     |
| `src/server/play/join.test.ts`                            | ya   | Tes kode kelas, pilihan game, dan pencocokan nama siswa            |
| `src/server/analytics`                                    | ya   | Agregat hasil main per kelas + game (`/guru/analitik`)             |
| `src/server/analytics/core.ts`                            | ya   | `getClassroomAnalytics`: poin terbaik, percobaan, konsep lemah     |
| `src/server/analytics/core.test.ts`                       | ya   | Tes agregasi analytics (libSQL in-memory)                          |
| `src/server/classrooms`                                   | ya   | Logika inti kelas dan siswa (`/guru/kelas`)                        |
| `src/server/classrooms/core.ts`                           | ya   | Query/validasi kelas, tambah siswa, NIS otomatis                   |
| `src/server/classrooms/core.test.ts`                      | ya   | Tes kelas/siswa (libSQL in-memory)                                 |
| `src/server/play-results`                                 | ya   | Modul penyimpanan hasil bermain siswa                              |
| `src/server/play-results/save.ts`                         | ya   | Validasi, scoring, dan simpan hasil bermain                        |
| `src/server/play-results/save.test.ts`                    | ya   | Tes simpan hasil bermain                                           |
| `src/app/guru`                                            | ya   | Halaman guru dan Server Actions                                    |
| `src/app/guru/actions.ts`                                 | ya   | Server Actions mutasi cerita guru                                  |
| `src/app/guru/actions.test.ts`                            | ya   | Tes Server Actions guru                                            |
| `src/app/guru/layout.tsx`                                 | ya   | Font portal guru, toast, ikon Font Awesome                         |
| `src/app/guru/masuk/page.tsx`                             | ya   | Halaman masuk guru (`POST /api/auth/login`)                        |
| `src/app/guru/masuk/page.test.tsx`                        | ya   | Tes panel brand halaman masuk (langkah + larangan janji fitur)     |
| `src/app/guru/(portal)/layout.tsx`                        | ya   | Pembungkus `PortalShell` + gerbang `requireTeacher()`              |
| `src/app/guru/(portal)/template.tsx`                      | ya   | Animasi masuk halaman portal (diputar ulang tiap navigasi)         |
| `src/app/guru/(portal)/loading.tsx`                       | ya   | Kerangka navigasi `/guru` (segmen lain punya file serupa)          |
| `src/app/guru/(portal)/motion.test.ts`                    | ya   | Penjaga aturan gerak CSS portal + kerangka `guru-skeleton`         |
| `src/app/guru/(portal)/error.tsx`                         | ya   | Batas error segmen portal (pesan ramah, tanpa detail)              |
| `src/app/guru/(portal)/page.tsx`                          | ya   | Dashboard guru dari `listStories`                                  |
| `src/app/guru/(portal)/materi/page.tsx`                   | ya   | Daftar materi + penyaring dari `listStories`                       |
| `src/app/guru/(portal)/materi/baru/page.tsx`              | ya   | AI Studio: unggah PDF lewat `POST /api/upload`                     |
| `src/app/guru/(portal)/materi/[storyId]/page.tsx`         | ya   | Detail materi: status job, ringkasan, aksi cerita                  |
| `src/app/guru/(portal)/materi/[storyId]/loading.tsx`      | ya   | Kerangka `MateriDetailSkeleton` untuk halaman detail               |
| `src/app/guru/(portal)/materi/[storyId]/edit/page.tsx`    | ya   | Halaman story editor (data awal + `StoryEditor`)                   |
| `src/app/guru/(portal)/materi/[storyId]/edit/loading.tsx` | ya   | Kerangka `EditorSkeleton` untuk halaman editor                     |
| `src/app/guru/(portal)/kelas/page.tsx`                    | ya   | Daftar & detail kelas dari `listClassrooms`                        |
| `src/app/guru/(portal)/kelas/actions.ts`                  | ya   | Server Action `createClassroom` / `addStudent`                     |
| `src/app/guru/(portal)/game/page.tsx`                     | ya   | Koleksi game guru dari `listStories`                               |
| `src/app/guru/(portal)/analitik/page.tsx`                 | ya   | Analytics per kelas + game dari `getClassroomAnalytics`            |
| `src/app/guru/(portal)/analitik/loading.tsx`              | ya   | Kerangka `AnalyticsSkeleton`                                       |
| `src/components/guru`                                     | ya   | Komponen client portal guru                                        |
| `src/components/guru/data.ts`                             | ya   | Hiasan gamifikasi guru (level/XP/gold) + pilihan jenjang           |
| `src/components/guru/logic.ts`                            | ya   | Logika murni portal (filter, format, validasi berkas)              |
| `src/components/guru/SelectMenu.tsx`                      | ya   | Dropdown custom bertema (pengganti `<select>`)                     |
| `src/components/guru/YearPicker.tsx`                      | ya   | Pemilih tahun ajaran `YYYY/YYYY`                                   |
| `src/lib/academic-year.ts`                                | ya   | Validasi/normalisasi tahun ajaran (dipakai client + server)        |
| `src/components/guru/logic.test.ts`                       | ya   | Tes logika murni portal guru                                       |
| `src/components/guru/skeletons.tsx`                       | ya   | Kerangka loading bersama untuk `loading.tsx` + `Suspense`          |
| `src/components/guru/StoryEditor.tsx`                     | ya   | Editor cerita: state, undo/redo, simpan, konflik versi             |
| `src/components/guru/StoryEditor.test.tsx`                | ya   | Tes editor: simpan, undo, validasi, konflik versi                  |
| `src/components/guru/storyEditorState.ts`                 | ya   | Logika murni editor (mutasi cerita, `assetUsage`, lokasi isu)      |
| `src/components/guru/storyEditorState.test.ts`            | ya   | Tes logika murni editor                                            |
| `src/components/guru/EditorSidebar.tsx`                   | ya   | Pohon chapter → scene + badge jumlah masalah                       |
| `src/components/guru/StoryMetaPanel.tsx`                  | ya   | Panel pengaturan cerita (judul, sinopsis, mode)                    |
| `src/components/guru/SceneEditor.tsx`                     | ya   | Panel isi chapter + scene + daftar beat                            |
| `src/components/guru/BeatCard.tsx`                        | ya   | Kartu satu beat (narasi, dialog, soal, transisi)                   |
| `src/components/guru/ChallengeForm.tsx`                   | ya   | Form soal per tipe (pilihan ganda, B/S, urutan, singkat)           |
| `src/components/guru/EditorField.tsx`                     | ya   | Kendali kecil bersama (field, hitungan karakter, tombol)           |
| `src/components/guru/ValidationPanel.tsx`                 | ya   | Panel hasil validasi + lompat ke lokasi masalah                    |
| `src/components/guru/GenerationProgress.tsx`              | ya   | Polling `GET /api/jobs/[jobId]` per tahap                          |
| `src/components/guru/StoryActions.tsx`                    | ya   | Aksi bagikan/arsip/hapus cerita lewat Server Action                |
| `src/components/guru/ShareGameDialog.tsx`                 | ya   | Dialog tautan per kelas (`?kelas=QST-XXXX`) + tombol salin         |
| `src/components/guru/ShareGameDialog.test.tsx`            | ya   | Tes tautan per kelas dan keadaan tanpa kelas                       |
| `src/components/guru/AnalyticsBrowser.tsx`                | ya   | Penyaring kelas/game + tabel poin dan konsep lemah per siswa       |
| `src/components/guru/AnalyticsBrowser.test.tsx`           | ya   | Tes penyaring query string dan tabel analytics                     |
| `src/app/play/actions.ts`                                 | ya   | Server Action simpan hasil bermain                                 |
| `src/app/play/actions.test.ts`                            | ya   | Tes Action hasil bermain                                           |
| `src/app/play/page.tsx`                                   | ya   | Route `/play`: gerbang kode kelas (tanpa `storyId`)                |
| `src/app/play/join-actions.ts`                            | ya   | Server Action `masukKelas`: kode kelas + NIS → game                |
| `src/app/play/join-actions.test.ts`                       | ya   | Tes Action gerbang: rate limit, input rusak, dan hasil             |
| `src/app/api`                                             | ya   | Route handler                                                      |
| `src/app/api/health/route.ts`                             | ya   | `GET /api/health`: cek hidup + versi build                         |
| `src/app/api/health/route.test.ts`                        | ya   | Tes kontrak respons health                                         |
| `src/app/api/stories/[storyId]/route.ts`                  | ya   | `GET /api/stories/[storyId]`: cerita versi terbit                  |
| `src/app/api/stories/[storyId]/route.test.ts`             | ya   | Tes endpoint cerita publik                                         |
| `src/app/api/upload/route.ts`                             | ya   | `POST /api/upload`: validasi PDF + buat story & job                |
| `src/app/api/upload/route.test.ts`                        | ya   | Tes route upload (libSQL in-memory)                                |
| `src/server/api-error.ts`                                 | ya   | Helper respons error bentuk `ApiError`                             |
| `src/server/jobs/run.ts`                                  | ya   | Job runner: ekstraksi → pipeline → simpan versi                    |
| `src/server/jobs/run.test.ts`                             | ya   | Tes job runner (libSQL in-memory, provider mock)                   |
| `src/server/jobs/schedule.ts`                             | ya   | `scheduleJob()`: jalankan runner lewat `after()`                   |
| `src/server/jobs/schedule.test.ts`                        | ya   | Tes penjadwalan `after()` dan penanganan kegagalan                 |
| `src/server/jobs/status.ts`                               | ya   | Status job untuk polling + `getLatestJobId`                        |
| `src/server/jobs/status.test.ts`                          | ya   | Tes pencarian job terbaru milik guru                               |
| `public/assets`                                           | ya   | File aset game (`assets:generate` + `assets:world`)                |
| `public/brand`                                            | ya   | Logo + ikon brand (bukan aset game, tanpa id manifest)             |
| `public/menu`                                             | ya   | Latar menu utama + rekaman hero `/` (dekoratif, tanpa id manifest) |
| `src/app/favicon.ico`                                     | ya   | Favicon 16/32/48 px dari ikon brand                                |
| `src/app/icon.png`                                        | ya   | Ikon aplikasi 192×192                                              |
| `src/app/apple-icon.png`                                  | ya   | `apple-touch-icon` 192×192                                         |
| `scripts/generate-assets.mjs`                             | ya   | Generator aset pixel + audio, tanpa dependensi                     |
| `scripts/import-world.mjs`                                | ya   | Impor peta desa dari editor + tulis `worldAssets.ts`               |
| `scripts/import-portraits.mjs`                            | ya   | Susun enam potret dialog per karakter ke `public/`                 |
| `scripts/dev-publish.ts`                                  | ya   | Script dev penerbit cerita                                         |

## Struktur target

Dibuat bertahap. Jangan membuat folder kosong hanya demi "rapi"; buat saat ada
isi pertamanya.

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── (landing)/
│   │   ├── layout.tsx                 # font + ikon halaman pemilihan peran
│   │   └── page.tsx                   # landing: pilih peran (guru/siswa)
│   ├── guru/
│   │   ├── layout.tsx                 # font + toast portal guru
│   │   ├── masuk/page.tsx             # login akun guru
│   │   ├── (portal)/                  # route group: semua halaman bersidebar
│   │   │   ├── layout.tsx             # PortalShell (sidebar + header)
│   │   │   ├── page.tsx               # dashboard
│   │   │   ├── materi/
│   │   │   │   ├── page.tsx           # daftar materi
│   │   │   │   ├── baru/page.tsx      # AI Studio
│   │   │   │   └── [storyId]/
│   │   │   │       ├── page.tsx       # status + ringkasan
│   │   │   │       ├── loading.tsx    # kerangka detail materi
│   │   │   │       └── edit/
│   │   │   │           ├── page.tsx   # story editor
│   │   │   │           └── loading.tsx # kerangka editor
│   │   │   ├── kelas/page.tsx         # daftar & detail kelas
│   │   │   └── game/page.tsx          # koleksi game
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
│       ├── MainMenu.tsx               # menu utama sebelum game dimulai (/demo & /play)
│       ├── GameCanvas.tsx             # host Phaser (client-only)
│       ├── ChallengeOverlay.tsx
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
│   ├── db/                            # client libSQL + migrasi + getReadyDb
│   ├── auth.ts                        # akun guru + token sesi + requireTeacher
│   ├── stories/                       # query/mutation cerita + versi
│   ├── jobs/                          # status job + penjadwalan job
│   ├── classrooms/                    # kelas & siswa
│   ├── play-results/                  # simpan hasil bermain siswa
│   ├── rate-limit/                    # batas per IP/guru/global
│   ├── upload/                        # validasi PDF di memori
│   └── config.ts                      # satu-satunya pembaca environment
│
└── lib/
    ├── academic-year.ts               # normalisasi tahun ajaran (YYYY/YYYY)
    └── academic-year.test.ts
```

Pembaca environment ada di `src/server/config.ts`; `src/lib` hanya menampung
utilitas murni tanpa I/O.

## Konvensi

### Penamaan file

| Jenis              | Konvensi               | Contoh                 |
| ------------------ | ---------------------- | ---------------------- |
| Komponen React     | `PascalCase.tsx`       | `ChallengeOverlay.tsx` |
| Modul non-komponen | `kebab-case.ts`        | `story-runner.ts`      |
| Route (Next)       | `kebab-case` folder    | `materi/baru`          |
| Tipe/interface     | `PascalCase`           | `Story`, `Challenge`   |
| Konstanta          | `SCREAMING_SNAKE_CASE` | `MAX_PDF_BYTES`        |
| Aset               | `snake_case` + prefix  | `char_npc_1.png`       |
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
- Path langsung di kode game dianggap bug (kecuali di `PreloadScene`).
- Satu pengecualian: `public/menu/desa.webp`, latar layar menu utama. Ia gambar
  dekoratif yang tidak pernah dipilih cerita, jadi sengaja **di luar**
  `public/assets/` supaya tidak perlu entri manifest. Alasan yang sama berlaku
  untuk `public/menu/hero_loop.mp4` (rekaman hero `/`).

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
