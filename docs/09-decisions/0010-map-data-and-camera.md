---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0010 — Map Data-Driven, Kamera Mengikuti Pemain, Collision dari Data

- **Status:** Accepted
- **Tanggal:** 2026-11-09
- **Pengambil keputusan:** developer frontend game
- **Menggantikan:** — (memperluas ADR 0008, tidak membatalkannya)

## Konteks

ADR 0008 memutuskan gerak bebas top-down dengan **map dummy** yang
didefinisikan di sisi game. Implementasinya hari ini ada di
`src/game/map.ts`: satu konstanta `DUMMY_ROOM` berukuran 480×270 yang dipakai
**semua** scene, dengan tiga masalah nyata:

1. **Collision tidak cocok dengan gambar.** `DUMMY_ROOM.walls` memuat kotak
   meja hardcoded `{ x: 170, y: 120, width: 96, height: 40 }`. Kotak itu tidak
   berasal dari gambar latar, jadi pemain berhenti di tengah ruangan seolah
   menabrak objek yang tidak terlihat.
2. **NPC sama di semua scene.** Dua NPC (`char_pak_bima`, `char_tirta`) muncul
   di setiap scene dengan posisi identik, termasuk scene yang latarnya bukan
   ruangan kelas.
3. **Tidak ada ruang untuk bergerak.** Ruangan persis seukuran layar
   internal dan kamera diam, jadi gerak bebas tidak terasa — pemain hanya
   bergeser di dalam satu gambar.

Selain itu, latar di manifest masih bergaya **pemandangan dari samping**
(perspektif orang berdiri menghadap kamera), padahal pemain bergerak di atas
bidang. Ini tidak bisa diperbaiki dengan menggambar ulang saja: data map harus
tahu di mana lantai, dinding, dan objek, supaya collision dan penempatan NPC
mengikuti gambar.

Batasan dari ADR 0002 dan 0008: **Story JSON tidak boleh diubah** untuk
keperluan ini. Map tetap milik sisi game.

## Opsi

| Opsi                                            | Kelebihan                                                               | Kekurangan                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A. Map dummy satu layar (sekarang)              | Tidak ada pekerjaan baru                                                | Tiga masalah di atas tetap ada                                    |
| **B. Map data per scene + kamera + depth sort** | Collision jujur, NPC per scene, ruangan lebih luas, urutan gambar benar | Butuh file data map, kalkulasi kamera, dan tes baru               |
| C. Tilemap penuh (editor eksternal + JSON tile) | Skalabel ke world besar                                                 | Menambah dependency/tool, format biner, di luar tenggat hackathon |

Untuk kamera:

| Opsi                         | Kelebihan                                          | Kekurangan                                        |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Tetap diam                   | Paling sederhana                                   | Ruangan lebih luas dari layar jadi tidak terlihat |
| **Ikuti pemain + batas map** | Terasa seperti Stardew/Omori; ruangan bisa 2 layar | Butuh `setBounds`, titik spawn, dan cek tepi peta |

## Keputusan

**Kami memilih opsi B: map data per scene, kamera mengikuti pemain dengan batas
map, dan collision yang diturunkan dari data objek yang sama dengan yang
digambar.** Status: **Accepted**.

Aturan bentuk datanya:

- Satu map = `sceneId` + `width`/`height` (kelipatan tile) + `spawn` +
  daftar `objects`.
- Setiap objek punya `kind` (`floor`, `wall`, `prop`, `npc`, `exit`),
  `tile` (posisi kelipatan 16), ukuran dalam tile, dan `solid: boolean`.
- **Collider dibuat dari objek yang sama yang menentukan gambar objek itu.**
  Tidak ada collider yang ditulis terpisah dari gambar — ini aturan yang
  menghapus bug "nabrak objek tak terlihat".
- Pemetaan `sceneId` → map jatuh ke `default` bila scene tidak punya map
  khusus, sama seperti aturan `resolveSceneLook()` di
  `src/game/sceneAssets.ts`.
- NPC diambil dari `story.cast`; map hanya menyebut **di mana** anggota cast
  berdiri di scene itu, tidak menambah id karakter baru.

Alasan:

1. Memisahkan gambar dan collision adalah penyebab bug yang sudah terlihat di
   demo; satu sumber data menghilangkannya tanpa menambah alat baru.
2. Bentuknya masih JSON sederhana di `src/game/maps/`, sehingga cerita dari AI
   tidak perlu tahu apa-apa tentang map.
3. Kamera mengikuti pemain adalah cara termurah membuat ruangan 640×360 terasa
   seperti dunia, tanpa membuka pintu ke world terbuka yang sudah ditolak
   ADR 0008.

## Konsekuensi

**Positif:**

- Ruangan bisa lebih luas dari layar; eksplorasi terasa nyata.
- NPC dan prop bisa berbeda per scene, mengikuti cerita.
- Bug collision objek tak terlihat hilang karena tidak ada data ganda.

**Negatif / utang:**

- `map.ts` diganti; `GameScene` perlu mantan `RoomMap` lama, `interaction.ts`
  perlu zona berbasis tile.
- Data map untuk setiap scene demo harus ditulis tangan (atau digenerate dari
  latar) — pekerjaan konten, bukan pekerjaan kode.
- Depth sorting (`setDepth(y)`) menambah satu aturan runtime yang harus
  dijaga setiap kali ada objek baru.

**Yang harus diubah (pada PR implementasi, bukan PR ini):**

- [`../04-game/world-design.md`](../04-game/world-design.md) — spesifikasi
  bentuk map dan aturan kamera.
- [`../04-game/scene-format.md`](../04-game/scene-format.md) — bagian
  "Ruangan dan eksplorasi".
- [`../04-game/game-design.md`](../04-game/game-design.md#eksplorasi-fase-explore)
  — kalimat "ruangan satu layar" diganti "ruangan satu peta".
- `src/game/map.ts`, `src/game/movement.ts`, `src/game/interaction.ts`,
  `src/game/scenes/GameScene.ts`, dan tesnya.
- [`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md)
  — baris map.

> **Implementasi:** bagian map data-driven dan collider dari objek sudah masuk
> lewat `src/game/maps/` + `buildRoomMap()` di `src/game/map.ts`. Kamera
> mengikuti pemain (`setBounds` + dead zone 8×6 tile + lerp 0.12) sudah masuk
> lewat `src/game/camera.ts`. Kind `exit` belum diimplementasi karena
> transisi antar-scene masih linear otomatis (ADR 0008).
>
> **Identitas ruangan:** `RoomData` memakai `roomId`, bukan `sceneId`. Beberapa
> scene yang terjadi di lokasi yang sama berbagi `roomId`, sehingga perpindahan
> scene tidak membangun ulang peta dan tidak mengembalikan pemain ke spawn.
> Spawn hanya dipakai saat masuk `roomId` baru atau saat "Ulangi chapter".
> Pemetaan scene → `roomId` masih di kode (`src/game/maps/roomData.ts`); memilih
> preset dari Story JSON adalah pekerjaan lanjutan setelah MVP.
>
> **Prop besar:** kanopi pohon dan badan furnitur besar tidak boleh menjadi
> collider penuh. `RoomObject.collider` opsional menandai area solid di dalam
> kotak objek — lihat [ADR 0011](0011-large-prop-subcollider.md).

> **Catatan lanjutan 2026-11-13 — kamera menempel pemain.** `lerp` 0,12
> diganti `1` (`CAMERA_LERP`). Luncuran kamera yang terus mengejar pemain
> membuat seluruh dunia bergeser pelan sepanjang waktu; digabung pixel art yang
> berkedip, gerak itu terasa memualkan. Dead zone 128×96 px tetap. Dengan `lerp`
> 1, `scrollX/scrollY` juga tetap bilangan bulat, dan objek yang diskalakan
> memakai `setVertexRoundMode("fullAuto")` supaya tidak meluncur di sub-piksel.

> **Catatan lanjutan 2026-11-13 — kamera keluar sedikit.** Pada zoom 1 bingkai
> 640×360 hanya menampilkan 640 px dunia, jadi karakter desa (56 px, ~15,5%
> tinggi layar) terasa dekat. `ZOOM_KAMERA` = 0,8 membuat kamera melihat
> 800×450 px dunia dan karakter turun ke ~12,4%. Ini melengkapi — bukan
> membatalkan — keputusan di atas: dead zone tetap 128×96 px di layar
> (`deadzoneDunia()` mengompensasi zoom), dan `lerp` 1 tetap dipakai supaya
> zoom pecahan tidak berubah jadi getaran tiap frame. Panel dialog Phaser yang
> menempel layar diskalakan terbalik (`posisiUiTerkunci()`), sedangkan prompt dan
> penanda DOM ikut rumus `duniaKeLayar()` yang sama.

## Kapan keputusan ini ditinjau ulang

- Jika data map per scene ternyata menyita lebih dari satu hari kerja: cukup
  buat satu map `default` yang dipakai semua scene, kamera dan collision tetap
  dipakai.
- Jika kelak butuh world terbuka antar ruangan — itu ADR baru, bukan revisi
  file ini.

## Referensi

- [`0008-top-down-movement.md`](0008-top-down-movement.md) — keputusan gerak
  top-down dan batas scope "bukan dunia terbuka"
- [`0002-story-json-as-contract.md`](0002-story-json-as-contract.md) — Story
  JSON tidak diubah untuk keperluan map
- [`0009-resolution-and-scale.md`](0009-resolution-and-scale.md) — resolusi dan
  ukuran tile yang dipakai map
- [`../04-game/world-design.md`](../04-game/world-design.md) — spesifikasi
  teknis yang diturunkan dari ADR ini
