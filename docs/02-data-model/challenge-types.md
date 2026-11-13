---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Tipe Tantangan

Tantangan (`challenge`) adalah soal yang muncul **di dalam cerita**, bukan kuis
terpisah. Semua tipe memakai `ChallengeBase`:

> Bentuk yang mengikat ada di [`story.schema.json`](./story.schema.json)
> (`$defs.challengeBase` dan empat varian di bawahnya). Dokumen ini menjelaskan
> **alasannya**; kalau keduanya berbeda, schema yang menang dan dokumen ini yang
> diperbaiki.

```ts
type ChallengeBase = {
  id: string; // chl_[a-z0-9_]+
  type: ChallengeType;
  prompt: string; // 5..300 karakter
  conceptTag: string; // harus ada di source.concepts
  difficulty: 1 | 2 | 3;
  explanation: string; // 10..400 karakter, WAJIB
  hints?: string[]; // maks 2
  points?: number; // default 10
};
```

`explanation` wajib karena produk ini belajar, bukan hanya menilai. Penjelasan
ditampilkan setelah hasil final: saat jawaban benar atau di percobaan terakhir.
Untuk tantangan dengan `onWrong`, percobaan yang masih bisa diulang **tidak**
menampilkan penjelasan supaya soal ulang tetap bermakna — lihat
[`story-schema.md`](./story-schema.md#konsekuensi-jawaban-salah-opsional).

## Ringkasan

| Tipe              | Interaksi             | Kompleksitas | Prioritas |
| ----------------- | --------------------- | ------------ | --------- |
| `multiple_choice` | Pilih satu opsi       | Rendah       | MVP       |
| `true_false`      | Pilih Benar / Salah   | Rendah       | MVP       |
| `ordering`        | Susun urutan          | Sedang       | MVP       |
| `short_answer`    | Ketik jawaban singkat | Sedang       | MVP       |
| `matching`        | Pasangkan dua kolom   | Tinggi       | Backlog   |

## 1. `multiple_choice`

```ts
type MultipleChoiceChallenge = ChallengeBase & {
  type: "multiple_choice";
  options: { id: string; text: string }[]; // 2..5
  correctOptionId: string; // harus salah satu options[].id
};
```

Aturan:

- 2–5 opsi, tepat satu benar.
- `options[].id` unik di dalam tantangan (pola `opt_[a-z0-9_]+`).
- Panjang teks opsi ≤ 120 karakter.
- Pengecoh harus masuk akal dan berasal dari kesalahpahaman umum **yang berkaitan
  dengan materi**, bukan asal salah.

Penilaian: `selectedId === correctOptionId`.

Contoh:

```json
{
  "id": "chl_01_01",
  "type": "multiple_choice",
  "prompt": "Apa yang terjadi pada air genangan saat terkena panas matahari?",
  "conceptTag": "Evaporasi",
  "difficulty": 1,
  "explanation": "Panas matahari memberi energi pada air sehingga air berubah menjadi uap.",
  "points": 10,
  "options": [
    { "id": "opt_a", "text": "Menguap menjadi uap air" },
    { "id": "opt_b", "text": "Membeku menjadi es" },
    { "id": "opt_c", "text": "Berubah menjadi tanah" }
  ],
  "correctOptionId": "opt_a"
}
```

## 2. `true_false`

```ts
type TrueFalseChallenge = ChallengeBase & {
  type: "true_false";
  statement: string; // 5..240 karakter
  correctAnswer: boolean;
};
```

Aturan:

- `prompt` biasanya instruksi ("Tentukan benar atau salah pernyataan berikut."),
  `statement` adalah pernyataannya. Jangan menduplikasi teks.
- Jangan membuat pernyataan yang benar/salahnya ambigu tanpa konteks materi.
- Seimbangkan benar dan salah dalam satu cerita (jangan 6/6 semuanya benar).

Penilaian: `answer === correctAnswer`.

## 3. `ordering`

```ts
type OrderingChallenge = ChallengeBase & {
  type: "ordering";
  items: { id: string; text: string }[]; // 2..5, id berpola itm_[a-z0-9_]+
  correctOrder: string[]; // permutasi lengkap dari items[].id
};
```

Aturan:

- 2–5 item; `correctOrder` harus memuat **semua** id tepat satu kali.
- Tiap item ≤ 120 karakter.
- Urutan harus punya logika jelas (proses, kronologi, langkah), bukan selera.
- UI menampilkan item dalam urutan **teracak** (bukan urutan benar).

Penilaian: urutan persis sama (bukan "sebagian benar"). Untuk MVP, tidak ada
skor parsial; `explanation` menjelaskan urutan yang benar.

## 4. `short_answer`

```ts
type ShortAnswerChallenge = ChallengeBase & {
  type: "short_answer";
  acceptedAnswers: string[]; // 1..5
  caseSensitive?: boolean; // default false
};
```

Aturan:

- 1–5 jawaban diterima, masing-masing ≤ 60 karakter.
- Normalisasi sebelum membandingkan: `trim`, lowercase (kecuali
  `caseSensitive`), rapikan spasi ganda, buang tanda baca akhir.
- Sertakan variasi ejaan yang wajar (`infiltrasi`, `peresapan`, `perkolasi`).
- Jangan membuat jawaban yang butuh kalimat panjang.

Penilaian: jawaban ternormalisasi ada di `acceptedAnswers` ternormalisasi.

> **Batasan:** `short_answer` sulit dinilai adil. Untuk MVP, jangan jadikan satu-
> satunya tantangan di sebuah chapter; selalu dampingi dengan tipe pilihan.

## Bentuk `ConceptTag` dan kesulitan

- `conceptTag` **wajib** salah satu dari `source.concepts`. Ini yang membuat
  ringkasan hasil bisa berkata "kamu perlu mengulang: Kondensasi".
- Bukan `conceptTag` yang mengelompokkan chapter; chapter punya `concept` sendiri.
  Tantangan di chapter X sebaiknya memakai `concept` chapter X, tapi boleh
  mengulang konsep chapter sebelumnya (untuk review).
- `difficulty`: 1 = ingat/kenali, 2 = paham/hubungkan, 3 = terapkan/analisis.
  Dalam satu chapter, jangan semua level 3.

## Penilaian dan skor

Satu fungsi murni di `src/story/scoring.ts`:

```ts
export type Answer =
  | { challengeId: string; type: "multiple_choice"; selectedId: string }
  | { challengeId: string; type: "true_false"; answer: boolean }
  | { challengeId: string; type: "ordering"; order: string[] }
  | { challengeId: string; type: "short_answer"; text: string };

export function isCorrect(challenge: Challenge, answer: Answer): boolean;
export function scoreStory(story: Story, answers: Answer[]): PlayResult;
```

Aturan skor (MVP):

- Benar: `points` (default 10). Salah: 0.
- Tidak ada pengurangan untuk mencoba lagi.
- `PlayResult` memuat `totalPoints`, `earnedPoints`, `correctCount`,
  `totalChallenges`, dan `weakConcepts` (dari `conceptTag` yang salah).
- Fungsi ini **tidak** mengakses React, DB, atau `localStorage`.

## Panduan menulis tantangan yang baik

1. Jawabannya harus bisa ditemukan dari cerita atau materi — bukan tebakan.
2. Satu tantangan = satu konsep. Jangan menggabungkan dua ide.
3. `explanation` menjelaskan **mengapa**, bukan mengulang jawaban.
4. Pengecoh mencerminkan miskonsepsi nyata.
5. Bahasa mengikuti `meta.language`, kalimat pendek, tanpa idiom rumit.
6. Jangan memakai "semua jawaban di atas benar" atau opsi lelucon.

## Yang tidak didukung (sampai ada ADR)

- Skor parsial untuk `ordering`.
- Batas waktu per soal.
- Tantangan bergantung pada jawaban sebelumnya (percabangan).
- Gambar di dalam soal.
- Menyimpan jawaban siswa di server per opsi.
