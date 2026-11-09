---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Asset Manifest

Manifest adalah **daftar resmi aset** yang boleh dipakai cerita. AI tidak boleh
mengarang `assetId`. Validator menolak id yang tidak ada di sini.

- Sumber kebenaran: `src/assets/manifest.ts` (rencana)
- Daftar aset untuk manusia: [`../07-assets/inventory.md`](../07-assets/inventory.md)
- Keputusan: [ADR 0003](../09-decisions/0003-fixed-asset-library.md)

## Satu tabel aset saja

Ada dua hal berbeda yang sering tertukar:

| Yang kamu cari                          | Buka                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| Daftar lengkap aset + status pengerjaan | [`../07-assets/inventory.md`](../07-assets/inventory.md) |
| Bentuk kode manifest (`AssetEntry`)     | dokumen ini                                              |

Dokumen ini **tidak** memuat daftar aset. Daftar aset hanya ada di
`inventory.md`, supaya tidak ada dua tabel yang harus disinkronkan tangan. Kalau
kamu menambah aset, tambahkan di satu tempat itu.

Sumber kebenaran untuk kode tetap `src/assets/manifest.ts` (rencana). Urutannya:
`manifest.ts` menang atas `inventory.md`, dan `inventory.md` harus diperbarui
kalau berbeda.

## Bentuk manifest

```ts
export type AssetKind =
  "background" | "character" | "tile" | "prop" | "music" | "sfx" | "ui";

export type AssetEntry = {
  id: string; // mis. "bg_classroom_day"
  kind: AssetKind;
  path: string; // relatif terhadap /public, mis. "/assets/bg/classroom_day.png"
  label: string; // nama yang dilihat guru di editor, mis. "Kelas, siang"
  tags: string[]; // kata kunci untuk pemilihan oleh AI
  width?: number;
  height?: number;
  portraitPath?: string; // hanya untuk kind "character"
};

export const ASSETS: readonly AssetEntry[] = [
  {
    id: "bg_classroom_day",
    kind: "background",
    path: "/assets/bg/classroom_day.png",
    label: "Kelas, siang",
    tags: ["kelas", "sekolah", "belajar", "siang", "indoor", "classroom"],
    width: 480,
    height: 270,
  },
  // ...
] as const satisfies readonly AssetEntry[];

export const ASSETS_BY_ID = new Map(ASSETS.map((a) => [a.id, a]));
export const BACKGROUNDS = ASSETS.filter((a) => a.kind === "background");
export const CHARACTERS = ASSETS.filter((a) => a.kind === "character");
export const MUSIC = ASSETS.filter((a) => a.kind === "music");
```

Manifest **statis dan tanpa dependensi** — boleh diimpor validator, prompt builder,
editor, dan game.

## Aturan id

| Kind         | Prefix  | Contoh             |
| ------------ | ------- | ------------------ |
| `background` | `bg_`   | `bg_classroom_day` |
| `character`  | `char_` | `char_pak_bima`    |
| `tile`       | `tile_` | `tile_floor_wood`  |
| `prop`       | `prop_` | `prop_desk`        |
| `music`      | `bgm_`  | `bgm_school_calm`  |
| `sfx`        | `sfx_`  | `sfx_correct`      |
| `ui`         | `ui_`   | `ui_textbox`       |

- `id` unik, `snake_case`, hanya `[a-z0-9_]`.
- `id` **tidak boleh berubah** setelah dipakai cerita. Ganti file boleh, ganti id
  tidak (kecuali migrasi cerita).
- `path` unik dan harus benar-benar ada di `public/`.
- `portraitPath` hanya boleh ada untuk kind `character`, dan filenya harus ada.

## Aset fallback

Selalu ada fallback per kind, supaya game tidak pernah crash:

| Kind         | Fallback         |
| ------------ | ---------------- |
| `background` | `bg_default`     |
| `character`  | `char_default`   |
| `tile`       | `tile_default`   |
| `prop`       | `prop_default`   |
| `music`      | `bgm_default`    |
| `sfx`        | — (boleh senyap) |
| `ui`         | `ui_default`     |

Validator **tidak** membiarkan AI memakai fallback sebagai pilihan utama. Fallback
hanya dipakai runtime bila file gagal dimuat.

## Cara AI memilih aset

AI tidak melihat gambar. Ia memilih berdasarkan `tags` dan `label`.

Karena itu:

- Setiap aset wajib punya minimal 4 tag, termasuk padanan bahasa Indonesia dan
  Inggris untuk hal penting.
- Tag harus deskriptif tentang **isi dan suasana**, bukan nama file.
- Prompt hanya mengirim `id`, `kind`, `label`, dan `tags` — bukan path.

Contoh paket yang dikirim ke prompt:

```text
BACKGROUNDS
- bg_classroom_day | Kelas, siang | kelas, sekolah, belajar, siang, classroom, indoor
- bg_schoolyard_day | Halaman sekolah, siang | halaman, sekolah, luar, siang, schoolyard, outdoor

CHARACTERS
- char_nara | Nara (siswa) | siswa, perempuan, seragam, remaja, student
- char_pak_bima | Pak Bima (guru) | guru, dewasa, pria, pengajar, teacher
```

Kalau AI butuh suasana yang tidak ada (mis. "laboratorium"), ia harus memilih
yang paling dekat dan mencatatnya di `source.gaps`, bukan mengarang id.

## Test wajib

`src/assets/manifest.test.ts` harus memastikan:

1. Semua `id` unik.
2. Semua `id` sesuai pola prefix untuk kind-nya.
3. Semua `path` menunjuk file yang ada di `public/`.
4. Semua aset punya minimal 4 tag.
5. Fallback tiap kind ada.
6. `width`/`height` background = 480×270 (lihat
   [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md)).

Test ini yang membuat "aset hilang" ketahuan saat `bun run test`, bukan saat demo.

## Perubahan manifest

Menambah aset:

1. Tambahkan file di `public/assets/...`.
2. Tambahkan entri manifest.
3. Perbarui [`../07-assets/inventory.md`](../07-assets/inventory.md).
4. Jalankan `bun run test`.

Menghapus aset: hanya setelah memastikan tidak ada cerita yang memakainya.
Gunakan `bun run story:audit` (rencana) atau grep `id` di database/fixture.

## Yang tidak boleh ada di manifest

- Path file mentah di dalam `Story` (cerita hanya menyimpan id).
- Aset yang tidak dipakai sama sekali dan tidak punya tag jelas.
- URL eksternal (semua aset lokal, supaya demo tidak bergantung jaringan).
