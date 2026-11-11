---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Aturan LOGICODIX 2026

Folder ini adalah **satu-satunya tempat aturan kompetisi**. Isinya terjemahan
operasional Guidebook LOGICODIX 2026 menjadi aturan kerja yang bisa langsung
diikuti siapa pun — termasuk AI agent — yang mengubah repo ini.

## Bedanya dengan folder lain

| Folder                      | Isinya                                            |
| --------------------------- | ------------------------------------------------- |
| `00-product` … `10-roadmap` | bagaimana kita membangun produk                   |
| `08-workflow`               | bagaimana kita bekerja (git, test, setup, review) |
| **`11-logicodix`**          | **apa yang dituntut panitia**                     |

Kalau aturan di folder ini berbeda dengan kebiasaan kita di `08-workflow`, folder
ini yang menang. Kompetisi tidak menilai kerapian internal kita; ia menilai
kepatuhan pada guidebook.

## Sumber dan batas keberlakuan

- Sumber: `GUIDEBOOK-LOGICODIX-FINAL.pdf` (32 halaman, LOGICODIX 2026).
- Dokumen di folder ini adalah **turunan**, bukan pengganti. Kalau ada perbedaan
  tafsir, yang berlaku adalah guidebook dan klarifikasi tertulis panitia lewat
  kanal resmi.
- Nomor halaman guidebook yang dipakai di folder ini adalah **nomor halaman
  tercetak di footer** (1–30), bukan nomor halaman PDF. Karena cover dan daftar
  isi, halaman PDF = halaman cetak + 2 (misalnya cetak 15 = PDF halaman 17).
  Selalu sebutkan "halaman cetak" kalau mengutip, supaya tidak ambigu.

## Sepuluh aturan yang paling mahal kalau salah

| #   | Aturan                                                                    | Sanksi                 | Dokumen                                                                        |
| --- | ------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| 1   | Kode harus ditulis **selama** Hacking Week, bukan sebelum                 | Diskualifikasi         | [`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md) |
| 2   | Dilarang pindah proyek lama ke repo baru                                  | Diskualifikasi         | [`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md) |
| 3   | Dilarang mengubah riwayat commit (force push, rebase, squash)             | Diskualifikasi         | [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md)                 |
| 4   | Dilarang bulk upload seluruh proyek di akhir                              | Diskualifikasi         | [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md)                 |
| 5   | Commit hanya dari akun GitHub anggota terdaftar                           | Diskualifikasi         | [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md)                 |
| 6   | Tidak ada kredensial hardcoded; `.env` tidak boleh ter-push               | Diskualifikasi         | [`06-keamanan-kredensial.md`](./06-keamanan-kredensial.md)                     |
| 7   | README wajib memuat 9 hal yang ditentukan panitia                         | Submission tidak valid | [`07-readme-wajib.md`](./07-readme-wajib.md)                                   |
| 8   | Video demo 3–5 menit, merekam aplikasi yang benar-benar jalan             | Submission tidak valid | [`08-video-demo.md`](./08-video-demo.md)                                       |
| 9   | Repo publik, aplikasi bisa diakses juri tanpa bayar/izin tambahan         | Submission tidak valid | [`09-deploy-dan-akses-juri.md`](./09-deploy-dan-akses-juri.md)                 |
| 10  | Code freeze 14 November 2026 pukul 23.59 WIB; tidak ada commit setelahnya | Tidak dinilai          | [`03-jadwal-dan-code-freeze.md`](./03-jadwal-dan-code-freeze.md)               |

## Daftar dokumen

| Dokumen                                                                        | Isi                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`01-ringkasan-guidebook.md`](./01-ringkasan-guidebook.md)                     | Tema, subtema, bentuk kegiatan, timeline resmi                |
| [`02-ketentuan-peserta-dan-karya.md`](./02-ketentuan-peserta-dan-karya.md)     | Ketentuan peserta, ketentuan karya, larangan, kategori        |
| [`03-jadwal-dan-code-freeze.md`](./03-jadwal-dan-code-freeze.md)               | Jadwal WIB dan apa yang boleh/tidak setelah code freeze       |
| [`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md) | Orisinalitas, satu repo kanonik, aturan riwayat               |
| [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md)                 | Format commit, branch, PR, larangan rewrite                   |
| [`06-keamanan-kredensial.md`](./06-keamanan-kredensial.md)                     | `.env`, `.env.example`, aturan pemakaian env                  |
| [`07-readme-wajib.md`](./07-readme-wajib.md)                                   | Sembilan isi README wajib + kerangka siap pakai               |
| [`08-video-demo.md`](./08-video-demo.md)                                       | Aturan video, urutan wajib, larangan, shot list               |
| [`09-deploy-dan-akses-juri.md`](./09-deploy-dan-akses-juri.md)                 | Deployment, akun demo, kuota API selama penilaian             |
| [`10-surat-pernyataan.md`](./10-surat-pernyataan.md)                           | Surat pernyataan orisinalitas: isi, meterai, konsistensi data |
| [`11-submission-checklist.md`](./11-submission-checklist.md)                   | Checklist final sebelum submit                                |
| [`12-rubrik-penilaian.md`](./12-rubrik-penilaian.md)                           | Bobot penilaian dan cara memenuhinya                          |
| [`13-pelanggaran-dan-sanksi.md`](./13-pelanggaran-dan-sanksi.md)               | Bentuk pelanggaran, hak verifikasi, format catatan kejadian   |
| [`14-ai-dan-atribusi.md`](./14-ai-dan-atribusi.md)                             | Dokumentasi penggunaan AI dan atribusi pihak ketiga           |
| [`15-babak-final.md`](./15-babak-final.md)                                     | Top 8, technical meeting, persiapan live demo                 |

## Cara memakai folder ini

1. **Sebelum menulis kode**, baca [`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md)
   dan [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md). Dua dokumen
   itu mengatur hal yang tidak bisa diperbaiki setelah terlanjur.
2. **Saat menulis kode**, ikuti [`06-keamanan-kredensial.md`](./06-keamanan-kredensial.md)
   dan [`02-ketentuan-peserta-dan-karya.md`](./02-ketentuan-peserta-dan-karya.md).
3. **Sebelum submission**, ikuti [`11-submission-checklist.md`](./11-submission-checklist.md)
   dari atas ke bawah. Submission hanya boleh dikirim **satu kali** dan tidak bisa
   diperbaiki setelahnya.
4. **Kalau ada yang tidak jelas**, jangan menebak. Tulis `TBD` di dokumen terkait
   dan tanyakan ke panitia lewat kanal resmi, lalu catat jawabannya di
   [`01-ringkasan-guidebook.md`](./01-ringkasan-guidebook.md).
