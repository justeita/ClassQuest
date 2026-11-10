---
status: stable
last_reviewed: 2026-11-10
owner: tim ClassQuest
---

# Tech Stack

Versi di bawah diambil dari `package.json` dan `bun.lock` pada 2026-11-08. Kalau
memperbarui dependency, perbarui tabel ini di PR yang sama.

## Runtime dan framework

| Komponen     | Versi    | Catatan                                                             |
| ------------ | -------- | ------------------------------------------------------------------- |
| Bun          | `1.4.0`  | Package manager wajib. `preinstall` memakai `only-allow bun`.       |
| Next.js      | `16.4.5` | App Router. Banyak breaking change vs Next 14/15 — baca docs lokal. |
| React        | `19.3.1` | Server Components + Server Actions.                                 |
| TypeScript   | `6.0.3`  | `strict: true`.                                                     |
| Tailwind CSS | `4.x`    | Lewat `@tailwindcss/turbopack` (lihat `next.config.ts`).            |
| Phaser       | `4.2.1`  | Game engine, hanya di client. Lihat ADR 0004.                       |
| Node.js      | `>= 20`  | Cache Components hanya mendukung Node runtime, bukan Edge.          |

## Tooling

| Alat                  | Versi     | Fungsi                                   |
| --------------------- | --------- | ---------------------------------------- |
| ESLint                | `10.14.0` | `eslint-config-next` + Prettier          |
| Prettier              | `3.9.10`  | Format seluruh repo                      |
| Vitest                | `5.1.0`   | Unit/component test, `jsdom`             |
| Testing Library React | `16.3.3`  | Render komponen                          |
| jsdom                 | `31.0.0`  | Environment test                         |
| Ajv                   | `8.20.0`  | Validasi `story.schema.json` di tes docs |
| server-only           | `0.0.1`   | Guard modul server (kredensial/DB)       |

Ajv sengaja dipasang sekarang, sebelum validatornya ada. Alasannya: bentuk cerita
harus bisa diuji sejak hari pertama, dan tes docs butuh validator JSON Schema
yang tidak mengarang aturan sendiri. Nanti validator aplikasi boleh memakai Ajv
yang sama, supaya bentuk yang diterima tes dan yang diterima game persis sama.

## Dependency yang direncanakan (belum terpasang)

Jangan menambahkannya sebelum fiturnya dikerjakan, tapi ini arah yang disepakati:

| Paket               | Untuk              | Catatan                                |
| ------------------- | ------------------ | -------------------------------------- |
| `unpdf`/`pdf-parse` | Ekstraksi teks PDF | Pilih yang jalan di Node runtime Next. |
| DB client           | Persistence        | Tergantung ADR 0005.                   |

**Validasi cerita tidak butuh package baru.** `ajv` sudah terpasang dan dipakai
`docs/02-data-model/story-schema.test.ts`; validator aplikasi memakai Ajv yang
sama. Jangan menambahkan Zod — dua validator berarti dua definisi kebenaran.

## Fakta Next.js 16.4.5 yang wajib diketahui

Ini bukan Next.js yang ada di data latih kebanyakan model. Sumber:
`node_modules/next/dist/docs/`.

### Cache Components aktif

`next.config.ts` memuat:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ...
};
```

Konsekuensi:

- Data fetching **dinamis secara default**; caching dipilih eksplisit dengan
  directive `use cache` + `cacheLife`/`cacheTag`.
- PPR aktif otomatis. Halaman dengan data dinamis perlu boundary `Suspense`.
- **Hanya Node runtime.** Jangan menulis `export const runtime = "edge"` atau
  `runtime = "nodejs"` — keduanya tidak didukung.
- `experimental.ppr` dan `experimental_ppr` sudah dihapus.
- Navigasi memakai React `<Activity>`: state komponen dipertahankan saat route
  disembunyikan. **Efek dibersihkan saat route hidden dan dibuat ulang saat
  visible.** Ini penting untuk Phaser: `useEffect` cleanup harus menghancurkan
  game dengan benar.

### Middleware bernama Proxy

Sejak Next 16, `middleware.ts` menjadi **`proxy.ts`** di root (atau di `src/`).
Untuk MVP kita belum butuh; kalau nanti perlu redirect berbasis sesi, pakai
`proxy.ts`, bukan `middleware.ts`.

### Typed routes

Route type dihasilkan otomatis (`next typegen`). Pola yang dipakai:

```tsx
export default function Page(props: PageProps<"/guru/materi/[storyId]">) {}
export default function Layout({ children }: LayoutProps<"/">) {}
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/stories/[storyId]">,
) {}
```

`bun run typecheck` sudah menjalankan `next typegen` lebih dulu.

### Server Actions untuk mutasi, Route Handlers untuk upload/streaming

- **Server Actions** (`"use server"`) untuk edit cerita, publish, hapus.
  Ingat: Server Action bisa dipanggil lewat POST langsung — **selalu cek otorisasi
  di dalam fungsinya**.
- **Route Handlers** (`src/app/api/**/route.ts`) untuk upload file
  (`request.formData()`), streaming progres generasi, dan endpoint publik
  `GET` cerita untuk game.
- Route Handler tidak di-cache by default.

### Konfigurasi build yang sudah ada

```ts
turbopack: {
  rules: {
    "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
  },
},
```

Jangan menghapus aturan ini; Tailwind 4 di proyek ini bergantung padanya.

## Phaser 4.2.1

**Terpasang** di `package.json` (`phaser@4.2.1`). Shell client ada di `src/game/`
dan `src/components/game/GameCanvas.tsx`, dibuka lewat halaman dev `/game`.
Bridge ke React, `StoryRunner`, dan loader aset masih rencana (lihat
[`../04-game/engine.md`](../04-game/engine.md#keadaan-sekarang-vs-target)).

Perbedaan besar dari Phaser 3 yang **akan memengaruhi kode kita**:

| Phaser 3                               | Phaser 4.2.1                                          |
| -------------------------------------- | ----------------------------------------------------- |
| FX dan mask terpisah                   | Satu **filter system** untuk semua game object/kamera |
| `setTintFill()`                        | `setTint()` + `setTintMode()`                         |
| Lighting lewat pipeline                | `setLighting(true)`                                   |
| `Phaser.Geom.Point`                    | `Phaser.Math.Vector2`                                 |
| `Math.TAU` salah (`PI/2`)              | `Math.TAU` = `2π`; pakai `Math.PI_OVER_2` bila perlu  |
| `Phaser.Struct.Set` / `Map`            | `Set` / `Map` bawaan JavaScript                       |
| `DynamicTexture` langsung gambar       | Wajib `render()` setelah menggambar                   |
| `roundPixels` default `true`           | Default `false` → **set eksplisit** untuk pixel art   |
| `Mesh`, `Plane`, `Camera3D`, `Layer3D` | Dihapus                                               |
| Pipeline WebGL kustom                  | Ditulis ulang sebagai **render nodes**                |

Sumber verifikasi:

- `https://phaser.io/download/release/v4.2.1`
- `https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know`
- Docs resmi tersedia sebagai Markdown (`https://phaser.io/oss/docs/...md`) dan
  MCP server (`https://phaser.io/oss/docs/mcp`).

> **Jangan tertukar:** Phaser AE (produk agentic berbayar di phaser.io) berbeda
> dari framework open source Phaser 4. Kita memakai **framework open source**.

## Batasan versi yang disengaja

- Jangan menambahkan package manager lain (npm/yarn/pnpm). Lockfile hanya `bun.lock`.
- Jangan menurunkan Next ke 15.x "supaya cocok dengan contoh di internet";
  contoh itu memakai API yang sudah berubah.
- Jangan memakai `experimental` flag baru tanpa ADR.
