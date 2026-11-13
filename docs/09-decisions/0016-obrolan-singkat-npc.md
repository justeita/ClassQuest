---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0016 — Obrolan Singkat NPC di Luar Perannya

- **Status:** Accepted
- **Tanggal:** 2026-11-13
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (memperluas ADR 0008, tidak membatalkannya)

## Konteks

Fase `explore` (ADR 0008) hanya mengizinkan **NPC pemberi quest** memunculkan
prompt dan memulai deretan beat scene. NPC lain berdiri sebagai penghalang tanpa
reaksi apa pun. Di demo, siswa mencoba menyapa semua warga desa, tetapi hanya satu
NPC per scene yang menjawab — dunia terasa seperti potongan panggung, bukan desa.

Kebutuhan nyatanya kecil: NPC yang bukan peran di chapter tertentu cukup
mengucapkan **satu kalimat** saat diajak bicara, lalu pemain bebas berjalan lagi.
Tidak perlu cabang dialog, tidak perlu mengubah urutan cerita.

Batasan yang mengikat:

- Cerita demo (`docs/02-data-model/story.example.json`,
  `src/game/fixture/demo-story.json`) nanti diganti JSON asli hasil halaman guru.
  Jadi teks obrolan **harus hidup di data cerita**, bukan di kode game.
- `characterSchema` memakai `strictObject` dan `story.schema.json` memakai
  `additionalProperties: false`. Tanpa field baru, tidak ada tempat sah untuk
  menyimpan teks itu.
- Pipeline AI tidak boleh dipaksa mengisi field baru; cerita lama dan hasil
  generator harus tetap valid.

## Opsi

| Opsi                                        | Kelebihan                                                 | Kekurangan                                                       |
| ------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| A. Tulis kalimat NPC langsung di kode game  | Cepat; tidak menyentuh kontrak                            | Hilang saat story demo diganti; tidak bisa diedit guru           |
| **B. Field opsional `smallTalk` di `cast`** | Ikut data cerita; opsional; dipakai engine yang sudah ada | Kontrak berubah; perlu ADR + schema + validator + docs           |
| C. Tambah scene/beat dialog di luar alur    | Memakai bentuk beat yang sudah ada                        | Mengaburkan arti scene; runner harus belajar "beat di luar alur" |

Opsi C terlihat murah, tetapi membuat `StoryRunner` punya dua jenis deretan beat
dan membingungkan editor guru. Opsi A melanggar aturan bahwa cerita adalah data.

## Keputusan

**Kami memilih opsi B: field opsional `smallTalk` pada tiap karakter `cast`.**

Aturan bentuknya:

- `smallTalk?: string`, 1–240 karakter, satu kalimat pendek. Opsional: karakter
  tanpa field ini tetap diam dan **tidak** memunculkan prompt.
- Di fase `explore`, NPC dengan `smallTalk` yang bukan pemberi quest scene aktif
  memunculkan kotak `Space` yang gayanya sama dengan pemberi quest, tetapi
  muncul sebagai pop-up (`animate-quest-pop`) karena tidak ada penanda `!` untuk
  ditempeli. Menekannya menampilkan satu baris itu di textbox (nama + portrait
  karakter), lalu textbox ditutup dengan Space/klik.
- Obrolan **tidak menyentuh `StoryRunner`**: fase tetap `explore`, posisi cerita
  tidak bergeser, dan baris itu tetap masuk log dialog.
- Pemberi quest tetap memprioritaskan deretan beat scene-nya. `smallTalk` hanya
  dipakai saat karakter itu tidak sedang memegang quest.

Alasan:

1. Satu-satunya tempat yang benar untuk teks cerita adalah data cerita; demo yang
   nanti dihapus tidak boleh membawa logika khusus.
2. Opsional, jadi generator AI dan cerita lama tetap valid tanpa perubahan.
3. Tidak menambah fase `StoryRunner`; presentasi memakai textbox dan portrait
   yang sudah ada.

## Konsekuensi

**Positif:**

- Dunia terasa hidup: setiap warga bisa disapa, bukan hanya pemberi quest.
- Guru bisa mengisi atau mengosongkan obrolan lewat data yang sama dengan cerita.
- Aturan "prompt hanya muncul bila ada yang bisa dikatakan" tetap dipegang.

**Negatif / utang:**

- Satu baris per karakter, bukan per chapter. NPC yang sama mengucapkan kalimat
  yang sama di semua scene sampai data punya bentuk per-chapter.
- Belum ada form editor untuk `smallTalk`; untuk sekarang diisi lewat JSON.
- Cerita hasil generator tidak akan punya obrolan sampai prompt diubah. Itu
  disengaja: fitur ini melengkapi, bukan menggantikan alur utama.

**Yang harus diubah:**

- [`../02-data-model/story.schema.json`](../02-data-model/story.schema.json) dan
  `src/story/schema.ts` (pasangan zod-nya), beserta drift guard.
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md) dan
  [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md).
- `src/story/validate.ts` (normalisasi) dan fixture cerita contoh + demo.
- `src/game/npcTalk.ts`, `src/game/scenes/GameScene.ts`, dan tesnya.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md),
  [`../04-game/engine.md`](../04-game/engine.md),
  [`../04-game/scene-format.md`](../04-game/scene-format.md), dan
  [`../04-game/game-design.md`](../04-game/game-design.md).

## Kapan keputusan ini ditinjau ulang

- Jika guru butuh obrolan berbeda per chapter: naikkan bentuknya menjadi peta
  `chapterId → teks` lewat ADR baru.
- Jika editor cerita sudah ada dan field ini perlu form khusus.
- Jika pipeline AI mulai mengisi `smallTalk`, aturan panjang dan nadanya harus
  masuk ke prompt.

## Referensi

- [`0002-story-json-as-contract.md`](0002-story-json-as-contract.md) — cerita
  adalah data, bukan kode
- [`0007-hybrid-ui.md`](0007-hybrid-ui.md) — textbox Phaser + teks DOM
- [`0008-top-down-movement.md`](0008-top-down-movement.md) — fase `explore` dan
  zona interaksi
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md) — perilaku
  runtime yang diperbarui
