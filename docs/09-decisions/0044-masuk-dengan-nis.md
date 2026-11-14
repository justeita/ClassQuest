---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0044 — Masuk Game dengan NIS dan Konfirmasi Nama Lengkap

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** bagian "Identitas dari nama" pada [0042](0042-kode-kelas-masuk-game.md)
- **Melanjutkan:** [0015](0015-kelas-dan-siswa.md), [0042](0042-kode-kelas-masuk-game.md)

## Konteks

[ADR 0042](0042-kode-kelas-masuk-game.md) membuka jalan masuk `/play` dengan
**kode kelas + nama**. Nama bebas selalu diterima: nama yang tidak cocok dengan
daftar siswa tetap boleh bermain, hanya hasilnya tidak masuk analytics kelas.
Akibatnya guru tidak pernah bisa yakin bahwa baris di analytics benar-benar milik
siswa yang dimaksud — dua siswa bernama "Andi" tidak bisa dibedakan, dan siapa
pun yang tahu kode kelas bisa memakai nama orang lain.

Guru sekarang juga mengisi **NISN** dan **NIS** per murid di `/guru/kelas`, jadi
sekolah punya nomor yang bisa memisahkan siswa tanpa menambah akun/password.

## Keputusan

1. **Gerbang `/play` meminta kode kelas + NIS**, bukan nama/username. Nama tidak
   lagi diketik di gerbang.
2. **NIS dicocokkan di server ke seluruh murid guru pemilik kelas**
   (`students.teacher_id`), bukan hanya kelas itu — `nis` sudah unik per guru
   (`students_nis_idx`). Perbandingan mengabaikan huruf besar/kecil dan memakai
   bentuk baku `cleanNis`; titik dan strip diabaikan saat membandingkan
   (`2026.001` = `2026001`) dan untuk sementara dianggap sama — bila dua murid
   jadi sama, server menjawab `nis_ambiguous` beserta daftar calon, bukan menebak.
3. **NIS yang tidak ada di daftar ditolak** (`nis_not_found`). Siswa melihat
   pesan "NIS tidak ada di daftar murid guru" di form dan **tidak bisa masuk**.
   Ini berbeda dari perilaku 0042: tidak ada lagi nama bebas.
4. **NIS yang cocok berhenti di layar konfirmasi.** Server mengirim nama lengkap
   dari baris `students`; UI menampilkan NIS, nama lengkap, dan kelas lalu
   bertanya "Ini kamu, benar?". "Benar, lanjut main" memasang `GameShell` dengan
   `pemainAwal` = `{ studentId, name }`. "Bukan saya" mengembalikan ke kolom NIS
   yang kosong. Nama yang dipakai di analytics **selalu** nama dari server.
5. **Urutan pemeriksaan:** kode → kelas & game terbit → NIS → (bila guru punya
   beberapa game) pilih game → konfirmasi. NIS diperiksa sebelum daftar game
   ditampilkan, supaya NIS yang salah tidak membuka informasi game.
6. **`nisn` ditambahkan ke `students`** (migrasi `0007_students_nisn`). NISN
   hanya untuk tampilan guru (NISN, NIS, nama lengkap) dan **tidak** dipakai
   untuk masuk serta tidak pernah dikirim ke browser siswa.
7. **`invalid_name` dihapus** dari `JoinFailureReason`; penggantinya
   `invalid_nis`, `nis_not_found`, dan `nis_ambiguous`.

## Konsekuensi

- Guru **wajib** mengisi NIS setiap murid yang akan bermain. Murid tanpa NIS
  tidak bisa masuk lewat `/play` (masih bisa lewat tautan
  `/play/[storyId]?kelas=...`, yang memakai daftar siswa, bukan NIS).
- Analytics kelas lebih tepercaya: satu NIS = satu `student_id`.
- NIS bukan rahasia. Siapa pun yang tahu kode kelas dan NIS seorang murid bisa
  masuk sebagai murid itu; layar konfirmasi membuat kesalahan ketik kelihatan,
  bukan mencegah penyalahgunaan yang disengaja. Untuk itu rate limit 30
  percobaan / 10 menit per IP tetap berlaku, dan menambah kode/PIN per siswa
  adalah pekerjaan lanjutan bila dibutuhkan.
- Murid yang NIS-nya sama di dua kelas guru yang sama tidak mungkin terjadi
  karena `students_nis_idx` menolak duplikat per guru.
- NISN boleh kosong dan boleh sama antar murid: ia label administratif, bukan
  kunci.

## Alternatif yang ditolak

- **NISN sebagai nomor masuk.** NISN nasional unik, tetapi tidak semua sekolah
  punya/mengetahui NISN murid, dan NISN lebih panjang untuk diketik anak SD.
  NIS tetap nomor yang dibagikan guru di kelas; NISN hanya ditampilkan.
- **Tetap menerima nama bebas sebagai cadangan.** Mengembalikan masalah 0042:
  hasil bisa tercatat atas nama orang lain dan guru tidak bisa membedakan siswa
  bernama sama.
- **Konfirmasi di sisi klien saja.** Client tidak boleh dipercaya; nama yang
  dicatat di `play_results` harus berasal dari baris `students` yang dipilih
  server.
- **Menebak saat NIS ambigu.** Menebak berarti poin bisa masuk ke murid yang
  salah; lebih baik siswa memilih dari dua calon.
