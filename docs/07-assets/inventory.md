---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Inventory Aset

Ini **satu-satunya** tabel daftar aset di repo. Dokumen lain menyebut bentuk
manifest dan aturan id, tapi tidak menyalin daftarnya — supaya tidak ada dua
tabel yang harus disinkronkan tangan.

Urutan kebenaran:

1. `src/assets/manifest.ts` dan `src/assets/worldAssets.ts` (kode) — yang
   dipakai game.
2. Tabel di halaman ini — yang dibaca manusia.
3. Kalau keduanya berbeda, manifest yang menang, dan tabel ini **wajib**
   diperbarui di PR yang sama.

Legenda status:

- `todo` — belum dibuat.
- `placeholder` — file ada, isinya sementara.
- `ready` — final, sesuai spesifikasi. Semua aset yang sekarang dipakai game
  berstatus ini.

> `ready` di sini adalah status **aset**, bukan status cerita. Status cerita
> hanya `processing | draft | published | failed | archived`; lihat
> [`../06-backend/persistence.md`](../06-backend/persistence.md#siklus-status).
> Dua domain ini tidak saling memengaruhi.

## Dua sumber berkas

Aset di `public/assets/` datang dari dua jalur, dan keduanya tidak saling
menimpa:

1. **Generator repo** — `bun run assets:generate`. Membuat aset generik: latar
   default `640×360`, panel UI, dan empat efek suara. Gambar digambar tanpa
   dependensi di `scripts/lib/`; audio disintesis lalu dienkode ke OGG lewat
   ffmpeg.
2. **Impor paket desa** — `bun run assets:world` (`scripts/import-world.mjs`).
   Menyalin peta desa, 80 potongan objek, dan satu lagu dari folder paket aset
   proyek di luar repo (`Asset/assets_classquest`), lalu membangkitkan
   `src/assets/worldAssets.ts` dan `src/game/world/village.json`.
3. **Impor karakter beranimasi** — `bun run assets:characters`
   (`scripts/import-characters.mjs`). Menyusun 10 spritesheet beranimasi dari
   folder karakter dan membangkitkan `src/assets/characterFrames.ts`.
4. **Impor potret berekspresi** — `bun run assets:portraits`
   (`scripts/import-portraits.mjs`). Menyusun enam potret per karakter ke
   `public/assets/portrait/<nama>/<ekspresi>.png`; jalur ini juga menghapus
   potret tunggal lama (`public/assets/portrait/*.png`).

Kind `world` berisi peta dan potongan objek yang dipasang dari data editor
peta. Entri itu **tidak** bisa dirujuk Story JSON: `STORY_ASSET_KINDS` hanya
memuat `background`, `character`, `music`, `sfx`, dan `ui`. Lihat
[`../02-data-model/asset-manifest.md`](../02-data-model/asset-manifest.md).

## Background

Latar `640×360` untuk layar judul dan layar hasil. Di dalam permainan, latar
yang terlihat adalah peta desa (kind `world`), bukan background.

| id           | Label         | Path                     | Tags                                       | Status |
| ------------ | ------------- | ------------------------ | ------------------------------------------ | ------ |
| `bg_default` | Latar default | `/assets/bg/default.png` | default, cadangan, netral, fallback, latar | ready  |

## Karakter

Spritesheet berpetak: delapan baris arah hadap (urut: selatan, tenggara, timur,
timur laut, utara, barat laut, barat, barat daya) dan kolom animasi — idle lebih
dulu, lalu walk untuk pemain. `frameWidth`/`frameHeight` tiap karakter berbeda
(kotak karakter aslinya); tinggi semuanya diseragamkan ke 56 px di peta.

Setiap karakter punya enam potret dialog di
`public/assets/portrait/<nama>/<ekspresi>.png` untuk `neutral`, `happy`, `sad`,
`angry`, `shocked`, dan `thinking` (tinggi 512 px, lebar kanvas diseragamkan per
karakter agar kepala tidak bergeser saat ekspresi berganti, latar transparan).
Potret dirender DOM dan bukan bagian `PreloadScene` (ADR 0017). Kolom Potret di
bawah menunjuk foldernya; nama folder mengikuti berkas sumber, bukan id manifest.

| id            | Label                | Sprite                    | Potret (folder)            | Frame | Tags                                          | Status |
| ------------- | -------------------- | ------------------------- | -------------------------- | ----- | --------------------------------------------- | ------ |
| `char_mc`     | Pemuda syal biru     | `/assets/char/mc.png`     | `/assets/portrait/mc/`     | 38×66 | pemuda, syal, biru, desa, pemain, karakter    | ready  |
| `char_npc_1`  | Pelajar bertopi biru | `/assets/char/npc_1.png`  | `/assets/portrait/npc_1/`  | 33×61 | pelajar, topi, biru, desa, remaja, warga      | ready  |
| `char_npc_3`  | Pelajar berkacamata  | `/assets/char/npc_3.png`  | `/assets/portrait/npc_3/`  | 33×62 | pelajar, kacamata, desa, remaja, warga, siswa | ready  |
| `char_npc_4`  | Gadis berjubah biru  | `/assets/char/npc_4.png`  | `/assets/portrait/npc_4/`  | 34×62 | gadis, jubah, biru, desa, warga, remaja       | ready  |
| `char_npc_5`  | Nenek bertongkat     | `/assets/char/npc_5.png`  | `/assets/portrait/npc_5/`  | 40×62 | nenek, tongkat, tua, desa, warga, bijak       | ready  |
| `char_npc_6`  | Kakek berjubah hijau | `/assets/char/npc_6.png`  | `/assets/portrait/npc_6/`  | 36×61 | kakek, jubah, hijau, desa, warga, tua         | ready  |
| `char_npc_7`  | Nelayan desa         | `/assets/char/npc_7.png`  | `/assets/portrait/npc_7/`  | 52×63 | nelayan, perahu, ikan, desa, warga, sungai    | ready  |
| `char_npc_8`  | Penjaga desa         | `/assets/char/npc_8.png`  | `/assets/portrait/npc_8/`  | 48×62 | penjaga, jaga, desa, warga, aman, pos         | ready  |
| `char_npc_9`  | Petani desa          | `/assets/char/npc_9.png`  | `/assets/portrait/npc_9/`  | 44×61 | petani, sawah, tani, desa, warga, panen       | ready  |
| `char_npc_10` | Tetua bijak desa     | `/assets/char/npc_10.png` | `/assets/portrait/npc_10/` | 37×63 | tetua, bijak, tua, desa, warga, penasihat     | ready  |

## Dunia desa (kind `world`)

Satu peta desa `2390×1792` dan potongan objek yang dipasang editor peta.
Kolom Ukuran adalah ukuran berkas asli; skala dan posisi di peta diatur data
editor (`src/game/world/village.json`), bukan ukuran berkas.

Entri di bawah **tidak** boleh dipakai sebagai `backgroundId` cerita.

| id                                                  | Label                                      | Path                                                            | Ukuran    | Tags                                                     |
| --------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | --------- | -------------------------------------------------------- |
| `world_map_village`                                 | Peta desa                                  | `/assets/world/map_village.jpg`                                 | 2390×1792 | peta, desa, dunia, latar, map, village                   |
| `world_mirrored_pixel_cottage_sprite_set`           | Mirrored Pixel Cottage Sprite Set          | `/assets/world/mirrored_pixel_cottage_sprite_set.png`           | 205×128   | mirrored, pixel, cottage, sprite, set, desa, objek, aset |
| `world_pixel_art_benches__front_and_top_down_views` | Pixel Art Benches Front And Top Down Views | `/assets/world/pixel_art_benches__front_and_top_down_views.png` | 989×887   | pixel, art, benches, front, and, top, down, views        |
| `world_bush_03_cream_white_blooms_1`                | Bush 03 Cream White Blooms 1               | `/assets/world/bush_03_cream_white_blooms_1.png`                | 1024×1024 | bush, 03, cream, white, blooms, 1, desa, objek           |
| `world_bush_03_cream_white_blooms_crop`             | Bush 03 Cream White Blooms Crop            | `/assets/world/bush_03_cream_white_blooms_crop.png`             | 805×1024  | bush, 03, cream, white, blooms, crop, desa, objek        |
| `world_bush_11_large_pink_blooms_1`                 | Bush 11 Large Pink Blooms 1                | `/assets/world/bush_11_large_pink_blooms_1.png`                 | 1024×1024 | bush, 11, large, pink, blooms, 1, desa, objek            |
| `world_bush_14_tiny_white_blooms_1`                 | Bush 14 Tiny White Blooms 1                | `/assets/world/bush_14_tiny_white_blooms_1.png`                 | 1024×1024 | bush, 14, tiny, white, blooms, 1, desa, objek            |
| `world_bush_16_purple_cluster_blooms_1`             | Bush 16 Purple Cluster Blooms 1            | `/assets/world/bush_16_purple_cluster_blooms_1.png`             | 1024×1024 | bush, 16, purple, cluster, blooms, 1, desa, objek        |
| `world_bush_16_purple_cluster_blooms_crop`          | Bush 16 Purple Cluster Blooms Crop         | `/assets/world/bush_16_purple_cluster_blooms_crop.png`          | 709×1024  | bush, 16, purple, cluster, blooms, crop, desa, objek     |
| `world_bush_16_purple_cluster_blooms_crop2`         | Bush 16 Purple Cluster Blooms Crop2        | `/assets/world/bush_16_purple_cluster_blooms_crop2.png`         | 551×1024  | bush, 16, purple, cluster, blooms, crop2, desa, objek    |
| `world_bush_18_ivory_blooms_1`                      | Bush 18 Ivory Blooms 1                     | `/assets/world/bush_18_ivory_blooms_1.png`                      | 1024×1024 | bush, 18, ivory, blooms, 1, desa, objek, aset            |
| `world_bush_22_lavender_bells_1`                    | Bush 22 Lavender Bells 1                   | `/assets/world/bush_22_lavender_bells_1.png`                    | 1024×1024 | bush, 22, lavender, bells, 1, desa, objek, aset          |
| `world_bush_23_white_red_mix_1`                     | Bush 23 White Red Mix 1                    | `/assets/world/bush_23_white_red_mix_1.png`                     | 1024×1024 | bush, 23, white, red, mix, 1, desa, objek                |
| `world_bush_24_yellow_cluster_1`                    | Bush 24 Yellow Cluster 1                   | `/assets/world/bush_24_yellow_cluster_1.png`                    | 1024×1024 | bush, 24, yellow, cluster, 1, desa, objek, aset          |
| `world_fountain`                                    | Fountain                                   | `/assets/world/fountain.png`                                    | 1263×1246 | fountain, desa, objek, aset                              |
| `world_house_blue`                                  | House Blue                                 | `/assets/world/house_blue.png`                                  | 184×128   | house, blue, desa, objek, aset                           |
| `world_house_blue_2`                                | House Blue 2                               | `/assets/world/house_blue_2.png`                                | 256×138   | house, blue, 2, desa, objek, aset                        |
| `world_house_red`                                   | House Red                                  | `/assets/world/house_red.png`                                   | 185×128   | house, red, desa, objek, aset                            |
| `world_library`                                     | Library                                    | `/assets/world/library.png`                                     | 148×137   | library, desa, objek, aset                               |
| `world_long_flower_planter`                         | Long Flower Planter                        | `/assets/world/long_flower_planter.png`                         | 1536×1024 | long, flower, planter, desa, objek, aset                 |
| `world_old_garden`                                  | Old Garden                                 | `/assets/world/old_garden.png`                                  | 128×128   | old, garden, desa, objek, aset                           |
| `world_pathway`                                     | Pathway                                    | `/assets/world/pathway.png`                                     | 887×887   | pathway, desa, objek, aset                               |
| `world_short_flower_planter`                        | Short Flower Planter                       | `/assets/world/short_flower_planter.png`                        | 1536×1024 | short, flower, planter, desa, objek, aset                |
| `world_stone_well`                                  | Stone Well                                 | `/assets/world/stone_well.png`                                  | 1254×1254 | stone, well, desa, objek, aset                           |
| `world_streetlamp_casual`                           | Streetlamp Casual                          | `/assets/world/streetlamp_casual.png`                           | 26×128    | streetlamp, casual, desa, objek, aset                    |
| `world_streetlamp_with_banner`                      | Streetlamp With Banner                     | `/assets/world/streetlamp_with_banner.png`                      | 36×128    | streetlamp, with, banner, desa, objek, aset              |
| `world_streetlamp_with_banner_copy`                 | Streetlamp With Banner Copy                | `/assets/world/streetlamp_with_banner_copy.png`                 | 36×128    | streetlamp, with, banner, copy, desa, objek, aset        |
| `world_tree_regular_1_1`                            | Tree Regular 1 1                           | `/assets/world/tree_regular_1_1.png`                            | 102×128   | tree, regular, 1, desa, objek, aset                      |
| `world_tree_regular_1_crop`                         | Tree Regular 1 Crop                        | `/assets/world/tree_regular_1_crop.png`                         | 55×128    | tree, regular, 1, crop, desa, objek, aset                |
| `world_tree_regular_1_crop2`                        | Tree Regular 1 Crop2                       | `/assets/world/tree_regular_1_crop2.png`                        | 102×74    | tree, regular, 1, crop2, desa, objek, aset               |
| `world_tree_regular_2_1`                            | Tree Regular 2 1                           | `/assets/world/tree_regular_2_1.png`                            | 80×128    | tree, regular, 2, 1, desa, objek, aset                   |
| `world_tree_regular_2_crop`                         | Tree Regular 2 Crop                        | `/assets/world/tree_regular_2_crop.png`                         | 80×97     | tree, regular, 2, crop, desa, objek, aset                |
| `world_tree_regular_2_crop2`                        | Tree Regular 2 Crop2                       | `/assets/world/tree_regular_2_crop2.png`                        | 48×67     | tree, regular, 2, crop2, desa, objek, aset               |
| `world_tree_regular_3_1`                            | Tree Regular 3 1                           | `/assets/world/tree_regular_3_1.png`                            | 117×128   | tree, regular, 3, 1, desa, objek, aset                   |
| `world_tree_regular_3_crop`                         | Tree Regular 3 Crop                        | `/assets/world/tree_regular_3_crop.png`                         | 117×23    | tree, regular, 3, crop, desa, objek, aset                |
| `world_tree_regular_3_crop2`                        | Tree Regular 3 Crop2                       | `/assets/world/tree_regular_3_crop2.png`                        | 117×43    | tree, regular, 3, crop2, desa, objek, aset               |
| `world_tree_regular_3_crop3`                        | Tree Regular 3 Crop3                       | `/assets/world/tree_regular_3_crop3.png`                        | 100×128   | tree, regular, 3, crop3, desa, objek, aset               |
| `world_tree_regular_3_crop4`                        | Tree Regular 3 Crop4                       | `/assets/world/tree_regular_3_crop4.png`                        | 117×87    | tree, regular, 3, crop4, desa, objek, aset               |
| `world_tree_regular_3_crop5`                        | Tree Regular 3 Crop5                       | `/assets/world/tree_regular_3_crop5.png`                        | 88×128    | tree, regular, 3, crop5, desa, objek, aset               |
| `world_tree_regular_3_crop6`                        | Tree Regular 3 Crop6                       | `/assets/world/tree_regular_3_crop6.png`                        | 117×117   | tree, regular, 3, crop6, desa, objek, aset               |
| `world_tree_regular_3_crop7`                        | Tree Regular 3 Crop7                       | `/assets/world/tree_regular_3_crop7.png`                        | 117×76    | tree, regular, 3, crop7, desa, objek, aset               |
| `world_tree_regular_3_crop8`                        | Tree Regular 3 Crop8                       | `/assets/world/tree_regular_3_crop8.png`                        | 83×128    | tree, regular, 3, crop8, desa, objek, aset               |
| `world_tree_regular_4_1`                            | Tree Regular 4 1                           | `/assets/world/tree_regular_4_1.png`                            | 105×128   | tree, regular, 4, 1, desa, objek, aset                   |
| `world_tree_regular_4_crop`                         | Tree Regular 4 Crop                        | `/assets/world/tree_regular_4_crop.png`                         | 105×64    | tree, regular, 4, crop, desa, objek, aset                |
| `world_tree_regular_4_crop2`                        | Tree Regular 4 Crop2                       | `/assets/world/tree_regular_4_crop2.png`                        | 105×72    | tree, regular, 4, crop2, desa, objek, aset               |
| `world_tree_regular_5_1`                            | Tree Regular 5 1                           | `/assets/world/tree_regular_5_1.png`                            | 101×128   | tree, regular, 5, 1, desa, objek, aset                   |
| `world_tree_regular_5_crop`                         | Tree Regular 5 Crop                        | `/assets/world/tree_regular_5_crop.png`                         | 101×89    | tree, regular, 5, crop, desa, objek, aset                |
| `world_tree_regular_5_crop2`                        | Tree Regular 5 Crop2                       | `/assets/world/tree_regular_5_crop2.png`                        | 101×57    | tree, regular, 5, crop2, desa, objek, aset               |
| `world_tree_regular_5_crop3`                        | Tree Regular 5 Crop3                       | `/assets/world/tree_regular_5_crop3.png`                        | 101×38    | tree, regular, 5, crop3, desa, objek, aset               |
| `world_tree_regular_5_crop4`                        | Tree Regular 5 Crop4                       | `/assets/world/tree_regular_5_crop4.png`                        | 101×86    | tree, regular, 5, crop4, desa, objek, aset               |
| `world_tree_regular_5_crop5`                        | Tree Regular 5 Crop5                       | `/assets/world/tree_regular_5_crop5.png`                        | 89×55     | tree, regular, 5, crop5, desa, objek, aset               |
| `world_tree_regular_5_crop6`                        | Tree Regular 5 Crop6                       | `/assets/world/tree_regular_5_crop6.png`                        | 101×108   | tree, regular, 5, crop6, desa, objek, aset               |
| `world_tree_regular_5_crop7`                        | Tree Regular 5 Crop7                       | `/assets/world/tree_regular_5_crop7.png`                        | 101×65    | tree, regular, 5, crop7, desa, objek, aset               |
| `world_tree_sakura_1`                               | Tree Sakura 1                              | `/assets/world/tree_sakura_1.png`                               | 118×128   | tree, sakura, 1, desa, objek, aset                       |
| `world_tree_spruce_1`                               | Tree Spruce 1                              | `/assets/world/tree_spruce_1.png`                               | 105×128   | tree, spruce, 1, desa, objek, aset                       |
| `world_tree_spruce_crop10`                          | Tree Spruce Crop10                         | `/assets/world/tree_spruce_crop10.png`                          | 105×37    | tree, spruce, crop10, desa, objek, aset                  |
| `world_tree_spruce_crop11`                          | Tree Spruce Crop11                         | `/assets/world/tree_spruce_crop11.png`                          | 105×64    | tree, spruce, crop11, desa, objek, aset                  |
| `world_tree_spruce_crop12`                          | Tree Spruce Crop12                         | `/assets/world/tree_spruce_crop12.png`                          | 73×104    | tree, spruce, crop12, desa, objek, aset                  |
| `world_tree_spruce_crop13`                          | Tree Spruce Crop13                         | `/assets/world/tree_spruce_crop13.png`                          | 86×128    | tree, spruce, crop13, desa, objek, aset                  |
| `world_tree_spruce_crop15`                          | Tree Spruce Crop15                         | `/assets/world/tree_spruce_crop15.png`                          | 69×128    | tree, spruce, crop15, desa, objek, aset                  |
| `world_tree_spruce_crop16`                          | Tree Spruce Crop16                         | `/assets/world/tree_spruce_crop16.png`                          | 105×30    | tree, spruce, crop16, desa, objek, aset                  |
| `world_tree_spruce_crop17`                          | Tree Spruce Crop17                         | `/assets/world/tree_spruce_crop17.png`                          | 105×103   | tree, spruce, crop17, desa, objek, aset                  |
| `world_tree_spruce_crop18`                          | Tree Spruce Crop18                         | `/assets/world/tree_spruce_crop18.png`                          | 105×118   | tree, spruce, crop18, desa, objek, aset                  |
| `world_tree_spruce_crop19`                          | Tree Spruce Crop19                         | `/assets/world/tree_spruce_crop19.png`                          | 60×128    | tree, spruce, crop19, desa, objek, aset                  |
| `world_tree_spruce_crop2`                           | Tree Spruce Crop2                          | `/assets/world/tree_spruce_crop2.png`                           | 105×117   | tree, spruce, crop2, desa, objek, aset                   |
| `world_tree_spruce_crop20`                          | Tree Spruce Crop20                         | `/assets/world/tree_spruce_crop20.png`                          | 105×63    | tree, spruce, crop20, desa, objek, aset                  |
| `world_tree_spruce_crop21`                          | Tree Spruce Crop21                         | `/assets/world/tree_spruce_crop21.png`                          | 54×128    | tree, spruce, crop21, desa, objek, aset                  |
| `world_tree_spruce_crop22`                          | Tree Spruce Crop22                         | `/assets/world/tree_spruce_crop22.png`                          | 70×128    | tree, spruce, crop22, desa, objek, aset                  |
| `world_tree_spruce_crop23`                          | Tree Spruce Crop23                         | `/assets/world/tree_spruce_crop23.png`                          | 99×128    | tree, spruce, crop23, desa, objek, aset                  |
| `world_tree_spruce_crop3`                           | Tree Spruce Crop3                          | `/assets/world/tree_spruce_crop3.png`                           | 54×128    | tree, spruce, crop3, desa, objek, aset                   |
| `world_tree_spruce_crop4`                           | Tree Spruce Crop4                          | `/assets/world/tree_spruce_crop4.png`                           | 105×23    | tree, spruce, crop4, desa, objek, aset                   |
| `world_tree_spruce_crop5`                           | Tree Spruce Crop5                          | `/assets/world/tree_spruce_crop5.png`                           | 73×62     | tree, spruce, crop5, desa, objek, aset                   |
| `world_tree_spruce_crop6`                           | Tree Spruce Crop6                          | `/assets/world/tree_spruce_crop6.png`                           | 105×32    | tree, spruce, crop6, desa, objek, aset                   |
| `world_tree_spruce_crop7`                           | Tree Spruce Crop7                          | `/assets/world/tree_spruce_crop7.png`                           | 105×47    | tree, spruce, crop7, desa, objek, aset                   |
| `world_tree_spruce_crop8`                           | Tree Spruce Crop8                          | `/assets/world/tree_spruce_crop8.png`                           | 105×54    | tree, spruce, crop8, desa, objek, aset                   |
| `world_tree_spruce_crop9`                           | Tree Spruce Crop9                          | `/assets/world/tree_spruce_crop9.png`                           | 105×52    | tree, spruce, crop9, desa, objek, aset                   |
| `world_welcome_sign`                                | Welcome Sign                               | `/assets/world/welcome_sign.png`                                | 128×128   | welcome, sign, desa, objek, aset                         |
| `world_wooden_bench_left_side`                      | Wooden Bench Left Side                     | `/assets/world/wooden_bench_left_side.png`                      | 1024×1536 | wooden, bench, left, side, desa, objek, aset             |
| `world_wooden_bench_side`                           | Wooden Bench Side                          | `/assets/world/wooden_bench_side.png`                           | 1024×1536 | wooden, bench, side, desa, objek, aset                   |
| `world_wooden_fence_horizontal`                     | Wooden Fence Horizontal                    | `/assets/world/wooden_fence_horizontal.png`                     | 869×128   | wooden, fence, horizontal, desa, objek, aset             |
| `world_wooden_fence_vertical`                       | Wooden Fence Vertical                      | `/assets/world/wooden_fence_vertical.png`                       | 16×128    | wooden, fence, vertical, desa, objek, aset               |

## Musik

Satu lagu untuk seluruh permainan; chapter tidak berganti lagu.

| id            | Label      | Path                        | Tags                                   | Status |
| ------------- | ---------- | --------------------------- | -------------------------------------- | ------ |
| `bgm_default` | Musik desa | `/assets/music/default.mp3` | desa, tenang, hangat, pengantar, musik | ready  |

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

Sejak ADR 0017, panel dialog (`ui_textbox`) dipasang DOM sebagai `<img>`, bukan
dimuat Phaser, dan bingkai potret (`ui_portrait_frame`) tidak dipakai runtime
karena potret digambar tanpa bingkai. Keduanya tetap ada di manifest supaya
tidak ada aset yang hilang dari repo; kalau nanti dipastikan tidak dibutuhkan,
hapus lewat ADR baru beserta penyesuaian hitungan kind `ui`.

## Font game

Font teks game **bukan** aset Phaser dan tidak masuk `src/assets/manifest.ts`;
dimuat `next/font/local` dari `public/fonts/` (ADR 0007).

| File                           | Ukuran   | Kegunaan              |
| ------------------------------ | -------- | --------------------- |
| `patrick-hand-latin.woff2`     | 23.944 B | Subset Latin (utama)  |
| `patrick-hand-latin-ext.woff2` | 20.112 B | Subset Latin Extended |
| `OFL.txt`                      | 4.376 B  | Lisensi SIL OFL 1.1   |

## Ringkasan

| Kind         | Jumlah  |
| ------------ | ------- |
| `background` | 1       |
| `character`  | 10      |
| `world`      | 81      |
| `music`      | 1       |
| `sfx`        | 4       |
| `ui`         | 3       |
| **Total**    | **100** |

## Prioritas bila aset perlu dibuat ulang

Urutan yang disarankan agar game tetap bisa tampil:

1. `bun run assets:world` — peta desa, objek, karakter, dan lagu.
2. `bun run assets:characters` — spritesheet beranimasi dan ukuran frame.
3. `bun run assets:portraits` — enam potret dialog per karakter.
4. `bun run assets:generate` — latar default, panel UI, sfx.
5. Periksa `bun run test` (test manifest memeriksa file dan jumlah per kind).

## Sumber dan lisensi

| Kelompok aset                                                              | Sumber                                                                                                                                       | Lisensi      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `bg_default`, `ui_*`, `sfx_*`                                              | Dibuat generator repo (`scripts/lib/*.mjs`)                                                                                                  | Milik proyek |
| Peta desa, objek `world_*`, `char_mc`, `char_npc_*`, potret, `bgm_default` | Dibuat tim dengan alat AI generatif, disalin `scripts/import-world.mjs`, `scripts/import-characters.mjs`, dan `scripts/import-portraits.mjs` | Milik proyek |
| Font Patrick Hand (`public/fonts/`)                                        | Google Fonts                                                                                                                                 | SIL OFL 1.1  |

Aset dunia desa (peta, potongan objek, karakter, potret, dan lagu) **dibuat tim
sendiri dengan alat AI generatif**, lalu disusun di editor peta
`pixel-map-placer.html`. Tidak ada aset yang diambil dari situs paket aset gratis
maupun dari game komersial. Yang di-commit hanya berkas jadi yang dipakai game,
bukan berkas mentah atau berkas proyek editor.

Kalau nanti menambah aset dari pihak ketiga, catat sumber, pembuat, dan
lisensinya lebih dulu di [`asset-guide.md`](asset-guide.md) dan
[`../../README.md`](../../README.md#atribusi-pihak-ketiga): guidebook LOGICODIX
mewajibkan atribusi setiap aset pihak ketiga.

Jangan mengisi kolom ini dengan "Google Images" atau nama game komersial.

## Cara memeriksa konsistensi

Test `src/assets/manifest.test.ts` memeriksa:

- setiap `id` di manifest punya file di path-nya,
- setiap file di folder aset terdaftar di manifest,
- jumlah aset per kind sesuai tabel ringkasan ini,
- semua `id` unik dan berprefix benar,
- karakter punya `frameWidth`/`frameHeight` dan potret yang benar-benar ada.

Kalau test gagal karena file belum ada, buat placeholder dulu — jangan
menghapus entri manifest.
