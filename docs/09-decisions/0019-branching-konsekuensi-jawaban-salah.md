---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0019 — Percabangan sebagai konsekuensi jawaban salah

- **Status:** Accepted
- **Tanggal:** 2026-11-13
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —

## Konteks

[ADR 0002](0002-story-json-as-contract.md) memilih satu dokumen JSON berversi
(`schemaVersion: "1.0"`) sebagai kontrak tunggal antara prompt, validator,
editor, dan game engine. Saat itu konsekuensinya ditulis tegas: "tidak ada
percabangan". Dokumen produk juga menaruh "percabangan cerita dinamis (pilihan
dialog yang mengubah alur)" di luar cakupan MVP
([`../00-product/mvp-scope.md`](../00-product/mvp-scope.md)).

Sejak itu, cerita yang dibuat AI terasa datar: setiap jawaban salah hanya
mengulang soal yang sama tanpa reaksi naratif. Peserta demo mengharapkan setidaknya
rasa "cerita menanggapi" ketika mereka salah, tanpa menambah editor alur penuh
atau game yang punya state global.

Dua hal sudah tersedia di kode sebelum ADR ini:

1. Schema cerita sudah punya penanda opsional di level `Beat`: `maxAttempts`,
   `onWrong` (`setFlags`, `retryQuestions`, `detour`), `textVariants`, dan daftar
   `flags` tingkat cerita. Semuanya opsional, jadi cerita lama tetap valid.
2. `docs/02-data-model/validation-rules.md` dan `src/story/validate.ts` sudah
   memeriksa deklarasi flag, jumlah soal ulang, dan panjang detour di level
   cerita penuh.

Yang belum ada: AI tidak pernah diajari memakai field itu, dan panggilan chapter
(sebelum cerita lengkap) tidak memeriksanya. Tanpa itu, fitur baru tidak akan
pernah muncul dari model sungguhan.

Batasan nyata: sisa waktu hackathon, tim kecil, dan tidak ada alur kerja editor
untuk merancang cabang. Engine hanya membaca satu bentuk `Story`.

## Opsi

| Opsi                                                      | Kelebihan                                       | Kekurangan                                                    | Biaya |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | ----- |
| A. Pilihan dialog pemain (graf alur penuh)                | Percabangan paling kaya                         | Editor graf baru, kondisi, dan state global; jauh di luar MVP | > 0   |
| B. Konsekuensi jawaban salah yang aditif, di balik toggle | Cukup memakai field schema yang sudah ada; aman | Bukan "pilih jalan cerita"; kualitas bergantung model         | 0     |
| C. Tidak ada percabangan sama sekali                      | Nol risiko, prompt tetap sederhana              | Cerita terasa datar; field schema yang ada jadi sia-sia       | 0     |

## Keputusan

**Kami memilih B.**

Alasan utama:

1. **Aditif, bukan breaking.** Semua field sudah opsional dan sudah ada di
   `schemaVersion: "1.0"`; cerita tanpa `flags` tetap valid, jadi tidak perlu
   versi schema baru atau migrasi fixture lama. Ini juga sesuai aturan
   `prompt-contract.md` "jangan mengubah prompt dan schema di PR yang sama tanpa
   ADR" — ADR ini yang menutup perubahan itu.
2. **Menghormati batas MVP.** Pemain tidak memilih dialog; yang berubah hanya
   reaksi otomatis setelah jawaban salah (soal ulang + detour singkat). Pilihan
   dialog pemain tetap dilarang dan tetap di luar cakupan.
3. **Bisa dimatikan lewat env.** `AI_BRANCHING=on` menyalakan blok aturan di
   prompt chapter; kosong berarti mati dan prompt kembali persis seperti
   sebelumnya. Perilaku lama tidak berubah tanpa diminta.

Asumsi: provider yang dipakai demo mampu mengikuti aturan JSON dan tidak boros
token; blok aturan sengaja dibuat ringkas (≤ ~25 baris).

## Konsekuensi

**Positif:**

- Cerita menanggapi jawaban salah tanpa editor alur atau state game global.
- `assemble()` menurunkan `flags` dari pemakaian nyata di chapter, sehingga
  model tidak perlu (dan tidak boleh) mendeklarasikan `flags` di draft chapter.
- Validator punya kode error `E_ONWRONG_WITHOUT_ATTEMPTS` dan warning
  `W_TEXT_VARIANT_FLAG_UNSET` yang memicu repair di level chapter.

**Negatif / utang:**

- Percabangan terbatas pada `onWrong`; tidak ada pilihan pemain, tidak ada
  efek lintas chapter selain lewat flag.
- Format id flag dan bentuk `onWrong` tetap dijaga schema (`E_SCHEMA`), jadi
  kesalahan itu tidak punya kode semantik sendiri di `validate-parts.ts`.
- [ADR 0002](0002-story-json-as-contract.md) perlu kalimat "tidak ada
  percabangan"-nya diperbarui (sudah dikerjakan di PR ini).

**Yang harus diubah:**

- `prompt-contract.md` (blok `BRANCHING`, versi prompt `story-v2`).
- `mvp-scope.md` (klarifikasi bahwa konsekuensi otomatis bukan larangan).
- `setup.md` / `provider-setup.md` dan `.env.example` (variabel `AI_BRANCHING`).
- `src/ai/prompt.ts`, `src/ai/pipeline.ts`, `src/story/validate-parts.ts`,
  `src/server/config.ts`, dan test terkait.

## Kapan keputusan ini ditinjau ulang

Setelah demo, atau bila dibutuhkan percabangan yang mengubah alur (pilihan
dialog pemain, kondisi lintas chapter). Perubahan seperti itu butuh ADR baru dan
kemungkinan versi schema baru.

## Referensi

- [`0002-story-json-as-contract.md`](0002-story-json-as-contract.md)
- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
