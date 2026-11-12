---
status: draft
last_reviewed: 2026-11-12
owner: tim ClassQuest
---

# 0015 — Tabel kelas dan siswa yang dikelola guru

- **Status:** Proposed
- **Tanggal:** 2026-11-12
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —

## Konteks

Halaman `/guru/kelas` sudah tampil sejak prototipe, tetapi seluruhnya memakai
data contoh di `src/components/guru/data.ts`: empat kelas dengan 30/28/32/30
siswa fiktif, penugasan game palsu, dan aktivitas palsu. Tidak ada tabel kelas di
[`../06-backend/persistence.md`](../06-backend/persistence.md), dan kode kelas
dianggap backlog di [`../00-product/mvp-scope.md`](../00-product/mvp-scope.md).

Akibatnya guru tidak bisa memakai halaman itu sama sekali: kelas yang dibuat
hilang setelah muat ulang, dan daftar siswa palsu menyesatkan siapa pun yang
mencoba demo.

Yang dibutuhkan sekarang hanya dua hal kecil: **membuat kelas** dan
**menambah siswa**. Belum ada kebutuhan penugasan game, nilai, kehadiran, atau
login siswa. Tabel `students` sudah dibuat oleh
[ADR 0014](0014-auth-akun-guru-siswa.md) untuk akun, dengan `username` dan
`password_hash` wajib.

## Opsi

| Opsi                                                   | Kelebihan                                             | Kekurangan                                                       | Biaya |
| ------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| A. Tetap data contoh di `data.ts`                      | Nol kerja                                             | Guru tidak bisa menyimpan apa pun; demo menyesatkan              | 0     |
| B. Tabel `classrooms` baru + lengkapi `students`       | Data nyata, daftar awal kosong, sesuai kebutuhan demo | Satu migrasi rebuild `students`; belum ada hapus/edit siswa      | 0     |
| C. Satu tabel JSON (`classrooms.payload` berisi siswa) | Satu tabel, migrasi paling kecil                      | Tidak bisa query/indeks NIS; siswa tidak punya identitas sendiri | 0     |
| D. Tabel kelas + akun siswa penuh (login, password)    | Siap untuk fitur kelas masa depan                     | Jauh melebihi kebutuhan; siswa di MVP bermain lewat tautan       | > 0   |

## Keputusan

Ambil **B**.

- Tabel baru `classrooms` (`id`, `teacher_id`, `name`, `subject`,
  `grade_level`, `code` unik, `academic_year`, `created_at`).
- Tabel `students` dibangun ulang (migrasi `0005_classrooms_students`) untuk
  menambah `classroom_id` (nullable, `on delete set null`) dan `nis`
  (unik per guru), serta melonggarkan `username`/`password_hash` menjadi boleh
  `null` karena akun siswa belum dipakai.
- Daftar awal **kosong**: tidak ada data contoh yang disisipkan otomatis. Guru
  membuat kelas, lalu menambah siswa satu per satu.
- NIS opsional. Bila dikosongkan, server memberi nomor urut mulai `1001` dan
  melewati nomor yang sudah terpakai. Bila diisi, dinormalisasi ke huruf besar
  dan pola `[A-Za-z0-9._-]{1,20}`.
- `academic_year` hanya menerima bentuk baku `YYYY/YYYY` (2000–2099, tahun kedua
  = tahun pertama + 1) lewat `normalizeAcademicYear()`
  (`src/lib/academic-year.ts`). Nilai lain ditolak dengan pesan, bukan dipotong.
  UI memakai `YearPicker` (custom, tanpa input teks) sehingga karakter aneh
  tidak punya jalan masuk; server tetap memvalidasi ulang.
- Nama, mapel, dan tingkat dibersihkan `cleanText()`: karakter kontrol menjadi
  spasi, karakter tak terlihat (zero-width, penanda arah RTL/LTR, BOM) dibuang.
- Kedua action dibatasi `guardClassroomWrite()` (60 tulisan/jam per guru, fail
  open) supaya skrip tidak bisa membanjiri tabel selama sesi guru hidup.
- Kode kelas `QST-XXXX` dari alfabet tanpa `I`/`O`/`0`/`1`, unik. Kode ini
  **hanya label tampilan** untuk sekarang; belum ada alur siswa memasukkan kode.
- Logika di `src/server/classrooms` (dengan tes libSQL in-memory); Server Action
  `createClassroom` dan `addStudent` di `src/app/guru/(portal)/kelas/actions.ts`
  hanya membungkus `requireTeacher()` → core → `revalidatePath`.

## Konsekuensi

Positif:

- `/guru/kelas` menyimpan data sungguhan per guru; guru lain tidak melihat
  kelas/ siswa milik guru lain (semua query memfilter `teacher_id`).
- Siswa punya identitas sendiri sehingga nanti bisa dipakai penugasan game atau
  statistik tanpa migrasi besar.
- `on delete set null` membuat penghapusan kelas (nanti) tidak menghapus
  identitas siswa.

Negatif / risiko:

- Migrasi `0005` membangun ulang tabel `students` (SQLite tidak bisa menghapus
  `not null` lewat `alter table`). Datanya disalin di dalam migrasi; tes
  `src/server/db/migrations.test.ts` memastikan baris lama (termasuk akun
  `siswa` hasil seed) selamat.
- Belum ada hapus/edit siswa dan belum ada UI untuk membagikan kode kelas. Itu
  tetap backlog; UI sengaja menampilkan keterangan, bukan tombol mati.
- `students.nis` unik per guru, bukan global: dua sekolah boleh memakai `1001`.

## Tindak lanjut

- Tambah hapus/edit siswa dan pindah kelas.
- Putuskan apakah kode kelas dipakai siswa untuk bergabung (perlu ADR baru bila
  mengubah MVP scope).
- Penugasan game ke kelas beserta tenggat.
