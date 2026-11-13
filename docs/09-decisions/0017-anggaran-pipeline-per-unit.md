---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0017 — Anggaran pipeline per unit dan reasoning dimatikan

- **Status:** Accepted
- **Tanggal:** 2026-11-13
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —

## Konteks

Pengukuran pipeline dengan provider nyata (task 25f, skrip lokal
`scripts/measure-branching.local.ts`) menemukan dua sebab pipeline selalu jatuh
ke `buildFallbackStory` walau modelnya mampu menulis cerita:

1. **Anggaran output habis untuk reasoning.** Model reasoning di balik
   `AI_PROVIDER=openai-compatible` (mis. `deepseek-v4.1-flash:free` via router)
   mengisi `reasoning_content` sebelum `content`. Pada permintaan outline
   (`maxOutputTokens = 1.500`, lihat
   [`prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)) hasilnya:
   `finish_reason: "length"`, `content` 0–282 karakter, `reasoning_content`
   5.104 karakter. Dua percobaan JSON gagal → `outline-invalid` → fallback.
   Dengan parameter `thinking: { type: "disabled" }`, outline yang sama menjadi
   valid dalam 7,6 detik dengan 3.127 karakter dan 0 token reasoning.
2. **Repair dihitung per cerita, bukan per unit.** Model nyata menghasilkan
   satu error mekanis per chapter (terukur: `E_TRANSITION_LAST` pada chapter
   pertama). Satu repair memperbaikinya, tetapi jatah `MAX_REPAIRS_PER_STORY = 2`
   habis di chapter kedua atau ketiga, sedangkan satu cerita punya 3–6 chapter.
   Hasilnya `chapter-invalid` di tengah cerita.

Keduanya bertabrakan dengan kontrak lama di
[`pipeline.md`](../03-ai-pipeline/pipeline.md) dan
[`jobs-and-limits.md`](../06-backend/jobs-and-limits.md): 12 panggilan LLM,
2 repair per cerita, deadline 120 detik. Batas itu benar untuk model yang patuh
skema sekali jalan, tetapi menolak model yang butuh satu putaran koreksi per
unit — justru pola "agent dengan batasan" yang diinginkan.

Batasan nyata: jumlah panggilan dan waktu harus tetap terbatas agar biaya dan
demo terkendali; validator tetap satu-satunya pintu; tidak ada editor alur baru.

## Opsi

| Opsi                                                | Kelebihan                                        | Kekurangan                                                      | Biaya  |
| --------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | ------ |
| A. Ganti model non-reasoning                        | Perubahan paling kecil                           | Kualitas/karakter narasi berbeda; tidak bisa dikontrol kode     | 0      |
| B. Loop per unit + matikan reasoning, dengan plafon | Model nyata bisa lolos; pemakaian tetap dibatasi | Deadline dan jumlah panggilan naik; butuh docs + test           | Rendah |
| C. Biarkan per cerita + fallback                    | Kontrak lama tidak berubah                       | Pipeline produksi praktis selalu fallback untuk model reasoning | 0      |

## Keputusan

**Kami memilih B.**

Alasan utama:

1. **Error nyata bersifat per unit, bukan per cerita.** Satu chapter yang gagal
   mekanis tidak boleh menghabiskan jatah chapter lain. Jatah repair dipindah
   ke level chapter, dengan repair tingkat cerita tetap punya jatah sendiri.
2. **Pemakaian tetap dipagari.** Bukan loop tak terbatas: plafon panggilan LLM
   dinaikkan 12 → 18, deadline 120 → 240 detik, timeout per panggilan tetap
   60 detik, output per panggilan tetap 4.000 token, dan sebelum panggilan baru
   sisa waktu harus ≥ 30 detik. Lewat salah satu batas → fallback.
3. **Reasoning dimatikan secara eksplisit, bukan diasumsikan.** Provider
   `openai-compatible` mengirim `thinking: { type: "disabled" }` **hanya** bila
   `AI_DISABLE_THINKING=on`. Default tetap perilaku lama supaya provider yang
   tidak mengenal parameter itu tidak berubah.

Asumsi yang perlu diingat: parameter `thinking` adalah ekstensi gateway, bukan
bagian dari spesifikasi chat completions. Bila gateway tidak mengenalnya, isi
`AI_DISABLE_THINKING` tetap kosong dan model dianggap tidak reasoning.

## Konsekuensi

**Positif:**

- Model reasoning dengan gateway yang mendukung `thinking` bisa dipakai tanpa
  mengganti model atau menulis ulang pipeline.
- Kegagalan mekanis satu chapter tidak menjatuhkan seluruh cerita.
- Semua batas tetap angka eksplisit dan dapat dites.

**Negatif / utang:**

- Demo bisa terasa lebih lama: waktu terburuk kira-kira 240 + 60 detik.
- Panggilan LLM naik (batas atas 18), jadi biaya per cerita maksimum lebih
  besar bila provider berbayar.
- `AI_DISABLE_THINKING` menambah satu variabel lingkungan yang harus
  didokumentasikan.

**Yang harus diubah:**

- `src/ai/pipeline.ts` — konstanta anggaran dan jatah repair per chapter.
- `src/server/config.ts` — toggle `AI_DISABLE_THINKING`.
- `src/ai/providers/openai-compatible.ts` — kirim `thinking: disabled`.
- `.env.example`, `docs/03-ai-pipeline/pipeline.md`,
  `docs/03-ai-pipeline/validation-and-repair.md`,
  `docs/03-ai-pipeline/provider-setup.md`,
  `docs/06-backend/jobs-and-limits.md`.
- Test: `pipeline.test.ts`, `config.test.ts`, `openai-compatible.test.ts`.

## Kapan keputusan ini ditinjau ulang

Setelah demo, atau bila biaya/latensi per cerita menjadi masalah. Bila provider
menyediakan `response_format` JSON schema yang benar-benar memaksa bentuk, loop
repair per unit ini bisa diperkecil lagi.

## Referensi

- [`../03-ai-pipeline/pipeline.md`](../03-ai-pipeline/pipeline.md)
- [`../03-ai-pipeline/validation-and-repair.md`](../03-ai-pipeline/validation-and-repair.md)
- [`../06-backend/jobs-and-limits.md`](../06-backend/jobs-and-limits.md)
- [ADR 0019](0019-branching-konsekuensi-jawaban-salah.md) — fitur yang diukur
