---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Route dan Halaman

Semua route ada di `src/app` (App Router). Route adalah lapisan tipis: ambil data,
render komponen. Logika ada di `src/story`, `src/server`, `src/ai`.

## Peta route

| Route                            | Akses   | Render  | Fungsi                                   |
| -------------------------------- | ------- | ------- | ---------------------------------------- |
| `/`                              | Publik  | Statis  | Landing: pilih peran guru/siswa          |
| `/privasi`                       | Publik  | Statis  | Kebijakan privasi                        |
| `/syarat`                        | Publik  | Statis  | Syarat & ketentuan layanan               |
| `/penafian`                      | Publik  | Statis  | Penafian peran AI dan skor               |
| `/cookie`                        | Publik  | Statis  | Cookie dan penyimpanan lokal             |
| `/guru/masuk`                    | Publik  | Dinamis | Login akun guru                          |
| `/guru`                          | Guru    | Dinamis | Dashboard: ringkasan + aktivitas terbaru |
| `/guru/materi`                   | Guru    | Dinamis | Daftar materi + penyaring + modal detail |
| `/guru/materi/baru`              | Guru    | Dinamis | AI Studio (form materi → modul)          |
| `/guru/materi/[storyId]`         | Guru    | Dinamis | Ringkasan + status generasi + aksi       |
| `/guru/materi/[storyId]/edit`    | Guru    | Dinamis | Story editor                             |
| `/guru/materi/[storyId]/preview` | Guru    | Dinamis | Preview game (versi draft)               |
| `/guru/kelas`                    | Guru    | Dinamis | Daftar kelas, detail kelas, kelas baru   |
| `/guru/game`                     | Guru    | Dinamis | Koleksi game edukasi                     |
| `/guru/analitik`                 | Guru    | Dinamis | Analytics per kelas + game               |
| `/play/[storyId]`                | Publik* | Dinamis | Game siswa (layar masuk + hasil)         |
| `/game`                          | Publik  | Client  | Demo Phaser; pintu siswa sementara       |
| `/_not-found`                    | Publik  | Statis  | Halaman 404 (`src/app/not-found.tsx`)    |

\* Publik tapi hanya untuk cerita `published`; kalau tidak ada → `notFound()`.

### Status implementasi portal guru

Portal guru sudah tersambung ke backend. Tidak ada lagi data contoh untuk
kelas/siswa:

| Bagian                  | Sekarang                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| Sumber data materi/game | `src/server/stories` (`listStories`, `getStoryDetail`)                   |
| Statistik dashboard     | Dihitung dari hasil `listStories` milik guru                             |
| `/guru/masuk`           | `POST /api/auth/login`; kode salah/`429` dijawab pesan berbeda           |
| Keluar                  | `POST /api/auth/logout` dari sidebar                                     |
| Otorisasi halaman guru  | `requireTeacher()` di layout `(portal)`; tiap page memanggil lagi        |
| AI Studio               | `POST /api/upload` (multipart) → redirect ke detail materi               |
| Progres generasi        | `GenerationProgress` polling `GET /api/jobs/[jobId]` tiap 1,5 s          |
| Aksi cerita             | Server Action `publishStory`/`archiveStory`/`deleteStory`                |
| Kelas & siswa           | `src/server/classrooms`; Server Action `createClassroom`/`addStudent`    |
| Penugasan game          | Tautan per kelas `?kelas=QST-XXXX` dari dialog "Bagikan" di `/guru/game` |
| Analytics               | `/guru/analitik` → `getClassroomAnalytics` (`src/server/analytics`)      |

Catatan wiring:

- `storyId` bukan `jobId`. Halaman detail mencari job terbaru milik guru lewat
  `getLatestJobId()` (`src/server/jobs/status.ts`); query-nya ikut memfilter
  `stories.teacher_id`, jadi cerita guru lain dan cerita tanpa job sama-sama
  tidak menghasilkan job.
- Layout `(portal)` memakai `export const instant = false` + `await connection()`
  — pola resmi Next 16 untuk segmen yang membaca sesi (`cookies()`). Tanpa
  `connection()`, `verifySessionToken()` memanggil `Date.now()` saat prerender
  dan dev server melaporkan `blocking-prerender-current-time`.
- Halaman yang memanggil `requireTeacher()` sendiri di dalam `<Suspense>` juga
  memanggil `connection()` di komponen async-nya (aturan Cache Components:
  data tak ter-cache harus di dalam batas Suspense).
- `/guru/materi/[storyId]` adalah route `◐`, jadi `notFound()` untuk cerita yang
  tidak ada / bukan milik guru hanya menghasilkan **soft 404**: UI 404 terkirim,
  tetapi status HTTP tetap `200` (perilaku yang sama dengan `/play/[storyId]`
  sebelum `src/proxy.ts` ditambahkan). Yang dilindungi di sini adalah
  kepemilikan data, bukan status HTTP; kalau status 404 asli dibutuhkan,
  pemeriksaan harus dipindah ke `src/proxy.ts` seperti route siswa.
- Editor cerita (`/guru/materi/[storyId]/edit`) sudah ada: halaman hanya
  menyiapkan cerita versi terbaru + nomor versi, lalu `StoryEditor` (client)
  menyunting salinan dan menyimpan lewat `saveStoryDraft`. Preview draft dan
  pembagian tautan lewat undangan **belum ada**; tautan siswa cukup
  `/play/[storyId]`.
- `/guru/kelas` membaca `listClassrooms()` dan menampilkan daftar kosong bila
  guru belum punya kelas. Buat kelas dan tambah siswa lewat Server Action di
  `src/app/guru/(portal)/kelas/actions.ts`; setelah sukses komponen memanggil
  `router.refresh()` supaya daftar kembali dari server, bukan state klien.
  Menghapus/mengedit siswa dan membagikan kode kelas **belum ada**.
- `/guru/analitik` menerima pilihan lewat query string `?kelas=&storyId=`, bukan
  state klien, supaya tautannya bisa dibagikan dan agregatnya dihitung di
  server (`getClassroomAnalytics`). Daftar siswa yang belum bermain tetap
  ditampilkan dengan poin 0. Halaman ini hanya membaca; tidak ada penulisan.
- Tautan siswa yang dibagikan guru membawa kode kelas
  (`/play/[storyId]?kelas=QST-XXXX`). Kode divalidasi di server: kelas yang
  bukan milik guru pemilik cerita diperlakukan seperti kode salah — siswa tetap
  bisa bermain, tetapi hasilnya tidak masuk analytics kelas.

Tidak ada route `/play/[storyId]/hasil`. Layar hasil adalah **overlay di dalam
`GameShell`** pada halaman yang sama, karena ia butuh state permainan yang masih
hidup di memori (skor, jawaban, `weakConcepts`). Pindah route berarti membuang
state itu. Lihat [`game-player.md`](./game-player.md).

`/game` **bukan** route siswa resmi. Halaman itu membuka **menu utama** dulu
(`MainMenu`, lihat [`game-player.md`](./game-player.md#menu-utama)), baru setelah
"Mulai" ia memuat `DEMO_STORY` di Phaser: tanpa `storyId` dan tanpa otorisasi.
Landing menautkan kartu "Arena Siswa" ke sini karena tautan kelas dibuat di
portal guru ("Bagikan" di `/guru/game`); target siswa tetap
`/play/[storyId]?kelas=QST-XXXX`. Kartu itu memakai `TautanLayarPenuh`
(`src/components/landing/TautanLayarPenuh.tsx`): di ponsel, ketukan meminta
layar penuh + kunci lanskap lebih dulu, lalu berpindah ke `/game` lewat
navigasi App Router yang tidak mengganti dokumen (ADR 0037).

Landing `/` memakai route group `src/app/(landing)/` supaya punya layout sendiri
(font Inter/Plus Jakarta + ikon Font Awesome) tanpa membebani halaman
siswa/game. Kartu "Portal Guru" menautkan ke `/guru` — layout `(portal)`
mengarahkan ke `/guru/masuk` bila sesi belum ada.

Empat dokumen legal juga berada di group `(landing)` dan memakai kerangka yang
sama (`src/components/legal/LegalPage.tsx`): kepala/kaki halaman brand, pill
navigasi antar dokumen, satu `h1` per route, dan tautan dokumen lain di kaki
halaman. Desain asalnya adalah satu halaman SPA dengan sub-tab; di sini setiap
dokumen punya URL sendiri supaya bisa dibagikan dan dicetak.

Isi dokumen legal **mengikuti perilaku aplikasi**, bukan templat. Jangan
mencantumkan XP, leaderboard, lencana, token kelas, atau kunci penyimpanan yang
tidak dipakai kode — sama seperti aturan copy di
[`ui-conventions.md`](./ui-conventions.md#halaman-legal-privasi-syarat-penafian-cookie).

## Route API

| Method | Route                    | Fungsi                                    |
| ------ | ------------------------ | ----------------------------------------- |
| `POST` | `/api/auth/login`        | Tukar username + sandi dengan cookie sesi |
| `POST` | `/api/auth/logout`       | Hapus cookie sesi                         |
| `POST` | `/api/upload`            | Terima PDF, buat story + job              |
| `GET`  | `/api/jobs/[jobId]`      | Status generasi                           |
| `GET`  | `/api/stories/[storyId]` | Cerita `published` untuk game (no-store)  |
| `GET`  | `/api/health`            | Cek hidup + versi build                   |

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
- Setiap segmen portal yang memuat data punya `loading.tsx` sendiri, memakai
  kerangka bersama di `src/components/guru/skeletons.tsx`. `Suspense` di dalam
  halaman memakai kerangka yang sama, jadi navigasi tidak menampilkan dua bentuk
  loading berbeda.
- `src/app/guru/(portal)/loading.tsx` adalah boundary induk yang tidak tahu
  halaman tujuan. Isinya indikator loading biasa (spinner + teks), bukan
  skeleton, supaya halaman materi tidak sempat menampilkan kerangka dashboard.

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
| `src/app/guru/layout.tsx`             | Font portal guru (Inter/Jakarta) + toast                  |
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

### Halaman 404

`src/app/not-found.tsx` adalah satu-satunya halaman 404. Ia melayani URL yang
tidak cocok dengan route mana pun, `notFound()` dari segmen mana pun, dan
rewrite `/_not-found` di `src/proxy.ts`.

Karena file itu berada di akar `app/`, ia dirender di dalam
`src/app/layout.tsx` — **bukan** di dalam layout `(landing)` atau `guru`. Font
Inter/Plus Jakarta/Pixelify dan ikon Font Awesome karena itu dimuat di file itu
sendiri. Tampilannya mengikuti tema halaman peran (`/`): latar titik, kartu
pixel, dan tautan ke dua pintu. Kepala dan kaki halaman memakai komponen bersama
`src/components/brand/AppHeader.tsx` dan `AppFooter.tsx` — jangan menyalin
markahnya ke halaman ketiga. Jangan membuat halaman 404 kedua per area: satu
tema 404 untuk seluruh aplikasi.

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
