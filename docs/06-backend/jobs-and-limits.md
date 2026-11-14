---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Job dan Batas

## Kenapa butuh job

Generasi cerita memakan 30–240 detik. Itu terlalu lama untuk satu request HTTP
yang ditunggu browser, dan rawan timeout di platform serverless.

Karena itu: **respons cepat (`202`), pekerjaan berjalan terpisah, UI polling.**

## Pilihan eksekusi

| Pendekatan                       | Cara                                       | Cocok untuk                   |
| -------------------------------- | ------------------------------------------ | ----------------------------- |
| **`after()` dari `next/server`** | Jalankan pipeline setelah respons terkirim | MVP / demo                    |
| Queue + worker terpisah          | BullMQ/Cloudflare Queues + worker          | Produksi                      |
| Proses sinkron di route handler  | Tunggu sampai selesai                      | Hanya lokal, jangan di deploy |

**Rekomendasi MVP:** `after()`.

```ts
// src/app/api/upload/route.ts
import { after } from "next/server";

export async function POST(req: Request) {
  const { storyId, jobId } = await createStoryFromUpload(req);

  after(async () => {
    await runGenerationJob({ storyId, jobId });
  });

  return Response.json({ storyId, jobId, status: "queued" }, { status: 202 });
}
```

Batasan yang harus disadari:

- `after()` berjalan di instance yang sama; kalau platform mematikan instance,
  job bisa terputus.
- Tidak ada retry otomatis.
- Tidak ada jaminan urutan.

Karena itu:

- Setiap tahap menulis status ke DB, sehingga job bisa **dilanjutkan** atau
  ditandai `failed` dengan jelas.
- Sediakan tombol "coba lagi" yang membuat job baru.
- Untuk produksi, ganti dengan queue tanpa mengubah kontrak API.

## Siklus job

```text
queued → extracting → outlining → generating → validating → repairing → saving → done
                                                                             ↘ failed
```

Aturan update:

- Update `stage` + `progress` di setiap peralihan.
- `progress` kasar: 5, 15, 30, 55, 75, 90, 100.
- Jangan menulis progres setiap beat (boros); cukup per chapter.
- `finished_at` diisi saat `done`/`failed`.
- `failed` wajib punya `error_code`.
- **`done` hanya ditulis setelah versi cerita tersimpan.** Pipeline memancarkan
  `done` lebih awal (sebelum `story_versions` ditulis); runner mengabaikan
  pancaran itu dan menulis `done` sendiri di akhir. Kalau tidak, UI berhenti
  polling dan me-refresh halaman saat cerita masih `processing`.
- **Update progres berurutan dan monoton.** Tulisan tahap diantrekan satu per
  satu, dan SQL-nya menolak tahap yang lebih rendah dari progres saat ini serta
  menolak menimpa `done`/`failed`. Tanpa itu, request `validating` yang datang
  terlambat bisa menimpa `done` dan kartu progres berhenti di "Memeriksa hasil"
  walaupun cerita sudah tersimpan.

### Progress

`progress` hanya boleh salah satu dari nilai ini. Angka bebas membuat UI terlihat
melompat-lompat dan menyulitkan tes.

| `stage`      | `progress` |
| ------------ | ---------- |
| `queued`     | 5          |
| `extracting` | 15         |
| `outlining`  | 30         |
| `generating` | 55         |
| `validating` | 75         |
| `repairing`  | 75         |
| `saving`     | 90         |
| `done`       | 100        |
| `failed`     | 100        |

`generating` sengaja 55 (bukan 45) karena di situlah porsi waktu terbesar: satu
panggilan per chapter. Kalau kamu mengubah pemetaan ini, ubah juga
[`api-contract.md`](./api-contract.md) — keduanya harus sama.

## Batas (limit)

Nilai awal; ubah hanya dengan memperbarui dokumen ini.

### Upload

| Batas                    | Nilai    | Alasan                   |
| ------------------------ | -------- | ------------------------ |
| Ukuran file              | 4 MB     | Batas body Vercel 4,5 MB |
| Jumlah halaman           | 40       | Batas absolut parser     |
| Halaman yang diproses    | 15       | Kendali biaya & waktu    |
| Karakter materi ke model | 30.000   | Konteks + biaya          |
| Upload per IP            | 20/jam   | Anti penyalahgunaan      |
| Upload per guru          | 10/jam   | Kuota tiap akun          |
| Upload global            | 100/hari | Pelindung biaya AI       |

### Generasi

| Batas                      | Nilai | Catatan                                             |
| -------------------------- | ----- | --------------------------------------------------- |
| Chapter                    | 3–6   | Schema menolak di luar ini                          |
| Scene per chapter          | 2–6   |                                                     |
| Beat per scene             | 3–10  |                                                     |
| Tantangan total            | 3–18  | Target, bukan aturan validator; lihat catatan       |
| Panggilan LLM per cerita   | 18    | Anggaran keras, termasuk repair dan cadangan        |
| Repair per **chapter**     | 2     | Bukan per cerita                                    |
| Repair per **cerita**      | 2     | Untuk error setelah semua chapter digabung          |
| Timeout satu panggilan LLM | 60 s  | Satu panggilan yang lewat ini dianggap gagal        |
| Anggaran waktu total       | 240 s | Deadline; lewat ini berhenti memanggil dan fallback |
| Output token per panggilan | 8.000 | Cukup untuk reasoning + 1 chapter (ADR 0018)        |

Dua baris tengah sering disalahpahami, jadi dinyatakan eksplisit:

- **60 s bukan target, tapi pagar.** Satu panggilan yang menggantung lebih dari 60
  detik dibatalkan.
- **240 s adalah deadline keseluruhan.** Sebelum memulai panggilan baru, pipeline
  mengecek sisa waktu. Kalau sisa < 30 detik, ia **tidak** memulai panggilan baru
  dan langsung memakai fallback. Jadi waktu nyata terburuk ≈ 240 + 60 = 300 detik.
  Angka ini dinaikkan dari 120 oleh
  [ADR 0017](../09-decisions/0017-anggaran-pipeline-per-unit.md).
- **18 panggilan** = 1 outline + 1 perbaikan outline + 6 chapter + 6 repair
  chapter + 2 repair cerita + 2 cadangan. Generate ulang chapter (untuk JSON rusak)
  memakai jatah cadangan itu, bukan jatah tambahan. Repair dihitung per chapter
  karena model nyata menghasilkan satu error mekanis per chapter.

Tantangan total 3–18 adalah **target**, bukan aturan yang ditegakkan validator
(tidak ada kode `E_*` untuk total tantangan). Angkanya diturunkan dari pola sehat
di [`../03-ai-pipeline/generation-rules.md`](../03-ai-pipeline/generation-rules.md#aturan-per-beat):
kira-kira 1 tantangan per scene, dan 2–6 scene per chapter. Yang benar-benar
mengikat hanya dua aturan: **tiap chapter minimal 1 beat `challenge`**
(`E_CHAPTER_NO_CHALLENGE`) dan **tiap tantangan dirujuk tepat sekali**.

### Permintaan

| Endpoint             | Batas             |
| -------------------- | ----------------- |
| `GET /api/jobs/*`    | 60/menit per sesi |
| `GET /api/stories/*` | 120/menit per IP  |
| Server Actions       | 30/menit per sesi |

## Perilaku saat batas terlampaui

| Batas                  | Perilaku                                            |
| ---------------------- | --------------------------------------------------- |
| Ukuran file            | Tolak sebelum file dibaca; `413` + batas yang jelas |
| Halaman > 40           | Tolak; minta guru memilih bagian materi             |
| Halaman > 15 (≤ 40)    | Proses 15 halaman pertama + catat `source.gaps`     |
| Karakter > 30.000      | Potong, catat `gaps`, beri tahu guru di UI          |
| Waktu generasi > 240 s | Fallback + tandai alasan                            |
| Rate limit             | `429` + `retryAfterSec`                             |

## Idempotensi dan konkurensi

- Upload dengan file + metadata sama dalam 60 detik → kembalikan job yang sama
  (opsional, gunakan hash file).
- Satu story hanya boleh punya **satu job aktif**. Kalau ada job `queued`/
  `generating`, upload ulang untuk story itu ditolak dengan `409` (atau
  mengembalikan job aktif).
- Publish dan edit tidak memakai job.

## Pemantauan

Minimal yang dicatat:

- Jumlah job per status per hari.
- Durasi rata-rata per tahap.
- Tingkat fallback.
- Kode error terbanyak.

Cukup tabel `jobs.log` (JSON) di MVP; tidak perlu sistem observabilitas penuh.
Saat fallback, `runJob()` mengisi kolom itu dengan
`{promptVersion, fallbackReason, llmCalls, repairs, durationMs, diagnostics}`.
`diagnostics` hanya berisi kode + path validasi (mis.
`"E_DUPLICATE_ID challenges[3].id"`), tanpa teks materi atau isi cerita.

## Checklist implementasi

- [ ] Upload merespons `202` dengan `jobId`.
- [ ] Pipeline berjalan di `after()`.
- [ ] Setiap tahap menulis status.
- [ ] `failed` selalu punya `error_code`.
- [ ] UI berhenti polling saat `done`/`failed`.
- [ ] Ada batas waktu total dan fallback.
- [ ] Satu story hanya punya satu job aktif.
- [ ] Batas di dokumen ini sama dengan konstanta di kode.
