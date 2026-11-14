---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0021 — Varian dialog per jawaban salah

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0020](0020-kutipan-jawaban-siswa-di-dialog.md)

## Konteks

[ADR 0020](0020-kutipan-jawaban-siswa-di-dialog.md) membuat cerita bisa mengakui
jawaban salah lewat `{{jawaban}}` dan varian `when: { flag, is }`. Fitur itu
sudah berjalan, tetapi reaksinya masih **satu untuk semua kesalahan**: apa pun
pilihan yang diambil siswa, tokoh membalas dengan kalimat yang sama dan hanya
mengutip teks jawabannya.

Pada soal pilihan ganda, kesalahan yang berbeda biasanya berarti miskonsepsi yang
berbeda pula. Menjawab `4 cangkir` (terlalu sedikit) dan `12 cangkir` (terlalu
banyak) seharusnya dijawab berbeda, bukan dengan satu kalimat generik
"Kau menjawab X. Tidak apa-apa." Guru dan penulis cerita ingin alur dialog yang
benar-benar bercabang menurut jawaban, bukan sekadar mengganti satu kata.

Batasan yang sama seperti ADR 0019 dan 0020 masih berlaku: sisa waktu hackathon,
tim kecil, tidak ada editor alur, dan engine hanya membaca satu bentuk `Story`.
Solusinya harus **aditif**, tidak boleh menambah versi schema, dan cerita lama
harus tetap valid serta berperilaku sama.

## Opsi

| Opsi                                                  | Kelebihan                                                                                      | Kekurangan                                                                                        | Biaya |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----- |
| A. Kondisi `when: { jawaban }` pada `textVariants`    | Aditif; penulis tetap menulis kalimat; satu varian per pilihan salah; tanpa token/versi schema | Menambah satu bentuk kondisi di schema + validator + prompt                                       | 0     |
| B. Cabang dialog penuh (pilihan dialog pemain)        | Percabangan paling kaya                                                                        | Mengubah model permainan, UI, dan skor; jauh di luar lingkup MVP                                  | > 0   |
| C. Template engine per tipe jawaban                   | Nol perubahan kontrak                                                                          | Kalimat seragam milik engine, bukan suara tokoh; tidak bisa menjelaskan miskonsepsi               | 0     |
| D. Field baru `onWrong.responses[]` di beat challenge | Reaksi menempel pada tantangan tanpa flag                                                      | Bentuk baru di luar `textVariants`; validator, normalisasi, dan renderer harus paham konteks baru | > 0   |

## Keputusan

**Kami memilih A.** `textVariants[].when` menerima dua bentuk:

```jsonc
// 1. Balasan khusus untuk satu jawaban salah (baru)
{ "when": { "jawaban": "4 cangkir" }, "text": "Empat cangkir kurang. ..." }

// 2. Balasan umum saat flag "pernah salah" menyala (tetap seperti ADR 0020)
{ "when": { "flag": "flg_salah_tinta", "is": true }, "text": "Kau menjawab {{jawaban}}. ..." }
```

Aturan pendukung:

1. **Urutan pemilihan** (`resolveDialogueText` di `src/game/branching.ts`):
   varian `when.jawaban` yang cocok **selalu menang** atas varian `when.flag`,
   lalu `text` utama. Urutan penulisan di JSON tidak menentukan; balasan khusus
   tidak boleh tertutup kalimat umum.
2. **Pencocokan** memakai `normalisasiJawaban()`: NFC, huruf kecil, spasi
   dirapikan, trim. Tanda baca **tidak** dibuang supaya `20%` dan `20` tetap dua
   jawaban berbeda.
3. **Jawaban disimpan per tantangan** (`BranchingRun.jawabanSalahUntuk(id)`),
   bukan hanya yang terakhir. `challengeSebelumnya()` mencari tantangan terdekat
   sebelum kursor lintas scene/chapter, sehingga dialog setelah tantangan lain
   tidak ikut mencocokkan jawaban lama. Varian hanya berlaku untuk **hasil
   akhir**: yang disimpan adalah percobaan terakhir, dan `jawabanSalahUntuk()`
   mengembalikan `null` bila percobaan terakhir benar, sehingga kesalahan yang
   sudah diperbaiki lewat soal ulang tidak dikutip lagi (lihat
   [ADR 0022](0022-pemain-mengucapkan-jawaban-di-dialog.md)).
4. **Teks yang dicocokkan adalah teks yang dilihat siswa**:
   `multiple_choice` → teks opsi, `true_false` → `Benar`/`Salah`, `ordering` →
   item sesuai urutan siswa dipisah `→`. Untuk `short_answer`, teks ketikan
   tidak bisa ditebak, jadi varian `when.flag` tetap wajib.
5. **Validator** memakai kode yang sudah ada: `when.jawaban` sebelum tantangan
   pertama ditolak `E_JAWABAN_WITHOUT_CHALLENGE`; flag pada `when.flag` tetap
   diperiksa `E_FLAG_UNDECLARED`, dan `W_TEXT_VARIANT_FLAG_UNSET` hanya berlaku
   untuk varian flag.

Alasan utama:

1. **Aditif, bukan breaking.** Tidak ada field baru di tingkat beat dan tidak ada
   versi schema baru: `when` hanya mendapat satu bentuk alternatif. Cerita v1.0
   dan cerita yang hanya memakai `when.flag` tetap valid dan berperilaku sama.
2. **Miskonsepsi bisa dijawab spesifik.** Satu varian per pilihan salah membuat
   tokoh bisa mengoreksi kekeliruan yang sebenarnya ("itu potongannya, bukan
   harga akhirnya"), sesuatu yang tidak mungkin dilakukan satu kalimat generik.
3. **Tidak butuh cabang dialog penuh.** Opsi B mengubah model permainan; opsi D
   memindahkan reaksi keluar dari `textVariants` dan menambah jalur render baru.
   Untuk kebutuhan "beda jawaban beda balasan", satu kondisi tambahan sudah cukup.

Asumsi: penulis cerita memakai teks jawaban **persis** seperti yang tampil di
overlay. Bila teks opsi berubah, varian `when.jawaban` harus ikut diubah; kalau
tidak, varian tidak akan pernah cocok dan dialog jatuh ke varian flag/teks utama
(perilaku aman, bukan error).

## Konsekuensi

**Positif:**

- Pilihan salah yang berbeda menghasilkan balasan NPC yang berbeda, jadi alur
  dialog terasa bereaksi pada siswa, bukan statis.
- Berlaku juga pada dialog di dalam `detour`: `GameScene` memakai jawaban
  tantangan pemicu selama detour berlangsung.
- Tidak ada perubahan bentuk pada `story.schema.json` di luar `$defs.textVariant`,
  dan `schemaVersion` tetap `1.0`.

**Negatif / utang:**

- Penulis/AI harus menulis satu varian per kemungkinan salah; pada soal dengan
  banyak opsi ini menambah panjang cerita. Varian `when.flag` tetap disarankan
  sebagai cadangan.
- `short_answer` dan `ordering` sulit diprediksi, sehingga varian per jawaban
  praktis hanya dipakai untuk `multiple_choice` dan `true_false`.
- `validateStory` tidak me-reset jawaban per tantangan saat "Ulangi chapter"
  (batasan yang sama dengan ADR 0019/0020).

**Yang harus diubah:**

- `docs/02-data-model/story.schema.json`, `docs/02-data-model/story-schema.md`,
  `docs/02-data-model/validation-rules.md`,
  `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/validation-and-repair.md`,
  `docs/04-game/interaction-loop.md`.
- `src/story/schema.ts`, `src/story/validate.ts`, `src/story/validate-parts.ts`,
  `src/game/branching.ts`, `src/game/scenes/GameScene.ts`,
  `src/ai/pipeline.ts`, `src/ai/prompt.ts` (blok `BRANCHING`,
  `PROMPT_VERSION` → `story-v8`; pola ucapan pemain menyusul di ADR 0022).
- Cerita contoh: `docs/02-data-model/story.example.json` dan salinannya
  `src/game/fixture/demo-story.json` (harus tetap identik).

## Kapan keputusan ini ditinjau ulang

Setelah demo, bila varian per jawaban terasa terlalu mahal untuk ditulis manual.
Kandidat: kondisi yang menempel langsung pada tantangan (opsi D) atau pemilihan
varian otomatis berdasarkan tipe miskonsepsi. Perubahan itu butuh ADR baru.

## Referensi

- [`0022-pemain-mengucapkan-jawaban-di-dialog.md`](0022-pemain-mengucapkan-jawaban-di-dialog.md)
- [`0020-kutipan-jawaban-siswa-di-dialog.md`](0020-kutipan-jawaban-siswa-di-dialog.md)
- [`0019-branching-konsekuensi-jawaban-salah.md`](0019-branching-konsekuensi-jawaban-salah.md)
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md)
