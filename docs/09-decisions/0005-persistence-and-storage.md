---
status: tbd
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# 0005 — Persistence dan Storage

- **Status:** Proposed (belum diputuskan)
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Kami harus menyimpan:

- PDF guru (1–4 MB, privat),
- cerita + versinya (JSON 50–300 KB),
- status job (sering berubah),
- opsional: hasil main.

Batasan: waktu hackathon, tim kecil, biaya rendah, deployment Next.js (Node
runtime, bukan Edge).

## Opsi

| Opsi                          | Kelebihan                                | Kekurangan                                       | Biaya        |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------ |
| Supabase (Postgres + Storage) | Satu layanan, dashboard, free tier, RLS  | Vendor lock-in ringan, cold start                | Free–$25/bln |
| Neon/Vercel Postgres + R2/S3  | Postgres standar, storage murah          | Dua layanan, konfigurasi lebih banyak            | Free–$20/bln |
| SQLite + Prisma (VPS/local)   | Paling sederhana, cepat, transaksi lokal | Tidak cocok serverless multi-instance            | $0–$5/bln    |
| JSON file di disk             | Nol setup                                | Tidak aman, tidak konkuren, hilang saat redeploy | $0           |

## Rekomendasi

**Supabase**, karena satu layanan menutup DB + storage + dashboard, dan free tier
cukup untuk demo. Ini rekomendasi, bukan keputusan.

## Yang harus diputuskan bersamaan

1. **Auth guru:** kode akses env (paling cepat) vs Supabase Auth — diputuskan
   di [ADR 0014](0014-auth-akun-guru-siswa.md): akun di database, tanpa vendor
   auth.
2. **Eksekusi job:** `after()` (paling cepat) vs queue.
3. **Hasil main:** disimpan server atau hanya lokal.

## Konsekuensi dari rekomendasi

**Positif:**

- Skema di [`../06-backend/persistence.md`](../06-backend/persistence.md) bisa
  langsung diterjemahkan ke SQL.
- Storage privat untuk PDF tanpa layanan tambahan.

**Negatif:**

- Perlu menjaga RLS/service key; risiko salah konfigurasi.
- Terikat pada Supabase untuk migrasi.

**Yang harus diubah bila disetujui:**

- Status ADR menjadi `Accepted`.
- `docs/06-backend/persistence.md` status menjadi `stable`.
- Tambah dependency client DB + `.env.example`.
- Tambah migrasi awal.

## Kapan ditinjau ulang

Setelah demo, atau jika memori/kuota free tier habis.

## Referensi

- [`../06-backend/persistence.md`](../06-backend/persistence.md)
- [`../06-backend/jobs-and-limits.md`](../06-backend/jobs-and-limits.md)
