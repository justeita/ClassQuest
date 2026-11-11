---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# 0012 — Peta Ruangan sebagai Satu Gambar Penuh

- **Status:** Accepted
- **Tanggal:** 2026-11-11
- **Pengambil keputusan:** developer frontend game
- **Menggantikan:** — (memperluas ADR 0010; sebagian aturan "satu tile lantai per
  ruangan" tidak lagi berlaku untuk ruangan bergambar penuh)

## Konteks

ADR 0010 memutuskan peta data-driven: satu `floorTile` + satu `wallTile` diulang
oleh `tileSprite`, ditimpa prop, dan collider diambil dari objek yang sama. Itu
cukup untuk ruangan dalam (koridor, kelas) yang memang satu bahan lantai.

Halaman sekolah tidak cocok dengan model itu. Referensi desainnya —
`D:\Data\LOGICODIX 26\Asset\image.png` — adalah taman botani dengan **jalan
batu, petak bunga, kolam, dan pagar** dalam satu bidang. Model satu-tile-lantai
tidak bisa mengungkapkannya:

1. Satu `floorTile` per ruangan berarti seluruh halaman hanya rumput (atau hanya
   batu). Jalan dan kolam harus jadi prop besar — memakan data, dan tiap prop
   hanya satu bahan.
2. Aset taman yang benar-benar bagus (The Fan-tasy Tileset) adalah **tileset
   autotile**: rumput, jalan, dan air punya ribuan kombinasi tepi. Menyusunnya di
   runtime berarti menulis mesin autotile — di luar tenggat lomba.
3. Hasil data-driven yang ada sekarang justru terlihat paling jelek: tile
   placeholder pucat dicampur prop detail (keluhan nyata pengguna).

## Opsi

| Opsi                                                     | Kelebihan                                                                  | Kekurangan                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A. Tetap satu tile lantai + prop besar                   | Tidak ada kode/perkakas baru                                               | Tidak bisa menyamai referensi; prop besar boros dan satu bahan               |
| B. Mesin autotile runtime dari tileset pihak ketiga      | Fleksibel, mapa bisa disusun runtime                                       | Pekerjaan besar (autotile + tileset baru di repo); risiko tinggi             |
| **C. Satu gambar peta penuh + collider dari `RoomData`** | Paling mirip referensi; gambar sepenuhnya aset seni, bukan hasil generator | Gambar dan collider bisa tidak sinkron; menyimpang dari "satu tile" ADR 0010 |

## Keputusan

**Kami memilih opsi C.** Ruangan boleh menggambar dirinya dari **satu gambar
peta penuh** berjenis manifest `map`, dan collider tetap berasal dari
`RoomData.objects` seperti ADR 0010/0011.

Aturan bentuknya:

- Aset peta adalah manifest entry `kind: "map"`, id berprefix `map_`, file di
  `public/assets/map/`. Satu ruangan = paling banyak satu gambar peta.
- Ukuran gambar **wajib kelipatan 16** dan sama dengan `widthTiles`×`heightTiles`
  ruangan; kalau tidak, grid collider dan gambar akan bergeser.
- Gambar peta **hanya seni**. Ia tidak menentukan collider, spawn, atau NPC.
  Semua itu tetap dari `RoomData`; tidak ada kotak yang ditulis "karena ada di
  gambar".
- Ruangan yang tidak punya peta tetap memakai jalur ADR 0010 (`floorTile` +
  `wallTile`). Kedua jalur hidup berdampingan; peta adalah tambahan opsional.
- Gambar peta dijahit **sekali** oleh `scripts/compose-map.mjs` dari aset pihak
  ketiga, lalu di-commit. Aset mentah pihak ketiga tidak masuk repo — sama
  aturannya dengan prop Craftpix.

Alasan:

1. Referensi halaman botani hanya bisa didekati dengan gambar penuh; itu tujuan
   perubahan ini.
2. Collider tetap satu sumber data, jadi bug "nabrak benda tak terlihat" tetap
   tertutup untuk ruangan bergambar penuh.
3. Tidak menambah dependency maupun mesin autotile; satu skrip sekali jalan.

## Konsekuensi

**Positif:**

- Halaman sekolah bisa menyamai referensi: jalan, petak bunga, kolam, pohon.
- Gambar peta tidak menambah beban runtime (satu texture, bukan ribuan tile).
- Prop pihak ketiga yang ada (Craftpix) tetap bisa dipakai berdampingan.

**Negatif / utang:**

- **Sinkronisasi gambar dan collider manual.** Menggeser pohon di gambar berarti
  menggeser collider di `roomData.ts`; tidak ada validasi otomatis. Peta dibuat
  deterministik supaya posisi tiap objek bisa dijadikan acuan tetap.
- Menyimpang dari "satu tile lantai" ADR 0010 untuk ruangan bergambar penuh.
- Regenerasi peta butuh aset mentah pihak ketiga di luar repo
  (`scripts/compose-map.mjs --asset-dir`); hasil sekali jadinya yang di-commit.

**Yang harus diubah:**

- `src/assets/manifest.ts` — kind `map` dan entri `map_halaman_sekolah`.
- `src/assets/manifest.test.ts` — cek prefix, ekstensi, dan kelipatan 16 peta.
- `scripts/compose-map.mjs` + `scripts/lib/png.mjs` — penjahit peta.
- `docs/07-assets/inventory.md`, `docs/07-assets/asset-guide.md` — daftar dan
  aturan aset peta.
- (PR lanjutan) `src/game/scenes/GameScene.ts`, `src/game/maps/roomData.ts` —
  menggambar peta dan collider halaman.

## Kapan keputusan ini ditinjau ulang

- Jika jumlah ruangan bergambar penuh bertambah sampai sinkronisasi collider
  manual sering salah: buat alat pratinjau collider atau data collider terpisah.
- Jika kelak butuh peta besar antar-ruangan atau kamera zoom: itu ADR baru.

## Referensi

- [`0010-map-data-and-camera.md`](0010-map-data-and-camera.md) — peta
  data-driven, collider dari data
- [`0011-large-prop-subcollider.md`](0011-large-prop-subcollider.md) —
  sub-collider prop besar
- [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md) — aturan aset
- [`../07-assets/inventory.md`](../07-assets/inventory.md) — daftar aset dan
  sumber lisensi
