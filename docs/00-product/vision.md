---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Visi Produk

## Masalah

Materi pelajaran biasanya sampai ke siswa dalam bentuk yang membosankan: PDF,
slide, dan teks panjang. Guru sudah punya materi yang bagus, tapi mengubahnya
menjadi pengalaman belajar yang menarik butuh waktu dan kemampuan yang tidak
selalu tersedia.

Sementara itu, game punya sifat yang justru dibutuhkan untuk belajar:

- memberi konteks pada informasi (materi jadi bagian dari situasi),
- memberi umpan balik langsung,
- membuat siswa mau mencoba lagi,
- membuat proses mengingat terasa seperti bagian dari cerita.

## Konsep

ClassQuest adalah **media pembelajaran berupa game 2D pixel bergaya Omori**: ada
cerita, karakter, suasana, dan tantangan. Bedanya, ceritanya **bisa disesuaikan
dengan materi guru**.

Guru tetap memegang kendali: materi yang diunggah guru adalah satu-satunya sumber
isi. AI tidak mengajar dengan pengetahuannya sendiri; AI hanya **mengubah bentuk**
materi menjadi cerita yang bisa dimainkan.

## Tujuan

1. Guru bisa mengubah PDF materi menjadi game yang layak dimainkan dalam hitungan
   menit, bukan minggu.
2. Siswa belajar lewat cerita dan tantangan, bukan membaca ulang PDF.
3. Guru bisa review dan mengedit hasil AI, karena AI tidak selalu benar.
4. Hasil visual konsisten dan terasa seperti game sungguhan, bukan template.

## Non-goals (yang sengaja tidak dikerjakan)

Ini sama pentingnya dengan tujuan. Kalau ada ide yang masuk ke daftar ini,
taruh di backlog, bukan di MVP.

- **Bukan platform LMS.** Tidak ada nilai rapor, kurikulum, absensi, atau
  integrasi sekolah.
- **Bukan generator aset.** Tidak ada pembuatan gambar/musik oleh AI. Semua aset
  disiapkan manusia dan bersifat tetap.
- **Bukan engine game umum.** Hanya mendukung pola cerita yang sudah ditentukan
  schema (chapter → scene → beat → challenge).
- **Bukan aplikasi multi-pemain.** Satu siswa, satu sesi.
- **Bukan pengganti guru.** Materi tetap dari guru; AI tidak menambah fakta baru.
- **Bukan produk produksi penuh.** Ini hasil hackathon: satu alur demo yang
  bekerja rapi lebih berharga daripada sepuluh fitur setengah jadi.

## Diferensiasi

| Media belajar biasa       | ClassQuest                                                         |
| ------------------------- | ------------------------------------------------------------------ |
| Teks linear               | Cerita yang berjalan dari scene ke scene, dengan dialog dan adegan |
| Soal terpisah dari materi | Tantangan muncul di dalam adegan, sebagai bagian cerita            |
| Guru menyerahkan ke tool  | Guru review & edit sebelum siswa main                              |
| AI bebas berhalusinasi    | AI dibatasi schema + manifest aset + validasi ketat                |
| Tampilan generik          | Arah seni pixel art yang konsisten sejak awal                      |

## Prinsip desain

1. **Guru adalah editor, bukan penonton.** Setiap output AI harus bisa dilihat,
   diedit, dan ditolak.
2. **Batasan membuat hasil lebih baik.** Aset tetap + schema ketat + aturan
   generasi menghasilkan cerita yang nyambung, bukan output acak yang terlihat
   mengesankan.
3. **Game dulu, lalu materi.** Siswa harus bisa menikmati 30 detik pertama tanpa
   merasa sedang mengerjakan ulangan.
4. **Tidak ada jalan buntu.** Kalau AI gagal, selalu ada cerita fallback yang
   tetap bisa dimainkan saat demo.
5. **Kecil dan selesai.** Satu alur end-to-end yang berjalan > banyak fitur setengah.

## Metrik keberhasilan (untuk hackathon)

Kualitatif, karena waktunya pendek:

- [ ] Guru bisa upload PDF → dapat cerita → edit → siswa bisa main, tanpa bantuan tim.
- [ ] Waktu dari upload sampai cerita siap review < 2 menit untuk materi 5–10 halaman.
- [ ] Tidak ada error validasi yang tidak tertangani saat demo.
- [ ] Minimal 3 chapter, 6 tantangan, dan seluruh aset yang dipakai ada di manifest.
- [ ] Audiens paham konsepnya dalam 30 detik pitch.

## Risiko utama

| Risiko                           | Dampak                  | Mitigasi                                                                                   |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| AI menghasilkan JSON tidak valid | Alur demo putus         | Validator + repair loop + fallback story (lihat `03-ai-pipeline/validation-and-repair.md`) |
| Cerita terasa ngawur             | Produk kehilangan makna | Aturan generasi ketat + review guru (`generation-rules.md`)                                |
| Aset belum siap                  | Game tidak bisa tampil  | Placeholder berlabel + manifest sejak hari pertama                                         |
| Scope melebar                    | Tidak selesai           | `mvp-scope.md` + cut line yang tegas                                                       |
| Waktu habis untuk integrasi      | Demo gagal              | Urutan kerja di `10-roadmap/hackathon-plan.md`                                             |
