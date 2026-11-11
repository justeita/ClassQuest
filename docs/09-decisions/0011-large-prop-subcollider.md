---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# 0011 — Sub-collider untuk Prop Besar

- **Status:** Accepted
- **Tanggal:** 2026-11-11
- **Pengambil keputusan:** developer frontend game
- **Menggantikan:** — (memperluas ADR 0010, tidak membatalkannya)

## Konteks

ADR 0010 menetapkan satu definisi objek untuk gambar **dan** collider:
`tileX`/`tileY`/`tileW`/`tileH` menentukan gambar sekaligus kotak solidnya. Aturan
itu benar untuk meja dan papan tulis, tetapi gagal untuk prop impor berukuran
besar:

- Pohon rindang 128×128 px (8×8 tile) punya kanopi lebar, sedangkan bagian yang
  benar-benar menghalangi pemain hanya batang di tengah bawah.
- Kolam 96×64 px (6×4 tile) perlu solid di seluruh badan air, tetapi bukan di
  bibir batu yang justru bisa dipijak.
- Rak 32×48 px (2×3 tile) hanya perlu memblok di kakinya; pemain berdiri di
  depan rak, bukan di atas badannya.

Kalau `tileW`×`tileH` dipaksa menjadi collider penuh, pemain berhenti jauh dari
batang pohon — bug "nabrak benda tak terlihat" versi baru, persis yang ingin
dihapus ADR 0010. Kalau prop dipecah menjadi objek gambar dan objek collider
terpisah, aturan satu sumber data dilanggar dan data bisa tidak sinkron.

## Opsi

| Opsi                                                      | Kelebihan                          | Kekurangan                                              |
| --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| A. Collider penuh `tileW`×`tileH`                         | Tidak ada kode baru                | Kanopi pohon memblok 8×8 tile; pemain berhenti di udara |
| B. Objek gambar + objek collider terpisah                 | Fleksibel                          | Melanggar ADR 0010; dua sumber data bisa tidak sinkron  |
| **C. Field `collider` opsional di dalam objek yang sama** | Satu sumber data, presisi sub-tile | Data map harus menulis offset batang secara manual      |
| D. Collider poligon / beberapa kotak per prop             | Paling presisi                     | Berlebihan untuk kebutuhan demo; menambah kompleksitas  |

## Keputusan

**Kami memilih opsi C: `RoomObject.collider` opsional berisi area solid di
dalam kotak objek.** Status: **Accepted**, sudah diterapkan di PR data ruangan.

Aturan bentuknya:

- `collider` berisi `{ x, y, w, h }` dalam **tile**, relatif terhadap pojok kiri
  atas objek. Nilai pecahan diizinkan (mis. `0.5`) karena batang pohon lebih
  sempit dari satu tile.
- Bila `solid: true` dan `collider` ada, collider memakai area itu **apa
  adanya** — tanpa inset 2 px di sisi depan. Penulis data yang menentukan batas
  yang pas dengan gambarnya.
- Bila `collider` tidak ada, perilaku lama berlaku: kotak penuh `tileW`×`tileH`
  dikurangi 2 px di sisi depan.
- `tileW`/`tileH` tetap menentukan jangkar gambar dan kedalaman (`setDepth`),
  jadi area solid boleh jauh lebih kecil dari area gambar.
- Dinding tidak memakai `collider`: dinding selalu solid sepanjang kotaknya,
  dan pelebaran dinding di `buildRoomMap()` tetap bekerja seperti sebelumnya.

Alasan:

1. Menjaga aturan ADR 0010: gambar dan collider tetap berasal dari satu entri.
2. Cukup satu field opsional; tidak ada editor, format baru, atau dependency.
3. Offset batang bisa dicocokkan dengan PNG impor tanpa mengubah gambar aset.

## Konsekuensi

**Positif:**

- Pemain bisa berjalan di bawah kanopi pohon dan memijak bibir kolam, tetapi
  tetap tertahan di batang/badan air.
- Prop besar tidak lagi memakan collider seluas gambar.
- Tidak ada data collider terpisah yang bisa basi terhadap gambar.

**Negatif / utang:**

- Offset dan ukuran sub-collider ditulis manual per prop; salah hitung membuat
  pemain berhenti terlalu cepat atau menembus batang.
- Satuan tile pecahan harus dipakai konsisten; tidak ada validasi otomatis
  selain tes yang memastikan area tetap di dalam kotak objek.
- Kalau nanti butuh collider tidak persegi (poligon atau beberapa kotak), itu
  ADR baru.

**Yang harus diubah:**

- `src/game/maps/types.ts` — tipe `RoomObjectCollider` dan field `collider`.
- `src/game/map.ts` — `colliderOf()` memakai area sub-collider.
- `src/game/maps/roomData.ts` — data pohon/rak memakai `collider`.
- `src/game/map.test.ts` — tes sub-collider dan invariant "di dalam objek".
- [`../04-game/world-design.md`](../04-game/world-design.md) — aturan collision
  untuk prop besar.

## Kapan keputusan ini ditinjau ulang

- Jika jumlah prop besar bertambah sampai offset manual sering salah: buat
  generator data atau alat pratinjau collider.
- Jika butuh bentuk collision non-persegi (poligon, lingkaran, banyak kotak):
  buat ADR baru, jangan menambah field diam-diam.

## Referensi

- [`0010-map-data-and-camera.md`](0010-map-data-and-camera.md) — collider dari
  objek yang sama dengan gambar
- [`0009-resolution-and-scale.md`](0009-resolution-and-scale.md) — tile 16×16 px
- [`../04-game/world-design.md`](../04-game/world-design.md) — aturan collision
- [`../07-assets/inventory.md`](../07-assets/inventory.md) — ukuran prop impor
