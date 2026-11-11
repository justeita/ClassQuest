---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Ketentuan Peserta dan Karya

Sumber: Guidebook LOGICODIX 2026, halaman cetak 5–7. Dua daftar ini adalah syarat ikut
lomba. Kolom "bukti di repo ini" adalah hal yang harus bisa ditunjukkan kalau juri
bertanya — bukan formalitas.

## A. Ketentuan umum lomba (14 poin)

| #   | Ketentuan                                                               | Apa artinya bagi kita                                                              | Bukti di repo ini                                                              |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Peserta wajib mengikuti akun Instagram resmi @logicodix                 | Semua anggota follow; perubahan jadwal diumumkan di sana                           | Konfirmasi anggota, bukan artefak repo                                         |
| 2   | Peserta wajib membaca dan memahami seluruh guidebook                    | Setiap anggota membaca; aturan diterjemahkan ke folder `11-logicodix/`             | Folder ini                                                                     |
| 3   | Terbuka bagi siswa SMA/SMK/MA/sederajat dan mahasiswa seluruh Indonesia | Tidak ada batasan domisili                                                         | Data pendaftaran                                                               |
| 4   | Setiap tim maksimal 4 orang                                             | Jumlah anggota dikunci sebelum submission                                          | [`07-readme-wajib.md`](./07-readme-wajib.md)                                   |
| 5   | Anggota boleh dari instansi berbeda dan lintas jenjang                  | Boleh campur SMA dan kuliah                                                        | Data pendaftaran                                                               |
| 6   | Setiap tim minimal 1 dan maksimal 4 orang                               | Sama seperti poin 4                                                                | Data pendaftaran                                                               |
| 7   | Wajib mengikuti Integrated Mentoring sebelum masa pengerjaan            | Kehadiran dicatat; materi mentoring memengaruhi arah produk                        | Catatan kehadiran                                                              |
| 8   | Wajib mengembangkan aplikasi berbasis Web/Mobile                        | Pilih satu kategori, satu produk                                                   | [`../01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)         |
| 9   | Wajib mengumpulkan source code dan video demo sesuai jadwal             | Dua artefak wajib, tidak boleh salah satu saja                                     | [`11-submission-checklist.md`](./11-submission-checklist.md)                   |
| 10  | Karya harus dapat dipertanggungjawabkan oleh tim                        | Setiap anggota mampu menjelaskan implementasi teknisnya                            | [`15-babak-final.md`](./15-babak-final.md)                                     |
| 11  | Karya orisinal, bukan plagiarisme                                       | Tidak menyalin kode proyek lain; atribusi wajib bila memakai komponen pihak ketiga | [`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md) |
| 12  | Ide dan karya belum pernah diikutsertakan di kompetisi lain             | Proyek ini tidak boleh pernah dilombakan                                           | Pernyataan orisinalitas                                                        |
| 13  | Wajib mengikuti seluruh rangkaian kompetisi sesuai jadwal               | Termasuk technical meeting dan grand final bila lolos                              | [`03-jadwal-dan-code-freeze.md`](./03-jadwal-dan-code-freeze.md)               |
| 14  | Pelanggaran dapat dikenai sanksi hingga diskualifikasi                  | Bukan peringatan ringan                                                            | [`13-pelanggaran-dan-sanksi.md`](./13-pelanggaran-dan-sanksi.md)               |

## B. Ketentuan karya (10 poin)

| #   | Ketentuan                                                                 | Apa artinya bagi kita                                                             | Bukti di repo ini                                                            |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Karya berupa Minimum Viable Product berbasis Web/Mobile                   | Fitur utama harus bisa dijalankan dan diuji, bukan mockup                         | README bagian fitur + video                                                  |
| 2   | Wajib menerapkan salah satu subtema Hackathon                             | Subtema ditulis eksplisit di README, video, dan pitch                             | [`01-ringkasan-guidebook.md`](./01-ringkasan-guidebook.md)                   |
| 3   | Karya memberi solusi pada permasalahan nyata dengan teknologi digital     | Masalah, target pengguna, dan solusinya harus bisa dijelaskan dalam satu paragraf | README + rubrik 25%                                                          |
| 4   | AI diperbolehkan dalam proses pengembangan maupun sebagai fitur aplikasi  | Boleh, tapi wajib didokumentasikan                                                | [`14-ai-dan-atribusi.md`](./14-ai-dan-atribusi.md)                           |
| 5   | Boleh memakai API AI atau model open-source                               | Tidak ada kewajiban memakai vendor tertentu                                       | [`../09-decisions/0006-ai-provider.md`](../09-decisions/0006-ai-provider.md) |
| 6   | Karya harus bisa dijalankan dan didemonstrasikan pada Grand Final         | Harus jalan di localhost laptop sendiri tanpa internet opsional yang rapuh        | [`15-babak-final.md`](./15-babak-final.md)                                   |
| 7   | Wajib mengumpulkan source code lewat repositori GitHub                    | Repo adalah artefak utama; tidak ada jalur zip/email                              | [`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md)               |
| 8   | Wajib video demo 3–5 menit yang menjelaskan cara kerja aplikasi           | Durasi dan isi diatur ketat                                                       | [`08-video-demo.md`](./08-video-demo.md)                                     |
| 9   | Peserta bertanggung jawab atas orisinalitas kode, data, dan aset          | Termasuk lisensi aset dan dataset                                                 | [`14-ai-dan-atribusi.md`](./14-ai-dan-atribusi.md)                           |
| 10  | Wajib memperhatikan etika AI, pelindungan data, dan efisiensi sumber daya | Ada bobot penilaian 10% untuk etika & keamanan digital                            | [`12-rubrik-penilaian.md`](./12-rubrik-penilaian.md)                         |

## Yang dilarang secara eksplisit

Daftar ini muncul di beberapa halaman guidebook dan semuanya bermuara pada
diskualifikasi. Jangan pernah menganggapnya imbauan.

1. Menyerahkan proyek yang sudah selesai atau sebagian besar dibangun sebelum
   Hacking Week.
2. Menggunakan repositori lama, fork proyek jadi milik pihak lain, atau
   memindahkan proyek lama ke repositori baru.
3. Menggunakan proyek jadi, kode pihak lain, hasil kompetisi sebelumnya, atau
   template aplikasi lengkap yang hanya diubah identitas, tampilan, atau isinya.
4. Meminta pihak di luar tim — termasuk mentor — membuatkan atau mengembangkan
   bagian utama aplikasi.
5. Commit dari akun GitHub yang bukan anggota tim terdaftar.
6. Mengunggah seluruh proyek dalam satu commit (bulk upload) di akhir periode.
7. Mengubah riwayat commit setelah di-push: force push, rebase, squash,
   penghapusan commit, atau manipulasi tanggal commit.
8. Menuliskan API key, token, password database, atau kredensial lain langsung di
   repositori.
9. Memakai rekaman demo palsu, simulasi hasil, atau manipulasi visual.
10. Mengubah kode atau deployment setelah code freeze untuk memengaruhi penilaian.
11. Memberikan informasi, dokumen, atau tautan yang tidak benar atau tidak bisa
    diverifikasi.

## Yang diperbolehkan

Sering dilupakan, padahal ini yang membuat pekerjaan tetap efisien:

- **Framework, library, package, komponen UI, starter template resmi, API publik,
  model pre-trained, pustaka open-source, dan AI coding assistant.**
- **Konsultasi, arahan, dokumentasi teknis, dan sumber belajar publik.**
- **Menyiapkan ide, riset, wireframe, dan desain UI/UX sebelum Hacking Week.**
  Yang tidak boleh: menulis kode.
- **Backend, database, layanan cloud, API pihak ketiga, dan layanan AI**, selama
  mendukung fungsi aplikasi.
- **AI tidak wajib**, kecuali rubrik menentukan lain.

Batas antara "boleh disiapkan" dan "tidak boleh" ada di
[`04-orisinalitas-dan-riwayat-repo.md`](./04-orisinalitas-dan-riwayat-repo.md).

## Kategori: Web atau Mobile

Guidebook halaman cetak 11:

- Setiap tim memilih **satu** kategori dan mengembangkan **satu** produk.
- Web: situs atau aplikasi web yang diakses lewat browser.
- Mobile: aplikasi untuk perangkat Android atau iOS.
- Kedua kategori dinilai dengan rubrik dan bobot yang **sama**.
- Penilaian **hanya** dilakukan pada implementasi kategori yang dipilih.

**Keputusan kita: kategori Web.** Alasannya ada di
[`../09-decisions/0001-nextjs-app-router.md`](../09-decisions/0001-nextjs-app-router.md)
dan stack yang sudah dipasang. Konsekuensi yang harus dijaga:

- Jangan menampilkan aplikasi mobile sebagai bagian dari demo — juri hanya menilai
  kategori yang dipilih.
- Deployment wajib bisa dibuka di browser tanpa instalasi.
- Jangan mengklaim "mobile-ready" di README atau pitch.
