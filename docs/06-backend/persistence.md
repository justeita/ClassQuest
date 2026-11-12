---
status: tbd
last_reviewed: 2026-11-12
owner: tim ClassQuest
---

# Persistence dan Storage

> **Status: sebagian sudah diputuskan.** Vendor database sudah dipilih:
> **Turso (libSQL)** — lihat
> [ADR 0013](../09-decisions/0013-hosting-vercel-turso.md). Storage PDF
> **tidak dipakai**: PDF hanya diproses di memori. Dokumen ini menetapkan
> **kebutuhan** dan **skema target**, bukan detail implementasi.

## Kebutuhan

| Kebutuhan                    | Catatan                              |
| ---------------------------- | ------------------------------------ |
| Simpan cerita + versi        | Cerita bisa besar (JSON 50–300 KB)   |
| Simpan PDF                   | PDF hanya di memori, maksimum 4 MB   |
| Query daftar materi per guru | Butuh index sederhana                |
| Status job                   | Sering di-update, dibaca via polling |
| Hasil main (opsional)        | Volume kecil di MVP                  |
| Konsistensi versi            | Publish harus atomik                 |
| Biaya rendah                 | Hackathon                            |

## Opsi

| Opsi                              | Kelebihan                                      | Kekurangan                                           |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| **Supabase (Postgres + Storage)** | DB + file storage + auth dalam satu, free tier | Vendor lock-in ringan, cold start                    |
| **Neon/Vercel Postgres + S3/R2**  | Postgres standar, storage murah                | Dua layanan untuk dikonfigurasi                      |
| **SQLite + Prisma (lokal/VPS)**   | Paling sederhana, cepat, tanpa jaringan        | Tidak cocok untuk serverless multi-instance          |
| **File JSON di disk**             | Nol setup                                      | Tidak aman, tidak konkuren, jangan untuk demo publik |

**Keputusan:** [ADR 0013](../09-decisions/0013-hosting-vercel-turso.md) memilih
**Turso (libSQL)** sebagai database produksi. Tabel opsi di atas adalah catatan
awal; keputusan resminya ada di ADR tersebut.

## Skema target

Nama tabel dan kolom ini yang dipakai kode, apa pun vendornya.

```mermaid
erDiagram
    teachers ||--o{ stories : membuat
    teachers ||--o{ classrooms : memiliki
    classrooms ||--o{ students : berisi
    stories ||--o{ story_versions : punya_versi
    stories ||--o{ jobs : punya_proses
    stories ||--o{ play_results : dimainkan

    teachers {
        text id PK
        text display_name
        text username UK "login guru"
        text password_hash "scrypt, bukan plaintext"
    }
    classrooms {
        text id PK
        text teacher_id FK
        text name
        text subject
        text grade_level
        text code UK "QST-XXXX, label tampilan"
        text academic_year
    }
    students {
        text id PK
        text teacher_id FK
        text classroom_id FK "boleh null"
        text nis "unik per guru, boleh null"
        text display_name
        text username UK "boleh null: akun siswa belum dipakai"
        text password_hash "scrypt, boleh null"
    }
    stories {
        text id PK
        text teacher_id FK
        text status "processing|draft|published|failed|archived"
        integer published_version "null berarti belum bisa dimainkan"
    }
    story_versions {
        text story_id FK
        integer version PK
        jsonb story "isi Story lengkap"
        boolean used_fallback
    }
    jobs {
        text id PK
        text story_id FK
        text stage
        integer progress "0 sampai 100"
    }
    play_results {
        text id PK
        text story_id FK
        integer correct_count
        text weak_concepts "array teks"
    }
```

Dua hal yang paling mudah salah dibaca dari gambar itu:

- **`stories.status` dan `published_version` yang menentukan boleh dimainkan atau
  tidak.** Status tidak pernah disimpan di dalam JSON cerita.
- **`story_versions` tidak pernah ditimpa.** Setiap simpan menambah baris baru.

Diagram di atas versi ringkas. SQL di bawah yang mengikat; kalau keduanya
berbeda, SQL yang menang dan diagram harus diperbaiki.

```sql
-- Guru: satu baris per akun (username + hash scrypt)
create table teachers (
  id            text primary key,
  display_name  text not null,
  username      text unique,      -- huruf kecil, tanpa spasi tepi
  password_hash text,             -- scrypt$N$r$p$salt$hash; null = belum punya akun
  created_at    timestamptz not null default now()
);

-- Siswa: identitas untuk halaman /guru/kelas.
-- Akun login belum dipakai (siswa bermain lewat tautan), jadi username dan
-- password_hash boleh null. NIS unik per guru, bukan global.
create table students (
  id            text primary key,
  teacher_id    text not null references teachers(id),
  classroom_id  text references classrooms(id) on delete set null,
  nis           text,             -- huruf besar, [A-Za-z0-9._-]{1,20}
  display_name  text not null,
  username      text unique,      -- null = belum punya akun login
  password_hash text,             -- scrypt$N$r$p$salt$hash
  created_at    timestamptz not null default now()
);

create unique index students_nis_idx on students (teacher_id, nis);

-- Kelas: satu baris per kelas yang dibuat guru. Daftar awal kosong.
create table classrooms (
  id            text primary key,
  teacher_id    text not null references teachers(id),
  name          text not null,
  subject       text not null,
  grade_level   text not null,
  code          text not null unique,  -- QST-XXXX; label tampilan, belum dipakai siswa
  academic_year text not null,
  created_at    timestamptz not null default now()
);

create index classrooms_teacher_idx on classrooms (teacher_id, created_at desc);

-- Cerita: satu baris per materi
create table stories (
  id                 text primary key,          -- st_xxx
  teacher_id         text not null references teachers(id),
  title              text not null,
  subject            text not null,
  grade_level        text not null,
  language           text not null,
  status             text not null,             -- processing|draft|published|failed|archived
  published_version  integer,
  source_file_name   text not null,
  source_file_path   text not null,             -- path di storage, bukan URL publik
  source_page_count  integer,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index stories_teacher_idx on stories (teacher_id, updated_at desc);
create index stories_status_idx on stories (status);

-- Versi cerita: setiap simpan = baris baru
create table story_versions (
  story_id     text not null references stories(id) on delete cascade,
  version      integer not null,
  story        jsonb not null,                  -- Story lengkap
  created_by   text not null,
  created_at   timestamptz not null default now(),
  prompt_version text,
  used_fallback  boolean not null default false,
  primary key (story_id, version)
);

-- Job generasi
create table jobs (
  id           text primary key,                -- job_xxx
  story_id     text not null references stories(id) on delete cascade,
  stage        text not null,
  progress     integer not null default 0,
  message      text,
  error_code   text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  log          jsonb                            -- GenerationLog
);

create index jobs_story_idx on jobs (story_id, started_at desc);

-- Hasil main (opsional di MVP)
create table play_results (
  id             text primary key,
  story_id       text not null references stories(id) on delete cascade,
  story_version  integer not null,
  nickname       text,                          -- opsional, tanpa identitas asli
  correct_count  integer not null,
  total_count    integer not null,
  earned_points  integer not null,
  weak_concepts  text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index play_results_story_idx on play_results (story_id, created_at desc);
```

### Catatan desain

- **`story` disimpan sebagai JSONB**, bukan tabel ternormalisasi. Alasannya:
  schema cerita masih berubah, dan seluruh cerita selalu dibaca utuh. Jangan
  mencoba query ke dalam JSON di MVP.
- **`stories` dan `story_versions` dipisah** agar publish tidak menghapus riwayat
  dan agar siswa tetap di versi lama saat guru mengedit.
- **`status` dan `published_version`** adalah satu-satunya sumber kebenaran
  "boleh dimainkan". Jangan menaruh status di dalam JSON cerita.
- **`source_file_path`** bukan URL. Signed URL dibuat saat dibutuhkan.
- **Jangan menyimpan jawaban siswa per opsi** di MVP. Cukup agregat.
- **`classrooms` dan `students` dipisah** supaya satu siswa punya satu kelas
  (`classroom_id` boleh `null`) dan menghapus kelas tidak menghapus identitas
  siswa (`on delete set null`). Daftar siswa selalu dibaca per kelas.
- **NIS unik per guru**, bukan global: dua sekolah boleh memakai `1001`. NIS
  kosong diisi otomatis mulai `1001` dan dilewati bila sudah terpakai.

## Storage

| Bucket/prefix          | Isi       | Akses                           |
| ---------------------- | --------- | ------------------------------- |
| `materials/{storyId}/` | PDF asli  | Privat; hanya server            |
| `public/assets/`       | Aset game | Publik, di repo (bukan storage) |

Aturan:

- Jangan pernah membuat bucket PDF publik.
- Nama file di storage memakai id internal, bukan nama asli.
- Hapus file saat cerita dihapus permanen (atau jadwalkan pembersihan).

## Siklus status

```mermaid
stateDiagram-v2
    [*] --> processing: upload
    processing --> draft: generasi sukses
    processing --> failed: generasi gagal
    failed --> processing: coba lagi
    draft --> published: guru publish
    draft --> archived: arsip
    draft --> [*]: hapus permanen
    failed --> [*]: hapus permanen
    published --> published: edit + publish versi baru
    published --> archived: arsip
    archived --> [*]: hapus permanen
```

Lima status, tidak lebih: `processing`, `draft`, `published`, `failed`, `archived`.

Aturan transisi:

- `published` tanpa `published_version` = bug.
- `archived` tidak bisa dimainkan.
- `processing` tidak bisa dipublish.
- Hapus permanen hanya untuk `draft`/`failed`/`archived`, dengan konfirmasi.

### Kenapa tidak ada `ready`

Dokumen lama sempat punya status `ready` ("siap dibagikan"). Itu dihapus dengan
sengaja, bukan karena lupa:

- **Tidak ada aksi yang menaikkannya.** Server Action yang ada hanya
  `saveStoryDraft`, `publishStory`, `archiveStory`, `deleteStory`. Tidak ada
  `markReady`.
- **Artinya sudah dicakup `published`.** "Siap dibagikan" dan "sudah dibagikan"
  dibedakan oleh tautan yang dibagikan, bukan oleh status record.
- **Setiap status tambahan harus punya transisi, aksi UI, dan tes.** Tiga hal itu
  tidak ada untuk `ready`, jadi yang jujur adalah membuangnya.

Kalau nanti benar-benar butuh memisahkan "sudah direview guru" dari "baru dari
AI", tambahkan sebagai kolom terpisah (mis. `reviewed_at`), bukan status baru.

## Konkurensi dan versi

- Setiap simpan mengirim `baseVersion`. Server menolak bila `baseVersion` ≠ versi
  terbaru, dan mengembalikan `{ conflict: true, latestVersion }`.
- `version` dinaikkan di dalam transaksi: `insert into story_versions ... select max(version)+1`.
- Publish menetapkan `published_version` dalam transaksi yang sama dengan
  pengecekan validasi.

## Migrasi

- Migrasi disimpan di `src/server/db/migrations.ts`; dijalankan otomatis oleh
  `getReadyDb()` pada pemanggilan database pertama.
- Setiap migrasi harus bisa dijalankan dari database kosong.
- Jangan mengubah migrasi yang sudah dijalankan; buat migrasi baru.
- Skema dokumen ini dan migrasi harus sinkron di PR yang sama.

## Auth

MVP memakai akun yang dibuat admin lewat `bun run db:seed`:

- Login guru = `username` + `password`. Username dinormalisasi (huruf kecil,
  spasi tepi dimangkas) lalu dicari di `teachers`. Password dibandingkan dengan
  hash scrypt di `teachers.password_hash` (`src/server/password.ts`) memakai
  perbandingan waktu-tetap.
- Username tidak dikenal dan password salah dijawab sama (`401`). Verifikasi
  tetap menjalankan scrypt terhadap hash dummy saat akun tidak ada, supaya waktu
  respons tidak menunjukkan akun mana yang terdaftar.
- Setelah berhasil, server menerbitkan cookie `httpOnly` berisi token bertanda
  tangan HMAC-SHA256 dengan `TEACHER_SESSION_SECRET`; masa berlaku 8 jam. Token
  memuat `teacherId` + `displayName`, bukan password atau hash.
- `requireTeacher()` memverifikasi tanda tangan dan masa berlaku token, lalu
  mengembalikan `{ teacherId, displayName }`. Tidak ada query database per
  request.
- Tabel `students` dan `classrooms` dipakai `/guru/kelas` (buat kelas + tambah
  siswa), tetapi halaman `/play/[storyId]` masih berbasis tautan: siswa belum
  diminta login (`docs/00-product/personas-and-roles.md`). Kode kelas hanya
  label tampilan sampai alur "siswa memasukkan kode kelas" dibuat.
- Tidak ada pendaftaran mandiri atau reset password. Akun diganti lewat
  `bun run db:seed` dengan `TEACHER_SEED_*`/`STUDENT_SEED_*`; keempat variabel
  wajib diisi (tidak ada akun demo bawaan, sesuai aturan kredensial).

Jangan mengklaim ini aman untuk produksi. Untuk produksi, gunakan penyedia auth
nyata dan tabel `teachers`/`students` di atas.

## Checklist sebelum memilih vendor

- [ ] Bisa menyimpan JSON 300 KB tanpa masalah.
- [ ] Bisa menangani file 4 MB secara privat.
- [ ] Ada free tier yang cukup untuk demo.
- [ ] Bisa diakses dari Node runtime Next.js (bukan Edge).
- [ ] Mendukung transaksi untuk publish.
- [ ] Ada cara backup/export.
- [ ] Kredensial hanya di server.
- [ ] Keputusan dicatat di ADR 0013.
