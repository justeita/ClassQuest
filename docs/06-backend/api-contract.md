---
status: draft
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Kontrak API

Semua endpoint memakai Web `Request`/`Response` (Route Handlers Next.js). Tidak ada
GraphQL. Mutasi dari editor memakai Server Actions, bukan endpoint terpisah.

## Prinsip

- **Server yang memutuskan.** Client tidak pernah mengirim `story` final untuk
  disimpan tanpa validasi server.
- **Error terstruktur.** Selalu `{ error: { code, message } }`, bukan HTML.
- **Jangan bocorkan internal.** Tidak ada stack trace, nama model, atau pesan
  provider mentah.
- **Idempotensi bila memungkinkan.** Upload dengan `Idempotency-Key` (opsional,
  backlog).

## Bentuk error

```ts
type ApiError = {
  error: {
    code: string; // mis. "FILE_TOO_LARGE"
    message: string; // bahasa Indonesia, aman ditampilkan
    details?: Record<string, unknown>; // opsional, tidak sensitif
  };
};
```

Kode error yang dipakai:

| Kode             | HTTP | Arti                                                  |
| ---------------- | ---- | ----------------------------------------------------- |
| `UNAUTHORIZED`   | 401  | Sesi tidak ada/kedaluwarsa; kredensial guru tidak sah |
| `FORBIDDEN`      | 403  | Bukan pemilik cerita                                  |
| `NOT_FOUND`      | 404  | Cerita/job tidak ada (termasuk bukan milik guru)      |
| `INVALID_INPUT`  | 400  | Body/field request tidak valid                        |
| `FILE_MISSING`   | 400  | Tidak ada file di form                                |
| `FILE_TOO_LARGE` | 413  | Melebihi batas                                        |
| `FILE_TYPE`      | 415  | Bukan PDF                                             |
| `PDF_UNREADABLE` | 422  | PDF rusak/terenkripsi                                 |
| `NO_TEXT_LAYER`  | 422  | PDF scan, tidak ada teks                              |
| `TOO_MANY_PAGES` | 422  | Melebihi batas halaman                                |
| `RATE_LIMITED`   | 429  | Terlalu banyak permintaan                             |
| `INTERNAL`       | 500  | Kesalahan tak terduga                                 |

---

## `POST /api/upload`

Menerima PDF, membuat story draft + job generasi.

**Request:** `multipart/form-data`

| Field        | Tipe   | Wajib | Catatan                        |
| ------------ | ------ | ----- | ------------------------------ |
| `file`       | File   | Ya    | `application/pdf`, maks. 4 MB  |
| `title`      | string | Ya    | 3–80 karakter                  |
| `subject`    | string | Ya    | 1–40 karakter                  |
| `gradeLevel` | string | Ya    | 1–40 karakter                  |
| `language`   | string | Ya    | `id`/`en`                      |
| `tone`       | string | Tidak | default "hangat dan penasaran" |

**Response `202`:**

```json
{
  "storyId": "st_abc123",
  "jobId": "job_def456",
  "status": "queued"
}
```

**Perilaku:**

- Validasi file di server (lihat
  [`../01-architecture/security-and-privacy.md`](../01-architecture/security-and-privacy.md)).
- Ukuran maksimum 4 MB (`MAX_PDF_BYTES`), mengikuti batas body request Vercel
  4,5 MB yang menyisakan margin untuk overhead multipart (ADR 0013).
- Simpan file, buat record story (`status: "processing"`), buat job.
- Jalankan pipeline (lihat [`jobs-and-limits.md`](./jobs-and-limits.md)).
- Idempotensi: kalau `storyId` sudah ada dan masih `processing`, kembalikan job
  yang sama.

**Kegagalan:**

| Kondisi                 | Response                                     |
| ----------------------- | -------------------------------------------- |
| Bukan PDF               | `415 FILE_TYPE`                              |
| > 4 MB                  | `413 FILE_TOO_LARGE` + `details.maxBytes`    |
| PDF rusak / terenkripsi | `422 PDF_UNREADABLE`                         |
| > batas halaman         | `422 TOO_MANY_PAGES`                         |
| Rate limit              | `429 RATE_LIMITED` + `details.retryAfterSec` |

**`NO_TEXT_LAYER` tidak muncul di sini.** Ekstraksi teks berjalan **setelah**
respons `202`, di dalam `after()`. Upload hanya tahu bahwa file itu PDF yang bisa
dibuka. Jadi PDF hasil scan tetap mendapat `202`, lalu job-nya berakhir
`stage: "failed"` dengan `error.code: "NO_TEXT_LAYER"` — itulah yang dibaca UI
saat polling `GET /api/jobs/[jobId]`.

---

## `GET /api/jobs/[jobId]`

Status generasi untuk polling.

**Response `200`:**

```json
{
  "id": "job_def456",
  "storyId": "st_abc123",
  "stage": "generating",
  "progress": 55,
  "message": "Menulis chapter 2 dari 3",
  "startedAt": "2026-11-08T10:00:00.000Z",
  "finishedAt": null
}
```

**Response saat selesai:**

```json
{
  "id": "job_def456",
  "storyId": "st_abc123",
  "stage": "done",
  "progress": 100,
  "message": "Selesai",
  "startedAt": "2026-11-08T10:00:00.000Z",
  "finishedAt": "2026-11-08T10:01:40.000Z",
  "version": 1,
  "usedFallback": false
}
```

`version` dan `usedFallback` diambil dari baris `story_versions` **terbaru** milik
`storyId`; `usedFallback: true` memicu banner "cerita cadangan" di dashboard. Isi
cerita (JSON) **tidak** dikirim di sini — JSON itu hanya lewat server component.

**Response saat gagal:**

```json
{
  "id": "job_def456",
  "storyId": "st_abc123",
  "stage": "failed",
  "progress": 100,
  "error": {
    "code": "NO_TEXT_LAYER",
    "message": "PDF ini sepertinya hasil scan, jadi teksnya tidak bisa dibaca."
  },
  "startedAt": "2026-11-08T10:00:00.000Z",
  "finishedAt": "2026-11-08T10:00:12.000Z"
}
```

Aturan:

- `Cache-Control: no-store`.
- Hanya pemilik (guru) yang bisa melihat: job harus milik story yang
  `teacher_id`-nya sama dengan sesi. Job yang tidak ada dan job milik guru lain
  dijawab **sama**: `404 NOT_FOUND` dengan body identik, supaya keberadaan job
  tidak bocor. `jobId` yang tidak valid (kosong/terlalu panjang) juga `404`.
- Tanpa sesi: `401 UNAUTHORIZED`.
- `message` opsional. Saat `stage: "failed"`, alasan ada di
  `error: { code, message }` dengan `code` salah satu `PDF_UNREADABLE`,
  `TOO_MANY_PAGES`, `NO_TEXT_LAYER`, `INTERNAL`; `message` selalu teks statis
  dari server, bukan kolom database mentah.
- **Job basi.** Job yang masih berjalan lebih dari 330 detik
  (300 detik `maxDuration` route upload + 30 detik margin) sejak `started_at`
  dianggap gagal: dijawab `stage: "failed"` dengan `error.code: "INTERNAL"`,
  lalu kegagalannya **disimpan** (job → `failed`, story `processing` → `failed`).
  Kontrak belum punya kode khusus timeout; usul: `TIMEOUT`. Implementasi:
  `src/server/jobs/status.ts` + `src/server/jobs/limits.ts`.
- `stage` ∈ `queued | extracting | outlining | generating | validating | repairing | saving | done | failed`.
- `progress` hanya salah satu dari `5, 15, 30, 55, 75, 90, 100` (lihat
  [`jobs-and-limits.md`](./jobs-and-limits.md#progress)). Jangan mengirim angka
  bebas.
- **Bentuk wire vs kolom DB.** Di JSON, error selalu bersarang:
  `error: { code, message }`. Di database, ia satu kolom `error_code` (dan
  `error_message` bila perlu). Nama field JSON **tidak** harus sama dengan nama
  kolom; yang mengikat adalah bentuk JSON di dokumen ini.

---

## `POST /api/auth/login`

Tukar kredensial akun guru (username + password) dengan cookie sesi. Akun
disimpan di tabel `teachers`; password hanya pernah tersimpan sebagai hash
scrypt. Detail auth: [`persistence.md`](./persistence.md#auth-tbd).

**Request:** `application/json`

```json
{ "username": "guru", "password": "<sandi guru>" }
```

`username` tidak peka huruf besar-kecil dan spasi tepi dimangkas sebelum
dicari. Batas panjang: 64 karakter untuk `username`, 200 untuk `password`.

**Response `200`:**

```json
{ "ok": true }
```

Cookie sesi (`classquest_teacher_session`) di-set `httpOnly`, `sameSite=lax`,
`path=/`, `secure` hanya di production, `maxAge` 8 jam. Isinya token bertanda
tangan berisi `teacherId` dan `displayName`; token tidak pernah dikirim di body.

**Kegagalan:**

| Kondisi                                                       | Response            |
| ------------------------------------------------------------- | ------------------- |
| Body bukan JSON, tanpa `username`/`password`, atau tipe salah | `400 INVALID_INPUT` |
| `username` atau `password` kosong                             | `401 UNAUTHORIZED`  |
| Username tidak terdaftar                                      | `401 UNAUTHORIZED`  |
| Password salah                                                | `401 UNAUTHORIZED`  |
| Akun belum punya `password_hash` (baris lama)                 | `401 UNAUTHORIZED`  |
| `TEACHER_SESSION_SECRET` belum diisi                          | `401 UNAUTHORIZED`  |

Semua baris `401` di atas memakai **pesan yang sama**. Klien tidak boleh bisa
membedakan "username salah" dari "password salah" atau "belum dikonfigurasi".
Tidak ada username, password, hash, token, atau secret di respons. Verifikasi
tetap menjalankan scrypt walau username tidak ditemukan, supaya waktu respons
tidak menunjukkan akun mana yang terdaftar.

**Rate limit:** 10 percobaan per 10 menit per IP, dihitung untuk **semua**
percobaan dan diperiksa **sebelum** body dibaca dan sebelum kredensial
diverifikasi. Melewati batas → `429 RATE_LIMITED` + header `Retry-After` (lihat
bagian [Rate limit](#rate-limit)). Kalau penghitungnya sendiri gagal, login
**fail closed**: `500 INTERNAL` dengan pesan generik.

---

## `POST /api/auth/logout`

Hapus cookie sesi guru. Aman dipanggil tanpa sesi.

**Response `200`:**

```json
{ "ok": true }
```

Tanpa sesi pun hasilnya sama; tombol keluar tidak boleh gagal hanya karena cookie
sudah tidak ada. `Cache-Control: no-store` di kedua endpoint auth.

---

## `GET /api/stories/[storyId]`

Cerita untuk game. **Publik**, tapi hanya versi `published`.

**Response `200`:**

```json
{
  "storyId": "st_abc123",
  "version": 4,
  "publishedAt": "2026-11-08T09:00:00.000Z",
  "story": { "schemaVersion": "1.0", "...": "..." }
}
```

Aturan:

- `Cache-Control: no-store`.
- **Hanya `published` yang dilayani.** Status lain (`processing`, `draft`,
  `failed`, `archived`) semuanya `404 NOT_FOUND` — siswa tidak boleh tahu bahwa
  sebuah cerita ada tapi belum siap.
- Jangan sertakan data guru, email, atau path storage.
- Bisa dipakai juga oleh preview? **Tidak.** Preview memakai draft lewat server
  component, bukan endpoint publik.

---

## `GET /api/health`

Untuk monitoring sederhana.

```json
{
  "ok": true,
  "version": "0.1.0",
  "commit": "d411d3e",
  "time": "2026-11-08T10:00:00.000Z"
}
```

Jangan menyertakan status dependency internal yang bisa membocorkan infrastruktur.

---

## Server Actions (bukan endpoint publik)

| Action            | Input                             | Output                                      |
| ----------------- | --------------------------------- | ------------------------------------------- |
| `saveStoryDraft`  | `{ storyId, story, baseVersion }` | `SaveStoryResult` (lihat di bawah)          |
| `publishStory`    | `{ storyId, version }`            | `{ ok: true }` atau `{ ok: false, errors }` |
| `deleteStory`     | `{ storyId }`                     | `{ ok: true }`                              |
| `archiveStory`    | `{ storyId }`                     | `{ ok: true }`                              |
| `savePlayResult`  | `{ storyId, result }`             | `{ ok: true }` (opsional)                   |
| `createClassroom` | `{ name, subject, grade, year }`  | `CreateClassroomResult` (lihat di bawah)    |
| `addStudent`      | `{ classroomId, name, nis }`      | `AddStudentResult` (lihat di bawah)         |

Bentuk hasil aksi kelas/siswa (`src/app/guru/(portal)/kelas/actions.ts`):

```ts
type CreateClassroomResult =
  { ok: true; classroom: ClassroomDetail } | { ok: false; message: string };

type AddStudentResult =
  { ok: true; student: StudentListItem } | { ok: false; message: string };
```

Aturan:

- Semua action memanggil `requireTeacher()` lebih dulu; tanpa sesi guru hasilnya
  redirect ke `/guru/masuk`.
- `nis` opsional. Kosong → server memberi nomor urut mulai `1001` (melewati
  nomor terpakai). Diisi → dinormalisasi ke huruf besar, pola
  `[A-Za-z0-9._-]{1,20}`, dan harus unik per guru.
- `year` (tahun ajaran) **bukan teks bebas**. Hanya bentuk baku `YYYY/YYYY`
  (2000–2099, tahun kedua = tahun pertama + 1) yang diterima lewat
  `normalizeAcademicYear()` (`src/lib/academic-year.ts`). Nilai lain — spasi,
  `2026-2027`, `2026 / 2027`, karakter kontrol, zero-width, emoji, digit
  non-ASCII — dijawab `{ ok: false, message: ACADEMIC_YEAR_INVALID_MESSAGE }`,
  tidak dipotong atau diperbaiki diam-diam. UI menawarkannya lewat `YearPicker`.
- `code` kelas dibuat server (`QST-XXXX`), bukan dikirim client.
- Teks lain (`name`, `subject`, `grade`) dibersihkan `cleanText()`: karakter
  kontrol diganti spasi, karakter tak terlihat (zero-width, penanda arah
  RTL/LTR, BOM) dibuang, spasi ganda dirapatkan, lalu dipotong ke batas kolom.
- Kedua action dibatasi `guardClassroomWrite()`: 60 tulisan per jam per guru
  (`docs/06-backend/api-contract.md` bagian Rate limit). Kelebihan dijawab
  `{ ok: false, message }` statis.
- Kegagalan database dan kegagalan validasi dijawab `{ ok: false, message }`
  dengan pesan statis berbahasa Indonesia. Tidak ada status code karena Server
  Action; detail error tidak pernah dikirim ke client.

Bentuk `SaveStoryResult` — **satu-satunya** bentuk yang dipakai editor, dashboard,
dan dokumen lain:

```ts
type SaveStoryResult =
  | { ok: true; version: number; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[] }
  | { ok: false; conflict: true; latestVersion: number };
```

Kenapa tiga cabang, bukan `{ version, warnings }` saja: UI harus bisa membedakan
"tersimpan", "ditolak validator", dan "ada yang lebih baru". Kalau semuanya
dikembalikan sebagai objek longgar, klien akan menebak-nebak.

Semua wajib:

- `"use server"` di file action.
- `requireTeacher()` (kecuali `savePlayResult`).
- Validasi ulang input dengan validator yang sama.
- `revalidatePath` pada halaman terkait.

### Bentuk input & hasil `savePlayResult`

```ts
type PlayResultInput = {
  nickname?: string; // opsional, maks 40 karakter, tanpa identitas asli
  answers: Answer[]; // satu entri per tantangan yang dijawab (Answer dari src/story/scoring.ts)
};

type SavePlayResultOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "invalid" | "too_large" | "rate_limited";
    };
```

Aturan:

- **Skor dihitung server.** Klien tidak boleh mengirim field skor (`earnedPoints`, `correctCount`, dsb.); field tersebut ditolak (`invalid`). Server menghitung ulang skor via `scoreStory()` dari cerita versi terbit yang tersimpan.
- Jawaban divalidasi terhadap tantangan cerita: id tantangan atau opsi tidak dikenal, jawaban ganda, atau jumlah jawaban melebihi tantangan ditolak (`invalid`).
- Data yang disimpan hanya agregat di tabel `play_results` (tanpa data per-opsi, IP, user-agent, atau identitas siswa).
- **Rate limit:** 120 panggilan per 10 menit per IP, diperiksa paling awal sebelum input disentuh. Melebihi batas menghasilkan `{ ok: false, reason: "rate_limited" }` (Server Action tidak bisa mengirim HTTP 429, jadi tidak ada header `Retry-After`; UI cukup menampilkan pesan "coba lagi sebentar lagi"). Kalau penghitungnya gagal, hasil bermain **tetap diproses** (fail open). Angka ini longgar karena satu kelas bisa berbagi satu IP.

### Batas ukuran payload

- **Cerita JSON** (`saveStoryDraft`): maksimal 512 KB (`MAX_STORY_JSON_BYTES`). Melebihi batas menghasilkan `{ ok: false, errors: [STORY_TOO_LARGE_ISSUE] }`.
- **Hasil bermain** (`savePlayResult`): maksimal 64 KB (`MAX_PLAY_RESULT_JSON_BYTES`), nickname maksimal 40 karakter, answers maksimal 200 entri. Melebihi batas menghasilkan `{ ok: false, reason: "too_large" }`.
- **`storyId`**: maksimal 200 karakter alfabet/angka/garis bawah/strip. Id kosong atau melebihi batas dijawab `404 NOT_FOUND` identik.
- **Daftar issue validasi**: dibatasi maksimal 50 issue per respons ke klien.

### Aturan transisi status & edit cerita terbit

- `saveStoryDraft`: diperbolehkan saat `status` bernilai `draft` maupun `published`. Saat status `published`, draft baru tersimpan sebagai baris versi baru (`version + 1`), sementara versi yang disajikan publik kepada siswa tetap `published_version` lama sampai `publishStory` dipanggil kembali. Optimistic locking: `baseVersion` harus sama persis dengan versi terbaru cerita, jika tidak mengembalikan `{ ok: false, conflict: true, latestVersion }`. Seluruh pengecekan dan penulisan dalam satu transaksi.
- `publishStory`: dapat dipanggil dari `status: "draft"` (`draft → published`, menetapkan `published_version = version`) atau pembaruan versi pada cerita yang sudah terbit (`published → published`, memperbarui `published_version = version`). Cerita dengan status `processing` atau `failed` ditolak (konflik). Versi terbaru divalidasi ulang di server sebelum terbit.
- `archiveStory`: pada cerita `published`, membatalkan status terbit kembali ke draft (`published → draft`, `published_version = null`), sehingga cerita langsung berhenti disajikan ke siswa. Pada `draft` atau `failed`, status berubah menjadi `archived`.
- `deleteStory`: hanya diizinkan untuk cerita berstatus `draft`, `failed`, atau `archived`. Cerita berstatus `published` (harus dibatalkan terbit dahulu) atau `processing` ditolak (`{ ok: false }`). Menghapus baris `stories`, `story_versions`, `jobs`, dan `play_results` dalam satu transaksi.
- `GET /api/stories/[storyId]`: hanya melayani cerita berstatus `published`. Mengembalikan `published_version` (bukan versi draft terbaru bila ada edit menyusul), dengan `Cache-Control: no-store`. Status lain (`processing`, `draft`, `failed`, `archived`) dijawab `404 NOT_FOUND` identik.

---

## Versi API

Tidak ada versioning URL di MVP. Kalau perlu perubahan breaking, tambahkan field
baru dan pertahankan yang lama selama satu iterasi. Jangan mengubah arti field
yang sudah ada.

## Rate limit

Batas yang berlaku sekarang. Angka tinggal di
`src/server/rate-limit/limits.ts`; kalau berubah, ubah keduanya.

| Endpoint                                | Batas                                                       | Penyimpanan | Saat limiter gagal |
| --------------------------------------- | ----------------------------------------------------------- | ----------- | ------------------ |
| `POST /api/auth/login`                  | 10 per 10 menit per IP                                      | database    | **fail closed**    |
| `POST /api/upload`                      | 20 per jam per IP, 10 per jam per guru, 100 per hari global | database    | **fail closed**    |
| `savePlayResult` (action)               | 120 per 10 menit per IP                                     | database    | fail open          |
| `createClassroom`/`addStudent` (action) | 60 per jam per guru                                         | database    | fail open          |
| `GET /api/stories/[storyId]`            | 120 per menit per IP                                        | memori      | fail open          |
| `GET /api/jobs/*`                       | 60 per menit per sesi                                       | belum ada   | —                  |

### Respons saat batas terlampaui

Route handler memakai bentuk `ApiError` yang sama dengan error lain, ditambah
header standar `Retry-After` dalam **detik**:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 90
Cache-Control: no-store
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
    "details": { "retryAfterSeconds": 90 }
  }
}
```

Aturan:

- `message` **statis**: tidak memuat IP, key, hash, nama limit, atau angka
  internal apa pun. Pesan yang sama dipakai semua endpoint.
- `details.retryAfterSeconds` hanya salinan angka `Retry-After` supaya klien yang
  tidak bisa membaca header (mis. lewat proxy) tetap punya nilainya. Nama
  `retryAfterSec` di `jobs-and-limits.md` **tidak** dipakai: bentuk `ApiError`
  tidak punya tempat untuk field itu, dan header sudah standar.
- Server Action `savePlayResult` tidak memakai bentuk ini: ia mengembalikan
  `{ ok: false, reason: "rate_limited" }` tanpa angka retry.
- Kegagalan penghitung pada endpoint **fail closed** dijawab `500 INTERNAL`
  dengan pesan generik (tanpa detail), bukan `429`: klien tidak boleh
  menyimpulkan "coba lagi nanti" dari masalah server.

### Identitas dan penyimpanan

- Identitas klien = IP dari header `x-real-ip`, lalu entri pertama
  `x-forwarded-for`, lalu `"unknown"`. Header ini hanya bisa dipercaya di
  belakang proxy hosting yang menimpanya; tanpa proxy, klien bisa mengarang
  nilainya.
- IP **tidak** disimpan mentah. Key di `rate_limits` berbentuk
  `"<nama-limit>:<HMAC-SHA256(identitas, TEACHER_SESSION_SECRET)>"`. Batas
  global memakai identitas tetap, bukan IP.
- Fixed window: `windowStart = floor(now / window) * window`. Penambahan
  hitungan atomik dalam satu statement
  (`insert ... on conflict do update set count = count + 1 returning count`);
  `rowsAffected` libSQL tidak dipakai karena hanya melaporkan statement terakhir.
- Baris `rate_limits` yang jendelanya lebih tua dari 1 hari dibersihkan
  oportunistik (sekitar 1% panggilan); kegagalan pembersihan diabaikan.
- `GET /api/stories/[storyId]` memakai `Map` per proses: batas berlaku **per
  instance**, bukan per deploy, dan tidak ada tulis database.
- Urutan di `POST /api/upload`: batas IP → sesi (`401` tidak menambah hitungan
  berikutnya) → Content-Length → batas per guru → batas global → file dibaca.

## Kontrak tipe bersama

Letakkan tipe request/response di `src/server/contracts.ts` (atau `src/lib/contracts.ts`)
dan impor dari client maupun server. Jangan mendefinisikan ulang bentuk response di
komponen.

## Checklist endpoint baru

- [ ] Ada di dokumen ini.
- [ ] Punya otorisasi yang jelas.
- [ ] Error memakai bentuk `ApiError`.
- [ ] `Cache-Control` diset eksplisit.
- [ ] Tidak membocorkan data internal.
- [ ] Ada test untuk happy path + minimal satu error.
