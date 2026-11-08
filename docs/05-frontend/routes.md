---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Route dan Halaman

Semua route ada di `src/app` (App Router). Route adalah lapisan tipis: ambil data,
render komponen. Logika ada di `src/story`, `src/server`, `src/ai`.

## Peta route

| Route                            | Akses   | Render  | Fungsi                                     |
| -------------------------------- | ------- | ------- | ------------------------------------------ |
| `/`                              | Publik  | Statis  | Landing: apa ini, tombol masuk guru/siswa  |
| `/guru/masuk`                    | Publik  | Dinamis | Kode akses guru                            |
| `/guru`                          | Guru    | Dinamis | Daftar materi + status                     |
| `/guru/materi/baru`              | Guru    | Dinamis | Form upload                                |
| `/guru/materi/[storyId]`         | Guru    | Dinamis | Ringkasan + status generasi + aksi         |
| `/guru/materi/[storyId]/edit`    | Guru    | Dinamis | Story editor                               |
| `/guru/materi/[storyId]/preview` | Guru    | Dinamis | Preview game (versi draft)                 |
| `/play/[storyId]`                | Publik* | Dinamis | Game siswa (termasuk layar hasil)          |
| `/game`                          | Dev     | Client  | Boot Phaser placeholder, bukan route siswa |

\* Publik tapi hanya untuk cerita `published`; kalau tidak ada → `notFound()`.

Tidak ada route `/play/[storyId]/hasil`. Layar hasil adalah **overlay di dalam
`GameShell`** pada halaman yang sama, karena ia butuh state permainan yang masih
hidup di memori (skor, jawaban, `weakConcepts`). Pindah route berarti membuang
state itu. Lihat [`game-player.md`](./game-player.md).

`/game` **bukan** route siswa. Halaman itu hanya boot Phaser sebelum pipeline
dan cerita siap: tanpa `storyId`, tanpa otorisasi, dan tidak ditautkan dari
landing atau dashboard guru. Target siswa tetap `/play/[storyId]`.

## Route API

| Method | Route                    | Fungsi                                   |
| ------ | ------------------------ | ---------------------------------------- |
| `POST` | `/api/upload`            | Terima PDF, buat story + job             |
| `GET`  | `/api/jobs/[jobId]`      | Status generasi                          |
| `GET`  | `/api/stories/[storyId]` | Cerita `published` untuk game (no-store) |
| `GET`  | `/api/health`            | Cek hidup + versi build                  |

Detail kontrak: [`../06-backend/api-contract.md`](../06-backend/api-contract.md).

## Pola Next.js 16.4.5 yang dipakai

### `params` adalah Promise

```tsx
// src/app/play/[storyId]/page.tsx
export default async function PlayPage(props: PageProps<"/play/[storyId]">) {
  const { storyId } = await props.params;
  const story = await getPublishedStory(storyId);
  if (!story) notFound();
  return <GameShell story={story} />;
}
```

Jangan menulis `props.params.storyId` langsung — itu pola Next 14.

### Route Handler dengan `RouteContext`

```ts
// src/app/api/stories/[storyId]/route.ts
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/stories/[storyId]">,
) {
  const { storyId } = await ctx.params;
  // ...
}
```

### Metadata

```tsx
export async function generateMetadata(
  props: PageProps<"/play/[storyId]">,
): Promise<Metadata> {
  const { storyId } = await props.params;
  const story = await getPublishedStory(storyId);
  return { title: story ? `${story.meta.title} — ClassQuest` : "ClassQuest" };
}
```

### Suspense dan Cache Components

Karena `cacheComponents: true`, halaman yang mengambil data dinamis harus punya
batas `Suspense` agar shell statis bisa langsung tampil:

```tsx
export default function GuruPage() {
  return (
    <Suspense fallback={<StoryListSkeleton />}>
      <StoryList />
    </Suspense>
  );
}
```

Aturan:

- Jangan memakai `export const runtime` (tidak didukung dengan Cache Components).
- Jangan memakai `export const dynamic = "force-dynamic"` sebagai jalan pintas;
  pahami dulu kenapa data dianggap statis.
- Caching opt-in dengan `use cache` hanya untuk data yang memang stabil.

### Server Actions

Untuk mutasi dari editor:

```ts
// src/app/guru/actions.ts
"use server";

export async function saveStoryDraft(
  input: SaveStoryInput,
): Promise<SaveStoryResult> {
  await requireTeacher(); // wajib, karena bisa dipanggil via POST langsung
  // validasi + simpan
  revalidatePath(`/guru/materi/${input.storyId}`);
  return { ok: true, version: newVersion, warnings };
}
```

Nama dan bentuk respons mengikuti
[`../06-backend/api-contract.md`](../06-backend/api-contract.md#server-actions-bukan-endpoint-publik).
Jangan membuat nama lain seperti `saveStoryVersion`.

### Navigasi

Pakai `next/link` dan `useRouter` dari `next/navigation`. Jangan `<a href>` untuk
route internal.

## Layout

| Layout                    | Isi                                            |
| ------------------------- | ---------------------------------------------- |
| `src/app/layout.tsx`      | `<html>`, font, `globals.css`, metadata global |
| `src/app/guru/layout.tsx` | Shell dashboard: sidebar/nav, cek sesi guru    |

Game **tidak** memakai layout guru. Ia memakai halaman sendiri yang fullscreen
(`src/app/play/[storyId]/`).

## Status dan error

| Kondisi                        | Tampilan                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| Cerita tidak ada               | `notFound()` → halaman 404                                     |
| Cerita belum published (siswa) | 404, bukan "belum siap" (jangan bocorkan draft)                |
| Job gagal                      | Halaman detail dengan alasan + tombol coba lagi                |
| Error server                   | `error.tsx` per segmen, pesan ramah + tombol ulang             |
| Loading                        | `loading.tsx`/`Suspense` dengan skeleton, bukan spinner kosong |

## Yang tidak boleh dilakukan

- Mengambil data langsung dari komponen client ke database.
- Menaruh kunci API di halaman.
- Membuat route `/api` baru tanpa memperbarui
  [`../06-backend/api-contract.md`](../06-backend/api-contract.md).
- Menambahkan route guru tanpa `requireTeacher()`.
- Memakai nama route bahasa Inggris campur (`/teacher`) — konsisten `/guru`.
- Menampilkan `storyId` mentah ke siswa sebagai satu-satunya cara berbagi.

## Checklist route baru

- [ ] Ada di tabel dokumen ini.
- [ ] Punya otorisasi yang jelas.
- [ ] Memakai `PageProps<"...">` dan `await params`.
- [ ] Punya state loading dan error.
- [ ] Tidak memakai `runtime`/`dynamic` yang tidak didukung.
- [ ] Link internal memakai `next/link`.
