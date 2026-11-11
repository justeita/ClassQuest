---
status: draft
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Rencana Integrasi 2 Map, Karakter Referensi, dan Story Demo

Dokumen ini merinci rencana teknis dan arsitektur untuk memperbarui dunia permainan ClassQuest:

1. **Dua Map Utama**: Gedung Sekolah (Indoor: Lorong & Kelas) dan Halaman Luar (Outdoor: Taman Edukasi/Halaman Sekolah).
2. **Aset Eksternal**: Penggunaan aset referensi dari `D:\Data\LOGICODIX 26\Asset` (pepohonan, interior, semak) yang sudah diproses menjadi prop game.
3. **Karakter Baru**: Protagonis (MC) digambar ulang di generator repo dengan siluet terinspirasi Nino (ekor kembar dan pita kupu-kupu), memakai kerangka animasi 8 arah milik proyek.
4. **Story Demo / Fixture**: Pembaruan cerita demo statis (`demo-story.json`) agar skenario cerita secara alami mengeksplorasi kedua map tersebut.

> **Status implementasi (2026-11-11).** PR 1 (aset + manifest) selesai:
> tile koridor, prop taman/interior, `char_nino`, dan portrait-nya sudah ada di
> manifest. PR 2 (data ruangan) dan PR 3 (story demo) belum dikerjakan; ukuran
> dan detail di bawah adalah target PR 2.

---

## 1. Rencana Dua Map Utama

Mengikuti [ADR 0009](../09-decisions/0009-resolution-and-scale.md) dan [ADR 0010](../09-decisions/0010-map-data-and-camera.md), viewport kamera adalah 640×360 px (40×22.5 tile @ 16px). Ruangan dibuat lebih luas dari layar agar kamera _lerp_ (mengikuti pemain).

### Map 1: Gedung Sekolah (Indoor)

Gedung sekolah dibagi menjadi 2 room data terpisah untuk memberikan fokus visual ala _Undertale_ / _Omori_:

#### 1A. Lorong Utama (`lorong_sekolah`)

- **Fungsi**: Hub penghubung antar ruangan sekolah dan jalan keluar ke halaman.
- **Ukuran**: 60×24 tile (960×384 px, lorong memanjang horizontal). Tinggi 24 tile dipilih supaya memenuhi minimum 40×23 di [`world-design.md`](./world-design.md) — dengan 18 tile (288 px) kamera 360 px akan memperlihatkan area kosong di luar peta.
- **Lantai & Dinding**: Lantai ubin koridor (`tile_floor_corridor`), dinding atas 2 tile (`tile_wall_plaster`) dengan pintu-pintu kelas dan jendela kaca.
- **Objek/Prop**: Mading sekolah, rak (`prop_shelf`), pot tanaman, pintu kelas A (`prop_door` di `tileX: 16`), pintu kelas B (`prop_door` di `tileX: 36`), dan pintu keluar ke halaman di ujung kanan (`tileX: 56`).
- **NPC**: Siswa lain (Rani) yang memberi petunjuk awal sebelum masuk kelas.

#### 1B. Ruang Kelas (`kelas_a`)

- **Fungsi**: Tempat KBM, interaksi dengan Pak Bima, dan pengerjaan kuis/tantangan di papan tulis.
- **Ukuran**: 48×28 tile (768×448 px).
- **Lantai & Dinding**: Lantai parket kayu, dinding plester.
- **Objek/Prop**:
  - Papan tulis besar di dinding depan (`tileX: 20, tileY: 2, tileW: 8, tileH: 2`, `solid: true`).
  - Meja guru di sisi papan tulis.
  - 4–6 pasang meja dan kursi siswa berderet dengan lorong tengah aman (lebar ≥ 2 tile).
  - Pintu keluar di bagian bawah (`tileX: 24, tileY: 27`).
- **NPC**: Pak Bima di dekat papan tulis sebagai pemegang quest utama Chapter 1.

---

### Map 2: Halaman Luar & Taman Botani Edukasi (Outdoor)

#### Halaman Sekolah & Taman Edukasi (`halaman_sekolah`)

- **Fungsi**: Eksplorasi sains/lingkungan (siklus air, ekosistem tanaman). Memberikan suasana petualangan terbuka (_sense of wonder_).
- **Ukuran**: 56×34 tile (896×544 px).
- **Lantai & Dinding**:
  - Lantai dasar: Rumput (`tile_floor_grass`).
  - Batas keliling: Pagar tanaman (`tile_wall_hedge`) dan pagar kayu (`prop_fence`).
  - Jalan setapak: Batu (`tile_floor_rock`).
- **Objek/Prop (Diambil dari referensi Asset)**:
  - Pohon rindang besar (`prop_tree_large`), pohon sedang (`prop_tree_medium`), dan pohon berbunga (`prop_tree_flower`).
  - Semak kecil (`prop_bush_small`) dan semak bunga merah muda (`prop_bush_flower`).
  - Kolam kecil (`prop_pond`) dengan air (`tile_floor_water`).
- **NPC**: Tirta (roh air) di tepi kolam dan Pak Bima yang sedang mengamati alam.

---

## 2. Standar Kualitas Visual Aset: "HD Pixel Art Berkualitas Tinggi tapi Tetap Ringan"

Untuk menghasilkan visual game yang terlihat **HD, modern, tajam, dan profesional** (tidak pecah atau blur, mirip standar visual _Omori_, _Stardew Valley_, atau _Eastward_), seluruh kategori aset di ClassQuest menerapkan standar terpadu:

### 2.1. Standar Prop Luar Ruangan (Pohon, Semak, Dekorasi Taman)

- **Sumber**: `D:\Data\LOGICODIX 26\Asset\craftpix-net-385863-free-top-down-trees-pixel-art\` & `craftpix-net-141354-free-top-down-bushes-pixel-art\`
- **Pilihan Varian Wajib**: Gunakan varian bertekstur dengan bayangan — `PNG/Assets_separately/Trees_texture_shadow/` untuk pohon dan `PNG/Assets_texture_shadow/` untuk semak, bukan varian flat.
- **Karakteristik**:
  - Dedaunan memiliki gradasi bayangan dan highlight bertekstur (_textured pixel clusters_).
  - Dilengkapi _built-in soft ambient shadow_ di bagian bawah (transparan alpha), sehingga menyatu alami di atas tile lantai tanpa terlihat melayang.
  - **Pohon Rindang HD**: Resolusi 128×128 px (8×8 tile grid 16px). Sangat megah sebagai kanopi alami.
  - **Semak & Bunga HD**: Resolusi 64×64 px (4×4 tile) atau 32×32 px (2×2 tile).
  - **Ukuran File**: Sangat ringan (~2 KB s.d. ~5 KB per file PNG terkompresi).

### 2.2. Standar Interior & Prop Dalam Ruangan (Sekolah, Meja, Papan Tulis, Rak)

- **Sumber**: `main-characters-home-free-top-down-pixel-art-asset/PNG/Interior.png` (rak buku) & `walls_floor.png` (pintu). Meja, papan tulis, dan prop lain tetap digambar generator `tiles.mjs` supaya ukurannya pas dengan tile 16 px.
- **Karakteristik**:
  - Garis outline 1 px tegas (_dark outline_) yang konsisten, tanpa anti-aliasing buram.
  - Meja kelas dan lemari digambar dari sudut pandang 3/4 top-down (bagian atas meja terlihat luas, bagian kaki memiliki bayangan alas 1–2 px).
  - Prop memiliki ukuran proporsional terhadap karakter (misal meja siswa 32×32 atau 48×32 px, papan tulis 96×32 atau 112×32 px).
  - Collision padat diset hanya di bagian alas/kaki furnitur, bukan di bagian atas meja, agar karakter terasa berdiri di samping atau di depan meja.

### 2.3. Standar Karakter (MC Nino & NPC)

- **Sumber**: digambar generator repo (`scripts/lib/characters.mjs`). Referensi visual `Nino_Nakano_ver1.webp` hanya dipakai untuk siluet dan warna; tidak ada berkas seni berhak cipta yang disalin. `The Female Adventurer - Free` tidak dipakai karena frame-nya 64×64 dengan 6 arah dan mengandung garis kecepatan, sehingga tidak bisa dipaskan ke grid 24×32 tanpa mengubah gaya.
- **Karakteristik**:
  - Frame karakter standar: **24×32 px** (proporsi chibi top-down 1.5×2 tile). Tidak ada frame 32×48; ADR 0009 sudah menetapkan 24×32.
  - Outline bersih 1 px gelap yang serasi dengan pohon dan dinding ruangan.
  - Animasi jalan 8 arah yang mulus (gerakan kaki dan ayunan ekor kembar).
  - Bayangan karakter mengikuti elips bawaan generator; collider tetap kotak 12×8 px di kaki.
  - **Portrait Dialog**: Resolusi **64×64 px** di atas panel dialog DOM, menampilkan wajah Nino dengan pita kupu-kupu di kedua sisi.

### 2.4. Standar Rendering Engine (Phaser & CSS)

- **Zero Blurring**:
  - Kanvas game disetel ke `pixelArt: true` di konfigurasi Phaser (`src/game/config.ts`).
  - CSS kanvas menggunakan `image-rendering: pixelated` dan `crisp-edges`.
  - Kamera memakai `roundPixels: true` agar pergerakan lerp kamera tidak menghasilkan getaran piksel (_pixel jitter_).
- **Performa**: Semua tekstur di-batch dalam atlas/individual PNG ringan, total konsumsi VRAM GPU tetap di bawah 15 MB dan stabil di 60 FPS di semua perangkat sekolah/laptop siswa.

---

## 3. Inventaris Aset & Pemetaan Sumber Referensi

| Kategori                | Berkas Sumber                               | Target di ClassQuest (`public/assets/` & manifest)           | Spesifikasi Standar HD Ringan                                                                                                      |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Pohon Rindang HD**    | `.../Trees_texture_shadow/Tree1.png`        | `prop_tree_large`                                            | 128×128 px (8×8 tile), detail bayangan daun bertekstur, ukuran file ~5 KB. Solid hanya di pangkal batang (lihat ADR 0011 di PR 2). |
| **Pohon Sedang HD**     | `.../Trees_texture_shadow/Tree2.png`        | `prop_tree_medium`                                           | 64×64 px (4×4 tile), tekstur bayangan halus.                                                                                       |
| **Pohon Berbunga**      | `.../Trees_texture_shadow/Flower_tree1.png` | `prop_tree_flower`                                           | 128×128 px, cocok untuk sudut observasi biologi di taman sekolah.                                                                  |
| **Semak Bertekstur HD** | `...bushes.../Autumn_bush1.png`             | `prop_bush_small`                                            | 64×64 px bertekstur bayangan daun rimbun.                                                                                          |
| **Semak Bunga**         | `...bushes.../Bush_pink_flowers1.png`       | `prop_bush_flower`                                           | 64×64 px, aksen bunga merah muda.                                                                                                  |
| **Rak Buku**            | `main-characters-home.../Interior.png`      | `prop_shelf`                                                 | Potong `x=160 y=80 32×48`, collision di kaki furnitur.                                                                             |
| **Pintu Kayu**          | `main-characters-home.../walls_floor.png`   | `prop_door`                                                  | Potong `x=112 y=96 32×32`, dipasang di dinding koridor.                                                                            |
| **Kolam Taman**         | generator `tiles.mjs`                       | `prop_pond`                                                  | 96×64 px, kolam dengan bibir batu, riak, dan daun teratai.                                                                         |
| **Lantai & Dinding**    | generator `tiles.mjs`                       | `tile_floor_corridor`, `tile_floor_wood`, `tile_floor_grass` | 16×16 px seamless; koridor memakai ubin teraso, kelas parket, halaman rumput.                                                      |
| **MC Nino**             | generator `characters.mjs`                  | `char_nino` + portrait                                       | Spritesheet 8 arah 432×32 (18 frame 24×32), portrait 64×64.                                                                        |

---

## 4. Rencana Karakter (MC Nino & NPC)

### 4.1. Main Character (MC - Nino)

- **Visual**: Siluet orisinal terinspirasi Nino (ekor kembar dan pita kupu-kupu) dengan proporsi chibi top-down 24×32 px, digambar generator dengan palet proyek. Rambut memakai turunan `warm` sehingga terbaca rose tanpa menambah warna di luar palet.
- **Kerangka Animasi**: Struktur 8 arah ditetapkan proyek (bukan disalin dari pack mana pun):
  - Arah: `down`, `up`, `left`, `right`, `down-left`, `down-right`, `up-left`, `up-right`.
  - Total frame pada spritesheet horizontal 432×32 px (18 frame @ 24×32 px):
    - Frame 0–1: Idle menghadap depan (kamera).
    - Frame 2–3: Jalan menghadap bawah (Down).
    - Frame 4–5: Jalan menghadap atas (Up).
    - Frame 6–7: Jalan menghadap kiri (Left).
    - Frame 8–9: Jalan menghadap kanan (Right).
    - Frame 10–11: Jalan serong kiri bawah (Down-Left).
    - Frame 12–13: Jalan serong kanan bawah (Down-Right).
    - Frame 14–15: Jalan serong kiri atas (Up-Left).
    - Frame 16–17: Jalan serong kanan atas (Up-Right).
- **Collider**: Kotak tabrakan 12×8 px berjangkar di kaki (`PLAYER_BODY_WIDTH = 12`, `PLAYER_BODY_HEIGHT = 8`).
- **Portrait**: 64×64 px wajah Nino dengan pita kupu-kupu untuk kotak dialog DOM.

> Catatan: `The Female Adventurer - Free` **tidak dipakai**. Berkas aslinya 384×64 per arah (6 frame 64×64, 6 arah) dan dua frame berisi garis kecepatan, jadi tidak cocok dengan grid 24×32 proyek.

### 4.2. NPC (Pak Bima, Tirta, Rani)

- **Visual**: Sprite 24×32 px.
- **Animasi**: Cukup 2 frame idle (bernapas halus 2 fps) menghadap ke depan/ke arah ruangan.
- **Interaksi**: Memiliki zona interaksi 1.5 tile di depan sprite untuk memicu dialog atau quest.

---

## 5. Pembaruan Story Demo (`demo-story.json`)

Agar 2 map (Gedung Sekolah dan Halaman Luar) terpakai secara fungsional dalam demo:

```mermaid
flowchart TD
  subgraph Chapter1["Chapter 1: Pengamatan di Dalam Kelas (Indoor)"]
    S1["sc_01_01: Mulai di Lorong Sekolah<br/>(Bicara dengan Rani & masuk ke kelas)"] --> S2["sc_01_02: Penjelasan Materi di Kelas A<br/>(Bicara dengan Pak Bima di depan papan)"]
    S2 --> S3["sc_01_03: Tantangan Konsep Kelas<br/>(Kuis Interaktif Papan Tulis)"]
  end

  subgraph Chapter2["Chapter 2: Penyelidikan di Halaman Sekolah (Outdoor)"]
    S3 --> S4["sc_02_01: Menuju Halaman Sekolah<br/>(Mencari fenomena air & pohon)"]
    S4 --> S5["sc_02_02: Interaksi dengan Tirta di Dekat Air<br/>(Observasi infiltrasi & evaporasi alami)"]
    S5 --> S6["sc_02_03: Ujian Akhir Siklus Alam<br/>(Tantangan Lapangan & Hasil Evaluasi)"]
  end
```

- **Manfaat**: Penguji/juri langsung dapat melihat perpindahan mulus dari ruangan indoor (lorong -> kelas) menuju outdoor (taman sekolah) lengkap dengan musik latar yang berganti otomatis (`bgm_school_calm` -> `bgm_adventure`).
