---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Validasi dan Repair

Tujuan bagian ini: **tidak ada output AI yang sampai ke siswa tanpa lolos
validasi**, dan **tidak ada demo yang berakhir dengan layar error**.

- Validator: `src/story/validate.ts` (lihat
  [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md))
- Orkestrasi: `src/ai/pipeline.ts`

## Alur keputusan

```text
        ┌──────────────┐
        │  GENERATE    │
        └──────┬───────┘
               ▼
        ┌──────────────┐   ok    ┌──────────────┐
        │  VALIDATE    ├────────>│    SIMPAN    │
        └──────┬───────┘         └──────────────┘
               │ errors
               ▼
        ┌──────────────┐
        │ REPAIR (1/2) │
        └──────┬───────┘
               ▼
        ┌──────────────┐   ok    ┌──────────────┐
        │  VALIDATE    ├────────>│    SIMPAN    │
        └──────┬───────┘         └──────────────┘
               │ errors
               ▼
        ┌──────────────┐
        │ REPAIR (2/2) │
        └──────┬───────┘
               ▼
        ┌──────────────┐   ok    ┌──────────────┐
        │  VALIDATE    ├────────>│    SIMPAN    │
        └──────┬───────┘         └──────────────┘
               │ errors
               ▼
        ┌──────────────┐
        │   FALLBACK   │  → simpan + tandai usedFallback
        └──────────────┘
```

Diagram di atas menggambarkan **satu putaran pemeriksaan**, bukan seluruh cerita.
Di pipeline nyata, putaran itu terjadi dua tingkat:

1. **Per chapter** — `validateChapter(draft, { outline, planned })` setelah tiap
   panggilan generate. Ini memeriksa scene/beat, id, `speakerId`, `challengeId`,
   dan batas teks untuk chapter itu saja.
2. **Sekali di akhir** — `validateStory(story)` setelah semua chapter digabung.
   Ini yang memeriksa aturan tingkat cerita (3–6 chapter, `assetUsage`).

Jangan memanggil `validateStory` di tengah loop: ceritanya belum lengkap, jadi
hasilnya selalu gagal `E_CHAPTER_COUNT` dan seluruh generasi jatuh ke fallback.
Kode lengkapnya di [`pipeline.md`](./pipeline.md#pseudocode).

## Isi permintaan repair

Kirim **hanya error**, bukan warning. Maksimal 20 error; sisanya diringkas
menjadi "dan N error serupa lainnya".

```text
Perbaiki JSON berikut. Jangan mengubah bagian yang tidak dilaporkan.
Jangan menambah fakta baru. Kembalikan JSON lengkap yang valid.

ERRORS
1. path: chapters[0].scenes[1].beats[2].text
   code: E_TEXT_TOO_LONG
   message: Teks 312 karakter, maksimal 240.
   hint: Pendekkan kalimat tanpa menghilangkan fakta.
2. path: chapters[1].backgroundId
   code: E_UNKNOWN_ASSET
   message: "bg_lab" tidak ada di manifest.
   hint: Pilih dari BACKGROUNDS yang tersedia.

DRAFT
{ ...json lengkap... }
```

Aturan:

- Suhu rendah (0.2), `responseFormat: json`.
- Jangan pernah mengirim seluruh percakapan sebelumnya; cukup draft + error.
- Jangan meminta model "memperbaiki semua masalah sekaligus" — spesifik per path.
- Kalau error struktural (JSON tidak bisa diparse), minta generate ulang chapter
  itu, bukan repair.

## Klasifikasi kegagalan

| Jenis                     | Bisa repair? | Tindakan                           |
| ------------------------- | ------------ | ---------------------------------- |
| JSON tidak bisa diparse   | Tidak        | Generate ulang chapter (1x)        |
| Field wajib hilang        | Ya           | Repair                             |
| Teks terlalu panjang      | Ya           | Repair                             |
| Id aset tidak dikenal     | Ya           | Repair                             |
| Speaker tidak dikenal     | Ya           | Repair                             |
| Chapter tanpa tantangan   | Ya           | Repair                             |
| Tantangan yatim           | Ya           | Repair                             |
| Tidak ada teks dari PDF   | Tidak        | Job `failed`, minta guru ganti PDF |
| Timeout provider          | Tidak        | Retry jaringan, lalu fallback      |
| Provider menolak (safety) | Tidak        | Fallback + catat alasan            |

## Anggaran

| Parameter                  | Nilai | Alasan                                                              |
| -------------------------- | ----- | ------------------------------------------------------------------- |
| Repair per **cerita**      | 2     | Cukup untuk error mekanis, tidak boros                              |
| Generate ulang per chapter | 1     | Untuk kasus JSON rusak; memakai jatah cadangan                      |
| Total panggilan LLM        | 12    | 1 outline + 1 perbaikan outline + 6 chapter + 2 repair + 2 cadangan |
| Timeout satu panggilan     | 60 s  | Pagar, bukan target                                                 |
| Anggaran waktu total       | 120 s | Deadline demo; lewat ini → fallback                                 |
| Output token per panggilan | 4.000 | Cukup untuk 1 chapter                                               |

Kalau anggaran habis → fallback. Jangan terus mencoba.

Dua hal yang mudah salah dibaca:

- **Repair dihitung per cerita, bukan per chapter.** Dua repair berarti dua
  panggilan tambahan untuk seluruh cerita. Kalau satu chapter butuh tiga kali
  perbaikan, itu sudah melewati anggaran dan hasilnya fallback.
- **12 panggilan adalah batas atas yang dihitung, bukan rata-rata.** Cerita 3
  chapter yang lolos sekali jalan hanya memakai 4 panggilan (1 outline + 3
  chapter). Sisa jatah tidak dipakai asal-asalan.

## Fallback

```ts
export function buildFallbackStory(input: {
  meta: StoryMetaInput;
  concepts: string[];
  castSeed: { id: string; name: string; role: CharacterRole }[];
  reason: string;
}): Story;
```

Karakteristik fallback:

- **Deterministik.** Input sama → output sama. Tidak memanggil AI.
- **Valid.** Lolos validator, dites di CI.
- **Memakai konsep materi.** Minimal 3 chapter, tiap chapter satu konsep, tiap
  chapter satu tantangan sederhana.
- **Memakai aset default yang ada.**
- **Jujur.** Guru melihat banner bahwa ini cerita cadangan.

Fallback bukan "cerita sampah": ia harus tetap bisa didemokan. Luangkan waktu
membuatnya layak.

## Telemetri (ringan)

Simpan per generasi:

```ts
type GenerationLog = {
  storyId: string;
  promptVersion: string;
  model: string;
  outlineAttempts: number;
  chapterAttempts: { chapterId: string; generate: number; repair: number }[];
  validationErrors: { code: string; count: number }[];
  usedFallback: boolean;
  fallbackReason?: string;
  tokenUsage: { input: number; output: number };
  durationMs: number;
};
```

Tanpa telemetri, mustahil tahu apakah kegagalan berasal dari prompt, model, atau
materi.

## Yang dilihat guru

| Kondisi               | UI                                                                    |
| --------------------- | --------------------------------------------------------------------- |
| Sukses                | "Cerita siap direview" + jumlah chapter & tantangan                   |
| Sukses setelah repair | Sama, tanpa menyebut repair (detail teknis tidak relevan)             |
| Fallback              | Banner kuning: "Kami memakai cerita cadangan. Kamu bisa mengeditnya." |
| Gagal total           | Error dengan langkah berikutnya: "Coba PDF lain atau kurangi halaman" |

Jangan pernah menampilkan JSON error, stack trace, atau nama model ke guru.

## Test

| Test                                 | Cara                                     |
| ------------------------------------ | ---------------------------------------- |
| Repair dipanggil saat ada error      | Mock provider, draft rusak               |
| Repair berhenti setelah 2 percobaan  | Mock provider selalu mengembalikan rusak |
| Fallback dipakai saat anggaran habis | Mock provider timeout                    |
| Fallback lolos validator             | Test langsung                            |
| Error tidak bocor ke UI              | Test komponen                            |
| Telemetri mencatat `usedFallback`    | Test pipeline                            |

Test **tidak** memanggil LLM nyata. Semua lewat mock/fixture.
