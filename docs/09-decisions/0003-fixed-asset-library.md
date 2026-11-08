---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# 0003 — Aset Tetap dari Manifest

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Ada dua cara membangun game edukasi dengan AI:

1. AI menghasilkan cerita **dan** aset (gambar, musik).
2. Aset disiapkan manusia di awal; AI hanya menyusun cerita.

Waktu hackathon terbatas, dan kualitas visual sangat menentukan kesan produk.

## Opsi

| Opsi                                     | Kelebihan                                                     | Kekurangan                                     |
| ---------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Aset tetap dari manifest (dipilih)       | Konsisten, cepat, bisa diuji, tidak ada biaya generasi gambar | Terbatas pada aset yang ada                    |
| AI membuat gambar/musik                  | Fleksibel, unik per materi                                    | Lambat, mahal, tidak konsisten, risiko lisensi |
| Campuran (aset tetap + AI untuk variasi) | Lebih kaya                                                    | Kompleksitas tinggi untuk hackathon            |
| Tanpa aset (teks saja)                   | Paling cepat                                                  | Tidak terasa seperti game                      |

## Keputusan

**Kami memilih pustaka aset tetap yang dideklarasikan di manifest.**

Alasan:

1. Konsistensi visual terjamin karena semua scene memakai aset yang sama.
2. AI tidak perlu menunggu generasi gambar; cerita bisa dibuat dalam hitungan detik.
3. Aset bisa diganti manusia tanpa menyentuh cerita, selama `id` tidak berubah.

## Konsekuensi

**Positif:**

- Validasi bisa menolak aset yang tidak ada sebelum siswa melihatnya.
- Game bisa dimainkan dengan placeholder sejak hari pertama.
- Tidak ada biaya/lisensi aset yang dihasilkan AI.

**Negatif / utang:**

- Cerita terbatas pada latar dan karakter yang tersedia.
- Menambah suasana baru berarti membuat aset baru (pekerjaan manusia).
- AI bisa memilih aset yang "paling dekat" tapi tidak ideal; guru harus review.

**Yang harus diubah:**

- `src/assets/manifest.ts` sebagai sumber kebenaran.
- [`../07-assets/inventory.md`](../07-assets/inventory.md)
- [`../02-data-model/asset-manifest.md`](../02-data-model/asset-manifest.md)

## Kapan ditinjau ulang

Jika ada waktu untuk pipeline aset otomatis, atau jika jumlah materi yang dibuat
melebihi kemampuan aset tetap.

## Referensi

- [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md)
- [`../02-data-model/asset-manifest.md`](../02-data-model/asset-manifest.md)
