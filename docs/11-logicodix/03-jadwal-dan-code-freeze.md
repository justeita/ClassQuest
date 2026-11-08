---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Jadwal dan Code Freeze

Sumber: Guidebook LOGICODIX 2026, halaman 5, 14, 16, dan 21.

## Jadwal pengembangan (halaman 14)

| Agenda                               | Waktu                       | Konsekuensi                                            |
| ------------------------------------ | --------------------------- | ------------------------------------------------------ |
| Hacking Kick-off dan awal pengerjaan | 7 November 2026             | Pengembangan kode dimulai **setelah** kick-off selesai |
| Code freeze (akhir Hacking Week)     | 14 November 2026, 23.59 WIB | Semua perubahan kode dihentikan                        |
| Batas akhir submission               | 14 November 2026, 23.59 WIB | Submission setelah batas tidak diterima                |

Seluruh pengerjaan dilakukan daring dan boleh dari lokasi masing-masing anggota.

## Arti code freeze

Empat hal ini berlaku bersamaan. Melanggar salah satunya berarti karya tidak
dinilai atau dianggap pelanggaran.

1. **Seluruh perubahan kode berhenti** pada 14 November 2026 pukul 23.59 WIB.
2. **Yang dinilai adalah commit yang dicantumkan di form submission** (commit hash
   final). Commit itu wajib dibuat **tidak lebih lambat** dari waktu code freeze.
3. **Aplikasi yang di-deploy, berkas APK, dan video demo wajib berasal dari commit
   final tersebut.** Bukan dari commit sesudahnya, bukan dari branch lain.
4. **Setelah code freeze, deployment tidak boleh diubah**, kecuali memulihkan
   ketersediaan layanan tanpa mengubah kode, fitur, atau data.
5. **Perubahan setelah code freeze tidak dinilai.** Juri hanya memeriksa commit
   final.

## Batas yang sah setelah code freeze

Ini daftar putih. Di luar ini, jangan sentuh apa pun.

| Boleh dilakukan setelah code freeze                                | Syarat                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Memulihkan aplikasi yang down (redeploy commit final yang sama)    | Tanpa perubahan kode, fitur, atau data                               |
| Memperbaiki konfigurasi infrastruktur yang tidak mengubah perilaku | Tidak menambah atau mengubah fitur                                   |
| Menjawab klarifikasi panitia/juri                                  | Jawaban tidak boleh berupa perubahan kode yang memengaruhi penilaian |
| Menambah isi data demo yang rusak                                  | Hanya pemulihan, bukan data baru yang mengubah hasil penilaian       |

| Tidak boleh setelah code freeze                        | Kenapa berbahaya                                         |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `git commit` kode apa pun di branch submission         | Commit final tidak cocok dengan repo yang diperiksa juri |
| `git push --force`, `rebase`, `squash`, `reset --hard` | Manipulasi riwayat commit                                |
| Redeploy dari branch selain commit final               | Deployment tidak lagi berasal dari commit final          |
| Edit video di YouTube (potong, ganti, hapus)           | Submission berubah setelah dikirim                       |
| Mengubah repo menjadi private atau menghapus           | Submission tidak dapat diakses = tidak valid             |
| Memperbarui `.env` di platform deploy                  | Perubahan konfigurasi yang memengaruhi perilaku aplikasi |

## Tenggat internal kita

Tenggat panitia adalah 23.59 WIB. Tenggat kita lebih awal supaya tidak pernah
berebut di menit terakhir. Semua waktu dalam WIB.

| Tenggat internal                | Waktu                       | Yang harus selesai                                                      |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| Fitur dibekukan                 | 13 November 2026, 20.00     | Semua fitur MVP selesai dan bisa didemokan                              |
| Bug fix terakhir                | 14 November 2026, 12.00     | Hanya bug fix, tidak ada fitur baru                                     |
| README final                    | 14 November 2026, 15.00     | Sembilan poin wajib lengkap                                             |
| Video demo final                | 14 November 2026, 18.00     | Sudah diunggah ke YouTube, unlisted/public, tautan tetap                |
| Deploy final dari commit final  | 14 November 2026, 19.00     | Aplikasi hidup dan sudah dites di perangkat lain                        |
| Surat pernyataan ditandatangani | 14 November 2026, 19.00     | PDF siap, sesuai format panitia                                         |
| Commit hash final dibekukan     | 14 November 2026, 20.00     | Dicatat di [`11-submission-checklist.md`](./11-submission-checklist.md) |
| Submission dikirim              | 14 November 2026, **21.00** | Minimal 3 jam sebelum batas; tidak bisa dikirim ulang                   |

**Aturan emas: submission dikirim paling lambat 21.00 WIB, bukan 23.59.** Form
submission bersifat final dan tidak bisa diganti atau dilengkapi, dan kendala
jaringan atau akun menjadi tanggung jawab tim.

## Countdown harian

Bila ragu apakah sebuah tindakan masih boleh, tanyakan satu hal: **apakah ini
mengubah commit final?** Kalau ya, berhenti. Kalau tidak, cek apakah itu mengubah
deployment atau isi submission. Kalau ya, berhenti juga.

## Setelah submission

| Waktu            | Agenda                                | Yang perlu disiapkan                |
| ---------------- | ------------------------------------- | ----------------------------------- |
| 21 November 2026 | Pengumuman Finalis (Top 8)            | Pantau situs dan media sosial resmi |
| 22 November 2026 | Technical Meeting peserta babak final | Wajib hadir bila lolos              |
| 29 November 2026 | Puncak Acara: babak final dan seminar | Live demo dari localhost, luring    |

Persiapan final ada di [`15-babak-final.md`](./15-babak-final.md).
