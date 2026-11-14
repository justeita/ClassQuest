---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Konvensi Penamaan Aset

Konsistensi nama adalah yang membuat AI bisa memilih aset dengan benar dan
membuat kode tidak penuh string ajaib.

## Aturan umum

- Semua `id` dan nama file memakai **`snake_case`**.
- Hanya huruf kecil `a-z`, angka `0-9`, dan `_`.
- Tanpa spasi, tanpa tanda hubung, tanpa titik selain ekstensi.
- Tanpa karakter non-ASCII.
- `id` **unik** dan **tidak pernah diubah** setelah dipakai cerita.

## Format `id`

```text
{prefix}_{kategori}_{varian}
```

| Kind         | Prefix  | Pola                    | Contoh             |
| ------------ | ------- | ----------------------- | ------------------ |
| `background` | `bg_`   | `bg_{tempat}[_{waktu}]` | `bg_classroom_day` |
| `character`  | `char_` | `char_{nama}`           | `char_pak_bima`    |
| `music`      | `bgm_`  | `bgm_{suasana}`         | `bgm_school_calm`  |
| `sfx`        | `sfx_`  | `sfx_{aksi}`            | `sfx_correct`      |
| `ui`         | `ui_`   | `ui_{elemen}`           | `ui_textbox`       |

`_{waktu}` wajib kalau tempat yang sama bisa muncul di waktu berbeda (kelas siang
vs kelas malam). Kalau tidak punya variasi waktu, cukup `bg_{tempat}` — contohnya
`bg_cloud_sky` (langit di atas awan) dan `bg_default`.

### Kosakata waktu/tempat

Pakai kosakata terbatas agar bisa ditebak AI:

| Dimensi | Nilai yang dipakai                                                        |
| ------- | ------------------------------------------------------------------------- |
| Waktu   | `day`, `evening`, `night`, `dawn`                                         |
| Tempat  | `classroom`, `schoolyard`, `library`, `river`, `mountain`, `sky`, `cloud` |
| Suasana | `calm`, `adventure`, `mystery`, `ending`, `tense`                         |

Jangan memakai sinonim acak (`morning` vs `dawn`, `yard` vs `schoolyard`).

## Nama file

Nama file = `id` tanpa prefix.

| `id`                 | Path file                                    |
| -------------------- | -------------------------------------------- |
| `bg_classroom_day`   | `public/assets/bg/classroom_day.png`         |
| `char_nara`          | `public/assets/char/nara.png`                |
| `char_nara` (potret) | `public/assets/portrait/nara/<ekspresi>.png` |
| `bgm_school_calm`    | `public/assets/music/school_calm.ogg`        |
| `sfx_correct`        | `public/assets/sfx/correct.ogg`              |
| `ui_textbox`         | `public/assets/ui/textbox.png`               |

Aturan:

- Nama file **harus** konsisten dengan `id`; test manifest memeriksa ini.
- Pengecualian: potret memakai folder `<nama>/<ekspresi>.png` di
  `public/assets/portrait/`, dengan `<nama>` mengikuti berkas sumber (`mc`,
  `npc_1`, …) dan `<ekspresi>` salah satu dari enam ekspresi (ADR 0023).
- Jangan menambahkan suffix versi (`_v2`, `_final`, `_fix`). Ganti isi file, bukan
  namanya.
- Jangan memakai nama orang nyata untuk karakter. Gunakan nama fiktif.

## Nama karakter

- `char_{nama_depan}` — `char_nara`.
- Untuk guru, tetap pakai nama: `char_pak_bima` (bukan `char_teacher_1`), karena
  AI perlu menulis dialog yang menyebut nama. Nama depan saja (`char_bima`) juga
  salah, karena "Pak" adalah bagian dari cara siswa memanggilnya dan membedakannya
  dari karakter lain bernama sama.
- Nama tampilan ada di `cast[].name`, bukan di id.

## Label dan tag

`label` adalah teks yang dilihat guru:

- Bahasa Indonesia, singkat, deskriptif.
- Sebut tempat + waktu: "Kelas, siang".
- Jangan memakai id di label.

`tags` adalah kata kunci untuk AI:

- Minimal 4.
- Campur Indonesia + Inggris untuk hal penting.
- Deskripsikan isi dan suasana, bukan nama file.
- Contoh: `["kelas", "sekolah", "belajar", "siang", "classroom", "indoor"]`.

## Id di dalam cerita

Selain aset, cerita punya id sendiri:

| Entitas   | Pola            | Contoh               |
| --------- | --------------- | -------------------- |
| Chapter   | `ch_{nn}`       | `ch_01`              |
| Scene     | `sc_{nn}_{nn}`  | `sc_01_02`           |
| Challenge | `chl_{nn}_{nn}` | `chl_01_01`          |
| Opsi      | `opt_{slug}`    | `opt_a`              |
| Item      | `itm_{slug}`    | `itm_naik`           |
| Story     | `st_{nanoid}`   | `st_demo_siklus_air` |

Aturan:

- Jangan memakai judul sebagai id.
- Jangan memakai indeks array sebagai id (rusak saat urutan berubah).
- Id chapter/scene mengikuti nomor urut agar mudah dibaca, tapi jangan
  mengandalkan nomor untuk logika — gunakan urutan array.

## Larangan

| Jangan                   | Alasan                          |
| ------------------------ | ------------------------------- |
| `BG_Classroom.PNG`       | Huruf besar, tidak konsisten    |
| `background kelas 1.png` | Spasi, tidak bisa jadi id       |
| `char_nara_final_v2`     | Versi di nama, bukan di kontrol |
| `bg_omori_style`         | Merujuk karya berhak cipta      |
| `sfx_sound1`             | Tidak deskriptif                |
| `bg_kelas`               | Campur bahasa tanpa alasan      |
