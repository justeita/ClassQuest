---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0039 — Sebaran Pembicara Antar Tokoh

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0033](0033-pemilihan-pembicara-keahlian.md),
  [0016](0016-obrolan-singkat-npc.md)

## Konteks

[ADR 0033](0033-pemilihan-pembicara-keahlian.md) memberi model kolom `keahlian`
di blok `CAST` dan blok `PEMILIHAN PEMBICARA`. Aturan itu menjawab "siapa yang
paling tahu", tetapi tidak menjawab "siapa saja yang bicara".

Akibatnya, untuk materi pelajaran umum — yang memang tidak punya pemilik domain
selain mentor — model menyerahkan **seluruh** dialog chapter kepada Edric
(`char_npc_10`). Cerita jadi monolog satu NPC: Kael bertanya, Edric menjelaskan
di semua scene, dan delapan tokoh lain tidak pernah muncul. Guru melihat hasil
yang secara kontrak valid tetapi terasa datar, dan tokoh yang sudah dibuat
lengkap dengan potret serta penempatan di desa tidak terpakai.

Yang sudah ada tidak menolong:

1. **Blok `PEMILIHAN PEMBICARA` hanya mengatur kecocokan topik.** Ia bahkan
   mendorong pemusatan: "konsep pelajaran umum lewat Edric sebagai mentor".
2. **Validator tidak punya aturan distribusi.** `E_UNKNOWN_SPEAKER` hanya
   memeriksa `speakerId` ada di cast. Tidak ada yang menghitung berapa tokoh
   berbeda yang bicara di satu chapter.
3. **Outline tidak menyebut tokoh.** `SCHEMA OUTLINE` hanya berisi `id`,
   `title`, `concept`, dan `sourcePages`, jadi tidak ada tempat untuk memaksa
   daftar pembicara per chapter.
4. **Fallback story ikut memusatkan dialog.** `buildFallbackStory` hanya memakai
   mentor untuk semua dialog, sehingga jalur cadangan menghasilkan masalah yang
   sama.

Batasan tetap: hari code freeze, tim kecil, dan kontrak `Story` yang sudah
dipakai prompt, validator, editor, serta game. Perubahan harus **aditif** —
`schemaVersion` tetap `1.0`, cerita lama tetap valid, dan tidak ada field baru.

## Opsi

| Opsi                                                         | Kelebihan                                                                | Kekurangan                                                                                   | Biaya |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----- |
| A. Aturan prompt + `usedSpeakers` + warning validator        | Aditif; tanpa perubahan schema; giliran pembicara bergilir antar chapter | Probabilistik: menaikkan peluang sebaran, bukan menjamin; guru tetap bisa mengubah manual    | 0     |
| B. Outline mewajibkan daftar pembicara per chapter           | Bisa divalidasi sebagai error; sebaran hampir terjamin                   | Perubahan schema outline, validator, prompt, fixture, dan dokumen di hari freeze             | > 0   |
| C. Validator menolak chapter dengan satu pembicara           | Dijamin tidak lolos simpan                                               | Cerita valid jadi gagal; repair memakan kuota; fallback bisa memicu masalah baru             | 0     |
| D. Distribusi deterministik di kode (rotasi tokoh per scene) | Dijamin tersebar; tanpa bergantung model                                 | Dialog jadi tidak nyambung dengan isi scene; AI kehilangan kendali atas siapa yang berbicara | 0     |
| E. Dokumentasi saja                                          | Nol perubahan kode                                                       | Monolog satu NPC tetap terjadi di demo                                                       | 0     |

## Keputusan

**Kami memilih A.** Empat perubahan, semuanya tanpa mengubah kontrak cerita:

1. **Blok `SEBARAN PEMBICARA` di `SYSTEM_PROMPT`.** Isinya angka yang bisa
   diperiksa: setiap chapter minimal tiga tokoh berbeda (Kael + dua NPC), satu
   NPC tidak memegang lebih dari separuh beat dialog, dialog tersebar di
   beberapa scene, dan sepanjang cerita minimal empat NPC berbeda bicara (lima
   bila chapter empat atau lebih), selama tempat dan keahliannya cocok.
2. **Dua butir `PEMILIHAN PEMBICARA` diubah.** Keahlian memilih siapa yang
   menjelaskan **inti** konsep, bukan siapa satu-satunya yang boleh bicara.
   Mentor tidak lagi otomatis memegang semua dialog topik umum; tokoh lain tetap
   dapat giliran untuk reaksi, pertanyaan, dan pengetahuan yang mereka miliki.
3. **`usedSpeakers` di prompt chapter.** `ChapterPromptInput` menerima daftar
   `speakerId` NPC yang sudah bicara di chapter sebelumnya; `pipeline.ts`
   mengumpulkannya lewat `collectSpeakers()` dan mengirimnya ke prompt chapter
   berikutnya. `TASK` menyebut nama NPC tersebut dan meminta model memberi
   giliran kepada tokoh lain lebih dulu.
4. **Warning `W_SINGLE_SPEAKER` di validator.** Muncul bila satu chapter tidak
   punya dialog NPC, hanya memakai satu NPC, atau menumpuk lebih dari 70% dialog
   NPC pada satu tokoh saat total dialog NPC minimal empat. Dialog pemain
   (`role: "player"`) tidak dihitung; `detour` jawaban salah dihitung karena juga
   dilihat siswa. Warning ini **tidak memblokir** publish.

`PROMPT_VERSION` naik ke `story-v13`.

`buildFallbackStory` juga diperbaiki: selain mentor, dua NPC pendamping
(`companionsFor()`) mendapat dialog dan hadir di narasi, bergiliran per chapter.
Tanpa ini, jalur cadangan akan terus memicu `W_SINGLE_SPEAKER` dan distribusi
hanya benar pada jalur AI.

Alasan utama:

1. **Aditif dan murah.** Nol perubahan schema, nol migrasi cerita, nol
   perubahan game. Yang tersentuh hanya `prompt.ts`, `pipeline.ts`,
   `validate.ts`, dan `fallback.ts`.
2. **Warning, bukan error.** Distribusi pembicara adalah soal rasa cerita, bukan
   pelanggaran kontrak. Menolak chapter dengan satu pembicara (opsi C) akan
   menggagalkan cerita yang sebenarnya bisa dimainkan dan menghabiskan kuota
   repair.
3. **Giliran antar chapter lebih kuat daripada aturan per chapter.** Mengirim
   `usedSpeakers` membuat model tahu siapa yang sudah tampil, sehingga
   distribusi menyebar sepanjang cerita, bukan hanya di dalam satu chapter.
4. **Opsi B terlalu mahal di hari freeze.** Menambah field pembicara di outline
   berarti mengubah schema outline, validator, fixture, dan dokumen. Ia kandidat
   yang tepat bila masalah ini masih terjadi setelah demo.

**Asumsi dan batasan yang diterima:** perbaikan berbasis prompt **tidak
menjamin** sebaran. Model masih bisa menumpuk dialog pada satu tokoh, terutama
bila materi sangat sempit atau chapter hanya punya sedikit beat dialog. Jaminan
mutlak hanya datang dari opsi B atau C, yang sengaja ditolak. Risiko sisa ini
dicatat, bukan disembunyikan.

## Konsekuensi

**Positif:**

- Cerita tidak lagi terasa monolog satu NPC; tokoh yang sudah punya potret dan
  penempatan di desa benar-benar muncul.
- Guru mendapat sinyal konkret (`W_SINGLE_SPEAKER`) beserta path chapter, lalu
  bisa memperbaiki distribusinya di editor tanpa cerita ditolak.
- Jalur fallback ikut tersebar, jadi hasil cadangan tidak lagi lebih buruk
  daripada jalur AI pada dimensi ini.
- Tidak ada perubahan pada schema, fixture, atau game. `schemaVersion` tetap
  `1.0`.

**Negatif / utang:**

- Masih probabilistik. Aturan angka di prompt mengarahkan distribusi, bukan
  menguncinya.
- Ambang 70% dan minimal empat dialog NPC adalah angka pilihan tim, belum
  diuji pada banyak cerita nyata. Bisa berubah setelah demo.
- `usedSpeakers` hanya melihat chapter sebelumnya dalam satu kali generate; ia
  tidak membaca cerita lama saat guru melakukan regenerate satu chapter.
- Prompt bertambah panjang (satu blok + satu baris `TASK`), sehingga token
  masukan naik sedikit per chapter.
- Test fixture `src/game/fixture/demo-story.json` sengaja tidak diubah, jadi
  fixture itu sekarang memicu `W_SINGLE_SPEAKER` pada chapter keduanya. Test
  mencatat perilaku itu secara eksplisit.

**Yang harus diubah:**

- `src/ai/prompt.ts` (`PROMPT_VERSION` → `story-v13`, blok
  `SEBARAN PEMBICARA`, `speakerTask()`, `usedSpeakers`).
- `src/ai/pipeline.ts` (`collectSpeakers()`, `chapterPass`).
- `src/story/validate.ts` (`W_SINGLE_SPEAKER`).
- `src/story/fallback.ts` (`companionsFor()` dan dialog pendamping).
- Test: `src/ai/prompt.test.ts`, `src/ai/pipeline.test.ts`,
  `src/story/validate.test.ts`, `src/story/fallback.test.ts`,
  `src/server/jobs/run.test.ts`.
- Dokumen: `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/generation-rules.md`,
  `docs/02-data-model/validation-rules.md`.

## Kapan keputusan ini ditinjau ulang

Setelah demo, bila guru masih melaporkan cerita yang terasa monolog. Kandidat
berikutnya adalah opsi B (outline menetapkan daftar pembicara per chapter) yang
bisa divalidasi sebagai error. Itu mengubah kontrak outline dan butuh ADR baru.

## Referensi

- [`0033-pemilihan-pembicara-keahlian.md`](0033-pemilihan-pembicara-keahlian.md)
- [`0016-obrolan-singkat-npc.md`](0016-obrolan-singkat-npc.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../03-ai-pipeline/generation-rules.md`](../03-ai-pipeline/generation-rules.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
