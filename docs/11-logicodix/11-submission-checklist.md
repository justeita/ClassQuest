---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Checklist Submission

Sumber: Guidebook LOGICODIX 2026, halaman 18–23.

Dokumen ini adalah lembar kerja terakhir. Isi semua kolom, jangan ada yang kosong
saat menekan tombol submit.

## Aturan submission

| Aturan                                                                        | Konsekuensi                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| Semua berkas dan tautan dikumpulkan lewat **portal submission resmi**         | Kiriman lewat WhatsApp/email tidak sah       |
| Batas waktu **14 November 2026 pukul 23.59 WIB**                              | Submission terlambat tidak diterima          |
| **Waktu pada sistem portal** menjadi acuan ketepatan waktu                    | Jam laptop sendiri tidak berlaku             |
| Setiap tim hanya boleh **satu kali submission**                               | Tidak bisa diperbaiki atau dilengkapi        |
| Submission yang sudah dikirim **bersifat final**                              | Periksa semuanya sebelum mengirim            |
| Kendala perangkat, jaringan, akun, atau penyimpanan adalah tanggung jawab tim | Tidak menjadi dasar penerimaan keterlambatan |
| Tim disarankan mengirim lebih awal                                            | Rekomendasi panitia                          |

**Karena hanya boleh sekali, seluruh daftar di bawah ini harus selesai sebelum
tombol submit disentuh.** Tenggat internal kita 21.00 WIB, bukan 23.59.

## Data identitas

Isi sekali, lalu salin dari sini ke semua berkas. Jangan mengetik ulang.

| Field              | Nilai                 |
| ------------------ | --------------------- |
| Nama tim           | `TBD`                 |
| Ketua tim          | `TBD`                 |
| Anggota 1          | `TBD`                 |
| Anggota 2          | `TBD`                 |
| Anggota 3          | `TBD`                 |
| Asal instansi      | `TBD`                 |
| Kategori           | Web                   |
| Nama aplikasi      | ClassQuest            |
| Subtema            | Smart & Fun Education |
| Repositori kanonik | `TBD`                 |
| URL aplikasi       | `TBD`                 |
| Tautan video demo  | `TBD`                 |
| Commit hash final  | `TBD`                 |
| Waktu commit final | `TBD`                 |
| Waktu deploy final | `TBD`                 |

## Berkas wajib

| #   | Berkas                        | Syarat                                                                                                     | Status |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Tautan repositori GitHub      | Publik, lengkap, tidak kosong, punya README, memuat seluruh kode sumber. Sertakan semua repo bila terpisah | ☐      |
| 2   | Tautan video demo YouTube     | 3–5 menit, Unlisted/Public, bisa diputar tanpa login                                                       | ☐      |
| 3   | Surat pernyataan orisinalitas | PDF format panitia, ditandatangani Ketua Tim, bermeterai                                                   | ☐      |
| 4   | Akun demonstrasi              | Wajib bila aplikasi memakai autentikasi                                                                    | ☐      |
| 5   | URL aplikasi Web              | Ter-deploy dan bisa diakses browser                                                                        | ☐      |

## Checklist A — Repositori

- [ ] Repositori berstatus **Public** dan tetap public sampai pengumuman hasil.
- [ ] Repositori bukan fork.
- [ ] Repositori memuat **seluruh kode sumber** dan komponen untuk menjalankan
      aplikasi.
- [ ] `README.md` ada di direktori utama dan memuat sembilan poin wajib
      ([`07-readme-wajib.md`](./07-readme-wajib.md)).
- [ ] Tidak ada `.env` atau nilai rahasia yang ter-track
      ([`06-keamanan-kredensial.md`](./06-keamanan-kredensial.md)).
- [ ] Riwayat commit tidak pernah di-rewrite
      ([`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md)).
- [ ] Semua penulis commit adalah anggota tim terdaftar.
- [ ] Tidak ada commit bot.
- [ ] Tidak ada commit besar berisi seluruh proyek di akhir periode.
- [ ] Commit final dibuat **sebelum** 14 November 2026 23.59 WIB.
- [ ] Hanya ada **satu** repo yang menjadi artefak submission.
- [ ] Aplikasi bisa dijalankan dengan mengikuti README dari nol.

## Checklist B — Aplikasi

- [ ] Aplikasi ter-deploy dari **commit final**.
- [ ] Bisa dibuka di jendela penyamaran tanpa login.
- [ ] Bisa dibuka di ponsel.
- [ ] Fitur utama berjalan tanpa error.
- [ ] Akun demo tersedia dan berfungsi (bila ada autentikasi).
- [ ] Tidak ada fitur utama yang butuh pembayaran atau langganan.
- [ ] Kuota API aktif sampai 29 November 2026.
- [ ] Tidak ada stack trace atau kredensial yang tampil di layar error.

## Checklist C — Video

- [ ] Durasi antara 3:00 dan 5:00.
- [ ] Direkam dari commit final.
- [ ] Menampilkan identitas aplikasi, alur input→proses→output, bukti fitur, dan
      integrasi AI.
- [ ] Tidak ada slide, mockup, animasi, atau simulasi.
- [ ] YouTube Unlisted atau Public, bisa diputar tanpa login.
- [ ] Tautan diuji di jendela penyamaran.
- [ ] Tidak akan diubah atau dihapus sampai pengumuman hasil.

## Checklist D — Dokumen dan konsistensi

- [ ] Surat pernyataan sesuai format panitia, bertanda tangan, bermeterai.
- [ ] Nama tim dan anggota sama persis di form pendaftaran, README, surat
      pernyataan, dan video.
- [ ] Nama subtema sama persis dengan guidebook.
- [ ] Semua tautan valid dan bisa diakses tanpa izin tambahan.
- [ ] Tidak ada tautan yang mengarah ke `localhost` atau repo private.

## Checklist E — Terakhir sebelum submit

- [ ] `bun run check` hijau di commit final.
- [ ] `bun run build` hijau di commit final.
- [ ] Commit hash final dicatat di tabel identitas di atas.
- [ ] Tautan dan berkas dibuka ulang satu per satu dari perangkat lain.
- [ ] Submission dikirim **maksimal 21.00 WIB**.
- [ ] Tangkapan layar konfirmasi submission disimpan.
- [ ] Setelah submit: **tidak ada perubahan** pada repo, deploy, dan video.

## Setelah submit

Yang boleh dilakukan:

- Memantau kanal resmi untuk pengumuman finalis (21 November 2026).
- Menyiapkan materi babak final ([`15-babak-final.md`](./15-babak-final.md)).
- Memulihkan layanan yang down tanpa mengubah kode, fitur, atau data.

Yang **tidak** boleh dilakukan:

- Commit, push, atau merge apa pun ke repo submission.
- Mengubah deployment.
- Mengedit video.
- Mengubah repo menjadi private atau menghapusnya.
- Memindahkan repo ke organisasi atau akun lain.

## Catatan submit

Setelah submit, isi bagian ini sebagai bukti:

| Item                        | Nilai |
| --------------------------- | ----- |
| Waktu submit (WIB)          | `TBD` |
| Nomor/tanda submission      | `TBD` |
| Tangkapan layar disimpan di | `TBD` |
| Yang mengirim               | `TBD` |
