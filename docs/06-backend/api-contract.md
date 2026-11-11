---
status: draft
last_reviewed: 2026-11-10
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
| `UNAUTHORIZED`   | 401  | Sesi tidak ada/kedaluwarsa; kode akses guru tidak sah |
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
| `file`       | File   | Ya    | `application/pdf`              |
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
- Simpan file, buat record story (`status: "processing"`), buat job.
- Jalankan pipeline (lihat [`jobs-and-limits.md`](./jobs-and-limits.md)).
- Idempotensi: kalau `storyId` sudah ada dan masih `processing`, kembalikan job
  yang sama.

**Kegagalan:**

| Kondisi                 | Response                                     |
| ----------------------- | -------------------------------------------- |
| Bukan PDF               | `415 FILE_TYPE`                              |
| > batas ukuran          | `413 FILE_TOO_LARGE` + `details.maxBytes`    |
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

Tukar kode akses guru dengan cookie sesi. Satu kode berlaku untuk semua guru
(demo). Detail auth: [`persistence.md`](./persistence.md#auth-tbd).

**Request:** `application/json`

```json
{ "code": "<kode akses guru>" }
```

**Response `200`:**

```json
{ "ok": true }
```

Cookie sesi (`classquest_teacher_session`) di-set `httpOnly`, `sameSite=lax`,
`path=/`, `secure` hanya di production, `maxAge` 8 jam. Isinya token bertanda
tangan; token tidak pernah dikirim di body.

**Kegagalan:**

| Kondisi                                                 | Response            |
| ------------------------------------------------------- | ------------------- |
| Body bukan JSON, tanpa `code`, atau `code` bukan string | `400 INVALID_INPUT` |
| `code` kosong                                           | `401 UNAUTHORIZED`  |
| `code` salah                                            | `401 UNAUTHORIZED`  |
| `TEACHER_ACCESS_CODE`/secret belum diisi                | `401 UNAUTHORIZED`  |

Tiga baris `401` di atas memakai **pesan yang sama**. Klien tidak boleh bisa
membedakan "salah" dari "belum dikonfigurasi". Tidak ada kode akses, token, atau
secret di respons.

Catatan: **rate limit belum ada**; menyusul (lihat bagian Rate limit).

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

| Action           | Input                             | Output                                      |
| ---------------- | --------------------------------- | ------------------------------------------- |
| `saveStoryDraft` | `{ storyId, story, baseVersion }` | `SaveStoryResult` (lihat di bawah)          |
| `publishStory`   | `{ storyId, version }`            | `{ ok: true }` atau `{ ok: false, errors }` |
| `deleteStory`    | `{ storyId }`                     | `{ ok: true }`                              |
| `archiveStory`   | `{ storyId }`                     | `{ ok: true }`                              |
| `savePlayResult` | `{ storyId, result }`             | `{ ok: true }` (opsional)                   |

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
  { ok: true } | { ok: false; reason: "not_found" | "invalid" | "too_large" };
```

Aturan:

- **Skor dihitung server.** Klien tidak boleh mengirim field skor (`earnedPoints`, `correctCount`, dsb.); field tersebut ditolak (`invalid`). Server menghitung ulang skor via `scoreStory()` dari cerita versi terbit yang tersimpan.
- Jawaban divalidasi terhadap tantangan cerita: id tantangan atau opsi tidak dikenal, jawaban ganda, atau jumlah jawaban melebihi tantangan ditolak (`invalid`).
- Data yang disimpan hanya agregat di tabel `play_results` (tanpa data per-opsi, IP, user-agent, atau identitas siswa).

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

| Endpoint               | Batas awal                 |
| ---------------------- | -------------------------- |
| `POST /api/auth/login` | TBD (task 24)              |
| `POST /api/upload`     | 5 per 10 menit per sesi/IP |
| `GET /api/jobs/*`      | 60 per menit per sesi      |
| `GET /api/stories/*`   | 120 per menit per IP       |

Implementasi: `TBD` (in-memory untuk demo, Redis/DB untuk produksi).

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
