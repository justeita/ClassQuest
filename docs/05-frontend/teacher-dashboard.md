---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Dashboard Guru

Dashboard adalah tempat guru mengubah PDF menjadi cerita. Ini permukaan produk
yang paling menentukan apakah ide ini terasa berguna atau merepotkan.

## Halaman

### `/guru/masuk` — akun guru

Satu-satunya halaman guru yang bisa dibuka tanpa sesi. Isinya: field
**username** dan **sandi** (dengan tombol tampilkan/sembunyikan), tombol
"MASUK KE PORTAL", dan pesan error yang tidak membocorkan apakah username-nya
tidak terdaftar atau sandinya salah (keduanya dijawab `401` dengan pesan yang
sama). Setelah berhasil, server menyetel cookie sesi lalu halaman redirect ke
`/guru`; sidebar dan sapaan dashboard memakai `displayName` dari sesi.

Panel kiri memakai bahasa visual portal dan landing: logo brand penuh, chip
`LOGICODIX 2026`, dan empat langkah alur. **Tidak ada statistik hiasan** (level,
XP, jumlah siswa) — hanya yang benar-benar ada di produk. Detailnya di
[`ui-conventions.md`](./ui-conventions.md#halaman-masuk-guru-gurumasuk).

Belum ada pendaftaran mandiri atau reset sandi. Akun dibuat/diganti lewat
`bun run db:seed` (lihat [`../08-workflow/setup.md`](../08-workflow/setup.md)).

### `/guru` — daftar materi

Isi:

- Tombol utama "Buat cerita baru".
- Daftar kartu materi: judul, mata pelajaran, jumlah chapter, status, waktu update.
- Aksi per kartu: buka, edit, preview, bagikan, hapus.
- Empty state yang menjelaskan alur dalam 3 langkah.

Status yang ditampilkan:

| Status       | Label             | Aksi tersedia                   |
| ------------ | ----------------- | ------------------------------- |
| `processing` | "Sedang dibuat…"  | Lihat progres                   |
| `draft`      | "Perlu direview"  | Edit, preview, bagikan, hapus   |
| `published`  | "Sudah dibagikan" | Edit (buat versi baru), bagikan |
| `failed`     | "Gagal dibuat"    | Lihat alasan, coba lagi, hapus  |
| `archived`   | "Diarsipkan"      | Pulihkan, hapus                 |

Lima status, sesuai enum di
[`../06-backend/persistence.md`](../06-backend/persistence.md#siklus-status).
Tidak ada `ready`: begitu guru selesai review, langkah berikutnya adalah
"bagikan", dan itu langsung memindahkan status ke `published`.

![Mockup dashboard guru: dua kartu materi dengan status berbeda](../assets/teacher-dashboard.svg)

### `/guru/materi/baru` — upload

Form minimal:

| Field          | Wajib | Catatan                             |
| -------------- | ----- | ----------------------------------- |
| File PDF       | Ya    | Drag & drop atau pilih file         |
| Judul          | Ya    | Default dari nama file, bisa diedit |
| Mata pelajaran | Ya    | Teks bebas atau pilihan umum        |
| Jenjang/kelas  | Ya    | Mis. "SMP 7"                        |
| Bahasa         | Ya    | Default "id"                        |
| Nada cerita    | Tidak | Default "hangat dan penasaran"      |

Aturan UX:

- Validasi file **sebelum** upload (tipe, ukuran), tapi server tetap memvalidasi.
- Tampilkan nama file + ukuran setelah dipilih.
- Tombol submit disabled sampai field wajib valid.
- Setelah submit, langsung pindah ke halaman status. Jangan menahan guru di form.

### `/guru/materi/[storyId]` — status dan ringkasan

Tiga keadaan:

**1. Sedang diproses**

- Progress per tahap: "Membaca PDF", "Menyusun kerangka", "Menulis cerita",
  "Memeriksa hasil".
- Estimasi kasar, bukan persentase palsu yang macet di 90%.
- Tombol "Boleh ditinggal" — job tetap berjalan.

**2. Selesai**

- Ringkasan: judul, jumlah chapter, jumlah tantangan, konsep yang tercakup.
- Peringatan `source.gaps` bila ada.
- Tombol: "Review cerita", "Preview", "Bagikan".
- Banner kuning bila memakai fallback.

**3. Gagal**

- Alasan dalam bahasa manusia.
- Langkah berikutnya: "Coba lagi", "Ganti PDF", "Kurangi halaman".
- Tidak menampilkan stack trace atau kode provider.

## Komponen

| Komponen             | Tanggung jawab                                |
| -------------------- | --------------------------------------------- |
| `UploadForm`         | Input file + metadata + submit                |
| `GenerationProgress` | Polling status job, tampilan per tahap        |
| `StorySummaryCard`   | Ringkasan hasil + aksi                        |
| `StoryList`          | Daftar materi + status                        |
| `ShareDialog`        | Tautan + kode kelas + tombol salin            |
| `DeleteStoryDialog`  | Konfirmasi hapus (ketik judul bila published) |
| `ClassesBrowser`     | Daftar kelas, detail kelas, modal buat kelas  |
| `CreateClassModal`   | Form kelas baru (nama, mapel, jenjang, tahun) |
| `AddStudentModal`    | Form tambah siswa (nama, NIS opsional)        |

## Alur status generasi

```text
Upload berhasil
   ↓
redirect ke /guru/materi/[storyId]
   ↓
komponen client polling GET /api/jobs/[jobId] setiap 1.5 s
   ↓
stage berubah → UI berubah
   ↓
stage "done" → router.refresh() → tampilkan ringkasan
stage "failed" → tampilkan alasan
```

Aturan polling:

- Hentikan polling saat `done`/`failed`.
- Hentikan saat tab tidak aktif; lanjutkan saat aktif.
- Batas waktu total 3 menit, lalu tampilkan "masih diproses, cek lagi nanti".
- Jangan polling lebih cepat dari 1 detik.

## Pesan error yang baik

| Situasi               | Jangan              | Pakai                                                                                                   |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| Bukan PDF             | "Invalid mime type" | "File ini bukan PDF. Pilih file .pdf ya."                                                               |
| Terlalu besar         | "413"               | "PDF-nya 4,5 MB, batasnya 4 MB. Coba kompres dulu."                                                     |
| PDF scan              | "NO_TEXT_LAYER"     | "PDF ini sepertinya hasil scan, jadi teksnya tidak bisa dibaca. Pakai PDF yang teksnya bisa diseleksi." |
| AI gagal              | "AI_TIMEOUT"        | "Pembuatan cerita memakan waktu terlalu lama. Coba lagi."                                               |
| Materi terlalu pendek | "400"               | "Materinya masih sangat sedikit. Tambahkan beberapa halaman agar ceritanya cukup."                      |

## Aksesibilitas

- Semua field punya `<label>`.
- Error field dihubungkan dengan `aria-describedby`.
- Drag & drop bukan satu-satunya cara memilih file.
- Progress dilaporkan lewat `role="status"` / `aria-live="polite"`.
- Tombol punya teks, bukan hanya ikon.

## Yang tidak ada di MVP

- Pencarian dan filter lanjutan.
- Folder/kelas.
- Kolaborasi antar guru.
- Statistik per siswa.
- Duplikasi cerita.

Catatan untuk "folder/kelas": kelas **sudah ada** sebagai halaman
(`/guru/kelas` + tabel `classrooms`/`students`), tetapi belum dipakai untuk
mengelompokkan materi atau menugaskan game. Yang tetap di luar MVP adalah
folder materi dan statistik/progres per siswa.

## Checklist implementasi

- [x] Upload memvalidasi tipe dan ukuran di client dan server.
- [x] Guru langsung diarahkan ke halaman status.
- [x] Progress per tahap, bukan spinner kosong.
- [x] Polling berhenti dengan benar.
- [x] Error dalam bahasa manusia.
- [x] Empty state menjelaskan alur.
- [x] Tombol hapus punya konfirmasi.
- [x] `requireTeacher()` di semua aksi.

Catatan status: upload, halaman status, polling, aksi cerita, dan empty state
sudah tersambung (`src/app/guru/(portal)/`). Yang belum ada adalah **editor
cerita**, **preview versi draft**, dan `ShareDialog` dengan kode kelas — lihat
tabel status di [`routes.md`](./routes.md#status-implementasi-portal-guru).
