---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Pelanggaran dan Sanksi

Sumber: Guidebook LOGICODIX 2026, halaman 24–25.

Dokumen ini bukan untuk menakut-nakuti. Tujuannya supaya setiap anggota tahu persis
di titik mana sebuah kebiasaan biasa berubah menjadi pelanggaran, dan apa yang
terjadi setelahnya.

## 1. Hak verifikasi panitia dan juri

Panitia dan juri berhak:

- **Memeriksa repositori, kode, riwayat commit, dokumentasi, video demo, dan
  aplikasi** yang dikumpulkan.
- Meminta **klarifikasi, bukti pendukung, atau demonstrasi tambahan** bila ada
  ketidaksesuaian antara video, kode, dan aplikasi, atau indikasi pelanggaran.
- Menetapkan sanksi berdasarkan hasil pemeriksaan dan bukti yang dapat
  dipertanggungjawabkan.

Kewajiban kita: **merespons dalam batas waktu yang ditetapkan panitia.** Kalau
klarifikasi tidak dijawab, sanksi bisa dijatuhkan tanpa pembelaan.

Karena juri boleh memeriksa **riwayat commit**, jangan menganggap repo hanya dilihat
sebagai file akhir.

## 2. Bentuk pelanggaran

Tim dinyatakan melanggar apabila terbukti melakukan salah satu dari ini:

| #   | Pelanggaran                                                                                     | Bentuk konkret di repo ini                                        |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Menyerahkan proyek yang selesai atau sebagian besar dibangun sebelum Hacking Week               | Commit pertama berisi aplikasi yang sudah berjalan penuh          |
| 2   | Menggunakan karya, kode, atau proyek jadi pihak lain tanpa pengembangan substantif dan atribusi | Menyalin template lengkap; memakai kode orang lain tanpa atribusi |
| 3   | Melibatkan pihak di luar tim dalam mengembangkan bagian utama aplikasi                          | Meminta mentor menulis fitur inti                                 |
| 4   | Memanipulasi riwayat commit atau bukti pengembangan                                             | Force push, rebase, squash, amend, ubah tanggal commit            |
| 5   | Menggunakan rekaman demo palsu, simulasi hasil, atau manipulasi visual                          | Mockup di video; hasil AI yang diedit                             |
| 6   | Mengubah kode atau deployment setelah code freeze untuk memengaruhi penilaian                   | Commit atau redeploy setelah 14 Nov 23.59 WIB                     |
| 7   | Memberikan informasi, dokumen, atau tautan yang tidak benar atau tidak dapat diverifikasi       | Klaim fitur yang tidak ada; tautan mati                           |

Aturan lain yang pelanggarannya disebut eksplisit dan berujung hal serupa:

| Aturan                                                  | Halaman | Bentuk konkret                                   |
| ------------------------------------------------------- | ------- | ------------------------------------------------ |
| Dilarang menggunakan repositori lama                    | 14      | Repo lain berisi proyek yang sama                |
| Dilarang fork proyek jadi milik pihak lain              | 14      | Repo berstatus fork                              |
| Dilarang memindahkan proyek lama ke repositori baru     | 14      | Snapshot proyek lama di repo baru                |
| Commit wajib berasal dari akun GitHub anggota terdaftar | 15      | Commit bot atau akun luar tim                    |
| Dilarang bulk upload seluruh proyek dalam satu commit   | 16      | Satu commit berisi seluruh kode di akhir periode |
| Dilarang kredensial hardcoded                           | 15      | API key di kode atau file konfigurasi            |
| Submission hanya lewat portal resmi                     | 23      | Kirim lewat WhatsApp atau email                  |

## 3. Sanksi

| Sanksi                              | Kapan                                                                                                          | Akibat                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Submission tidak valid**          | Submission tidak lengkap, terlambat, atau tidak dapat diakses (repositori, aplikasi, video, atau berkas wajib) | Tidak dilanjutkan ke penilaian                    |
| **Ketentuan video tidak terpenuhi** | Durasi di luar 3–5 menit atau syarat isi tidak dipenuhi (halaman 21)                                           | Submission tidak memenuhi persyaratan demonstrasi |
| **Diskualifikasi**                  | Terbukti melanggar, atau tidak mampu memberikan klarifikasi yang dapat dipertanggungjawabkan                   | Gugur dari kompetisi                              |

## 4. Catatan risiko

Setiap kejadian yang berpotensi jadi pelanggaran dicatat di bawah, sekecil apa pun.
Catatan jujur sekarang lebih berguna daripada penjelasan dadakan nanti.

Format:

```text
Tanggal (WIB):
Kejadian:
Aturan yang berpotensi terdampak (halaman):
Tindakan yang sudah diambil:
Bukti (tautan/log):
Status: terbuka | selesai
```

### Catatan kejadian

Belum ada catatan.

Batas waktunya biasanya pendek. Ikuti urutan ini:

1. **Jangan panik dan jangan mengubah repo.** Perubahan setelah diminta
   klarifikasi bisa terlihat seperti upaya menutupi.
2. Kumpulkan bukti apa adanya: log commit, tanggal, screenshot dashboard.
3. Jawab dengan fakta dan tanpa spekulasi. Kalau tidak tahu, katakan tidak tahu dan
   tawarkan demonstrasi.
4. Libatkan seluruh anggota — juri bisa menanyai siapa saja.
5. Kirim lewat kanal resmi, bukan jalur pribadi.
6. Catat pertanyaan, jawaban, dan waktunya di dokumen ini.

## 5. Kalau menerima klarifikasi dari panitia
