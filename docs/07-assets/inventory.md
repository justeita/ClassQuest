---
status: draft
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Inventory Aset

Ini **satu-satunya** tabel daftar aset di repo. Dokumen lain menyebut bentuk
manifest dan aturan id, tapi tidak menyalin daftarnya — supaya tidak ada dua tabel
yang harus disinkronkan tangan.

Urutan kebenaran:

1. `src/assets/manifest.ts` (rencana) — yang dipakai kode.
2. Tabel di halaman ini — yang dibaca manusia.
3. Kalau keduanya berbeda, manifest yang menang, dan tabel ini **wajib**
   diperbarui di PR yang sama.

Legenda status:

- `todo` — belum dibuat.
- `placeholder` — file ada, isinya sementara. Semua aset yang **digambar
  generator** (`scripts/generate-assets.mjs`) berstatus ini, termasuk tile dan
  prop map top-down (ADR 0009/0010).
- `ready` — final, sesuai spesifikasi. Aset pihak ketiga yang sudah diproses
  masuk ke sini; sumbernya dicatat di bagian
  [Sumber dan lisensi](#sumber-dan-lisensi).

> `ready` di sini adalah status **aset**, bukan status cerita. Status cerita hanya
> `processing | draft | published | failed | archived`; lihat
> [`../06-backend/persistence.md`](../06-backend/persistence.md#siklus-status).
> Dua domain ini tidak saling memengaruhi.

Sebagian besar berkas di tabel ini dibuat generator di repo:
`bun run assets:generate` (gambar PNG tanpa dependensi, audio OGG lewat ffmpeg).
Jalankan ulang perintah itu setelah mengubah `scripts/lib/`; hasil gambar
dijamin identik.

Pengecualian: tujuh prop taman/interior adalah aset pihak ketiga yang sudah
dipotong dan di-commit sebagai file game. Generator **tidak** menimpanya karena
namanya tidak ada di daftar `IMAGES`. Kotak potong dan sumbernya dicatat di
[Sumber dan lisensi](#sumber-dan-lisensi).

## Background

| id                      | Label                  | Path                                | Tags                                               | Status |
| ----------------------- | ---------------------- | ----------------------------------- | -------------------------------------------------- | ------ |
| `bg_classroom_day`      | Kelas, siang           | `/assets/bg/classroom_day.png`      | kelas, sekolah, belajar, siang, classroom, indoor  | ready  |
| `bg_schoolyard_day`     | Halaman sekolah, siang | `/assets/bg/schoolyard_day.png`     | halaman, sekolah, luar, siang, schoolyard, outdoor | ready  |
| `bg_schoolyard_evening` | Halaman sekolah, sore  | `/assets/bg/schoolyard_evening.png` | halaman, sekolah, sore, senja, sunset, outdoor     | ready  |
| `bg_cloud_sky`          | Langit di atas awan    | `/assets/bg/cloud_sky.png`          | langit, awan, tinggi, terang, sky, cloud           | ready  |
| `bg_mountain_night`     | Gunung, malam          | `/assets/bg/mountain_night.png`     | gunung, malam, gelap, dingin, mountain, night      | ready  |
| `bg_river_day`          | Sungai, siang          | `/assets/bg/river_day.png`          | sungai, air, alam, siang, river, nature            | ready  |
| `bg_library_evening`    | Perpustakaan, sore     | `/assets/bg/library_evening.png`    | perpustakaan, buku, sore, tenang, library, indoor  | ready  |
| `bg_default`            | Latar default          | `/assets/bg/default.png`            | default, cadangan, netral, fallback                | ready  |

## Karakter

| id              | Label                 | Sprite                      | Portrait                        | Tags                                                 | Status |
| --------------- | --------------------- | --------------------------- | ------------------------------- | ---------------------------------------------------- | ------ |
| `char_nara`     | Nara (siswa)          | `/assets/char/nara.png`     | `/assets/portrait/nara.png`     | siswa, perempuan, seragam, remaja, student           | ready  |
| `char_pak_bima` | Pak Bima (guru)       | `/assets/char/pak_bima.png` | `/assets/portrait/pak_bima.png` | guru, dewasa, pria, pengajar, teacher                | ready  |
| `char_tirta`    | Tirta (roh air)       | `/assets/char/tirta.png`    | `/assets/portrait/tirta.png`    | air, roh, biru, kecil, spirit, water                 | ready  |
| `char_rani`     | Rani (siswa)          | `/assets/char/rani.png`     | `/assets/portrait/rani.png`     | siswa, perempuan, rambut pendek, teman               | ready  |
| `char_nino`     | Nino (siswa pindahan) | `/assets/char/nino.png`     | `/assets/portrait/nino.png`     | siswa, perempuan, ekor kembar, pita, remaja, student | ready  |
| `char_default`  | Karakter default      | `/assets/char/default.png`  | —                               | default, cadangan, fallback, netral                  | ready  |

## Tile

| id                    | Label           | Path                              | Tags                                                   | Status      |
| --------------------- | --------------- | --------------------------------- | ------------------------------------------------------ | ----------- |
| `tile_floor_wood`     | Lantai kayu     | `/assets/tile/floor_wood.png`     | lantai, kayu, kelas, indoor, floor, wood               | placeholder |
| `tile_floor_grass`    | Rumput          | `/assets/tile/floor_grass.png`    | lantai, rumput, halaman, luar, grass, outdoor          | placeholder |
| `tile_floor_cloud`    | Lantai awan     | `/assets/tile/floor_cloud.png`    | lantai, awan, langit, terang, cloud, sky               | placeholder |
| `tile_floor_rock`     | Batu            | `/assets/tile/floor_rock.png`     | lantai, batu, gunung, gelap, rock, mountain            | placeholder |
| `tile_floor_water`    | Air             | `/assets/tile/floor_water.png`    | lantai, air, sungai, dingin, water, river              | placeholder |
| `tile_floor_corridor` | Lantai koridor  | `/assets/tile/floor_corridor.png` | lantai, koridor, ubin, sekolah, indoor, corridor       | placeholder |
| `tile_wall_plaster`   | Dinding plester | `/assets/tile/wall_plaster.png`   | dinding, plester, kelas, indoor, wall, interior        | placeholder |
| `tile_wall_hedge`     | Pagar tanaman   | `/assets/tile/wall_hedge.png`     | dinding, tanaman, halaman, luar, hedge, outdoor        | placeholder |
| `tile_wall_rock`      | Dinding batu    | `/assets/tile/wall_rock.png`      | dinding, batu, gunung, gelap, rock, outdoor            | placeholder |
| `tile_canopy`         | Kanopi penutup  | `/assets/tile/canopy.png`         | kanopi, pohon, langit-langit, penutup, canopy, overlay | placeholder |
| `tile_default`        | Tile default    | `/assets/tile/default.png`        | default, cadangan, netral, fallback                    | placeholder |

## Prop

| id                 | Label                  | Path                           | Tags                                                | Status      |
| ------------------ | ---------------------- | ------------------------------ | --------------------------------------------------- | ----------- |
| `prop_desk`        | Meja kelas             | `/assets/prop/desk.png`        | meja, kelas, belajar, indoor, desk, school          | placeholder |
| `prop_blackboard`  | Papan tulis            | `/assets/prop/blackboard.png`  | papan, tulisan, kelas, mengajar, blackboard, school | placeholder |
| `prop_tree`        | Pohon                  | `/assets/prop/tree.png`        | pohon, halaman, alam, luar, tree, nature            | placeholder |
| `prop_fence`       | Pagar kayu             | `/assets/prop/fence.png`       | pagar, halaman, luar, kayu, fence, outdoor          | placeholder |
| `prop_tree_large`  | Pohon rindang besar    | `/assets/prop/tree_large.png`  | pohon, rindang, taman, luar, tree, shade            | ready       |
| `prop_tree_medium` | Pohon sedang           | `/assets/prop/tree_medium.png` | pohon, sedang, taman, luar, tree, outdoor           | ready       |
| `prop_tree_flower` | Pohon berbunga         | `/assets/prop/tree_flower.png` | pohon, bunga, taman, luar, flower, tree             | ready       |
| `prop_bush_small`  | Semak kecil            | `/assets/prop/bush_small.png`  | semak, daun, taman, luar, bush, outdoor             | ready       |
| `prop_bush_flower` | Semak bunga merah muda | `/assets/prop/bush_flower.png` | semak, bunga, merah muda, taman, bush, flower       | ready       |
| `prop_shelf`       | Rak buku               | `/assets/prop/shelf.png`       | rak, buku, kelas, indoor, shelf, library            | ready       |
| `prop_door`        | Pintu kayu             | `/assets/prop/door.png`        | pintu, kayu, koridor, indoor, door, sekolah         | ready       |
| `prop_pond`        | Kolam taman            | `/assets/prop/pond.png`        | kolam, air, taman, luar, pond, water                | placeholder |
| `prop_default`     | Prop default           | `/assets/prop/default.png`     | default, cadangan, netral, fallback                 | placeholder |

## Musik

| id                | Label          | Path                            | Tags                                   | Status |
| ----------------- | -------------- | ------------------------------- | -------------------------------------- | ------ |
| `bgm_school_calm` | Sekolah tenang | `/assets/music/school_calm.ogg` | tenang, sekolah, pagi, hangat, calm    | ready  |
| `bgm_adventure`   | Petualangan    | `/assets/music/adventure.ogg`   | petualangan, naik, semangat, adventure | ready  |
| `bgm_mystery`     | Misteri        | `/assets/music/mystery.ogg`     | misteri, gelap, penasaran, mystery     | ready  |
| `bgm_ending`      | Penutup        | `/assets/music/ending.ogg`      | penutup, hangat, lega, ending          | ready  |
| `bgm_default`     | Musik default  | `/assets/music/default.ogg`     | default, cadangan, netral, tenang      | ready  |

## SFX

| id            | Label         | Path                      | Tags                            | Status |
| ------------- | ------------- | ------------------------- | ------------------------------- | ------ |
| `sfx_click`   | Klik          | `/assets/sfx/click.ogg`   | klik, pilih, ui, click          | ready  |
| `sfx_correct` | Jawaban benar | `/assets/sfx/correct.ogg` | benar, berhasil, tepat, correct | ready  |
| `sfx_wrong`   | Jawaban salah | `/assets/sfx/wrong.ogg`   | salah, lembut, keliru, wrong    | ready  |
| `sfx_page`    | Ganti scene   | `/assets/sfx/page.ogg`    | transisi, halaman, pindah, page | ready  |

## UI

| id                  | Label          | Path                            | Tags                             | Status |
| ------------------- | -------------- | ------------------------------- | -------------------------------- | ------ |
| `ui_textbox`        | Kotak dialog   | `/assets/ui/textbox.png`        | dialog, teks, panel, textbox     | ready  |
| `ui_portrait_frame` | Bingkai potret | `/assets/ui/portrait_frame.png` | potret, bingkai, karakter, frame | ready  |
| `ui_default`        | UI default     | `/assets/ui/default.png`        | default, cadangan, panel, netral | ready  |

## Font game

Font teks game **bukan** aset Phaser dan tidak masuk `src/assets/manifest.ts`;
dimuat `next/font/local` dari `public/fonts/` (ADR 0007).

| File                           | Ukuran   | Kegunaan              |
| ------------------------------ | -------- | --------------------- |
| `patrick-hand-latin.woff2`     | 23.944 B | Subset Latin (utama)  |
| `patrick-hand-latin-ext.woff2` | 20.112 B | Subset Latin Extended |
| `OFL.txt`                      | 4.376 B  | Lisensi SIL OFL 1.1   |

## Ringkasan

| Kind         | Jumlah |
| ------------ | ------ |
| `background` | 8      |
| `character`  | 6      |
| `tile`       | 11     |
| `prop`       | 13     |
| `music`      | 5      |
| `sfx`        | 4      |
| `ui`         | 3      |
| **Total**    | **50** |

## Prioritas pengerjaan

Urutan yang disarankan agar game bisa tampil cepat:

1. `bg_default`, `char_default`, `bgm_default`, `ui_default` — agar fallback jalan.
2. `bg_classroom_day`, `char_nara`, `char_pak_bima`, `ui_textbox` — cukup untuk
   chapter 1 contoh.
3. `bgm_school_calm`, `sfx_click`, `sfx_correct`, `sfx_wrong`.
4. Sisa background dan karakter.
5. `bgm_adventure`, `bgm_ending`, `ui_portrait_frame`.

## Sumber dan lisensi

| id                                                                           | Sumber                                    | Berkas asal                                  | Lisensi               |
| ---------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- | --------------------- |
| Semua aset lain (background, karakter, tile, prop generator, musik, sfx, ui) | Dibuat generator repo                     | `scripts/lib/*.mjs`                          | Milik proyek          |
| `prop_tree_large`, `prop_tree_medium`, `prop_tree_flower`                    | Craftpix — Free Top Down Trees Pixel Art  | `Tree1.png`, `Tree2.png`, `Flower_tree1.png` | Craftpix Free License |
| `prop_bush_small`, `prop_bush_flower`                                        | Craftpix — Free Top Down Bushes Pixel Art | `Autumn_bush1.png`, `Bush_pink_flowers1.png` | Craftpix Free License |
| `prop_shelf`                                                                 | Craftpix — Main Character's Home          | `Interior.png`, potong `x=160 y=80 32×48`    | Craftpix Free License |
| `prop_door`                                                                  | Craftpix — Main Character's Home          | `walls_floor.png`, potong `x=112 y=96 32×32` | Craftpix Free License |
| Font Patrick Hand (`public/fonts/`)                                          | Google Fonts                              | `patrick-hand-latin.woff2`                   | SIL OFL 1.1           |

Ketiga paket Craftpix berasal dari <https://craftpix.net>. Lisensi freebie-nya
mengizinkan pemakaian di proyek komersial maupun non-komersial dan mengizinkan
modifikasi; atribusi tidak diwajibkan, tetapi tetap dicatat di
[`../../README.md`](../../README.md#atribusi-pihak-ketiga). Yang dilarang adalah
menjual atau mendistribusikan ulang file seni mentah, jadi repo ini hanya memuat
aset yang sudah dipotong dan dipakai game — bukan isi paket, PSD, atau file
sumber lain.

`char_nino` **tidak** memakai sprite pack mana pun. Ia digambar generator dengan
resep sendiri (ekor kembar dan pita kupu-kupu) memakai palet delapan warna
proyek; kemiripan dengan karakter referensi hanya pada siluet dan warna rambut,
bukan salinan berkas.

Jangan mengisi kolom ini dengan "Google Images" atau nama game komersial.

## Cara memeriksa konsistensi

Test `src/assets/manifest.test.ts` memeriksa:

- setiap `id` di manifest punya file di path-nya,
- setiap file di folder aset terdaftar di manifest,
- jumlah aset per kind sesuai tabel ringkasan ini,
- semua `id` unik dan berprefix benar.

Kalau test gagal karena file belum ada, buat placeholder dulu — jangan menghapus
entri manifest.
