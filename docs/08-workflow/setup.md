---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Setup Development

## Prasyarat

| Kebutuhan | Versi    | Cek              |
| --------- | -------- | ---------------- |
| Bun       | `1.4.0`  | `bun --version`  |
| Node.js   | ≥ 20.9.0 | `node --version` |
| Git       | terbaru  | `git --version`  |

Node 20.0–20.8 **tidak cukup**: Next 16 mensyaratkan `>=20.9.0` di `engines`, jadi
`bun install` lolos tapi `bun run build` gagal.

Proyek ini **hanya memakai Bun**. `package.json` punya `preinstall` yang
menjalankan `only-allow bun`, jadi `npm install` akan gagal — itu memang
disengaja.

## Langkah

```bash
git clone <repo-url> classquest
cd classquest
bun install
cp .env.example .env.local
bun dev
```

Buka http://localhost:3000.

## Environment

`.env.example` saat ini hanya berisi komentar. Variabel yang akan dibutuhkan:

```bash
# Provider AI (lihat docs/03-ai-pipeline/provider-setup.md)
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
AI_TIMEOUT_MS=60000

# Akses guru (sementara, sampai auth nyata)
TEACHER_ACCESS_CODE=

# Database/storage (TBD, lihat docs/06-backend/persistence.md)
DATABASE_URL=
STORAGE_BUCKET=
```

Aturan:

- **Jangan commit `.env.local`.** `.gitignore` sudah mengecualikan `.env*` kecuali
  `.env.example`.
- Jangan memakai prefix `NEXT_PUBLIC_` untuk nilai rahasia.
- Kalau variabel wajib belum diisi, aplikasi harus gagal saat start dengan pesan
  jelas — bukan error saat demo.

## Menjalankan tanpa kunci AI

```bash
AI_PROVIDER=mock bun dev
```

Mode ini memakai fixture, sehingga seluruh alur bisa dikembangkan tanpa biaya dan
tanpa jaringan.

## Struktur perintah

```bash
bun dev              # development server (Turbopack)
bun run build        # production build
bun start            # jalankan hasil build
bun run check        # format + lint + typecheck + test
bun run format       # tulis ulang format
bun run test         # unit test sekali jalan
bun run test:watch   # test mode watch
```

Detail: [`commands.md`](./commands.md).

## Masalah umum

| Gejala                                   | Penyebab                        | Solusi                                           |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------ |
| `only-allow` menolak install             | Memakai npm/yarn/pnpm           | Pakai `bun install`                              |
| `bun: command not found`                 | Bun belum terpasang             | Install Bun 1.4.0                                |
| `window is not defined` saat build       | Phaser diimpor di server        | Pindahkan ke `useEffect` + `"use client"`        |
| `Cannot find module '@/...'`             | `tsconfig` paths / import salah | Pakai alias `@/`, jalankan `bun run typecheck`   |
| Tipe route tidak dikenal (`PageProps`)   | Route types belum digenerate    | `bun run typecheck` (menjalankan `next typegen`) |
| Port 3000 dipakai                        | Proses lain                     | `bun dev --port 3001`                            |
| Test gagal karena `matchMedia` tidak ada | jsdom tidak menyediakannya      | Tambahkan polyfill di `vitest.setup.ts`          |
| Halaman kosong setelah edit              | Cache dev rusak                 | Hapus `.next`, jalankan ulang `bun dev`          |
| Build lambat / memori tinggi             | Turbopack cache                 | Hapus `.next`                                    |

## Sebelum mulai bekerja

1. Baca [`../README.md`](../README.md) dan pilih dokumen sesuai tugas.
2. Baca [`../08-workflow/ai-agent-rules.md`](./ai-agent-rules.md) bila kamu AI agent.
3. Pastikan `bun run check` hijau **sebelum** mengubah apa pun, supaya kamu tahu
   kegagalan yang ada bukan dari perubahanmu.

## Editor

- VS Code disarankan dengan ekstensi ESLint, Prettier, dan Tailwind CSS IntelliSense.
- Format on save sebaiknya memakai Prettier.
- Jangan menambahkan konfigurasi editor ke repo kecuali disepakati.
