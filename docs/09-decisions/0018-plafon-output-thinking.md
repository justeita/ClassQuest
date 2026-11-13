---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0018 — Plafon output, batas eksplisit outline, dan reasoning default mati

- **Status:** Accepted
- **Tanggal:** 2026-11-13
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** sebagian [ADR 0017](0017-anggaran-pipeline-per-unit.md) — angka plafon output dan asumsi "reasoning dimatikan"

## Konteks

[ADR 0017](0017-anggaran-pipeline-per-unit.md) menaikkan jatah repair per unit
dan menyediakan `AI_DISABLE_THINKING=on` untuk mematikan reasoning. Pengukuran
lanjutan dengan `deepseek-v4.1-flash:free` memberi fakta terukur:

| Skenario (outline)                       | `max_tokens` | Hasil                                                                |
| ---------------------------------------- | ------------ | -------------------------------------------------------------------- |
| thinking hidup, prompt sekarang          | 3.000        | `finish_reason: "length"`, `content` kosong → JSON gagal (3/3)       |
| thinking hidup, prompt sekarang          | 8.000        | `finish=stop`, JSON lengkap tapi `E_TEXT_TOO_LONG concepts[i]` (3/3) |
| thinking hidup, prompt + batas eksplisit | 8.000        | **valid 2/2**, ~29–31 s                                              |
| thinking mati, prompt sekarang           | 1.500        | valid 2/3; 1/3 gagal `cast[].role` di luar enum                      |

Dua akar masalah:

1. **Plafon terlalu kecil saat thinking hidup.** Model mengisi
   `reasoning_content` 6.000–14.000 karakter sebelum `content`; plafon lama
   (1.500 outline, 4.000 sisanya) menghabiskannya untuk reasoning sehingga
   `content` kosong → `outline-invalid` → fallback.
2. **`BATAS OUTLINE` kurang eksplisit.** Batas 60 karakter untuk setiap
   `concepts` dan enum `role` (`player|mentor|npc|antagonist`) tidak pernah
   disebut, sehingga model yang verbose melanggar schema.

Setelah keduanya diperbaiki, pengukuran end-to-end dengan thinking hidup lolos
outline dan chapter, tetapi berakhir `budget-exhausted`: tiap panggilan 25–45 s,
dan satu cerita 6 chapter butuh ~500 s. Batas itu bertabrakan dengan arsitektur:
job generasi berjalan di `after()` pada invocation upload yang sama, dibatasi
`maxDuration = 300` detik, dan watchdog `JOB_STALE_AFTER_SECONDS = 330`.
Menaikkan deadline berarti menaikkan `maxDuration` (batas fungsi hosting,
lihat [ADR 0013](0013-hosting-vercel-turso.md)) dan watchdog.

Batasan nyata: validator tetap satu-satunya pintu; demo 3 menit; deploy Vercel
dengan batas fungsi 300 detik; biaya token bukan kendala (keputusan user).

## Opsi

| Opsi                                                                           | Kelebihan                             | Kekurangan                                     | Biaya  |
| ------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------- | ------ |
| A. Reasoning mati default, plafon + prompt diperbaiki                          | Muat deadline/hosting; cepat (~2 mnt) | Tidak memakai penalaran model                  | Rendah |
| B. Reasoning hidup + naikkan deadline & `maxDuration`                          | Memakai penalaran                     | Perlu batas fungsi >300 s (Fluid compute/plan) | Sedang |
| C. Pindahkan job ke worker/queue ([ADR 0005](0005-persistence-and-storage.md)) | Job panjang tanpa batas invocation    | Perubahan arsitektur besar                     | Tinggi |

## Keputusan

**Kami memilih A untuk default runtime, dengan plafon dan batas eksplisit dari
perbaikan tetap dipasang.**

Alasan utama:

1. **Plafon 8.000 dan batas eksplisit tetap berguna di kedua mode.** Keduanya
   memperbaiki kepatuhan schema; keduanya juga membuat jalur reasoning-hidup
   tidak lagi selalu `finish_reason: "length"`.
2. **Batas waktu hosting menentukan default.** Dengan `maxDuration = 300` dan
   watchdog 330 s, reasoning-hidup (~500 s) tidak akan selesai; karena itu
   `AI_DISABLE_THINKING=on` menjadi default operasional (dipasang di
   `.env.local`).
3. **Jalur reasoning-hidup tetap terbuka, tidak dikunci.** Operator bisa
   mengosongkan `AI_DISABLE_THINKING` di lingkungan yang batas fungsinya lebih
   longgar; pipeline sudah menyiapkannya.

Asumsi: `max_tokens` 8.000 didukung gateway (`finish_reason: "stop"`), dan
parameter `thinking` adalah ekstensi gateway (bukan spesifikasi chat
completions).

## Konsekuensi

**Positif:**

- Pipeline produksi muat dalam deadline 240 detik dan batas fungsi 300 detik.
- Dua bug lama terangkat: plafon terlalu kecil dan `BATAS OUTLINE` yang tidak
  menyebut batas/`enum`.

**Negatif / utang:**

- Cerita dibuat tanpa penalaran model; kualitas RP sepenuhnya bergantung pada
  prompt. Kalau mutu terasa kurang, jalur perbaikan adalah opsi B atau C,
  bukan menaikkan deadline diam-diam.
- Plafon 8.000 lebih longgar dari kebutuhan mode thinking-mati (sekadar jaring
  aman), jadi biaya token worst-case sedikit lebih besar.

**Yang harus diubah:**

- `src/ai/prompt.ts` — `PROMPT_VERSION = "story-v4"`,
  `PROMPT_MAX_OUTPUT_TOKENS = 8_000`, batas eksplisit `BATAS OUTLINE`.
- `src/ai/pipeline.ts` — `MAX_OUTPUT_TOKENS = 8_000`.
- `.env.local` / `.env.example` — `AI_DISABLE_THINKING=on` sebagai default
  operasional untuk model reasoning.
- `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/pipeline.md`,
  `docs/03-ai-pipeline/validation-and-repair.md`,
  `docs/03-ai-pipeline/provider-setup.md`,
  `docs/06-backend/jobs-and-limits.md`.

## Kapan keputusan ini ditinjau ulang

Kalau demo butuh mutu penalaran: pindahkan job keluar dari `after()` (ADR 0005)
atau pakai plan hosting dengan batas fungsi >300 s, lalu kosongkan
`AI_DISABLE_THINKING` dan naikkan deadline secara eksplisit lewat ADR baru.

## Referensi

- [ADR 0017 — anggaran pipeline per unit](0017-anggaran-pipeline-per-unit.md).
- [`prompt-contract.md`](../03-ai-pipeline/prompt-contract.md).
- `scripts/measure-branching.local.ts` (skrip lokal, tidak di-commit).
