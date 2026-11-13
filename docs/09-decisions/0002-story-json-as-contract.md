---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0002 — Story JSON sebagai Kontrak

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Empat bagian produk perlu sepakat tentang "bentuk cerita":

1. prompt AI (yang menghasilkan),
2. validator (yang memeriksa),
3. editor guru (yang mengubah),
4. game engine (yang memainkan).

Tanpa satu kontrak, setiap bagian akan punya asumsi sendiri dan integrasi menjadi
mimpi buruk — terutama ketika dikerjakan paralel oleh beberapa agent.

## Opsi

| Opsi                                       | Kelebihan                                           | Kekurangan                                     |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------- |
| JSON dengan schema eksplisit (dipilih)     | Satu sumber kebenaran, bisa divalidasi, mudah dites | Kaku; butuh versi                              |
| Markdown terstruktur                       | Mudah ditulis manusia                               | Sulit divalidasi, rawan ambigu                 |
| Skrip game langsung (JS/DSL)               | Fleksibel                                           | Tidak aman untuk output LLM, sulit diedit guru |
| Database relasional penuh (tabel per beat) | Query fleksibel                                     | Over-engineering, migrasi mahal                |

## Keputusan

**Kami memilih satu dokumen JSON dengan schema berversi (`schemaVersion: "1.0"`).**

Alasan:

1. Output LLM bisa divalidasi secara deterministik sebelum disimpan.
2. Guru bisa mengedit lewat form tanpa menyentuh JSON.
3. Engine hanya perlu memahami satu bentuk, sehingga bisa dites tanpa browser.

## Konsekuensi

**Positif:**

- Validator menjadi pusat kualitas; satu perbaikan berlaku untuk semua jalur.
- Kontrak bisa diuji dengan fixture.
- Perubahan bisa dilacak lewat versi schema.

**Negatif / utang:**

- Fleksibilitas cerita terbatas pada bentuk yang didukung. Percabangan sejauh
  ini hanya berupa konsekuensi jawaban salah (soal ulang + detour singkat),
  bukan pilihan dialog pemain; lihat
  [ADR 0019](0019-branching-konsekuensi-jawaban-salah.md).
- Setiap fitur naratif baru butuh perubahan schema + ADR.
- Perlu disiplin: jangan menyimpan metadata internal (status, versi, pemilik) di
  dalam JSON.

**Yang harus diubah:**

- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)
- `src/story/schema.ts`, `validate.ts`, dan fixture.

## Kapan ditinjau ulang

Jika guru perlu menambah struktur (chapter/scene) sendiri, atau butuh
percabangan di luar konsekuensi jawaban salah.

## Referensi

- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../02-data-model/story.example.json`](../02-data-model/story.example.json)
