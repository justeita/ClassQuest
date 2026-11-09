---
status: draft
last_reviewed: 2026-11-09
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
- `placeholder` — file ada, isinya sementara. Saat ini **semua** aset adalah
  placeholder yang digambar generator (`scripts/generate-assets.mjs`), termasuk
  tile dan prop untuk map top-down (ADR 0009/0010).
- `ready` — final, sesuai spesifikasi.

> `ready` di sini adalah status **aset**, bukan status cerita. Status cerita hanya
> `processing | draft | published | failed | archived`; lihat
> [`../06-backend/persistence.md`](../06-backend/persistence.md#siklus-status).
> Dua domain ini tidak saling memengaruhi.

Semua berkas di tabel ini dibuat oleh generator di repo, bukan diunduh:
`bun run assets:generate` (gambar PNG tanpa dependensi, audio OGG lewat ffmpeg).
Jalankan ulang perintah itu setelah mengubah `scripts/lib/`; hasil gambar
dijamin identik.

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

| id              | Label            | Sprite                      | Portrait                        | Tags                                       | Status |
| --------------- | ---------------- | --------------------------- | ------------------------------- | ------------------------------------------ | ------ |
| `char_nara`     | Nara (siswa)     | `/assets/char/nara.png`     | `/assets/portrait/nara.png`     | siswa, perempuan, seragam, remaja, student | ready  |
| `char_pak_bima` | Pak Bima (guru)  | `/assets/char/pak_bima.png` | `/assets/portrait/pak_bima.png` | guru, dewasa, pria, pengajar, teacher      | ready  |
| `char_tirta`    | Tirta (roh air)  | `/assets/char/tirta.png`    | `/assets/portrait/tirta.png`    | air, roh, biru, kecil, spirit, water       | ready  |
| `char_rani`     | Rani (siswa)     | `/assets/char/rani.png`     | `/assets/portrait/rani.png`     | siswa, perempuan, rambut pendek, teman     | ready  |
| `char_default`  | Karakter default | `/assets/char/default.png`  | —                               | default, cadangan, fallback, netral        | ready  |

## Tile

| id                  | Label           | Path                            | Tags                                                   | Status      |
| ------------------- | --------------- | ------------------------------- | ------------------------------------------------------ | ----------- |
| `tile_floor_wood`   | Lantai kayu     | `/assets/tile/floor_wood.png`   | lantai, kayu, kelas, indoor, floor, wood               | placeholder |
| `tile_floor_grass`  | Rumput          | `/assets/tile/floor_grass.png`  | lantai, rumput, halaman, luar, grass, outdoor          | placeholder |
| `tile_floor_cloud`  | Lantai awan     | `/assets/tile/floor_cloud.png`  | lantai, awan, langit, terang, cloud, sky               | placeholder |
| `tile_floor_rock`   | Batu            | `/assets/tile/floor_rock.png`   | lantai, batu, gunung, gelap, rock, mountain            | placeholder |
| `tile_floor_water`  | Air             | `/assets/tile/floor_water.png`  | lantai, air, sungai, dingin, water, river              | placeholder |
| `tile_wall_plaster` | Dinding plester | `/assets/tile/wall_plaster.png` | dinding, plester, kelas, indoor, wall, interior        | placeholder |
| `tile_wall_hedge`   | Pagar tanaman   | `/assets/tile/wall_hedge.png`   | dinding, tanaman, halaman, luar, hedge, outdoor        | placeholder |
| `tile_wall_rock`    | Dinding batu    | `/assets/tile/wall_rock.png`    | dinding, batu, gunung, gelap, rock, outdoor            | placeholder |
| `tile_canopy`       | Kanopi penutup  | `/assets/tile/canopy.png`       | kanopi, pohon, langit-langit, penutup, canopy, overlay | placeholder |
| `tile_default`      | Tile default    | `/assets/tile/default.png`      | default, cadangan, netral, fallback                    | placeholder |

## Prop

| id                | Label        | Path                          | Tags                                                | Status      |
| ----------------- | ------------ | ----------------------------- | --------------------------------------------------- | ----------- |
| `prop_desk`       | Meja kelas   | `/assets/prop/desk.png`       | meja, kelas, belajar, indoor, desk, school          | placeholder |
| `prop_blackboard` | Papan tulis  | `/assets/prop/blackboard.png` | papan, tulisan, kelas, mengajar, blackboard, school | placeholder |
| `prop_tree`       | Pohon        | `/assets/prop/tree.png`       | pohon, halaman, alam, luar, tree, nature            | placeholder |
| `prop_fence`      | Pagar kayu   | `/assets/prop/fence.png`      | pagar, halaman, luar, kayu, fence, outdoor          | placeholder |
| `prop_default`    | Prop default | `/assets/prop/default.png`    | default, cadangan, netral, fallback                 | placeholder |

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

## Ringkasan

| Kind         | Jumlah |
| ------------ | ------ |
| `background` | 8      |
| `character`  | 5      |
| `tile`       | 10     |
| `prop`       | 5      |
| `music`      | 5      |
| `sfx`        | 4      |
| `ui`         | 3      |
| **Total**    | **40** |

## Prioritas pengerjaan

Urutan yang disarankan agar game bisa tampil cepat:

1. `bg_default`, `char_default`, `bgm_default`, `ui_default` — agar fallback jalan.
2. `bg_classroom_day`, `char_nara`, `char_pak_bima`, `ui_textbox` — cukup untuk
   chapter 1 contoh.
3. `bgm_school_calm`, `sfx_click`, `sfx_correct`, `sfx_wrong`.
4. Sisa background dan karakter.
5. `bgm_adventure`, `bgm_ending`, `ui_portrait_frame`.

## Sumber dan lisensi

| id  | Sumber                                                           | Lisensi |
| --- | ---------------------------------------------------------------- | ------- |
| —   | Semua aset harus dibuat sendiri atau CC0; catat saat aset dibuat | —       |

Jangan mengisi kolom ini dengan "Google Images" atau nama game komersial.

## Cara memeriksa konsistensi

Test `src/assets/manifest.test.ts` memeriksa:

- setiap `id` di manifest punya file di path-nya,
- setiap file di folder aset terdaftar di manifest,
- jumlah aset per kind sesuai tabel ringkasan ini,
- semua `id` unik dan berprefix benar.

Kalau test gagal karena file belum ada, buat placeholder dulu — jangan menghapus
entri manifest.
