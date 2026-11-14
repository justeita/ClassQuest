---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0032 — Emosi per Varian Jawaban

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0023](0023-potret-ekspresi-persona.md),
  [0021](0021-varian-dialog-per-jawaban-salah.md)

## Konteks

[ADR 0023](0023-potret-ekspresi-persona.md) memasang potret berekspresi di atas
kotak dialog: enam berkas per karakter di
`public/assets/portrait/<nama>/<ekspresi>.png`, dipilih lewat field `expression`
pada beat. Asetnya sudah lengkap untuk sepuluh karakter, dan `DialogueBox` sudah
memanaskan keenam ekspresi begitu tokoh muncul.

Yang belum bisa dilakukan: **emosi hanya menempel pada beat, bukan pada isi
kalimat yang sedang diucapkan**. Satu beat dialog punya satu `expression`, padahal
sejak [ADR 0021](0021-varian-dialog-per-jawaban-salah.md) satu beat bisa memilih
teks berbeda menurut jawaban siswa. Akibatnya, kalimat untuk jawaban salah dan
kalimat untuk jawaban benar memakai potret yang sama. Adegan yang seharusnya
menunjukkan tokoh bingung (`thinking`) ketika siswa menjawab keliru tetap tampil
senang, karena emosinya diambil dari beat, bukan dari varian.

Selain itu, `expression` masih **opsional tanpa dorongan apa pun**: prompt hanya
berkata "pilih ekspresi yang cocok", sehingga sebagian besar dialog hasil generator
tidak punya emosi dan potretnya selalu `neutral`. Cerita demo sendiri, sebelum
perubahan ini, hanya punya 5 `expression` untuk 43 beat dialog.

Batasan tetap sama: sisa waktu hackathon, tim kecil, dan kontrak `Story` yang
sudah dipakai prompt, validator, editor, dan game. Solusinya harus **aditif** —
cerita v1.0 yang sudah ada tetap valid dan berperilaku sama.

## Opsi

| Opsi                                                        | Kelebihan                                                                         | Kekurangan                                                                                            | Biaya |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----- |
| A. `expression` opsional di `textVariants` + aturan prompt  | Aditif; satu beat bisa bingung saat salah dan senang saat benar; tanpa versi baru | Penulis/AI harus mengisi emosi varian; validator hanya bisa memberi peringatan, bukan error           | 0     |
| B. `expression` wajib di schema untuk semua beat            | Emosi dijamin ada oleh kontrak                                                    | Breaking: `schemaVersion` 2.0, semua cerita/fixture lama harus diperbarui, game menolak 1.0           | > 0   |
| C. Emosi ditentukan engine dari teks (heuristik/kata kunci) | Nol perubahan kontrak dan nol kerja penulis                                       | Emosi tidak bisa dikontrol guru; salah tebak terus terjadi; melanggar prinsip "guru memegang kendali" | 0     |
| D. Field emosi terpisah per kondisi di luar `textVariants`  | Reaksi emosi bisa menempel pada tantangan                                         | Bentuk baru di luar `textVariants`; validator dan renderer harus paham konteks baru                   | > 0   |

## Keputusan

**Kami memilih A.** `textVariants[]` menerima `expression` opsional:

```jsonc
{
  "type": "dialogue",
  "speakerId": "char_npc_1",
  "text": "Tepat, enam cangkir.", // jawaban benar
  "expression": "happy",
  "textVariants": [
    {
      "when": { "jawaban": "4 cangkir" },
      "text": "Empat cangkir? Masih kurang.",
      "expression": "thinking", // bingung, hanya untuk jawaban ini
    },
  ],
}
```

Aturan pendukung:

1. **Urutan emosi mengikuti urutan teks.** `resolveDialogueLine()` di
   `src/game/branching.ts` memilih varian dengan aturan yang sama seperti
   `resolveDialogueText()` (varian `when.jawaban` menang atas `when.flag`, lalu
   teks utama), lalu mengembalikan `{ text, expression }` dari sumber yang menang.
   Varian yang tidak menyebut `expression` mewarisi emosi beat induk, sehingga
   varian lama berperilaku persis seperti sebelumnya.
2. **Tidak ada field baru di tingkat beat.** `expression` pada beat tetap seperti
   ADR 0023, termasuk aturan "narration hanya boleh memakai `expression` bersama
   `speakerId`". Yang berubah hanya `$defs.textVariant`.
3. **Emosi wajib lewat prompt, bukan schema.** `PROMPT_VERSION` naik ke
   `story-v9`: system prompt memuat blok `EMOSI` (arti tiap ekspresi + kewajiban
   mengisi emosi pada setiap beat `dialogue`), dan blok `BRANCHING` mewajibkan
   varian jawaban salah punya emosi sendiri (`thinking`/`sad`/`shocked`) yang
   berbeda dari teks utama (biasanya `happy`).
4. **Validator memberi peringatan, bukan error.** `W_DIALOGUE_NO_EXPRESSION`
   dilaporkan sekali per chapter yang punya dialog (termasuk dialog di dalam
   `onWrong.detour`) tanpa emosi. Cerita tetap sah dan tetap bisa dimainkan dengan
   potret `neutral`; peringatan hanya memberi tahu guru bahwa percakapan di
   chapter itu belum punya emosi.
5. **Normalisasi mempertahankan emosi varian.** `normalizeTextVariants()` di
   `src/story/validate.ts` merapikan teks tetapi tidak membuang `expression`.

Alasan utama:

1. **Aditif, bukan breaking.** `schemaVersion` tetap `1.0`. Cerita yang belum
   memakai emosi varian tetap valid; yang berubah hanya potret yang tampil.
2. **Guru tetap memegang kendali.** Emosi ditulis di JSON cerita, bisa diedit
   guru dan diperiksa lewat peringatan validator — bukan ditebak engine.
3. **Memenuhi kebutuhan demo tanpa membongkar kontrak.** Opsi B memaksa migrasi
   seluruh cerita dan fixture pada hari code freeze; opsi C menghilangkan kendali
   penulis; opsi D menambah jalur render kedua untuk hasil yang sama.

Asumsi: penulis cerita memakai emosi yang konsisten dengan kalimatnya. Tidak ada
mesin yang bisa memaksa "bingung" pada kalimat yang isinya senang, jadi
konsistensi itu dijamin prompt dan review guru, bukan validator.

## Konsekuensi

**Positif:**

- Satu beat bisa berekspresi berbeda per jawaban: bingung saat siswa salah,
  senang saat siswa benar. Ini yang membuat reaksi terasa nyata.
- `DialogueBox` tidak perlu diubah: pergantian emosi sudah ditangani lewat
  `src` potret, dan keenam ekspresi sudah dipanaskan per karakter.
- Cerita cadangan (`fallback.ts`) dan cerita contoh ikut beremosi, jadi demo tetap
  terasa hidup walau generasi AI gagal.

**Negatif / utang:**

- Varian yang banyak membuat penulis/AI mengisi emosi lebih banyak; varian tanpa
  emosi tidak error, hanya mewarisi emosi beat.
- Peringatan `W_DIALOGUE_NO_EXPRESSION` hanya per chapter, bukan per beat, supaya
  daftar peringatan guru tidak membanjir.
- Belum ada editor emosi di UI guru (editor cerita belum ada); saat ini emosi
  hanya bisa diubah lewat JSON.

**Yang harus diubah:**

- `docs/02-data-model/story.schema.json` (`$defs.textVariant`),
  `docs/02-data-model/story-schema.md`,
  `docs/02-data-model/validation-rules.md`,
  `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/generation-rules.md`,
  `docs/04-game/scene-format.md`.
- `src/story/schema.ts`, `src/story/validate.ts`, `src/game/branching.ts`,
  `src/game/scenes/GameScene.ts`, `src/ai/prompt.ts`
  (`PROMPT_VERSION` → `story-v9`), `src/story/fallback.ts`.
- Cerita contoh: `docs/02-data-model/story.example.json` dan salinannya
  `src/game/fixture/demo-story.json` (harus tetap identik).

## Kapan keputusan ini ditinjau ulang

Setelah demo, bila guru menganggap pengisian emosi per varian terlalu mahal
manual. Kandidat: emosi default per peran (mis. mentor selalu `thinking` saat
mengoreksi) atau pemilih emosi di editor cerita. Perubahan itu butuh ADR baru.

## Referensi

- [`0023-potret-ekspresi-persona.md`](0023-potret-ekspresi-persona.md)
- [`0021-varian-dialog-per-jawaban-salah.md`](0021-varian-dialog-per-jawaban-salah.md)
- [`0022-pemain-mengucapkan-jawaban-di-dialog.md`](0022-pemain-mengucapkan-jawaban-di-dialog.md)
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../04-game/scene-format.md`](../04-game/scene-format.md)
