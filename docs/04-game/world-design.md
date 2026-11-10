---
status: draft
last_reviewed: 2026-11-09
owner: tim ClassQuest
---

# Desain Dunia Top-Down

Dokumen ini menjawab satu pertanyaan: **bagaimana ruangan game digambar dan
disusun supaya terasa seperti Omori, Undertale, atau Stardew Valley** — dunia
yang dilihat dari atas, karakter kecil, dan ruang yang bisa dijelajahi.

Dokumen pedamping:

- Arah visual, palet, dan suasana: [`game-design.md`](./game-design.md)
- Spesifikasi file gambar: [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md)
- Keputusan resolusi: [`../09-decisions/0009-resolution-and-scale.md`](../09-decisions/0009-resolution-and-scale.md)
- Keputusan data map dan kamera: [`../09-decisions/0010-map-data-and-camera.md`](../09-decisions/0010-map-data-and-camera.md)

> **Status:** draft. Angka di sini mengikuti ADR 0009 dan 0010 yang sudah
> **Accepted**; implementasinya berjalan per PR sesuai urutan di bagian
> [Urutan pengerjaan](#urutan-pengerjaan).

## Masalah yang diperbaiki

Tampilan hari ini terasa seperti game dari samping, bukan dari atas, karena
tiga hal:

| Gejala                                  | Penyebab sekarang                                              |
| --------------------------------------- | -------------------------------------------------------------- |
| Pemain seperti "menempel" di gambar     | Latar bergaya pemandangan dari samping, bukan lantai dari atas |
| Tabrakan dengan benda yang tak terlihat | Kotak collision di `map.ts` ditulis terpisah dari gambarnya    |
| Ruangan sempit, karakter besar          | Ruangan = 1 layar, sprite 48×72 di layar setinggi 270 px       |

## Satuan dasar

Semua angka dinyatakan dalam **tile**. Satu tile = **16×16 px** pada resolusi
internal. Tidak ada ukuran yang ditulis dalam piksel lepas di kode map.

| Hal                   | Nilai                                    |
| --------------------- | ---------------------------------------- |
| Resolusi internal     | 640×360 px                               |
| Tile                  | 16×16 px                                 |
| Layar dalam tile      | 40×22.5 tile                             |
| Frame sprite karakter | 24×32 px (1.5×2 tile)                    |
| Portrait              | 64×64 px                                 |
| Ruangan minimum       | 40×23 tile (satu layar penuh)            |
| Ruangan tipikal       | 56×34 tile (±1.4 layar, kamera bergerak) |
| Kecepatan pemain      | 5 tile/detik (80 px/detik)               |
| Zona interaksi        | 1.5 tile dari kaki NPC                   |
| Lebar koridor aman    | ≥ 2 tile                                 |

## Perspektif

Aturan supaya dunia terbaca "dari atas":

1. **Lantai mendominasi.** Lantai menutupi ±75% tinggi ruangan. Dinding hanya
   tampil sebagai pita pendek di tepi atas ruangan yang terlihat.
2. **Objek berdiri punya alas.** Meja, pohon, lemari digambar dengan sisi atas
   (wajah) terlihat jelas dan sisi depan lebih pendek, ditambah bayangan 1–2 px
   di bawah alasnya. Objek tanpa alas terlihat seperti tempelan.
3. **Wajah karakter hanya di depan.** Sprite menghadap kamera; bagian atas
   kepala lebih besar dari area kaki. Karakter tidak digambar setengah badan
   seperti presentasi visual novel.
4. **Urutan gambar mengikuti kaki.** Objek yang alasnya lebih bawah tampil di
   depan (`setDepth(y)`). Pemain yang berdiri di belakang meja tertutup sebagian
   oleh meja.
5. **Tidak ada horizon.** Kalau sebuah gambar punya garis langit di tengah,
   itu pemandangan, bukan ruangan. Langit hanya boleh muncul lewat jendela atau
   di ruang terbuka yang memang punya tepi atas.

## Sketsa ruangan

Contoh rencana kelas, kira-kira 56×34 tile, dilihat dari atas. Huruf = jenis
objek, penjelasan di tabel setelahnya.

```text
+-----------------------------------------------------------+
|  D D D D D D D D D D D D D D D D D D D D D D D D D D D D  |  D = dinding atas
|  D     W W W       P P P P P P       W W W       . . .   D |  W = jendela
|  D     W W W       P P P P P P       W W W               D |  P = papan tulis
|  D                                                       D |
|  D      . M .        . M .         . M .        . M .     D |  M = meja
|  D      . . .        . . .         . . .        . . .     D |  . = kursi
|  D                                                       D |
|  D      . M .        . M .         . M .        . M .     D |
|  D      . . .        . . .         . . .        . . .     D |
|  D                                                       D |
|  D                              N                        D |  N = NPC guru
|  D                                                       D |
|  D                          S                             D |  S = spawn pemain
|  D D D D D D D D D D D E E D D D D D D D D D D D D D D D   |  E = pintu keluar
+-----------------------------------------------------------+
```

Pintu keluar (`E`) diletakkan di sisi bawah atau samping; ia hanya memicu
transisi ke scene berikutnya sesuai urutan cerita (ADR 0008), **bukan** pilihan
bebas.

## Objek dan collision

Setiap objek di map punya satu definisi yang sekaligus menentukan gambar dan
collider-nya (ADR 0010). Tidak ada collider yang ditulis terpisah.

| `kind`  | Solid | Ukuran tipikal (tile) | Catatan                                                |
| ------- | ----- | --------------------- | ------------------------------------------------------ |
| `floor` | tidak | seluruh ruangan       | Lantai bertekstur, variasi 2–3 tile supaya tidak datar |
| `wall`  | ya    | 1 tebal               | Tepi ruangan; ujung atas 3–4 px lebih terang           |
| `prop`  | ya    | 1×1 s.d. 3×2          | Meja, lemari, pohon, tiang lampu                       |
| `npc`   | ya    | 1×2                   | Posisi anggota `story.cast`, bukan id baru             |
| `exit`  | tidak | 2×1                   | Zona pemicu transisi scene                             |

Aturan collision:

- Collider pemain adalah **kotak kaki** 12×8 px, bukan seluruh sprite.
- Dinding dan prop padat memakai kotak penuh objek, dikurangi 2 px di depan
  supaya pemain bisa berdiri dekat tanpa terlihat melayang.
- Objek dekoratif (tikar, pot kecil, bayangan) **tidak** punya collider.
- Kalau gambar dan collider berasal dari entri yang sama, bug "nabrak benda
  tak terlihat" tidak bisa muncul lagi.

## Kamera

| Aturan               | Nilai                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Mode                 | Mengikuti pemain, kamera berhenti di tepi map (`setBounds`)           |
| Dead zone            | Kotak 8×6 tile di tengah layar; kamera diam selama pemain di dalamnya |
| Pergerakan kamera    | `lerp` 0.12 — bergeser halus, tidak menempel kaku                     |
| Sisi ruangan = layar | Kamera dikunci ke tengah ruangan, tidak bergerak                      |
| `roundPixels`        | `true` — wajib, mencegah jitter saat lerp di pixel art                |

Kalau ruangan lebih besar dari layar, pemain boleh mendekati tepi, tetapi
kamera tidak melewati batas map — supaya tidak muncul area kosong di luar
dunia.

## Sprite karakter

| Hal         | Nilai                                                              |
| ----------- | ------------------------------------------------------------------ |
| Frame       | 24×32 px                                                           |
| Sheet       | Horizontal: idle 2 frame, jalan 2 frame **per arah** (8 arah)      |
| Total frame | 18 (2 idle + 16 jalan)                                             |
| Anchor      | Tengah bawah (kaki)                                                |
| Outline     | 1 px gelap, konsisten dengan latar                                 |
| Bayangan    | Elips 12×4 px di bawah kaki (gambar terpisah, bukan bagian frame)  |
| Warna       | Hanya palet + ramp turunan di [`game-design.md`](./game-design.md) |

Aturan animasi:

- Animasi jalan 6 frame/detik, idle 2 frame/detik.
- Idle cukup satu arah (menghadap kamera); jalan butuh **8 arah** (empat utama
  - empat diagonal).
- Diagonal digambar sebagai tampak tiga-perempat: badan menyamping dengan wajah
  sebagian menghadap kamera untuk arah bawah, dan kepala dari belakang untuk
  arah atas. Sisi kanan adalah cermin sisi kiri.
- Saat berhenti, frame terakhir di arah terakhir — jangan kembali ke idle
  menghadap depan untuk arah samping maupun diagonal.

## Lampiran aset latar

Latar tidak lagi satu gambar pemandangan 1 lapis. Setiap ruangan disusun dari:

| Lapisan         | Isi                                                        | Contoh id manifest                                                                               |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Lantai          | Tile lantai yang diulang                                   | `tile_floor_wood`, `tile_floor_grass`, `tile_floor_cloud`, `tile_floor_rock`, `tile_floor_water` |
| Dinding         | Pita dinding + tepi atas                                   | `tile_wall_plaster`, `tile_wall_hedge`, `tile_wall_rock`                                         |
| Objek           | Meja, papan tulis, pohon, pagar                            | `prop_desk`, `prop_blackboard`, `prop_tree`, `prop_fence`                                        |
| Atas (opsional) | Kanopi pohon atau ujung langit-langit yang menutupi pemain | `tile_canopy`                                                                                    |

> Id aset tile dan prop di atas sudah **final** dan terdaftar di
> `src/assets/manifest.ts` serta [`../07-assets/inventory.md`](../07-assets/inventory.md).
> Menambah tile atau prop berikutnya berarti menambah entri di kedua tempat itu
> di PR yang sama.

Latar "pemandangan" yang ada sekarang (`bg_classroom_day`, `bg_river_day`, dan
seterusnya) **dipertahankan sebagai latar layar judul dan layar hasil**, karena
di sana komposisi yang indah lebih penting daripada navigasi. Di dalam
permainan, latar diganti susunan lantai + dinding + objek.

## Teks dan font

Font monospace sistem yang dipakai sekarang (`textbox.ts`, `interaction.ts`)
tidak konsisten dengan pixel art: lebar huruf tidak kelipatan piksel, sehingga
teks di canvas terlihat kabur.

- Font pixel **bitmap**, satu ukuran dasar **8 px**, ditampilkan pada kelipatan
  2 (16 px) atau 3 (24 px).
- Sumber font: pixel font berlisensi OFL yang disimpan lokal di
  `public/fonts/` dan dimuat lewat `next/font/local` untuk elemen DOM.
- Phaser memakai atlas bitmap yang dibuat generator dari font yang sama, supaya
  teks dialog di canvas dan overlay DOM terlihat satu keluarga.
- Ukuran minimum teks dialog di layar: setara 16 px di layar ≥ 640 px;
  perhitungan ulang ada di [`accessibility.md`](./accessibility.md#ukuran-teks).

> **TBD — font final.** Pilihan font pixel belum diputuskan. Kandidat dan
> lisensinya dicatat di PR font; setelah dipilih, tambahkan baris di
> `inventory.md` (kategori baru) dan `src/assets/manifest.ts`.

## Urutan pengerjaan

Ini bukan janji jadwal, hanya urutan yang aman. Setiap langkah satu PR kecil.

1. **ADR 0009 dan 0010 disepakati** — ubah status ke Accepted.
2. **Generator aset baru**: tile lantai/dinding, objek, sprite 24×32, portrait
   64×64. Aset lama tetap ada sampai langkah 3 hijau.
3. **Data map per scene** + collider dari data objek + tes.
4. **Kamera dan depth sorting.**
5. **Animasi jalan 4 arah.**
6. **Font pixel** dan penyelarasan textbox/HUD.
7. **Layar judul dan hasil** memakai latar pemandangan (tidak berubah).

Langkah 2 dan 3 bisa dikerjakan paralel oleh dua orang karena kontaknya cuma
nama id tile.

## Yang sengaja tidak dikerjakan

- World terbuka yang tersambung bebas antar ruangan (ditolak ADR 0008).
- Tilemap buatan alat eksternal (ditolak ADR 0010).
- Parallax lebih dari dua lapisan; satu lapisan latar belakang sudah cukup.
- Animasi diagonal lebih dari 2 frame (jalan diagonal memakai 2 frame cermin).

## Referensi

- [`../09-decisions/0009-resolution-and-scale.md`](../09-decisions/0009-resolution-and-scale.md)
- [`../09-decisions/0010-map-data-and-camera.md`](../09-decisions/0010-map-data-and-camera.md)
- [`game-design.md`](./game-design.md) — palet, arah visual, loop permainan
- [`scene-format.md`](./scene-format.md) — bagaimana scene cerita dipilih
