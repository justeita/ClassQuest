---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Rubrik Penilaian

Sumber: Guidebook LOGICODIX 2026, halaman 29.

Rubrik ini menjelaskan ke mana waktu sebaiknya dialokasikan. Bobot terbesar bukan
pada tampilan, tapi pada tiga hal yang sama besar: masalah-solusi, teknologi, dan
rekayasa perangkat lunak.

## Bobot

| Kriteria                                           | Bobot    | Yang dinilai menurut guidebook                                                                  |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| Kesesuaian Masalah & Solusi (Problem-Solution Fit) | 25%      | Ketajaman identifikasi masalah dan kesesuaian solusi dengan kebutuhan pengguna                  |
| Inovasi & Implementasi Teknologi                   | 25%      | Kreativitas dan efektivitas pemanfaatan teknologi; pemanfaatan AI menjadi nilai tambah          |
| Rekayasa Perangkat Lunak                           | 25%      | Fungsionalitas MVP, kualitas kode, arsitektur sistem, dan dokumentasi                           |
| Desain & Pengalaman Pengguna (UI/UX)               | 15%      | Kualitas antarmuka, kemudahan penggunaan, dan alur pengguna                                     |
| Etika & Keamanan Digital                           | 10%      | Etika pengembangan, perlindungan privasi dan data, keamanan dasar, transparansi AI dan atribusi |
| **Total**                                          | **100%** |                                                                                                 |

## Cara repo ini memenuhi tiap kriteria

### 1. Problem-Solution Fit — 25%

| Yang dinilai       | Bukti yang harus ada                                          |
| ------------------ | ------------------------------------------------------------- |
| Ketajaman masalah  | Rumusan masalah yang spesifik, bukan "pendidikan itu penting" |
| Kesesuaian solusi  | Setiap fitur menjawab satu bagian masalah                     |
| Kebutuhan pengguna | Target pengguna jelas: guru dan siswa, dengan batasannya      |

Cara memperkuat:

- Tulis masalah dalam satu paragraf yang menyebut **siapa**, **apa yang gagal
  dilakukan sekarang**, dan **kenapa cara lama tidak cukup**.
- Hubungkan setiap fitur utama ke bagian masalah. Fitur tanpa masalah = fitur yang
  bisa dihapus.
- Sebutkan batasan dengan jujur. Juri menghargai kejelasan scope lebih dari klaim
  besar.

Tempat menulis: `README.md` bagian Produk, dan
[`../00-product/vision.md`](../00-product/vision.md).

### 2. Inovasi & Implementasi Teknologi — 25%

| Yang dinilai            | Bukti yang harus ada                                        |
| ----------------------- | ----------------------------------------------------------- |
| Kreativitas pemanfaatan | Kombinasi yang tidak biasa, bukan CRUD biasa                |
| Efektivitas teknologi   | Teknologi dipilih karena kebutuhan, bukan karena tren       |
| Pemanfaatan AI          | AI dipakai untuk hal yang sulit dilakukan cara konvensional |

Cara memperkuat:

- Tunjukkan bagian yang **tidak mungkin** dikerjakan tanpa AI: mengubah PDF materi
  menjadi cerita yang konsisten dengan aset tetap.
- Jelaskan kenapa memilih pendekatan itu, bukan alternatifnya. Alasan teknis yang
  jelas lebih bernilai daripada fitur yang banyak.
- Tunjukkan bahwa teknologi bekerja nyata di video, bukan hanya diklaim.

Tempat menulis: `docs/09-decisions/` (alasan pilihan teknis) dan
[`../03-ai-pipeline/pipeline.md`](../03-ai-pipeline/pipeline.md).

### 3. Rekayasa Perangkat Lunak — 25%

| Yang dinilai       | Bukti yang harus ada                               |
| ------------------ | -------------------------------------------------- |
| Fungsionalitas MVP | Fitur utama jalan dan bisa diuji                   |
| Kualitas kode      | Typecheck, lint, test hijau; tidak ada kode mati   |
| Arsitektur sistem  | Pemisahan lapisan yang jelas dan konsisten         |
| Dokumentasi        | README lengkap dan dokumen teknis yang sesuai kode |

Cara memperkuat:

- `bun run check` dan `bun run build` hijau di commit final.
- Test untuk perilaku penting, bukan test yang menguji dirinya sendiri.
- Arsitektur dijelaskan dalam diagram dan satu paragraf, bukan hanya nama folder.
- Dokumentasi harus sesuai kode. Dokumentasi yang berbohong lebih buruk daripada
  dokumentasi yang sedikit.

Tempat menulis: `README.md` bagian Teknologi dan Arsitektur,
[`../01-architecture/overview.md`](../01-architecture/overview.md).

### 4. Desain & Pengalaman Pengguna — 15%

| Yang dinilai         | Bukti yang harus ada                            |
| -------------------- | ----------------------------------------------- |
| Kualitas antarmuka   | Konsisten, terbaca, tidak berantakan            |
| Kemudahan penggunaan | Alur bisa diselesaikan tanpa penjelasan panjang |
| Alur pengguna        | Langkah jelas dari masuk sampai hasil           |

Cara memperkuat:

- Satu alur utama yang selesai lebih baik daripada lima alur setengah jadi.
- Pastikan kontras dan ukuran teks layak. Ini juga masuk kriteria keamanan digital
  dalam bentuk aksesibilitas.
- Tunjukkan alur di video secara berurutan, bukan potongan acak.

Tempat menulis: [`../05-frontend/ui-conventions.md`](../05-frontend/ui-conventions.md).

### 5. Etika & Keamanan Digital — 10%

| Yang dinilai                  | Bukti yang harus ada                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| Etika pengembangan            | Tidak menyesatkan pengguna; batasan diakui                           |
| Perlindungan privasi dan data | Data siswa minimal; tidak ada data pribadi di prompt AI              |
| Keamanan dasar                | Tidak ada kredensial hardcoded; otorisasi diperiksa                  |
| Transparansi AI               | Model dan bagian yang memakainya disebut di README                   |
| Atribusi sumber daya          | Seluruh template, aset, dataset, dan kode pihak ketiga diatribusikan |

Cara memperkuat:

- Bagian Penggunaan AI dan Atribusi di README **wajib** ada. Ini bobot yang paling
  murah didapat dan paling sering hilang.
- Sebutkan batasan: misalnya jawaban bisa dilihat siswa lewat network tab. Jujur
  lebih baik daripada dikoreksi juri.
- Sediakan cara menghapus data lokal.

Tempat menulis: [`14-ai-dan-atribusi.md`](./14-ai-dan-atribusi.md) dan
[`../01-architecture/security-and-privacy.md`](../01-architecture/security-and-privacy.md).

## Alokasi waktu yang masuk akal

Berdasarkan bobot, alokasi kerja yang proporsional:

| Kriteria                 | Bobot | Porsi waktu | Catatan                                     |
| ------------------------ | ----- | ----------- | ------------------------------------------- |
| Problem-Solution Fit     | 25%   | 20%         | Banyak di awal: rumusan masalah dan scope   |
| Inovasi & Teknologi      | 25%   | 25%         | Pipeline AI adalah inti nilai jual          |
| Rekayasa Perangkat Lunak | 25%   | 30%         | Fitur, test, dokumentasi                    |
| UI/UX                    | 15%   | 15%         | Cukup rapi dan konsisten, tidak perlu mewah |
| Etika & Keamanan         | 10%   | 10%         | README, atribusi, env, otorisasi            |

Kalau waktu habis, **jangan** mengorbankan rekayasa dan etika untuk mempercantik
tampilan. Dua kriteria itu totalnya 35%, tampilan 15%.

## Kesalahan strategi yang umum

| Kesalahan                               | Kenapa merugikan                                              |
| --------------------------------------- | ------------------------------------------------------------- |
| Menambah banyak fitur setengah jadi     | Fungsionalitas MVP dinilai; fitur rusak mengurangi nilai      |
| UI cantik tapi alur utama tidak selesai | UI/UX hanya 15%, dan alur masuk kriteria lain                 |
| AI dipakai sebagai hiasan               | "Pemanfaatan AI menjadi nilai tambah" butuh AI yang berfungsi |
| README minim                            | Dokumentasi 25% dan etika 10% sama-sama terdampak             |
| Tidak ada atribusi                      | Kehilangan poin di kriteria yang paling murah                 |
| Klaim fitur yang tidak ada di video     | Dianggap tidak dapat diverifikasi                             |
