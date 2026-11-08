---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Babak Final

Sumber: Guidebook LOGICODIX 2026, halaman 22–23.

Dokumen ini hanya berlaku kalau tim lolos. Tetap dibaca sekarang, karena beberapa
persiapannya tidak bisa dilakukan mendadak.

## Alur

| Waktu            | Agenda                                | Sifat  |
| ---------------- | ------------------------------------- | ------ |
| 21 November 2026 | Pengumuman Finalis (Top 8)            | —      |
| 22 November 2026 | Technical Meeting peserta babak final | Daring |
| 29 November 2026 | Puncak Acara: babak final dan seminar | Luring |

Seleksi: karya melalui kurasi dan penilaian dewan juri; **8 tim terbaik** melanjutkan
ke Grand Final.

## Technical Meeting

1. Finalis **wajib** mengikuti Technical Meeting yang dilaksanakan **daring**.
2. Materi yang dibahas: tata cara pelaksanaan Grand Final, mekanisme presentasi,
   live demo, dan tata tertib puncak acara.
3. Ketentuan urutan tampil dan teknis presentasi disampaikan di sesi ini.
4. Informasi lanjutan lewat grup WhatsApp resmi finalis.

Tugas kita di sesi ini: catat urutan tampil, batas waktu presentasi, batas waktu
live demo, format slide, dan apakah ada ketentuan jaringan di lokasi.

## Kewajiban saat Grand Final

| Kewajiban                                                                             | Halaman |
| ------------------------------------------------------------------------------------- | ------- |
| Mempersiapkan aplikasi agar dapat dijalankan **localhost** pada laptop yang digunakan | 23      |
| Presentasi dan **live demo secara luring** di hadapan dewan juri industri             | 23      |
| Mengikuti technical meeting                                                           | 22      |
| Mengikuti seluruh rangkaian kompetisi                                                 | 8       |

Kata "localhost" penting: aplikasi **wajib** jalan tanpa internet. Kalau fitur utama
bergantung sepenuhnya pada API AI, siapkan mode tanpa jaringan yang tetap bisa
didemokan.

## Persiapan teknis live demo

### Yang harus siap di laptop

- [ ] Repo di-clone ulang dari commit final, bukan dari working directory yang
      penuh eksperimen.
- [ ] `bun install` berhasil di mesin bersih.
- [ ] `.env.local` sudah terisi dan **tidak** ikut ter-commit.
- [ ] `bun run build` dan `bun run start` berhasil.
- [ ] Data demo sudah disiapkan: PDF contoh, kunci API aktif, kuota cukup.
- [ ] Aplikasi berjalan **tanpa internet** untuk alur utama (mode mock/fallback).
- [ ] Baterai penuh dan charger dibawa.
- [ ] Ada tethering ponsel sebagai jaringan cadangan.

### Yang harus siap sebagai cadangan

| Risiko               | Cadangan                                                        |
| -------------------- | --------------------------------------------------------------- |
| Internet lokasi mati | Mode mock/fallback tanpa API                                    |
| Kuota API habis      | Kunci kedua dengan kuota terpisah                               |
| Laptop bermasalah    | Laptop anggota lain dengan repo yang sama, sudah dites          |
| Proyek gagal install | Folder hasil build yang sudah terpasang, beserta `node_modules` |
| Demo gagal total     | Video demo tersimpan offline dan bisa diputar                   |

Cadangan berlapis itu bukan berlebihan. Live demo adalah satu-satunya kesempatan.

### Yang tidak boleh dibawa

- Kunci API di dalam slide atau terlihat di layar.
- File `.env` yang terbuka di editor saat presentasi.
- Tab browser berisi akun pribadi.
- Notifikasi sistem dan pesan masuk.

## Persiapan presentasi

| Aspek              | Yang perlu disiapkan                                      |
| ------------------ | --------------------------------------------------------- |
| Masalah            | Satu paragraf tajam, bukan statistik panjang              |
| Solusi             | Satu kalimat yang menjelaskan apa yang dilakukan aplikasi |
| Demo               | Alur utama, berurutan, tanpa lompat-lompat                |
| Teknologi          | Alasan pilihan, bukan daftar library                      |
| AI                 | Bagian yang tidak mungkin dikerjakan tanpa AI             |
| Etika dan keamanan | Apa yang tidak disimpan, apa yang dikendalikan guru       |
| Batasan            | Apa yang belum dikerjakan dan kenapa                      |

## Siapa menjawab apa

Juri bisa bertanya ke siapa saja. Bagi peran sebelum hari H:

| Area                         | Penanggung jawab utama | Cadangan |
| ---------------------------- | ---------------------- | -------- |
| Masalah dan nilai produk     | `TBD`                  | `TBD`    |
| Pipeline AI dan batasannya   | `TBD`                  | `TBD`    |
| Game, engine, dan alur siswa | `TBD`                  | `TBD`    |
| Arsitektur, API, dan data    | `TBD`                  | `TBD`    |
| Etika, privasi, atribusi     | `TBD`                  | `TBD`    |

Aturan: **setiap orang harus bisa menjawab area miliknya tanpa membaca kode**, dan
minimal satu anggota bisa menjelaskan keseluruhan sistem.

## Latihan minimal

Sebelum 29 November, lakukan minimal dua kali:

1. **Latihan 1 (25 November):** presentasi penuh dengan laptop sendiri, tanpa
   jaringan cadangan. Catat bagian yang membuat waktu habis.
2. **Latihan 2 (27 November):** simulasi di kondisi sial — internet dimatikan di
   tengah demo, API dimatikan, lalu pulihkan. Ini menguji cadangan, bukan
   presentasinya.

Setelah masing-masing latihan, perbarui daftar risiko di
[`13-pelanggaran-dan-sanksi.md`](./13-pelanggaran-dan-sanksi.md) bila ditemukan
masalah baru.

## Checklist

- [ ] Tanggal pengumuman finalis dipantau.
- [ ] Technical Meeting dihadiri bila lolos.
- [ ] Laptop sudah diuji dengan commit final dari clone bersih.
- [ ] Aplikasi jalan tanpa internet untuk alur utama.
- [ ] Cadangan jaringan, kuota, dan laptop disiapkan.
- [ ] Video demo tersedia offline.
- [ ] Pembagian peran tanya jawab disepakati.
- [ ] Minimal dua kali latihan dilakukan.
- [ ] Slide tidak memuat kredensial apa pun.
