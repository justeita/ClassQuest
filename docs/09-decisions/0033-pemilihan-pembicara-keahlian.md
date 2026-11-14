---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0033 — Pemilihan Pembicara Menurut Keahlian

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0016](0016-obrolan-singkat-npc.md),
  [0023](0023-potret-ekspresi-persona.md)

## Konteks

Cast ClassQuest sudah tetap: sepuluh tokoh di `src/story/cast.ts`
(`FIXED_CAST`). Pipeline mengirim satu blok `CAST` ke model berisi `id`, `name`,
`role`, `spriteId`, `description` (maks 160 karakter), `smallTalk`, dan
sekarang `keahlian`.

Masalahnya muncul saat guru memakai materi bertema tertentu. Contoh nyata:
materi tentang **ikan dan sungai**. Pembaca berharap Marlow — satu-satunya
nelayan — yang bicara. Yang terjadi justru dialog jatuh ke pelajar yang gemar
membaca, karena:

1. **Tidak ada aturan pemilihan pembicara.** `SYSTEM_PROMPT` punya blok
   `ATURAN KERAS`, `GAYA`, `EMOSI`, `SUARA DAN ROLEPLAY`, dan `LARANGAN`; tidak
   satu pun menyebut kecocokan topik dengan pekerjaan tokoh. Model bebas memilih
   siapa pun dari `CAST`.
2. **Keahlian tenggelam di deskripsi.** Pekerjaan hanya terselip di
   `description` yang bercampur ciri fisik ("Pemancing bertopi jerami bermata
   cokelat dan biru…"), dan deskripsi itu dipakai untuk menulis aksi, bukan untuk
   memilih pembicara.
3. **Komposisi cast timpang.** Hanya Marlow (ikan/sungai), Theo
   (ladang/panen), dan Leonhardt (jaga/keamanan) yang punya domain jelas.
   Sementara Elian, Elias, dan Clara semuanya pelajar yang digambarkan membawa
   buku. Model cenderung menyamakan "tahu banyak" dengan "orang yang membaca",
   jadi tiga tokoh itu menarik hampir semua topik pengetahuan.

Validator tidak bisa menolong: `E_UNKNOWN_SPEAKER` hanya memeriksa bahwa
`speakerId` ada di cast, bukan bahwa pembicara itu relevan dengan topik. Dan
`SCHEMA OUTLINE` tidak punya field tokoh per chapter.

Batasan tetap: hari code freeze, tim kecil, kontrak `Story` yang sudah dipakai
prompt, validator, editor, dan game. Perubahan harus **aditif** — cerita v1.0
tetap valid, dan tidak ada field baru di schema.

## Opsi

| Opsi                                                         | Kelebihan                                                                  | Kekurangan                                                                                      | Biaya |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----- |
| A. Aturan prompt + kolom `keahlian` eksplisit di blok `CAST` | Aditif; tanpa perubahan schema; guru tetap bisa mengubah cerita lewat JSON | Probabilistik: menaikkan peluang, bukan menjamin; model masih bisa salah pilih                  | 0     |
| B. Outline menentukan daftar tokoh wajib per chapter         | Pilihan model menyempit jauh; bisa divalidasi (`speakerId` di luar daftar) | Perubahan schema outline, validator, prompt, fixture, dan dokumen; lebih besar di hari freeze   | > 0   |
| C. Pemetaan deterministik konsep → tokoh di kode             | Dijamin benar; tidak bergantung pada model                                 | AI tidak lagi bebas memilih; guru tidak bisa mengubah lewat cerita; rapuh untuk konsep campuran | 0     |
| D. Dokumentasi saja, terima risiko salah pembicara           | Nol perubahan kode                                                         | Masalah yang dilaporkan tetap terjadi di demo                                                   | 0     |

## Keputusan

**Kami memilih A.** Dua perubahan, keduanya di lapisan prompt:

1. **Kolom `keahlian` di blok `CAST`.** Peta baru `CAST_EXPERTISE` di
   `src/story/cast.ts` menyimpan satu baris bidang keahlian per `id` tetap.
   `castSection()` menambahkannya sebagai `| keahlian: …` pada baris tokoh,
   disertai satu kalimat bahwa kolom itu **hanya untuk memilih pembicara** dan
   tidak boleh disalin ke keluaran JSON.
2. **Blok `PEMILIHAN PEMBICARA` di `SYSTEM_PROMPT`.** Isinya: dialog tentang
   suatu bidang diberikan kepada tokoh yang keahliannya cocok; Elian, Elias, dan
   Clara adalah pelajar, bukan sumber jawaban soal ikan/ladang/keamanan; topik
   desa punya pemiliknya (ikan → Marlow, ladang → Theo, keamanan → Leonhardt,
   sejarah lama → Eldric); konsep pelajaran tetap lewat Edric sebagai mentor atau
   tokoh yang mengalami langsung; kalau tidak ada ahli, pakai mentor dan jangan
   mengarang keahlian baru.

`PROMPT_VERSION` naik ke `story-v10`.

`CAST_EXPERTISE` sengaja **bukan** field schema. Menambah field ke `Character`
akan mengubah kontrak cerita (zod, JSON Schema, validator, fixture, editor) dan
membutuhkan ADR tersendiri. Peta ini hanya memengaruhi perilaku prompt, jadi
mengubahnya tidak membatalkan cerita mana pun.

Isi keahlian diturunkan dari tiga sumber yang sudah ada, bukan dikarang:
pekerjaan di berkas persona ODT, tag aset di manifest, dan `smallTalk` tokoh.
Rujukannya [`../07-assets/cast-bible.md`](../07-assets/cast-bible.md).

Alasan utama:

1. **Aditif dan murah.** Nol perubahan schema, nol migrasi cerita, nol
   perubahan game. Semua yang tersentuh hanya `cast.ts` dan `prompt.ts`.
2. **Guru tetap memegang kendali.** Keahlian adalah data di repo, bukan tebakan
   runtime. Kalau ada tokoh yang perlu domain baru, ubah satu baris di
   `CAST_EXPERTISE`.
3. **Opsi B dan C terlalu mahal atau terlalu kaku.** B menambah field outline
   dan jalur validasi baru di hari code freeze; C mematikan kebebasan AI dan
   gagal untuk konsep yang menggabungkan beberapa domain.

**Asumsi dan batasan yang diterima:** perbaikan berbasis prompt **tidak
menjamin** pembicara yang benar. Ia mengarahkan distribusi pilihan model, bukan
menguncinya. Jaminan mutlak hanya datang dari opsi B atau C, yang sengaja
ditolak. Risiko sisa ini dicatat, bukan disembunyikan.

## Konsekuensi

**Positif:**

- Model menerima penanda keahlian eksplisit, bukan harus menyimpulkannya dari
  deskripsi 160 karakter yang bercampur ciri fisik.
- Materi bertema ikan, ladang, atau keamanan punya arahan langsung ke tokoh yang
  tepat, tanpa mengunci pilihan model untuk topik lain.
- Tidak ada perubahan pada cerita, fixture, validator, atau game. `schemaVersion`
  tetap `1.0`.

**Negatif / utang:**

- Masih probabilistik. Model bisa tetap memberi dialog ahli kepada tokoh yang
  salah, terutama kalau materi mencampur banyak domain.
- `CAST_EXPERTISE` adalah duplikasi pengetahuan yang juga ada di
  `cast-bible.md`. Keduanya harus diperbarui bersamaan; belum ada test yang
  membandingkannya dengan ODT.
- `keahlian` menambah panjang blok `CAST`. Belum ada batas panjang otomatis
  untuk kolom ini; penulisannya harus ringkas (satu baris frasa).
- Dokumen persona lengkap (bible) tetap tidak dikirim ke model. Hanya satu baris
  keahlian per tokoh yang sampai, jadi nuansa persona tidak memengaruhi dialog.

**Yang harus diubah:**

- `src/story/cast.ts` (`CAST_EXPERTISE`), `src/ai/prompt.ts`
  (`PROMPT_VERSION` → `story-v10`, `castSection()`, blok
  `PEMILIHAN PEMBICARA`).
- `src/ai/prompt.test.ts` dan `src/server/jobs/run.test.ts` (versi prompt);
  test baru untuk kolom `keahlian` dan blok `PEMILIHAN PEMBICARA`.
- `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/generation-rules.md`,
  `docs/07-assets/cast-bible.md`.

## Kapan keputusan ini ditinjau ulang

Setelah demo, bila guru masih melaporkan pembicara yang salah pada materi
tertentu. Kandidat berikutnya adalah opsi B (outline menetapkan tokoh wajib per
chapter) atau pemetaan konsep → tokoh yang bisa diedit guru. Keduanya mengubah
kontrak dan butuh ADR baru.

## Referensi

- [`0016-obrolan-singkat-npc.md`](0016-obrolan-singkat-npc.md)
- [`0023-potret-ekspresi-persona.md`](0023-potret-ekspresi-persona.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../03-ai-pipeline/generation-rules.md`](../03-ai-pipeline/generation-rules.md)
- [`../07-assets/cast-bible.md`](../07-assets/cast-bible.md)
