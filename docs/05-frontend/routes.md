---
status: draft
last_reviewed: 2026-11-12
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
| `/guru`                          | Guru    | Dinamis | Dashboard: ringkasan + aktivitas terbaru   |
| `/guru/materi`                   | Guru    | Dinamis | Daftar materi + penyaring + modal detail   |
| `/guru/materi/baru`              | Guru    | Dinamis | AI Studio (form materi → modul)            |
| `/guru/materi/[storyId]`         | Guru    | Dinamis | Ringkasan + status generasi + aksi         |
| `/guru/materi/[storyId]/edit`    | Guru    | Dinamis | Story editor                               |
| `/guru/materi/[storyId]/preview` | Guru    | Dinamis | Preview game (versi draft)                 |
| `/guru/kelas`                    | Guru    | Dinamis | Daftar kelas, detail kelas, kelas baru     |
| `/guru/game`                     | Guru    | Dinamis | Koleksi game edukasi                       |
| `/play/[storyId]`                | Publik* | Dinamis | Game siswa (termasuk layar hasil)          |
| `/game`                          | Dev     | Client  | Boot Phaser placeholder, bukan route siswa |

\* Publik tapi hanya untuk cerita `published`; kalau tidak ada → `notFound()`.

### Status implementasi portal guru

`/guru`, `/guru/materi`, `/guru/materi/baru`, `/guru/kelas`, dan `/guru/game`
sudah dirender dari komponen di `src/components/guru/`, tetapi **belum
tersambung ke data**:

| Bagian                  | Sekarang                                           | Saat wiring                                  |
| ----------------------- | -------------------------------------------------- | -------------------------------------------- |
| Sumber data             | `src/components/guru/data.ts` (contoh statis)      | `src/server/stories` + query DB              |
| `/guru/masuk`           | Toast + pindah ke `/guru`                          | `POST /api/auth/login`, lalu set cookie sesi |
| Otorisasi halaman guru  | Belum ada                                          | `requireTeacher()` di layout `(portal)`      |
| AI Studio "Buat Cerita" | Pratinjau lokal dari isian form                    | Server Action `publishStory` / pipeline AI   |
| Simpan draf AI Studio   | `localStorage` (kunci `classquest.guru.ai-studio`) | Tabel `stories` (status draft)               |
| Kelas & penugasan game  | State komponen (hilang saat muat ulang)            | Tabel kelas/siswa/penugasan                  |

Sampai tabel di atas terisi, halaman-halaman itu adalah **tampilan** dan tidak
boleh dipakai untuk menyimpan data nyata. Saat wiring, `requireTeacher()` tetap
wajib dipasang di layout `(portal)` — lihat bagian "Yang tidak boleh dilakukan".

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
| `POST` | `/api/auth/login`        | Tukar kode akses dengan cookie sesi      |
| `POST` | `/api/auth/logout`       | Hapus cookie sesi                        |
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
  const story = await getPlayableStory(storyId);
  if (story === null) notFound();
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

| Layout                                | Isi                                                       |
| ------------------------------------- | --------------------------------------------------------- |
| `src/app/layout.tsx`                  | `<html>`, font, `globals.css`, metadata global            |
| `src/app/guru/layout.tsx`             | Font portal guru (Inter/Jakarta/Pixelify) + toast         |
| `src/app/guru/(portal)/layout.tsx`    | `PortalShell`: sidebar/nav + header, hanya halaman portal |
| `src/components/guru/PortalShell.tsx` | Markup sidebar/header portal guru                         |

`/guru/masuk` berada di bawah `src/app/guru/layout.tsx` tetapi **di luar** route
group `(portal)`, jadi ia memakai font dan toast yang sama tanpa sidebar. Di
dalam group itu, `src/app/guru/(portal)/page.tsx` adalah `/guru`.

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

Khusus `/play/[storyId]`: status `404` dihasilkan `src/proxy.ts` sebelum halaman
dirender, karena route itu `◐` (App Shell terkirim lebih dulu) sehingga
`notFound()` saja hanya menghasilkan soft 404. Rinciannya di
[`game-player.md`](./game-player.md#pengambilan-data).

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
