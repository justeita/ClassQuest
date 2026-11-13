---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Catatan Historis: Rencana Map, Karakter, dan Demo

> **Dokumen ini arsip, bukan rencana kerja.** Isinya arah yang pernah dicoba lalu
> ditinggalkan. Untuk dunia yang berlaku sekarang, baca
> [`world-design.md`](./world-design.md).

## Ringkasan

Arah pertama proyek adalah dunia **sekolah** bergaya dua peta:

1. **Gedung sekolah** — lorong dan ruang kelas, disusun dari tile lantai/dinding
   plus prop satu per satu (jalur ADR 0010).
2. **Halaman sekolah** — taman terbuka, digambar sebagai satu peta penuh
   `map_halaman_sekolah` (jalur ADR 0012).

Protagonis saat itu adalah karakter bergaya siluet **Nino** (`char_nino`, 18
frame, frame 24×32 px, kotak kaki 12×8 px), dengan NPC Pak Bima dan Tirta. Cerita
demo berkisah tentang siklus air: genangan di halaman sekolah yang menyusut.

## Kenapa arah itu ditinggalkan

- **Satu peta desa lebih jujur dan lebih ringan.** Dunia sekolah menuntut banyak
  ruangan dan transisi antar-ruangan; dunia desa cukup satu peta 2390×1792 px
  yang dibangun sekali, tanpa bangun ulang saat chapter berganti.
- **Tile 16×16 tidak dipakai lagi.** Editor peta (`pixel-map-placer.html`)
  menempel gambar di koordinat piksel bebas, jadi satuan tile di dokumen lama
  tidak lagi menggambarkan kenyataan.
- **Karakter desa menggantikan `char_nino`.** Spritesheet desa memakai **8 arah
  beranimasi** (idle, plus walk untuk pemain), bukan 18 frame 24×32.
- **Atribusi aset diperbaiki.** Aset dunia desa (peta, objek, karakter, potret,
  lagu) adalah **buatan tim dengan alat AI generatif**, disalin
  `scripts/import-world.mjs` dari paket proyek di luar repo. Sebelumnya dokumen
  ini menyebut beberapa paket gratis pihak ketiga (The Fan-tasy Tileset,
  Craftpix, dan sejenisnya); itu tidak lagi mewakili aset yang dipakai.

## Yang berlalu

- `char_nino` dan sprite sekolah: dihapus dari manifest.
- Ruangan `lorong_sekolah`, `kelas_a`, `halaman_sekolah` dan `RoomData` per
  `roomId`: digantikan satu dunia desa (`VILLAGE`).
- Nama-nama karakter demo (Nino, Rani, Pak Bima, Tirta): diganti cast **Pesta
  Panen Desa** (Nara, Pak Wira, Bu Sri, dan warga lain) — lihat
  [`../02-data-model/story.example.json`](../02-data-model/story.example.json).

## Di mana ceritanya sekarang

| Dulu (arsip)                      | Sekarang                                             |
| --------------------------------- | ---------------------------------------------------- |
| 2 peta sekolah + transisi ruangan | Satu peta desa, kamera follow                        |
| Tile lantai/dinding + prop        | Satu gambar peta + 80 potongan objek dari editor     |
| `char_nino` 18 frame 24×32        | `char_mc` + 9 NPC, 8 arah beranimasi                 |
| `RoomData` per `roomId`           | `src/game/world/village.json`                        |
| Cerita siklus air di sekolah      | Cerita **Pesta Panen Desa** (perbandingan & pecahan) |

Detail teknisnya ada di [`world-design.md`](./world-design.md),
[`scene-format.md`](./scene-format.md), dan
[`../07-assets/inventory.md`](../07-assets/inventory.md).
