---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Aturan Validasi

Validator adalah penjaga kontrak. Output AI tidak pernah langsung disimpan; ia
harus lolos validasi dulu. Implementasi: `src/story/validate.ts`.

## Satu definisi bentuk

Lapis struktural **tidak** menulis ulang bentuk cerita. Sumbernya satu:
[`story.schema.json`](./story.schema.json). Validator memuatnya, dan prompt
builder boleh mengirimkannya langsung ke provider yang mendukung structured
output. Artinya aturan di dokumen ini dan bentuk di schema tidak bisa berbeda
tanpa ada yang gagal lebih dulu.

Lapis semantik tetap ditulis tangan, karena isinya bukan soal bentuk: referensi
yang menggantung, aset yang tidak ada, cakupan konsep.

## Dua lapis

| Lapis          | Memeriksa                                                    | Bisa diperbaiki AI? |
| -------------- | ------------------------------------------------------------ | ------------------- |
| **Struktural** | Bentuk JSON, tipe field, field wajib, pola id, batas panjang | Ya                  |
| **Semantik**   | Referensi, konsistensi, cakupan materi, keberadaan aset      | Ya                  |

Kalau lapis struktural gagal, jangan lanjut ke semantik — error-nya akan menumpuk
dan membingungkan repair.

## Bentuk hasil

```ts
type ValidationIssue = {
  code: string; // E_* atau W_*
  severity: "error" | "warning";
  path: string; // mis. "chapters[0].scenes[1].beats[2].text"
  message: string; // bahasa manusia, siap ditampilkan ke guru
  hint?: string; // instruksi singkat untuk repair prompt
};

type ValidationResult = {
  ok: boolean; // true bila tidak ada error
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};
```

- `errors` memblokir simpan/publish.
- `warnings` tidak memblokir, tapi ditampilkan di editor.
- `message` untuk guru (bahasa Indonesia, tanpa istilah kode).
- `hint` untuk AI (spesifik, menyebut path dan tindakan).

## Urutan pemeriksaan

1. Parse JSON (kalau dari LLM, bisa saja bukan JSON).
2. Schema struktural (`story.schema.json`, dijalankan dengan Ajv) — berhenti bila gagal.
3. `schemaVersion` didukung.
4. Keunikan id.
5. Jumlah chapter/scene/beat.
6. Referensi: speaker, challenge, aset, konsep.
7. Aturan per tipe tantangan.
8. Batas panjang teks.
9. Konsistensi `assetUsage`.
10. Warning gaya/penyebaran.

## Kode error

### Struktural

| Kode               | Arti                            | Contoh pesan ke guru                                    |
| ------------------ | ------------------------------- | ------------------------------------------------------- |
| `E_JSON_PARSE`     | Output bukan JSON valid         | "Hasil AI tidak bisa dibaca. Coba buat ulang."          |
| `E_SCHEMA`         | Gagal schema (tipe/field wajib) | "Struktur cerita tidak lengkap pada bagian X."          |
| `E_SCHEMA_VERSION` | `schemaVersion` tidak didukung  | "Cerita dibuat dengan versi format yang tidak dikenal." |
| `E_MISSING_FIELD`  | Field wajib kosong              | "Bagian X belum diisi."                                 |

### Semantik — struktur cerita

| Kode                     | Arti                                        | Hint untuk AI                                                        |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| `E_DUPLICATE_ID`         | Ada id yang sama                            | "Id `{id}` dipakai lebih dari sekali; buat unik."                    |
| `E_CHAPTER_COUNT`        | Chapter di luar 3–6                         | "Hasilkan tepat 3–6 chapter."                                        |
| `E_SCENE_COUNT`          | Scene per chapter di luar 2–6               | "Chapter `{id}` harus punya 2–6 scene."                              |
| `E_BEAT_COUNT`           | Beat per scene di luar 3–10                 | "Scene `{id}` harus punya 3–10 beat."                                |
| `E_CHAPTER_NO_CHALLENGE` | Chapter tanpa beat tantangan                | "Tambahkan minimal satu beat `challenge` di chapter `{id}`."         |
| `E_ORPHAN_CHALLENGE`     | Tantangan dideklarasikan tapi tidak dirujuk | "Tantangan `{id}` tidak dipakai; rujuk dari sebuah beat atau hapus." |
| `E_DANGLING_CHALLENGE`   | Beat merujuk tantangan yang tidak ada       | "`challengeId` `{id}` tidak ada di daftar challenges."               |
| `E_TRANSITION_LAST`      | Beat terakhir adalah `transition`           | "Hapus transition di akhir scene `{id}`."                            |

### Semantik — referensi

| Kode                     | Arti                                       | Hint untuk AI                                               |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| `E_UNKNOWN_ASSET`        | `assetId` tidak ada di manifest            | "`{id}` bukan aset yang tersedia. Pilih dari daftar."       |
| `E_UNKNOWN_SPEAKER`      | `speakerId` tidak ada di cast              | "`{id}` tidak ada di cast."                                 |
| `E_UNKNOWN_CONCEPT`      | `concept`/`conceptTag` tidak ada di source | "`{concept}` tidak ada di `source.concepts`."               |
| `E_ASSET_USAGE_MISMATCH` | `assetUsage` tidak cocok dengan isi cerita | "Perbarui `assetUsage` agar sama dengan aset yang dipakai." |

### Semantik — cast dan tantangan

| Kode                        | Arti                                           | Hint untuk AI                                          |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `E_CAST_COUNT`              | Cast di luar 2–10                              | "Gunakan 2–10 karakter."                               |
| `E_PLAYER_COUNT`            | Bukan tepat satu `role: "player"`              | "Tandai tepat satu karakter sebagai `player`."         |
| `E_NO_MENTOR`               | Tidak ada mentor                               | "Tambahkan satu karakter `mentor`."                    |
| `E_OPTION_COUNT`            | Opsi di luar 2–5                               | "Tantangan `{id}` harus punya 2–5 opsi."               |
| `E_CORRECT_OPTION`          | `correctOptionId` bukan salah satu opsi        | "`correctOptionId` harus salah satu `options[].id`."   |
| `E_ORDER_PERMUTATION`       | `correctOrder` bukan permutasi lengkap `items` | "`correctOrder` harus memuat semua item tepat sekali." |
| `E_EMPTY_ANSWERS`           | `acceptedAnswers` kosong                       | "Isi minimal satu jawaban yang diterima."              |
| `E_DUPLICATE_CHALLENGE_REF` | Satu tantangan dirujuk lebih dari sekali       | "Rujuk tantangan `{id}` hanya sekali."                 |

### Semantik — konsekuensi jawaban salah

Semua field di bawah ini opsional. Aturan hanya berlaku bila field dipakai.

| Kode                | Arti                                         | Hint untuk AI                                                       |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `E_RETRY_COUNT`     | `retryQuestions` ≠ `maxAttempts` − 1         | "Isi `retryQuestions` tepat `maxAttempts` − 1 entri."               |
| `E_FLAG_UNDECLARED` | Flag dipakai tanpa dideklarasikan di `flags` | "Tambahkan flag `{id}` ke `flags` atau ganti dengan flag yang ada." |
| `E_DETOUR_TOO_LONG` | `onWrong.detour` lebih dari 3 beat           | "Pendekkan detour menjadi maksimal 3 beat narasi/dialog."           |

`maxAttempts` default 1, jadi tantangan tanpa `onWrong` tidak butuh
`retryQuestions`. Retry hanya mengganti teks soal; opsi dan jawaban benar tidak
berubah. Tantangan di dalam `detour` ditolak lapis struktural (`E_SCHEMA`)
karena schema hanya mengizinkan beat `narration`/`dialogue` di sana.

### Batas teks

| Kode              | Field                             | Maks  |
| ----------------- | --------------------------------- | ----- |
| `E_TEXT_TOO_LONG` | `beats[].text`                    | 240   |
| `E_TEXT_TOO_LONG` | `meta.title`                      | 80    |
| `E_TEXT_TOO_LONG` | `meta.synopsis`                   | 400   |
| `E_TEXT_TOO_LONG` | `chapters[].summary`              | 240   |
| `E_TEXT_TOO_LONG` | `challenges[].prompt`             | 300   |
| `E_TEXT_TOO_LONG` | `challenges[].explanation`        | 400   |
| `E_TEXT_TOO_LONG` | `options[].text` / `items[].text` | 120   |
| `E_TEXT_TOO_LONG` | `acceptedAnswers[]`               | 60    |
| `E_TEXT_TOO_LONG` | `hints[]`                         | 140   |
| `E_TEXT_TOO_LONG` | `textVariants[].text`             | 240   |
| `E_TEXT_TOO_LONG` | `onWrong.detour[].text`           | 240   |
| `E_TEXT_TOO_LONG` | `retryQuestions[]`                | 300   |
| `E_TEXT_EMPTY`    | Semua field teks wajib            | min 1 |

Batas ini bukan selera: textbox game hanya muat ~180 karakter per halaman pada
resolusi 640×360 dengan teks 14 px. Beat yang lebih panjang ditampilkan
sebagai dua halaman, dan batas keras 240 karakter memastikan tidak pernah lebih
dari itu (lihat [`../04-game/scene-format.md`](../04-game/scene-format.md#peta-visual)).

## Kode warning

| Kode                       | Arti                                          | Tindakan guru               |
| -------------------------- | --------------------------------------------- | --------------------------- |
| `W_CONCEPT_NOT_IN_CHAPTER` | Tantangan memakai konsep di luar chapter-nya  | Boleh, untuk review         |
| `W_NO_CHALLENGE_IN_SCENE`  | Scene tanpa tantangan (maks 3 scene berturut) | Pertimbangkan menambah      |
| `W_DIFFICULTY_SKEW`        | Semua tantangan level 1 atau semua level 3    | Seimbangkan                 |
| `W_TRUE_FALSE_BIAS`        | > 70% jawaban benar (atau salah)              | Seimbangkan                 |
| `W_SHORT_ANSWER_ONLY`      | Chapter hanya punya `short_answer`            | Tambah tipe pilihan         |
| `W_LONG_DIALOGUE_RUN`      | > 6 beat dialog/narasi tanpa interaksi        | Pecah atau tambah challenge |
| `W_GAP_RECORDED`           | `source.gaps` tidak kosong                    | Cek materi                  |

## Kebijakan repair

```text
generate → validate
   ok?  → simpan
   no?  → repair (maks 2x)
            → validate
               ok?  → simpan
               no?  → fallback story + tandai "fallback"
```

Aturan repair:

1. Kirim **hanya error**, jangan warning.
2. Maksimal 20 error per percobaan (sisanya diringkas).
3. Sertakan `path` + `hint` agar model tahu persis bagian mana.
4. Minta model mengembalikan **JSON lengkap**, bukan diff.
5. Suhu rendah (deterministik) untuk repair.
6. Jangan pernah "memperbaiki" dengan menambah fakta baru.

Kalau setelah 2 percobaan masih gagal, **jangan tampilkan error mentah ke guru**.
Gunakan fallback dan tampilkan banner: "Kami memakai cerita cadangan karena materi
ini sulit diproses. Kamu tetap bisa mengeditnya."

## Yang boleh dinormalisasi otomatis

Aman dilakukan tanpa bertanya:

- `trim` spasi di awal/akhir teks.
- Menggabung spasi ganda.
- Membuang karakter kontrol.
- Mengisi `points` dengan default 10.
- Mengurutkan `assetUsage` dan membuang duplikat.

**Tidak boleh** dinormalisasi otomatis:

- Mengganti aset yang tidak ada dengan aset lain (bisa mengubah makna).
- Memotong teks yang terlalu panjang (bisa menghilangkan fakta).
- Menambah/menghapus tantangan.
- Mengubah jawaban benar.

## Test yang wajib ada

| Test                                      | Fixture                            |
| ----------------------------------------- | ---------------------------------- |
| Cerita contoh lolos tanpa error           | `story.example.json`               |
| Setiap kode `E_*` punya minimal satu test | fixture rusak per kode             |
| Warning tidak membuat `ok: false`         | fixture dengan warning             |
| Pesan error menyebut `path` yang benar    | fixture dengan error terlokalisasi |
| Id aset dari manifest selalu diterima     | manifest                           |
| Id aset karangan selalu ditolak           | `bg_tidak_ada`                     |

Fixture rusak diletakkan di `src/story/__fixtures__/` dengan nama sesuai kode
error, mis. `unknown-asset.json`.
