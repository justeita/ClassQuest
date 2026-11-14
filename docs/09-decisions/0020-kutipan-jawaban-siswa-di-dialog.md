---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0020 — Kutipan jawaban siswa di dialog setelah tantangan

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0019](0019-branching-konsekuensi-jawaban-salah.md)

## Konteks

[ADR 0019](0019-branching-konsekuensi-jawaban-salah.md) memberi cerita reaksi
otomatis terhadap jawaban salah: `onWrong` (`setFlags`, `retryQuestions`,
`detour`) dan `textVariants` pada beat `dialogue`. Fitur itu sudah berjalan,
tetapi ada dua celah yang terasa langsung saat dimainkan:

1. **Flag hanya menyala bila masih ada percobaan ulang.** `BranchingRun.grade()`
   berhenti lebih awal pada jawaban salah terakhir, jadi `setFlags` tidak pernah
   dijalankan. Dialog setelah soal yang dijawab salah pada percobaan terakhir
   tetap memakai kalimat yang menganggap jawabannya benar ("Tepat!", "Benar,
   sembilan cangkir..."). Itu justru kasus yang paling sering terjadi pada
   tantangan `maxAttempts: 1`.
2. **Teks dialog tidak bisa menyebut jawaban siswa.** `textVariants` memilih
   kalimat alternatif, tetapi kalimatnya statis. Penulis cerita tidak bisa
   menulis "Kau menjawab _empat cangkir_" karena isi jawaban baru diketahui saat
   dimainkan.

Akibatnya cerita terasa "memaksa benar": siswa melihat overlay "Salah", lalu
tokoh di cerita memuji jawaban yang tidak pernah ia berikan. Untuk game belajar,
pengakuan salah yang jujur lebih penting daripada alur yang mulus.

Batasan yang sama seperti ADR 0019 masih berlaku: sisa waktu hackathon, tim
kecil, tidak ada editor alur, dan engine hanya membaca satu bentuk `Story`.
Karena itu solusinya harus **aditif** dan tidak boleh menambah versi schema.

## Opsi

| Opsi                                           | Kelebihan                                                                                                | Kekurangan                                                                 | Biaya |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| A. Placeholder `{{jawaban}}` + varian flag     | Tetap di kontrak v1.0; kalimat ditulis penulis cerita; bisa dipakai di detour maupun dialog setelah soal | Butuh token baru, aturan validator, dan disiplin penulis soal              | 0     |
| B. Echo otomatis dari engine                   | Nol perubahan kontrak; semua cerita langsung mendapat reaksi                                             | Kalimat seragam milik engine, bukan suara tokoh; sulit dilokalkan          | 0     |
| C. Varian flag saja, tanpa mengutip jawaban    | Paling murah                                                                                             | Tidak memenuhi permintaan: siswa tetap tidak melihat jawabannya diucapkan  | 0     |
| D. Kondisi baru `when: { jawabanSalah: true }` | Semantik paling tepat (menempel pada tantangan terakhir)                                                 | Menambah bentuk `textVariants` dan tipe kondisi baru di schema + validator | > 0   |

## Keputusan

**Kami memilih A**, dengan dua aturan pendukung:

1. **`{{jawaban}}`** — token teks yang diganti saat runtime dengan jawaban salah
   **terakhir** siswa, dalam bentuk yang bisa dibaca:
   - `multiple_choice` → teks opsi yang dipilih,
   - `true_false` → `Benar` / `Salah`,
   - `ordering` → teks item sesuai urutan yang disusun siswa, dipisah `→`,
   - `short_answer` → teks yang diketik siswa (spasi dirapikan).
     Token berlaku di `narration.text`, `dialogue.text`,
     `dialogue.textVariants[].text`, dan seluruh beat `onWrong.detour`. Token
     **tidak** berlaku di `prompt`, `explanation`, `hints`, atau
     `retryQuestions`, karena teks itu dirender overlay tantangan, bukan kotak
     dialog.
2. **`onWrong.setFlags` dijalankan pada setiap jawaban salah**, bukan hanya saat
   masih ada percobaan ulang. Arti flag karena itu berubah menjadi "pernah
   salah", dan dialog setelah soal bisa memakai varian itu untuk mengakui
   kesalahan. `detour` tetap hanya diputar bila soal masih akan ditanyakan ulang.

Alasan utama:

1. **Aditif, bukan breaking.** Tidak ada field baru di schema dan tidak ada versi
   baru: `{{jawaban}}` hanyalah isi `text` yang sudah ada. Cerita lama tetap
   valid dan berperilaku sama karena tanpa token tidak ada yang diganti.
2. **Suara tetap milik cerita.** Kalimat pengakuan salah ditulis penulis/AI
   bersama konteks tokohnya, bukan template engine. Detour dan dialog penutup
   bisa memakai nada berbeda.
3. **Cukup untuk masalah nyata.** Opsi D lebih rapi secara semantik, tetapi
   menambah bentuk kondisi baru di `story.schema.json`, zod, drift guard, dan
   validator. Untuk satu kebutuhan ("sebut jawaban siswa"), biayanya tidak
   sepadan.

Asumsi: penulis cerita memakai satu flag per tantangan yang punya reaksi salah,
sehingga varian tidak saling silang. `{{jawaban}}` selalu berarti jawaban salah
**terakhir**; kalau sebuah dialog membaca flag tantangan lain, kalimatnya bisa
menyebut jawaban yang salah tempat. Prompt dan dokumen menutup ini dengan aturan
"varian salah hanya untuk tantangan tepat sebelumnya".

## Konsekuensi

**Positif:**

- Siswa melihat jawabannya benar-benar diucapkan, lalu tokoh menanggapinya.
  Tidak ada lagi pujian untuk jawaban yang salah.
- Berlaku juga pada tantangan `maxAttempts: 1`: cukup `onWrong.setFlags` tanpa
  `retryQuestions`, sehingga `E_ONWRONG_WITHOUT_ATTEMPTS` dilonggarkan menjadi
  "hanya bila `retryQuestions` dipakai".
- `detour` ikut bisa mengutip jawaban, karena flag sudah menyala sebelum detour
  diputar.

**Negatif / utang:**

- `{{jawaban}}` adalah satu-satunya token yang dikenali. Token lain dibiarkan apa
  adanya; validator cerita penuh menolak `{{jawaban}}` yang muncul sebelum
  tantangan pertama (`E_JAWABAN_TANPA_SOAL`).
- Jawaban yang dikutip dipotong maksimal 60 code point (diakhiri `…`) supaya
  kotak dialog tidak meluber. Teks bervariabel karena itu sebaiknya ≤ 120
  karakter.
- `validateStory` tidak me-reset flag saat "Ulangi chapter" (batasan yang sama
  dengan ADR 0019).

**Yang harus diubah:**

- `docs/02-data-model/story-schema.md`, `docs/02-data-model/validation-rules.md`,
  `docs/03-ai-pipeline/prompt-contract.md`, `docs/03-ai-pipeline/validation-and-repair.md`,
  `docs/04-game/interaction-loop.md`.
- `src/game/branching.ts`, `src/game/scenes/GameScene.ts`,
  `src/story/scoring.ts`, `src/story/validate.ts`, `src/story/validate-parts.ts`,
  `src/ai/prompt.ts` (blok `BRANCHING`, `PROMPT_VERSION` → `story-v6`).
- Cerita contoh dan fallback: `docs/02-data-model/story.example.json`,
  `src/game/fixture/demo-story.json`, `src/story/fallback.ts`.

## Kapan keputusan ini ditinjau ulang

Setelah demo, atau bila dibutuhkan reaksi yang menempel pada tantangan tertentu
tanpa flag manual (kandidat: opsi D). Perubahan itu butuh ADR baru dan
kemungkinan versi schema baru.

## Referensi

- [`0019-branching-konsekuensi-jawaban-salah.md`](0019-branching-konsekuensi-jawaban-salah.md)
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md)
