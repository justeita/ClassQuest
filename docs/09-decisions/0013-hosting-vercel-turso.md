---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# 0013 — Hosting Vercel dan Database Turso

- **Status:** Accepted
- **Tanggal:** 2026-11-11
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menjawab sebagian pertanyaan vendor di ADR 0005)

## Konteks

Aplikasi harus live dan bisa diakses juri tanpa biaya tambahan sebelum code
freeze 14 November 2026. Batasannya:

- Next 16.4.5 memakai `cacheComponents` dan `partialPrefetching`; runtime Node.js,
  bukan Edge.
- Route upload memakai `after()` dan `maxDuration = 300`; pipeline punya deadline
  120 detik.
- PDF hanya diproses di memori, tidak disimpan. Yang perlu persisten hanya
  database: cerita, versi, job, hasil main, guru, dan rate limit.
- Database lokal `file:./local.db` tidak bisa dipakai di platform serverless
  karena filesystem-nya read-only dan tidak dibagi antar instance.
- Vercel memotong body request di 4,5 MB, sehingga batas upload aplikasi harus
  lebih kecil.

## Opsi

| Opsi                     | Kelebihan                                                                                                       | Kekurangan                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Vercel Hobby + Turso** | Next.js native tanpa adapter; `after()` dan durasi 300 s cocok; Turso libSQL kompatibel dengan `@libsql/client` | Hobby non-komersial; fungsi satu region; rate limit memori per instance |
| Cloudflare Workers + D1  | Murah, dekat pengguna, terintegrasi Cloudflare                                                                  | Runtime dan batas eksekusi berbeda; pipeline `after()` perlu adaptasi   |
| Cloudflare Containers    | Node runtime penuh, batas waktu longgar                                                                         | Setup lebih berat; biaya dan operasional lebih tinggi untuk demo        |
| Railway / Fly.io         | Node proses panjang, kontrol penuh                                                                              | Tidak native Next 16; satu layanan lagi yang harus dijaga               |

## Keputusan

**Kami memilih Vercel Hobby sebagai hosting dan Turso (libSQL remote) sebagai
database produksi.**

Aturan yang mengikat:

- Region function Vercel: `sin1` (Singapore), satu region sesuai batas Hobby.
  Turso dibuat di `aws-ap-southeast-1` agar dekat dengan function.
- Batas upload PDF: **4 MB** (`MAX_PDF_BYTES`), karena body request Vercel
  dibatasi 4,5 MB dan multipart membutuhkan overhead. Upload 4 MB + 64 KB masih
  aman.
- PDF tetap hanya di memori; tidak ada object storage. Yang disimpan hanya story
  JSON dan metadata di Turso.
- Migrasi dijalankan manual sebelum deploy (`bun run db:migrate`) agar cold start
  pertama tidak gagal; `getReadyDb()` tetap menjalankan migrasi otomatis sebagai
  jaring pengaman.
- Deploy dari `main` setelah PR di-merge, dengan merge commit (bukan squash).

## Konsekuensi

**Positif:**

- Tidak perlu adapter atau konfigurasi build khusus; Vercel mendeteksi Next.js.
- `/api/health` sudah membaca `VERCEL_GIT_COMMIT_SHA`, jadi bukti commit deploy
  tersedia tanpa kode tambahan.
- Turso memakai protokol libSQL yang sudah dipakai `@libsql/client`, sehingga
  kode database tidak berubah.

**Negatif / utang:**

- PDF lebih dari 4 MB ditolak aplikasi (`413 FILE_TOO_LARGE`). Materi yang lebih
  besar harus dikompres atau dipotong.
- Vercel Hobby hanya untuk penggunaan non-komersial. Demo hackathon aman, tetapi
  pemakaian komersial butuh plan berbayar.
- Rate limit `GET /api/stories/[storyId]` disimpan di memori **per instance**,
  jadi tidak akurat lintas instance Vercel. Batas database (`login`, `upload`,
  `savePlayResult`) tetap akurat.
- Job yang berjalan di `after()` bisa terputus bila instance dimatikan platform.
  Status job di database memungkinkan job ditandai gagal, tetapi tidak ada retry
  otomatis.
- Database dan token Turso harus dijaga aktif sampai penilaian selesai
  (29 November 2026).

**Yang harus diubah:**

- `src/server/upload/config.ts` — `MAX_PDF_BYTES` menjadi 4 MB.
- `vercel.json` — region `sin1`.
- `docs/08-workflow/setup.md` — env `DATABASE_AUTH_TOKEN`, langkah deploy.
- `README.md` — layanan pihak ketiga dan akses demo.

## Kapan keputusan ini ditinjau ulang

- Setelah demo: jika butuh PDF lebih dari 4 MB, pertimbangkan Vercel Blob atau
  host Node dengan batas body lebih besar. Itu ADR baru.
- Jika trafik nyata membuat rate limit per instance tidak memadai, pindahkan
  limiter cerita publik ke database, Durable Object, atau WAF.
- Jika pipeline butuh lebih dari 300 detik atau retry otomatis, ganti `after()`
  dengan queue + worker terpisah.
- Jika proyek dikomersialkan, pindah dari Hobby ke plan yang mengizinkan
  penggunaan komersial.

## Referensi

- [`0005-persistence-and-storage.md`](0005-persistence-and-storage.md) — skema
  dan kebutuhan persistence; tetap `Proposed` karena keputusan storage PDF
  adalah "tidak disimpan".
- [`../06-backend/jobs-and-limits.md`](../06-backend/jobs-and-limits.md) — batas
  upload dan perilaku job.
- [`../06-backend/persistence.md`](../06-backend/persistence.md) — skema database.
- [`../08-workflow/setup.md`](../08-workflow/setup.md) — langkah setup dan deploy.
