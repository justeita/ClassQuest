---
status: draft
last_reviewed: 2026-11-09
owner: tim ClassQuest
---

# Format Scene (Cerita → Runtime)

Dokumen ini menjelaskan bagaimana `Story` (JSON) dipetakan menjadi tampilan game.
Ini menjembatani [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
dan [`engine.md`](./engine.md).

## Ringkasan mapping

| Story                   | Runtime                                            |
| ----------------------- | -------------------------------------------------- |
| `chapters[]`            | Urutan chapter; satu chapter = satu "bab" gameplay |
| `scenes[]`              | Satu background + satu musik + deretan beat        |
| `beats[]`               | Satu langkah dialog atau satu tantangan            |
| `cast[]`                | Sprite yang bisa muncul + portrait                 |
| `challenges[]`          | Overlay React, dipanggil dari beat `challenge`     |
| `backgroundId` chapter  | Default background untuk semua scene di chapter    |
| `backgroundId` scene    | Override background chapter                        |
| `musicId` chapter/scene | Sama, override berlaku                             |

## Resolusi nilai

Nilai efektif dihitung sekali saat chapter dimulai, bukan tiap beat:

```ts
export function resolveSceneLook(chapter: Chapter, scene: Scene | null) {
  return {
    backgroundId: scene?.backgroundId ?? chapter.backgroundId ?? "bg_default",
    musicId: scene?.musicId ?? chapter.musicId ?? "bgm_default",
  };
}
```

Modul nyata ada di `src/game/sceneAssets.ts`; di sana juga ada
`collectStoryAssets(story)` yang mengumpulkan aset dipakai cerita untuk preload.

Aturan:

- `bg_default`/`bgm_default` **hanya** dipakai kalau aset yang diminta gagal
  dimuat. Kalau id tidak ada di manifest, itu bug validasi — jangan diam-diam
  mengganti.
- Ganti musik hanya bila `musicId` berbeda dari scene sebelumnya. Jangan restart
  track yang sama.

## Preload

`PreloadScene` tidak memuat seluruh manifest. `collectStoryAssets(story)`
mengambil hanya:

- background chapter + override scene + `bg_default`;
- musik chapter + override scene + `bgm_default`;
- `spriteId` setiap `cast` (spritesheet 24×32, 10 frame idle+jalan) beserta portrait-nya;
- aset UI (`ui_textbox`, `ui_portrait_frame`, `ui_default`) dan SFX
  (`sfx_click`, `sfx_page`, `sfx_correct`, `sfx_wrong`).

Semua key loader memakai `id` manifest, jadi scene tidak menebak path file.

## Ruangan dan eksplorasi (ADR 0008)

Per ADR 0008, scene dirender sebagai **ruangan satu layar** yang bisa dijelajahi:

- Scene dibuka dalam fase `explore`: pemain spawn di titik tetap, lalu bergerak
  4 arah (`W`/`A`/`S`/`D`, panah) dengan collision.
- Data map — lantai, dinding, penempatan NPC, spawn, zona interaksi —
  didefinisikan **di sisi game** (`src/game/`, map dummy per scene) dan **tidak
  mengubah kontrak Story JSON**. Struktur datanya dibuat supaya nanti bisa
  diganti tileset nyata tanpa refactor.
- Map dummy menyimpan lantai/dinding/spawn/zona; Sprite karakter memakai
  `spriteId` dari `cast` (spritesheet 24×32) dan background dari
  `backgroundId`. Bila texture tidak ada, runtime jatuh ke `char_default` /
  `bg_default` tanpa menghentikan permainan.
- Collision: dinding keliling ruangan + objek padat; arcade physics gravity 0
  (sudah diset di `config.ts`). Collider dibangun dari data objek yang sama
  yang digambar (ADR 0010) — tidak ada collider terpisah dari visual.
- NPC/objek interaksi punya zona kecil. Pemain di dalam zona → indikator
  interaksi muncul → `Space`/`Enter` memutar deretan beat scene itu (fase
  `dialog`); gerak terkunci sampai deretan beat habis.

## Peta visual

Resolusi 640×360 (ADR 0009). Layout di bawah berlaku saat fase `dialog`
(textbox terbuka); saat fase `explore`, textbox tersembunyi dan karakter bebas
bergerak. Posisi dalam piksel:

```text
┌──────────────────────────────────────────────────────┐ 640×360
│                                                  │
│                BACKGROUND (full)                 │
│                                                  │
│     ┌──────┐                                     │
│     │SPRITE│  ← karakter aktif, kiri bawah       │
│     │24×32 │                                     │
│     └──────┘                                     │
│ ┌──────────────────────────────────────────────┐ │
│ │ TEXTBOX (ui_textbox)                         │ │
│ │ Nama                                         │ │
│ │ Teks dialog...                               │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

| Elemen     | Posisi/ukuran                                              |
| ---------- | ---------------------------------------------------------- |
| Background | `0,0`, 640×360, `setOrigin(0)`                             |
| Sprite     | `x=48`, `y=240`, origin bottom-left (kaki di atas textbox) |
| Portrait   | Opsional, di atas textbox, 64×64                           |
| Textbox    | `x=16`, `y=240`, lebar 608, tinggi 104                     |
| Nama       | Di dalam textbox, baris pertama (DOM)                      |
| Teks       | Maks 3 baris per halaman, ~60 karakter/baris (DOM)         |
| Indikator  | Panah kecil berkedip di kanan bawah saat menunggu (DOM)    |

> **Panel di Phaser, teks di DOM (ADR 0007).** Phaser hanya menggambar
> `ui_textbox`, bingkai portrait, dan portrait-nya. Nama, isi dialog, dan
> indikator "lanjut" dirender `DialogueBox.tsx` di lapisan DOM dengan posisi
> persen dari `src/game/layout.ts`, sehingga huruf tajam di layar. Prompt
> interaksi `Space` juga DOM (`InteractHint.tsx`). Jangan menambah teks game
> baru di canvas: canvas 640×360 di-upscale `pixelated`, jadi semua huruf di
> dalamnya bergerigi.

Beginilah hasilnya di layar:

![Layar dialog: ruang kelas, dua karakter, textbox di bawah](../assets/game-screen.svg)

> Gambar di atas digambar pada kanvas 320×180 lalu diperbesar agar tajam di
> layar. Yang berlaku untuk aset dan kode adalah angka di tabel: 640×360.

Batas keras **240 karakter per beat** berasal dari schema. Satu halaman textbox
hanya memuat 3 baris × ~60 karakter ≈ 180 karakter, jadi beat yang lebih panjang
ditampilkan sebagai **dua halaman**: siswa menekan lanjut sekali lagi sebelum beat
berikutnya. Dengan begitu tidak ada teks yang terpotong, dan angka 240 di
validator tetap punya alasan. Kalau kamu mengubah ukuran textbox, hitung ulang
kedua angka itu.

## Siklus beat

```mermaid
flowchart TD
  S["Scene mulai"] --> A["Set background"]
  A --> B["Set musik<br/>(hanya jika berubah)"]
  B --> X["Fase explore:<br/>pemain jalan bebas"]
  X --> D0["Interaksi NPC<br/>Space/Enter di zona"]
  D0 --> C["beatIndex = 0"]
  C --> D["Tampilkan beat"]
  D --> E{"Jenis beat?"}
  E -- "narration" --> F["Textbox tanpa nama"]
  E -- "dialogue" --> G["Textbox + nama + sorot sprite"]
  E -- "challenge" --> H["Pause dialog<br/>kirim event challenge"]
  E -- "transition" --> I["Fade / cut"]
  F --> J["Tunggu advance"]
  G --> J
  H --> K["Tunggu jawaban dinilai"]
  K --> J
  I --> J
  J --> L["beatIndex++"]
  L --> M{"Beat habis?"}
  M -- "belum" --> D
  M -- "ya" --> N["Scene selesai"]
  N --> O{"Scene berikutnya<br/>di chapter ini?"}
  O -- "ada" --> S
  O -- "habis" --> P["Chapter selesai"]
```

Perhatikan dua hal: `transition` **tidak** menunggu klik (ia hanya menunggu
animasi selesai), dan `challenge` menunggu `resolve_challenge`, bukan `advance`.
Scene **tidak** kembali ke `explore` di tengah deretan beat — eksplorasi hanya
terjadi sebelum beat pertama scene.

## Menampilkan beat

### `narration`

- Textbox tanpa nama.
- Sprite karakter sebelumnya **tetap** tampil (kecuali scene berganti).
- Tidak ada portrait.

### `dialogue`

- Textbox dengan nama karakter (`cast.name`, bukan `id`).
- Sprite speaker disorot: `setTint(0xffffff)` untuk yang bicara, `setTint(0x9a9a9a)`
  untuk yang tidak. **Ingat:** `setTintFill()` sudah dihapus di Phaser 4.
- Portrait ditampilkan bila entri manifest karakter punya `portraitPath`.

### `challenge`

![Overlay tantangan di atas dunia yang diredupkan](../assets/challenge-overlay.svg)

- Dialog **dipause**, bukan ditutup. Setelah dijawab, dialog kembali.
- Event `challenge` dikirim ke React dengan `challengeId`.
- Phaser menunggu perintah `resolve_challenge` sebelum lanjut.

### `transition`

- `effect: "fade"` → kamera fade out/in 300 ms.
- `effect: "cut"` → langsung ganti.
- `text` opsional ditampilkan sebagai kartu singkat (mis. "Keesokan pagi").
- Tidak boleh menjadi beat terakhir scene (sudah divalidasi).

## Typewriter

- Kecepatan 30–40 karakter/detik.
- Klik/Spasi saat mengetik → tampilkan seluruh teks (bukan lanjut beat).
- Klik/Spasi saat selesai → lanjut beat.
- Teks harus di-`setText` utuh, bukan per karakter dengan `Text` baru; gunakan
  counter dan `setText(text.slice(0, n))` — cukup untuk 240 karakter.

## Perpindahan scene dan chapter

| Peristiwa         | Visual                                                 |
| ----------------- | ------------------------------------------------------ |
| Scene → scene     | Fade 300 ms; musik lanjut bila sama                    |
| Chapter → chapter | Fade + kartu judul chapter (1,5 detik), musik berganti |
| Chapter terakhir  | Fade ke layar hasil (React)                            |

Kartu judul chapter diambil dari `chapter.title` dan `chapter.concept`.

## Contoh lengkap

Story: [`../02-data-model/story.example.json`](../02-data-model/story.example.json)

Chapter 1, scene `sc_01_02`:

```json
{
  "id": "sc_01_02",
  "title": "Uap yang Tak Terlihat",
  "beats": [
    {
      "type": "dialogue",
      "speakerId": "char_pak_bima",
      "text": "Air bisa berubah wujud. Saat dipanaskan matahari, air menjadi uap yang tidak terlihat."
    },
    { "type": "challenge", "challengeId": "chl_01_01" },
    {
      "type": "dialogue",
      "speakerId": "char_tirta",
      "text": "Aku uap yang baru lepas dari genangan itu. Ringan sekali, sampai aku bisa naik."
    },
    {
      "type": "narration",
      "text": "Nara mengikuti arah naiknya uap, meski matanya tidak bisa melihat apa pun."
    }
  ]
}
```

Yang terjadi:

1. Background tetap `bg_classroom_day` (dari chapter).
2. Ruangan `sc_01_02` dibuka dalam fase `explore`: Nara berjalan bebas.
3. Pemain mendekati Pak Bima (zona interaksi dari map dummy) → `Space`/`Enter`.
4. Pak Bima tampil, textbox berisi nama + kalimat.
5. Klik → beat tantangan → dialog pause, overlay `chl_01_01` muncul.
6. Siswa menjawab → feedback + penjelasan → overlay tertutup.
7. Tirta muncul (sprite `char_tirta`), dialog.
8. Narasi tanpa nama.
9. Scene selesai → `sc_01_03`.

## Data yang dikirim ke React

Jangan kirim seluruh `Story` ke overlay. Kirim yang perlu saja:

```ts
type ChallengeView = {
  id: string;
  type: ChallengeType;
  prompt: string;
  conceptTag: string;
  options?: { id: string; text: string }[];
  statement?: string;
  items?: { id: string; text: string }[];
  hints?: string[];
};
```

**Jangan** kirim `correctOptionId`, `correctAnswer`, `correctOrder`, atau
`acceptedAnswers` ke komponen presentasional. Penilaian dilakukan di modul yang
memegang `Story`, lalu hasil boolean dikirim ke UI.

> Catatan jujur: jawaban tetap ada di bundle karena game dinilai di client. Ini
> batasan MVP yang diterima (lihat
> [`../01-architecture/security-and-privacy.md`](../01-architecture/security-and-privacy.md)).
> Yang penting: jangan menampilkannya di DOM/atribut.

## Kesalahan mapping yang harus dihindari

| Kesalahan                               | Akibat                            |
| --------------------------------------- | --------------------------------- |
| Memakai `chapter.backgroundId` langsung | Override scene diabaikan          |
| Restart musik tiap scene                | Musik terasa terpotong            |
| Menutup textbox saat tantangan          | Dialog kehilangan konteks         |
| Mengirim jawaban benar ke komponen UI   | Jawaban bocor di DOM              |
| Membuat `Text` baru tiap karakter       | FPS turun, memori naik            |
| Memakai indeks array sebagai id         | Progress rusak saat cerita diedit |
