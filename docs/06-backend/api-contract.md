---
status: draft
last_reviewed: 2026-11-08
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

| Kode             | HTTP | Arti                            |
| ---------------- | ---- | ------------------------------- |
| `UNAUTHORIZED`   | 401  | Tidak ada/kedaluwarsa sesi guru |
| `FORBIDDEN`      | 403  | Bukan pemilik cerita            |
| `NOT_FOUND`      | 404  | Cerita/job tidak ada            |
| `FILE_MISSING`   | 400  | Tidak ada file di form          |
| `FILE_TOO_LARGE` | 413  | Melebihi batas                  |
| `FILE_TYPE`      | 415  | Bukan PDF                       |
| `PDF_UNREADABLE` | 422  | PDF rusak/terenkripsi           |
| `NO_TEXT_LAYER`  | 422  | PDF scan, tidak ada teks        |
| `TOO_MANY_PAGES` | 422  | Melebihi batas halaman          |
| `RATE_LIMITED`   | 429  | Terlalu banyak permintaan       |
| `INTERNAL`       | 500  | Kesalahan tak terduga           |

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
- Hanya pemilik (guru) yang bisa melihat.
- `stage` ∈ `queued | extracting | outlining | generating | validating | repairing | saving | done | failed`.
- `progress` hanya salah satu dari `5, 15, 30, 55, 75, 90, 100` (lihat
  [`jobs-and-limits.md`](./jobs-and-limits.md#progress)). Jangan mengirim angka
  bebas.
- **Bentuk wire vs kolom DB.** Di JSON, error selalu bersarang:
  `error: { code, message }`. Di database, ia satu kolom `error_code` (dan
  `error_message` bila perlu). Nama field JSON **tidak** harus sama dengan nama
  kolom; yang mengikat adalah bentuk JSON di dokumen ini.

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

---

## Versi API

Tidak ada versioning URL di MVP. Kalau perlu perubahan breaking, tambahkan field
baru dan pertahankan yang lama selama satu iterasi. Jangan mengubah arti field
yang sudah ada.

## Rate limit

| Endpoint             | Batas awal                 |
| -------------------- | -------------------------- |
| `POST /api/upload`   | 5 per 10 menit per sesi/IP |
| `GET /api/jobs/*`    | 60 per menit per sesi      |
| `GET /api/stories/*` | 120 per menit per IP       |

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
