---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0022 — Pemain mengucapkan jawabannya di dialog sesudah soal

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0021](0021-varian-dialog-per-jawaban-salah.md)

## Konteks

[ADR 0021](0021-varian-dialog-per-jawaban-salah.md) memberi varian
`when: { jawaban }`, sehingga pilihan salah yang berbeda bisa dibalas berbeda.
Tetapi saat dicoba di game, hasilnya masih terasa aneh:

1. **Pemain tidak pernah mengucapkan jawabannya.** Jawaban siswa hanya muncul
   sebentar di overlay soal lalu hilang. Di dialog, tokoh pertama sesudah soal
   langsung membahas jawaban yang tidak pernah diucapkan siapa pun.
2. **Tekanannya terbalik.** Varian `when.jawaban` dipasang pada dialog tokoh
   lain yang juga memuat pembenaran ("Empat cangkir kurang. Sembilan itu tiga
   kali tiga, jadi tinta emasnya dua kali tiga, enam cangkir."). Akibatnya, siswa
   yang salah melihat lawan bicaranya berbicara sendiri: mengucapkan dugaan
   siswa, membantahnya, dan menjelaskan jawaban benar dalam satu tarikan napas.
3. **Kesalahan yang sudah diperbaiki ikut terpakai.** Karena jawaban salah
   disimpan apa adanya, siswa yang salah lalu menjawab benar di soal ulang masih
   mendapat varian "jawaban salah" di dialog sesudahnya.

Batasan tetap sama: aditif, tanpa versi schema baru, dan tidak menambah pilihan
dialog pemain (ADR 0019).

## Opsi

| Opsi                                                    | Kelebihan                                                        | Kekurangan                                                                               | Biaya |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| A. Aturan cerita: pemain mengucapkan jawaban lebih dulu | Nol bentuk schema baru; alur terasa seperti percakapan sungguhan | Bergantung pada penulis cerita dan prompt; tidak bisa dipaksa validator                  | 0     |
| B. Engine otomatis menampilkan beat ucapan pemain       | Selalu konsisten                                                 | Kalimat seragam milik engine, bukan suara tokoh; menyisipkan beat yang tidak ada di JSON | > 0   |
| C. Overlay soal yang menyisakan kalimat jawaban         | Cukup satu perubahan UI                                          | Masih bukan dialog; tokoh tetap berbicara pada kalimat yang tidak diucapkan              | > 0   |
| D. Pilihan dialog pemain                                | Percabangan paling kaya                                          | Mengubah model permainan dan UI; di luar lingkup MVP                                     | > 0   |

## Keputusan

**Kami memilih A**, dengan tiga aturan:

1. **Pola wajib sesudah `challenge`.** Beat dialog pertama sesudah soal adalah
   pemain (`char_mc`) yang **hanya** mengucapkan jawabannya dalam satu kalimat
   pendek (≤ 60 karakter), tanpa pembenaran, hitungan, atau koreksi. Tokoh lain
   menanggapi ucapan itu di beat berikutnya. Pembenaran hanya boleh muncul di
   mulut tokoh lain.
2. **`text` beat pemain = jawaban benar.** Varian `when.jawaban` mengisi versi
   jawaban salah, sehingga alur benar tetap satu beat tanpa varian tambahan.
   Untuk `short_answer` dan `ordering`, yang jawabannya tidak bisa ditebak, beat
   pemain memakai satu varian `when.flag` berisi `{{jawaban}}`.
3. **Varian `jawaban` hanya untuk hasil akhir.** `BranchingRun` menyimpan hasil
   percobaan **terakhir** per tantangan, dan `jawabanSalahUntuk()` mengembalikan
   `null` bila percobaan terakhir benar. Dengan begitu siswa yang salah lalu
   memperbaiki jawabannya di soal ulang tidak mendapat varian kesalahan lama.
   Flag "pernah salah" (ADR 0020) tetap menyala, tetapi hanya dipakai untuk
   kalimat cadangan.

Aturan 1 diajarkan di blok `BRANCHING` prompt (`PROMPT_VERSION` → `story-v8`) dan
diterapkan pada seluruh cerita contoh (`story.example.json`).

Asumsi: cerita yang ditulis tangan tetap bisa menyimpang dari pola ini. Validator
tidak memaksanya karena bentuknya masih valid secara schema; kualitas alur adalah
tanggung jawab penulis cerita dan prompt.

## Konsekuensi

**Positif:**

- Dialog terasa seperti percakapan: siswa menyebut jawabannya, tokoh menanggapinya,
  lalu alurnya melanjutkan pelajaran.
- Salah dan benar terpisah jelas: kalimat pemain hanya berisi jawaban, kalimat
  tokoh hanya berisi tanggapan.
- Perbaikan lewat soal ulang tidak lagi dihukum kalimat "jawaban salah" sesudahnya.

**Negatif / utang:**

- Cerita butuh satu beat tambahan per soal (di dalam batas 3–10 beat per scene).
- Kalimat pemain jadi sangat pendek; nuansa karakter pemain berkurang di titik itu.
- Tidak ada validasi otomatis untuk pola ini, jadi modifikasi tangan bisa
  mengembalikan masalah lama.

**Yang harus diubah:**

- `src/game/branching.ts` (`jawabanSalahUntuk` hanya untuk hasil akhir salah).
- `src/ai/prompt.ts` (blok `BRANCHING`, `PROMPT_VERSION` → `story-v8`).
- `docs/02-data-model/story-schema.md`,
  `docs/03-ai-pipeline/prompt-contract.md`, `docs/04-game/interaction-loop.md`.
- Cerita contoh: `docs/02-data-model/story.example.json` dan salinannya
  `src/game/fixture/demo-story.json` (harus tetap identik).

## Kapan keputusan ini ditinjau ulang

Bila jumlah beat per scene mulai menghalangi alur, atau bila pola ini terlalu
mudah dilanggar tanpa validator. Kandidat: validasi ringan yang memastikan beat
pertama sesudah `challenge` diucapkan pemain, atau varian opsi B (satu beat
ucapan pemain yang dihasilkan engine).

## Referensi

- [`0021-varian-dialog-per-jawaban-salah.md`](0021-varian-dialog-per-jawaban-salah.md)
- [`0020-kutipan-jawaban-siswa-di-dialog.md`](0020-kutipan-jawaban-siswa-di-dialog.md)
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md)
