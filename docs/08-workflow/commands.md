---
status: stable
last_reviewed: 2026-11-09
owner: tim ClassQuest
---

# Perintah

Semua perintah dijalankan dengan Bun. Sumber: `package.json`.

## Perintah yang ada

| Perintah               | Isi                                    | Kapan dipakai                         |
| ---------------------- | -------------------------------------- | ------------------------------------- |
| `bun dev`              | `next dev`                             | Development harian                    |
| `bun run build`        | `next build`                           | Sebelum PR, cek production build      |
| `bun start`            | `next start`                           | Menjalankan hasil build lokal         |
| `bun run lint`         | `eslint`                               | Cek aturan kode                       |
| `bun run typecheck`    | `next typegen && tsc --noEmit`         | Cek tipe + generate route types       |
| `bun run test`         | `vitest run`                           | Test sekali jalan                     |
| `bun run test:watch`   | `vitest`                               | Test saat mengembangkan               |
| `bun run db:migrate`   | `bun scripts/db-migrate.ts`            | Terapkan migrasi DB dari environment  |
| `bun run db:seed`      | `bun scripts/db-seed.ts`               | Buat/perbarui akun guru & siswa       |
| `bun run dev:publish`  | `bun scripts/dev-publish.ts <storyId>` | Terbitkan cerita guru demo untuk test |
| `bun run format`       | `prettier --write .`                   | Rapikan format                        |
| `bun run format:check` | `prettier --check .`                   | CI: pastikan format benar             |
| `bun run check`        | format:check + lint + typecheck + test | Validasi cepat (belum termasuk build) |

`bun run check` **tidak** menjalankan build. Jalankan `bun run build` terpisah.
Itu sebabnya Definition of Done selalu menyebut keduanya: "check hijau" saja belum
berarti selesai.

Ada satu script yang tidak dipanggil manual: `preinstall` (`only-allow bun`). Ia
berjalan otomatis saat `bun install` dan menolak npm/yarn/pnpm. Jangan menghapusnya
untuk "memperbaiki" error install di mesin orang lain — yang salah adalah
package manager-nya.

`bun run test` juga menjalankan tes dokumentasi di `docs/`. Jadi kalau kamu
menambah dokumen tanpa memperbarui indeks di `docs/README.md`, tesnya gagal.
Detailnya di [`testing.md`](./testing.md#tes-dokumentasi).

## Urutan yang disarankan

Sebelum mulai:

```bash
bun run check
```

Saat mengembangkan:

```bash
bun run test:watch
```

Sebelum commit:

```bash
bun run format
bun run check
bun run build
```

## Perintah yang direncanakan

Belum ada di `package.json`; tambahkan saat fiturnya dibuat, lalu perbarui tabel
ini.

| Perintah                 | Fungsi                                            |
| ------------------------ | ------------------------------------------------- |
| `bun run story:validate` | Validasi `story.example.json` dan fixture         |
| `bun run story:audit`    | Cek cerita di DB terhadap manifest aset           |
| `bun run assets:check`   | Cek file aset vs manifest (bisa jadi bagian test) |

Jangan menambahkan skrip yang memanggil API berbayar ke `check`.

## Menjalankan satu test

```bash
# file yang benar-benar ada hari ini
bun run test docs/docs.test.ts
bun run test docs/02-data-model/story-schema.test.ts
bun run test src/app/page.test.tsx

# filter berdasarkan nama test
bun run test -t "menerima cerita contoh"
```

Contoh `bun run test src/story/validate.test.ts` baru bisa dipakai **setelah**
`src/story/validate.ts` dibuat (lihat
[`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md#status-kode-sekarang)).

## Typecheck dan route types

`bun run typecheck` menjalankan `next typegen` lebih dulu. Ini perlu karena
`PageProps<"/route">`, `LayoutProps<"/">`, dan `RouteContext<"/api/...">`
dihasilkan dari route yang ada.

Kalau menambah route baru dan tipe helper tidak dikenali:

```bash
bun run typecheck
```

Jangan membuat tipe route manual.

## Format

- Prettier mengatur seluruh repo, termasuk Markdown dan JSON.
- Konfigurasi: `.prettierrc` (`semi: true`, `singleQuote: false`, `trailingComma: all`,
  `tabWidth: 2`).
- Jalankan `bun run format` sebelum commit agar CI tidak gagal.

## CI

`.github/workflows/ci.yml` menjalankan, berurutan:

1. `bun install --frozen-lockfile`
2. `bun run format:check`
3. `bun run lint`
4. `bun run typecheck`
5. `bun run test`
6. `bun run build`

Semua harus hijau. Jangan menonaktifkan langkah CI untuk "sementara".
