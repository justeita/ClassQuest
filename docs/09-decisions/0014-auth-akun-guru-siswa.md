---
status: draft
last_reviewed: 2026-11-12
owner: tim ClassQuest
---

# 0014 — Auth akun guru dan siswa

- **Status:** Proposed
- **Tanggal:** 2026-11-12
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —

## Konteks

Sampai sekarang guru masuk dengan **satu kode akses bersama** dari environment
(`TEACHER_ACCESS_CODE`). Itu penghalang demo yang murah, tetapi:

- semua guru memakai kredensial yang sama, sehingga tidak ada identitas per
  akun dan tidak ada cara mencabut akses satu orang;
- kode hanya hidup di environment, bukan di database, sehingga tidak bisa
  dikelola bersama data lain;
- halaman masuk tidak punya field username, padahal data guru sudah punya baris
  `teachers` dengan `display_name`.

Database (Turso) sudah menjadi sumber data utama untuk cerita dan job
([ADR 0013](0013-hosting-vercel-turso.md)). Menyimpan akun di tempat yang sama
menghindari dua sumber kebenaran.

Batasan: waktu hackathon, tim kecil, dan demo yang harus tetap sederhana. Belum
ada kebutuhan SSO sekolah atau integrasi Google Classroom.

## Opsi

| Opsi                                                 | Kelebihan                                          | Kekurangan                                                 | Biaya |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ----- |
| A. Tetap kode akses bersama dari env                 | Nol perubahan, paling cepat                        | Tanpa identitas per akun; tidak bisa cabut akses satu guru | 0     |
| B. Akun di tabel `teachers` + hash scrypt            | Identitas per akun, satu sumber data, tanpa vendor | Perlu migrasi + seed + reset manual (belum ada UI reset)   | 0     |
| C. Penyedia auth pihak ketiga (Supabase Auth, Clerk) | Fitur lengkap (reset, sesi, MFA)                   | Dependency + vendor baru; setup lebih panjang untuk demo   | > 0   |

## Keputusan

Kami memilih **B**: akun guru disimpan di tabel `teachers`
(`username` unik + `password_hash`), dan tabel `students` disiapkan dengan
bentuk yang sama untuk fase berikutnya.

Alasan utama:

1. Identitas per akun tanpa menambah layanan atau dependency baru; `scrypt`
   sudah ada di `node:crypto`.
2. Satu sumber data: akun, cerita, dan job ada di database yang sama
   (`DATABASE_URL`), sehingga deploy tidak perlu menyelaraskan env dan DB.
3. Cukup untuk demo: login tetap satu request, cookie sesi tetap HMAC bertanda
   tangan, dan tidak ada alur pendaftaran yang harus dibangun.

Asumsi: jumlah guru kecil (satu sekolah demo), dan akun boleh dibuat/diganti
lewat CLI (`bun run db:seed`), bukan lewat UI admin.

**Siswa belum login.** Tabel `students` dan akun demo `siswa` di-seed, tetapi
`/play/[storyId]` tetap bisa dibuka lewat tautan/QR sesuai
[`../00-product/personas-and-roles.md`](../00-product/personas-and-roles.md).
Mewajibkan login siswa akan mengubah alur demo dan belum dibutuhkan.

## Konsekuensi

**Positif:**

- Login memakai username + sandi; nama di sidebar/dashboard berasal dari akun
  yang benar-benar masuk, bukan konstanta "Guru Demo".
- Password tidak pernah disimpan sebagai teks biasa; hash memakai salt acak per
  baris dan parameter yang ditulis di dalam hash.
- Kredensial bisa diganti tanpa mengubah kode (`bun run db:seed`).

**Negatif / utang:**

- Belum ada reset sandi mandiri, pendaftaran, atau UI manajemen akun. Lupa sandi
  = jalankan `db:seed` dengan sandi baru.
- Belum ada peran/otorisasi selain "guru yang login"; semua guru melihat
  ceritanya sendiri lewat `stories.teacher_id`.
- Akun siswa ada tetapi belum dipakai; kalau nanti `/play` mewajibkan login,
  perlu ADR/route baru.

**Yang harus diubah:**

- Migrasi `0004_accounts` (kolom `teachers.username`/`password_hash`, tabel
  `students`, hapus `teachers.access_code`).
- `src/server/auth.ts`, `src/server/password.ts`, route login, form masuk.
- `docs/06-backend/api-contract.md`, `persistence.md`, `docs/05-frontend/`,
  `docs/08-workflow/setup.md`, `.env.example`.

## Kapan keputusan ini ditinjau ulang

- Sebelum demo publik dengan guru sungguhan (ganti sandi demo, pertimbangkan
  reset mandiri).
- Jika jumlah guru > 10 atau butuh peran admin.
- Jika siswa perlu login untuk menyimpan hasil lintas perangkat.

## Referensi

- [`../01-architecture/security-and-privacy.md`](../01-architecture/security-and-privacy.md)
- [`../06-backend/persistence.md`](../06-backend/persistence.md)
- [`../08-workflow/setup.md`](../08-workflow/setup.md)
