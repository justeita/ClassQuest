---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Orisinalitas dan Riwayat Repositori

Sumber: Guidebook LOGICODIX 2026, halaman 8–9, 14–16, 24–25, dan 27.

Dokumen ini mengatur hal yang **tidak bisa diperbaiki setelah terlanjur**. Semua
yang ada di sini punya sanksi sampai diskualifikasi, dan panitia punya hak penuh
memeriksa repositori serta riwayat commit.

## 1. Aturan orisinalitas proyek

### Yang wajib

- Seluruh kode dan komponen utama produk **dikembangkan selama Hacking Week**
  (7–14 November 2026).
- Karya dapat dipertanggungjawabkan tim, orisinal, bukan plagiarisme.
- Ide dan karya **belum pernah** diikutsertakan dalam kompetisi lain.
- Peserta bertanggung jawab atas orisinalitas kode, data, dan aset.

### Yang boleh disiapkan sebelum Hacking Week

Garis batasnya adalah **kode**, bukan ide.

| Boleh sebelum 7 November 2026        | Tidak boleh sebelum 7 November 2026       |
| ------------------------------------ | ----------------------------------------- |
| Ide dan konsep solusi                | Menulis kode aplikasi                     |
| Riset masalah dan pengguna           | Scaffold proyek yang akan disubmit        |
| Wireframe dan sketsa layar           | Membangun komponen UI yang dipakai        |
| Desain UI/UX dan palet warna         | Menyiapkan logika, validator, atau API    |
| Menyusun rencana dan pembagian tugas | Menyiapkan fixture/dataset hasil generate |

Kalau sebuah file akan ikut dinilai dan berisi kode yang menjalankan aplikasi, file
itu harus lahir di dalam Hacking Week.

### Yang dilarang

1. Menyerahkan proyek yang sudah selesai atau **sebagian besar sudah dibangun**
   sebelum Hacking Week.
2. Menggunakan **repositori lama**.
3. Melakukan **fork** proyek jadi milik pihak lain.
4. **Memindahkan proyek lama ke repositori baru.**
5. Memakai proyek jadi, kode milik pihak lain, hasil kompetisi sebelumnya, atau
   **template aplikasi lengkap yang hanya diubah identitas, tampilan, atau
   kontennya**.
6. Meminta pihak luar tim — termasuk mentor — membuatkan atau mengembangkan
   **bagian utama** aplikasi.

Yang membedakan poin 5 dari "boleh pakai starter template resmi": kalau logika,
fitur, dan alur kerja produk tetap harus ditulis tim sendiri, itu boleh. Kalau
template sudah punya alur produknya dan tim hanya mengganti nama, warna, dan isi,
itu tidak boleh.

## 2. Satu repo kanonik

Aturan yang paling gampang dilanggar tanpa sadar: **hanya ada satu repositori yang
menjadi artefak submission.** Setiap repositori tambahan yang berisi proyek yang
sama menimbulkan pertanyaan "mana yang asli, dan kenapa ada dua?".

Keputusan yang mengikat:

| Hal                                   | Aturan                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Repo submission                       | Hanya satu, tercatat di [`11-submission-checklist.md`](./11-submission-checklist.md) |
| Repo kedua untuk proyek yang sama     | Dilarang dibuat mulai sekarang                                                       |
| Repo berisi snapshot/salinan proyek   | Dilarang dibuat                                                                      |
| Memindahkan proyek ke repo baru       | Dilarang                                                                             |
| Fork repo orang lain untuk dikerjakan | Dilarang                                                                             |

Kalau butuh eksperimen berisiko (spike, coba library), lakukan di **branch** pada
repo yang sama, bukan di repo baru. Branch boleh dihapus; repo tidak bisa
dihilangkan dari riwayat publik.

Repo kanonik dicatat di [`11-submission-checklist.md`](./11-submission-checklist.md).
Begitu dicatat, jangan diubah lagi.

## 3. Aturan riwayat commit

Sumber: halaman 16.

| Aturan                                                                  | Konsekuensi kalau dilanggar       |
| ----------------------------------------------------------------------- | --------------------------------- |
| Repositori GitHub dibuat **setelah** Hacking Kick-off                   | Dipertanyakan orisinalitas        |
| Commit pertama dibuat **setelah** kick-off selesai                      | Dipertanyakan orisinalitas        |
| Commit dibuat **berkala** selama Hacking Week                           | Riwayat tidak mencerminkan proses |
| Commit mencerminkan perubahan nyata (fitur, bug fix, integrasi API, UI) | Bulk upload = pelanggaran         |
| Dilarang mengunggah seluruh proyek dalam satu commit di akhir periode   | Diskualifikasi                    |
| Dilarang mengubah riwayat commit setelah di-push                        | Diskualifikasi                    |
| Dilarang memanipulasi tanggal commit                                    | Diskualifikasi                    |

Bentuk "mengubah riwayat commit setelah di-push" yang harus dihindari:

- `git push --force` dan `git push --force-with-lease`
- `git rebase` pada commit yang sudah di-push, termasuk `git pull --rebase`
- `git commit --amend` pada commit yang sudah di-push
- `git reset --hard` lalu push ulang
- Squash merge PR
- Menghapus commit atau branch yang sudah di-push
- Mengubah `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE`
- Menghapus dan membuat ulang repositori

**Karena itu: merge PR memakai merge commit, bukan squash, dan tombol "Squash and
merge" tidak boleh dipakai di repo ini.** Detailnya di
[`05-aturan-commit-dan-git.md`](./05-aturan-commit-dan-git.md).

## 4. Commit harus dari akun anggota terdaftar

Sumber: halaman 15.

- Produk hanya boleh dikembangkan anggota tim yang terdaftar resmi.
- **Seluruh commit wajib berasal dari akun GitHub anggota terdaftar.**

Konsekuensi praktis:

| Kejadian                                  | Status                                                           |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Commit dari `dependabot[bot]`             | Tidak berasal dari akun anggota — **harus dihentikan**           |
| Commit dari akun GitHub orang lain        | Pelanggaran                                                      |
| Commit dari akun anggota tapi email salah | Bisa dipertanyakan; samakan `git config user.email`              |
| Commit hasil AI coding assistant          | Boleh — AI assistant diperbolehkan, tapi tetap di-commit anggota |

Setiap anggota menyetel identitas git-nya sekali, dan identitas itu yang dipakai
di semua commit:

```bash
git config user.name "Nama Anggota"
git config user.email "email-yang-terhubung-ke-akun-github"
```

Email **wajib** email yang terhubung ke akun GitHub anggota, atau
`ID+username@users.noreply.github.com` milik anggota itu sendiri. Jangan memakai
email bersama.

## 5. Yang harus bisa dijelaskan

Guidebook mewajibkan setiap tim mampu menjelaskan dan mempertanggungjawabkan
seluruh implementasi teknisnya, dan panitia berhak meminta klarifikasi, bukti
pendukung, atau demonstrasi tambahan.

Karena itu, untuk setiap bagian besar produk, minimal satu anggota harus bisa
menjawab tanpa membaca kode:

1. Bagian ini dibuat kapan dan oleh siapa?
2. Kenapa memilih pendekatan ini, bukan alternatif lain?
3. Commit mana yang menambahkannya?
4. Kalau ada komponen pihak ketiga, dari mana asalnya dan apa lisensinya?

Kalau ada bagian yang tidak bisa dijawab siapa pun, itu masalah lebih besar
daripada bug: itu membuat karya sulit dipertanggungjawabkan.

## 6. Checklist orisinalitas

Jalankan sebelum submission. Semua harus "ya".

- [ ] Semua kode produk ditulis antara 7 dan 14 November 2026.
- [ ] Tidak ada file kode yang berasal dari proyek sebelum Hacking Week.
- [ ] Tidak ada repo kedua yang berisi proyek ini, selain yang diputuskan sebagai
      kanonik.
- [ ] Repositori bukan fork.
- [ ] Riwayat commit tidak pernah di-force push, rebase, squash, atau amend setelah
      di-push.
- [ ] Semua penulis commit adalah anggota tim terdaftar.
- [ ] Tidak ada commit bot (Dependabot, Renovate, GitHub Actions).
- [ ] Setiap commit punya pesan yang menjelaskan perubahan nyata.
- [ ] Tidak ada commit besar berisi seluruh proyek di akhir periode.
- [ ] Komponen pihak ketiga tercatat di README beserta sumbernya.
- [ ] Proyek ini belum pernah diikutsertakan di kompetisi lain.
