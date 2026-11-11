---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# README Wajib

Sumber: Guidebook LOGICODIX 2026, halaman cetak 17–18.

README adalah berkas pertama yang dibaca juri. Guidebook mewajibkan `README.md`
berada di **direktori utama** repositori dan memuat sembilan hal. Kalau ada yang
hilang, submission bisa dinilai tidak lengkap.

## Sembilan isi wajib

| #   | Wajib memuat                                                                                                             | Bagian di README |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | Nama tim dan daftar anggota                                                                                              | § Tim            |
| 2   | Kategori (Web/Mobile), nama aplikasi, deskripsi solusi, masalah, target pengguna                                         | § Produk         |
| 3   | Daftar fitur utama yang berhasil diimplementasikan                                                                       | § Fitur          |
| 4   | Teknologi: framework, library, database, API, layanan pihak ketiga                                                       | § Teknologi      |
| 5   | Diagram arsitektur sistem dan alur data                                                                                  | § Arsitektur     |
| 6   | Panduan instalasi, konfigurasi, menjalankan aplikasi, konfigurasi tambahan, daftar variabel environment (`.env.example`) | § Menjalankan    |
| 7   | Akun demonstrasi, jika aplikasi memakai autentikasi                                                                      | § Akun Demo      |
| 8   | Dokumentasi penggunaan AI, jika AI digunakan                                                                             | § Penggunaan AI  |
| 9   | Atribusi seluruh template, aset, dataset, dan kode pihak ketiga                                                          | § Atribusi       |

Poin 7 hanya wajib bila aplikasi memakai autentikasi; kalau belum, tulis
"Belum ada autentikasi pada versi ini."

## Aturan penulisan

1. **Ditulis untuk orang luar.** Juri bukan anggota tim. Jangan memakai singkatan
   internal, nama branch, atau istilah yang hanya dipahami tim.
2. **Jujur.** Hanya sebut fitur yang benar-benar berjalan dari commit final.
   Fitur yang direncanakan ditulis di bagian terpisah bernama "Rencana".
3. **Nama subtema persis.** Tulis "Smart & Fun Education" sesuai guidebook, bukan
   variasi lain.
4. **Bisa dijalankan mengikuti README saja.** Kalau mengikuti README dari nol gagal,
   README-nya salah.
5. **Bahasa konsisten.** README boleh berbahasa Indonesia atau Inggris, tapi
   jangan dicampur dalam satu paragraf.
6. **Tautan arsitektur relatif.** Arahkan ke dokumen di `docs/`, jangan menyalin isi
   dokumen sehingga bisa berbeda.

## Kerangka siap pakai

Ganti bagian bertanda `<!-- isi -->`. Setiap bagian memetakan langsung ke poin
wajib di atas.

```markdown
# ClassQuest

<!-- isi: satu baris penjelasan aplikasi -->

## Tim

<!-- isi: 1–4 anggota, format tabel -->

| Nama | Peran | Instansi |
| ---- | ----- | -------- |

## Produk

- **Kategori:** Web
- **Nama aplikasi:** ClassQuest
- **Subtema LOGICODIX 2026:** Smart & Fun Education
- **Masalah:** <!-- isi -->
- **Target pengguna:** <!-- isi -->
- **Solusi:** <!-- isi -->

## Fitur Utama

<!-- isi: hanya fitur yang berjalan di commit final -->

| Fitur | Status | Cara mencoba |
| ----- | ------ | ------------ |

## Teknologi

| Lapisan              | Teknologi                   | Keterangan |
| -------------------- | --------------------------- | ---------- |
| Framework            | Next.js 16 (App Router)     |            |
| Bahasa               | TypeScript                  |            |
| UI                   | React 19, Tailwind CSS 4    |            |
| Game                 | Phaser 4                    |            |
| Database             | <!-- isi atau TBD -->       |            |
| AI                   | <!-- isi provider/model --> |            |
| Layanan pihak ketiga | <!-- isi -->                |            |

## Arsitektur

<!-- isi: diagram + satu paragraf alur data -->

Lihat [docs/01-architecture/overview.md](docs/01-architecture/overview.md).

## Menjalankan Aplikasi

### Prasyarat

- Bun 1.4.0
- Node.js ≥ 20.9.0

### Instalasi

\`\`\`bash
git clone <url-repo>
cd ClassQuest
bun install
cp .env.example .env.local
\`\`\`

### Konfigurasi

<!-- isi: tabel variabel environment -->

Semua variabel ada di [.env.example](.env.example). Tidak ada nilai rahasia di repo.

### Menjalankan

\`\`\`bash
bun dev
\`\`\`

Buka http://localhost:3000.

### Pemeriksaan

\`\`\`bash
bun run check
bun run build
\`\`\`

## Akun Demo

<!-- isi bila memakai autentikasi; kalau belum, tulis "Belum ada autentikasi pada versi ini." -->

## Penggunaan AI

<!-- isi: tool AI saat pengembangan + fitur AI di produk -->

Lihat [docs/11-logicodix/14-ai-dan-atribusi.md](docs/11-logicodix/14-ai-dan-atribusi.md).

## Atribusi Pihak Ketiga

<!-- isi: setiap template, aset, dataset, pustaka, dan layanan pihak ketiga -->

Lihat [docs/11-logicodix/14-ai-dan-atribusi.md](docs/11-logicodix/14-ai-dan-atribusi.md).

## Lisensi dan Penggunaan

<!-- isi: status lisensi dan aturan penggunaan aset pihak ketiga -->
```

## Hal yang sering lupa

Ini yang biasanya hilang walaupun sembilan poin di atas sebenarnya sudah ada:

1. **Nama anggota tanpa peran.** Peran membantu juri saat tanya jawab.
2. **Fitur yang diklaim tapi tidak jalan.** Lebih baik jujur; juri mencoba aplikasi.
3. **Variabel environment tanpa penjelasan.** Nama saja tidak cukup; jelaskan
   fungsinya dan nilainya untuk mode demo.
4. **Arsitektur berupa gambar tanpa penjelasan.** Diagram ditambah satu paragraf
   alur data.
5. **Atribusi hanya pustaka npm.** Aset visual, ikon, font, dataset, dan template
   juga wajib.
6. **Penggunaan AI hanya di fitur.** Guidebook halaman cetak 18 juga meminta dokumentasi
   bila AI dipakai **saat pengembangan**.
7. **README di `docs/` bukan di root.** Guidebook menyebut direktori utama.

## Checklist

- [ ] `README.md` ada di root repo.
- [ ] Poin 1–6 dan 9 terisi.
- [ ] Poin 7 terisi atau dinyatakan tidak berlaku.
- [ ] Poin 8 terisi bila AI dipakai saat pengembangan atau sebagai fitur.
- [ ] Nama subtema persis sesuai guidebook.
- [ ] Mengikuti README dari nol berhasil menjalankan aplikasi.
- [ ] Tautan di README tidak ada yang mati.
