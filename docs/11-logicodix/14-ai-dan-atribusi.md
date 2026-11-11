---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Penggunaan AI dan Atribusi

Sumber: Guidebook LOGICODIX 2026, halaman cetak 6–7, 13, 18, dan 29.

Dua hal digabung di dokumen ini karena sanksinya sama: **transparansi**. Panitia
tidak melarang AI dan tidak melarang komponen pihak ketiga. Yang dilarang adalah
menyembunyikannya.

## 1. Aturan penggunaan AI

| Aturan                                                                                             | Halaman cetak |
| -------------------------------------------------------------------------------------------------- | ------------- |
| AI diperbolehkan, baik saat pengembangan maupun sebagai fitur aplikasi                             | 6–7           |
| Boleh memakai API AI atau model open-source                                                        | 6             |
| AI coding assistant diperbolehkan                                                                  | 13            |
| Penggunaan AI **tidak wajib**, kecuali rubrik menentukan lain                                      | 13            |
| Tim bertanggung jawab penuh atas kode, keamanan, dan fungsi, **termasuk kode hasil AI**            | 13            |
| Jika memakai AI, README **wajib** menyebutkan layanan/model dan bagian produk yang memanfaatkannya | 18            |
| Pengembangan wajib memperhatikan etika AI, pelindungan data, dan efisiensi sumber daya             | 7, 29         |

Poin terakhir penting: memakai AI tidak mengurangi tanggung jawab. Kode hasil AI
yang punya bug adalah bug tim, bukan bug alat.

## 2. Dua kategori penggunaan AI

Jangan campur keduanya di README. Juri menilai keduanya berbeda.

### A. AI sebagai alat bantu pengembangan

| Yang perlu dicatat        | Contoh                                            |
| ------------------------- | ------------------------------------------------- |
| Alat yang dipakai         | AI coding assistant di editor, asisten chat       |
| Bagian yang dibantu       | Menyusun test, refactor, dokumentasi, mencari API |
| Verifikasi yang dilakukan | Typecheck, lint, test, review manusia             |

Aturan internal kita: **tidak ada kode hasil AI yang di-commit tanpa dibaca dan
dipahami minimal oleh satu anggota.** Kalau tidak ada yang bisa menjelaskan sebuah
fungsi, fungsi itu belum boleh masuk.

### B. AI sebagai fitur produk

| Yang perlu dicatat         | Contoh                                        |
| -------------------------- | --------------------------------------------- |
| Penyedia dan model         | Nama provider, nama model, versi bila relevan |
| Bagian produk yang memakai | Pipeline generasi cerita, ringkasan, dsb.     |
| Data yang dikirim          | Teks materi saja; tanpa data pribadi siswa    |
| Batas dan fallback         | Jumlah percobaan repair, perilaku saat gagal  |

Catatan: keputusan penyedia model belum final. Lihat
[`../09-decisions/0006-ai-provider.md`](../09-decisions/0006-ai-provider.md). Jangan
menulis nama model di README sebelum keputusannya dikunci, karena README yang
menyebut model yang tidak dipakai justru mengurangi kredibilitas.

## 3. Etika AI yang bisa ditunjukkan

Ini menjawab kriteria "Etika & Keamanan Digital" (10%).

| Prinsip               | Wujud konkret di produk                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| Transparansi          | Guru melihat hasil AI sebelum dipublikasikan; tidak ada output otomatis ke siswa |
| Kendali manusia       | Guru bisa mengedit semua yang ditulis AI                                         |
| Minimisasi data       | Materi pelajaran dikirim ke model; data pribadi siswa tidak                      |
| Batas kemampuan       | Fallback cerita bawaan saat AI gagal, supaya demo tidak kosong                   |
| Efisiensi sumber daya | Batas halaman PDF, batas percobaan repair, batas panjang teks                    |
| Atribusi              | README menyebut model, library, dan aset                                         |

Yang harus disebut jujur di pitch: hasil AI **bisa salah**, dan karena itu ada
review guru. Jangan mengklaim AI selalu benar.

## 4. Atribusi pihak ketiga

Guidebook mewajibkan **sumber atau atribusi setiap kode, template, aset, dataset,
dan layanan pihak ketiga dicantumkan di README**.

### Cakupan yang wajib diatribusikan

| Jenis                    | Contoh di proyek ini                                  |
| ------------------------ | ----------------------------------------------------- |
| Framework dan library    | Next.js, React, Phaser, Tailwind CSS, Vitest          |
| Starter template         | `create-next-app`                                     |
| Komponen UI pihak ketiga | Bila nanti memakai pustaka komponen                   |
| Aset visual              | Sprite, tileset, ikon, ilustrasi                      |
| Font                     | Font yang di-host sendiri                             |
| Audio                    | Musik dan efek suara                                  |
| Dataset                  | Materi contoh, korpus latihan                         |
| Layanan pihak ketiga     | Penyedia model AI, platform deploy, database, storage |
| Kode yang diadaptasi     | Cuplikan dari Stack Overflow, blog, atau repo lain    |

### Format pencatatan di README

```markdown
## Atribusi Pihak Ketiga

### Library dan Framework

| Nama | Versi | Lisensi | Sumber |
| ---- | ----- | ------- | ------ |

### Aset Visual dan Audio

| Aset | Pembuat | Lisensi | Sumber |
| ---- | ------- | ------- | ------ |

### Dataset dan Materi Contoh

| Dataset | Sumber | Lisensi | Dipakai untuk |
| ------- | ------ | ------- | ------------- |

### Layanan Pihak Ketiga

| Layanan | Dipakai untuk | Catatan |
| ------- | ------------- | ------- |
```

### Lisensi dependency saat ini

Semua dependency proyek ini berlisensi MIT. Tetap cantumkan di README — "MIT" bukan
alasan untuk tidak menulis sumbernya.

| Paket                | Lisensi    | Peran                |
| -------------------- | ---------- | -------------------- |
| `next`               | MIT        | Framework            |
| `react`, `react-dom` | MIT        | UI                   |
| `phaser`             | MIT        | Engine game          |
| `tailwindcss`        | MIT        | Styling              |
| `typescript`         | Apache-2.0 | Bahasa dan typecheck |
| `vitest`             | MIT        | Test runner          |
| `ajv`                | MIT        | Validasi JSON Schema |
| `eslint`, `prettier` | MIT        | Lint dan format      |

Verifikasi ulang bila ada dependency baru: lisensi ada di `node_modules/<paket>/LICENSE`.

### Aset default yang perlu dibereskan

Repo ini masih memuat aset bawaan `create-next-app`:

```text
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
```

Tiga pilihan, semuanya sah:

1. **Hapus** kalau tidak dipakai. Paling bersih.
2. **Atribusikan** di README sebagai aset template `create-next-app`.
3. **Ganti** dengan aset buatan tim, lalu hapus yang lama.

Jangan membiarkannya tanpa keterangan. Juri yang teliti akan bertanya asalnya.

## 5. Yang tidak boleh

| Larangan                                                        | Alasan                              |
| --------------------------------------------------------------- | ----------------------------------- |
| Menyembunyikan penggunaan AI                                    | README wajib menyebutnya            |
| Mengklaim aset pihak ketiga sebagai buatan tim                  | Pelanggaran orisinalitas            |
| Memakai aset berlisensi non-komersial untuk produk komersial    | Masalah lisensi                     |
| Memakai template aplikasi lengkap lalu mengganti nama dan warna | Dilarang guidebook halaman cetak 13 |
| Menempelkan output AI langsung ke aplikasi tanpa review         | Tanggung jawab tetap pada tim       |

## 6. Checklist

- [ ] README punya bagian Penggunaan AI.
- [ ] README menyebut alat AI yang dipakai saat pengembangan.
- [ ] README menyebut model/layanan AI dan bagian produk yang memakainya (bila AI jadi fitur).
- [ ] README punya bagian Atribusi Pihak Ketiga.
- [ ] Semua library tercantum beserta lisensi.
- [ ] Semua aset visual/audio punya sumber.
- [ ] Dataset dan materi contoh punya sumber.
- [ ] Layanan pihak ketiga (AI, deploy, database) tercantum.
- [ ] Aset default Next.js dihapus atau diatribusikan.
- [ ] Setiap kode hasil AI bisa dijelaskan minimal oleh satu anggota.
