---
status: draft
last_reviewed: 2026-11-09
owner: tim ClassQuest
---

# Panduan Aset

Aset disiapkan **di awal** dan bersifat tetap. Ini keputusan inti produk: dengan
aset terbatas, AI hanya menyusun cerita, hasilnya konsisten dan bisa dibangun
dalam waktu hackathon.

- Keputusan: [ADR 0003](../09-decisions/0003-fixed-asset-library.md)
- Manifest: [`../02-data-model/asset-manifest.md`](../02-data-model/asset-manifest.md)
- Daftar aset: [`inventory.md`](./inventory.md)

## Spesifikasi

> Angka di bagian ini mengikuti resolusi internal yang berlaku sekarang.
> Keputusan untuk menaikkan resolusi dan mengecilkan karakter ada di
> [`../09-decisions/0009-resolution-and-scale.md`](../09-decisions/0009-resolution-and-scale.md);
> angka finalnya di [`../04-game/world-design.md`](../04-game/world-design.md#satuan-dasar).
> Selama ADR itu masih `Proposed`, **spesifikasi di bawah yang dipakai**.

### Background

| Properti     | Nilai                                                   |
| ------------ | ------------------------------------------------------- |
| Resolusi     | **640×360** (16:9, ADR 0009)                            |
| Format       | PNG, indexed/24-bit                                     |
| Transparansi | Tidak perlu                                             |
| Gaya         | Pixel art, tanpa anti-aliasing                          |
| Ukuran file  | ≤ 80 KB per gambar                                      |
| Area aman    | 90 px bawah untuk textbox (jangan taruh detail penting) |

Background di dalam permainan kelak disusun dari tile lantai, dinding, dan
objek (lihat [`../04-game/world-design.md`](../04-game/world-design.md#lampiran-aset-latar)),
bukan satu gambar pemandangan. Latar pemandangan tetap dipakai untuk layar
judul dan layar hasil.

### Sprite karakter

| Properti     | Nilai                                              |
| ------------ | -------------------------------------------------- |
| Ukuran frame | **48×72**                                          |
| Format       | PNG spritesheet, horizontal                        |
| Frame        | 2 frame idle (bernafas), opsional 2 frame berjalan |
| Anchor       | Kaki di tengah bawah                               |
| Outline      | 1 px gelap, konsisten di semua karakter            |
| Ukuran file  | ≤ 40 KB                                            |

### Portrait

| Properti  | Nilai                      |
| --------- | -------------------------- |
| Resolusi  | **96×96**                  |
| Format    | PNG dengan transparansi    |
| Pemakaian | Opsional, muncul di dialog |

Portrait memakai `portraitPath` di entri manifest karakter. Kalau tidak ada, game
tidak menampilkan portrait.

#### Tile

| Properti    | Nilai                                 |
| ----------- | ------------------------------------- |
| Ukuran      | **16×16** (satu tile, ADR 0009)       |
| Format      | PNG, tidak transparan (full-bleed)    |
| Isi         | Satu tile berulang, tanpa tepi khusus |
| Ukuran file | ≤ 4 KB                                |

Tile dipasang berulang oleh game; jadi satu tile **tidak boleh** mengandung
gradien besar atau tepi yang terlihat saat diulang.

### Prop

| Properti    | Nilai                                                |
| ----------- | ---------------------------------------------------- |
| Ukuran      | Kelipatan 16 px                                      |
| Format      | PNG dengan transparansi                              |
| Anchor      | Alas di tengah bawah (kaki objek)                    |
| Bayangan    | Elips gelap 1–2 px di bawah alas, bagian dari gambar |
| Outline     | 1 px gelap, konsisten dengan karakter                |
| Ukuran file | ≤ 20 KB                                              |

## Musik

| Properti    | Nilai                                |
| ----------- | ------------------------------------ |
| Format      | OGG Vorbis (fallback MP3 bila perlu) |
| Durasi      | 30–60 detik, loop mulus              |
| Bitrate     | 96–128 kbps                          |
| Ukuran file | ≤ 800 KB                             |
| Loudness    | Sekitar -16 LUFS, tanpa lonjakan     |

### SFX

| Properti | Nilai                                   |
| -------- | --------------------------------------- |
| Format   | OGG atau WAV                            |
| Durasi   | ≤ 1 detik                               |
| Ukuran   | ≤ 30 KB                                 |
| Loudness | Konsisten, tidak lebih keras dari musik |

### UI

| Properti | Nilai                           |
| -------- | ------------------------------- |
| Textbox  | 456×78, border 3 px, sudut 3 px |
| Frame    | 9-slice (6 px border)           |
| Format   | PNG dengan transparansi         |

## Aturan pixel art

1. **Satu grid.** Semua gambar digambar pada grid 1 px dari resolusi 640×360.
   Jangan mengecilkan gambar besar.
2. **Tanpa anti-aliasing.** Tidak ada blur, gradient halus, atau bayangan lembut.
3. **Palet terbatas.** Maksimal 8 warna per gambar (6 inti + 2 fungsional), diambil
   dari palet proyek ([`../04-game/game-design.md`](../04-game/game-design.md)).
   Untuk background yang butuh variasi terang/gelap, pakai tint dari palet itu —
   jangan menambah warna baru.
4. **Skala integer saat menggambar.** Semua gambar digambar pada grid 1 px; game
   yang menampilkan dengan `Scale.FIT`. Pratinjau di 2× (1280×720) atau 3×
   (1920×1080) untuk memeriksa ketajaman.
5. **Konsisten.** Karakter yang sama harus punya proporsi dan outline sama di
   semua pose.

## Palet

![Palet ClassQuest](../assets/palette.svg)

| Nama          | Hex       | Peran                    |
| ------------- | --------- | ------------------------ |
| Latar terang  | `#F4EFE6` | inti                     |
| Latar gelap   | `#14201A` | inti                     |
| Aksen utama   | `#E8A87C` | inti                     |
| Aksen dingin  | `#7FA6C9` | inti                     |
| Teks          | `#1F1E28` | inti                     |
| Teks terang   | `#F7F4EC` | inti                     |
| Hijau lembut  | `#6F9B7A` | fungsional: benar/sukses |
| Kuning lembut | `#C9A227` | fungsional: peringatan   |

Warna di luar palet harus ditambahkan ke dokumen ini dulu.

## Struktur folder

```text
public/assets/
├── bg/
├── char/
├── portrait/
├── tile/
├── prop/
├── music/
├── sfx/
└── ui/
```

Nama file: `snake_case` tanpa prefix (`classroom_day.png`), karena prefix ada di
`id` manifest (`bg_classroom_day`). Lihat
[`naming-conventions.md`](./naming-conventions.md).

## Placeholder

Saat aset belum siap, **tetap buat file placeholder** agar manifest test dan game
bisa berjalan:

- Background: kotak warna + label teks kecil ("BG: Kelas, siang").
- Sprite: siluet 32×48 dengan label inisial.
- Musik: file senyap 1 detik (atau nada sederhana).
- SFX: klik pendek.

Aturan:

- Placeholder **wajib** punya nama file dan id yang sama dengan aset final.
- Jangan menandai placeholder sebagai `ready` di inventory.
- Game harus tetap bisa dimainkan dengan placeholder.

## Lisensi

- Semua aset harus dibuat sendiri, atau berlisensi CC0/public domain.
- Catat sumber di [`inventory.md`](./inventory.md) kolom "Sumber".
- Jangan memakai aset dari game komersial (termasuk Omori) walau hanya untuk
  referensi gaya.
- Jangan memakai font berbayar tanpa lisensi web.

## Cara menambah aset

1. Buat file sesuai spesifikasi di atas.
2. Simpan di folder yang benar.
3. Tambahkan entri di `src/assets/manifest.ts` (id, kind, path, label, tags).
4. Tambahkan baris di [`inventory.md`](./inventory.md).
5. Jalankan `bun run test` (test manifest memeriksa file ada).
6. Update dokumen ini bila menambah kategori baru.

## Yang tidak boleh

- Aset dari internet tanpa lisensi jelas.
- Gambar resolusi tinggi yang diperkecil (menghasilkan pixel tidak konsisten).
- File > batas ukuran tanpa persetujuan tim.
- Nama file dengan spasi, huruf besar, atau karakter non-ASCII.
- Mengubah `id` aset yang sudah dipakai cerita.
