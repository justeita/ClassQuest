---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# 0001 — Next.js App Router

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Kami butuh satu aplikasi web yang melayani dua pengalaman berbeda (dashboard guru
dan game siswa) dalam waktu hackathon, dengan tim kecil. Kami juga butuh:

- rendering server untuk halaman yang mengambil data (daftar materi, cerita),
- client component untuk editor dan canvas game,
- API untuk upload dan polling,
- deployment sederhana tanpa mengelola server sendiri.

## Opsi

| Opsi                            | Kelebihan                                        | Kekurangan                                         |
| ------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Next.js App Router              | RSC, Server Actions, route handler, deploy mudah | Banyak API berubah di v16; docs lokal wajib dibaca |
| Vite + React SPA + API terpisah | Sederhana, cepat                                 | Perlu dua deploy, tidak ada RSC                    |
| Remix                           | Model data bagus                                 | Tim lebih familiar Next                            |
| Astro + island                  | Bagus untuk konten                               | Kurang cocok untuk app interaktif                  |

## Keputusan

**Kami memilih Next.js 16.4.5 dengan App Router.**

Alasan:

1. Satu proyek untuk halaman guru, game, dan API — mengurangi pekerjaan integrasi.
2. Server Component memudahkan mengambil cerita `published` tanpa membocorkan draft.
3. Server Actions cukup untuk mutasi editor tanpa menulis endpoint tambahan.

## Konsekuensi

**Positif:**

- Satu deployment, satu repo, satu set tipe.
- Data fetching di server mengurangi loading state di client.

**Negatif / utang:**

- Next 16 punya banyak breaking change; agent harus membaca
  `node_modules/next/dist/docs/` dan bukan mengandalkan data latih.
- `cacheComponents: true` memaksa disiplin `Suspense` dan caching eksplisit.
- Terikat pada ekosistem Next.

**Yang harus diubah:**

- `docs/01-architecture/tech-stack.md` mencatat fakta versi.
- `docs/05-frontend/routes.md` mencatat pola `params` sebagai Promise.

## Kapan ditinjau ulang

Jika kebutuhan real-time (multiplayer/kelas langsung) muncul, atau jika batas
Cache Components menghambat fitur inti.

## Referensi

- `node_modules/next/dist/docs/01-app/`
- [`../01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)
