---
status: tbd
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# 0006 — Provider AI

- **Status:** Proposed (belum diputuskan)
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Pipeline butuh model yang:

- bisa menghasilkan JSON yang bisa dipaksa,
- punya konteks ≥ 32k token,
- cukup cepat (< 60 detik per chapter),
- bisa dipanggil dari Node runtime tanpa SDK aneh,
- biayanya terkendali untuk hackathon.

## Opsi

| Opsi               | Kelebihan                           | Kekurangan                          |
| ------------------ | ----------------------------------- | ----------------------------------- |
| Google Gemini      | Free tier, JSON mode, konteks besar | Kuota berubah, kualitas bervariasi  |
| OpenAI             | Structured Outputs andal            | Berbayar                            |
| Anthropic Claude   | Narasi bagus, patuh instruksi       | Berbayar, JSON lewat tool/instruksi |
| OpenRouter/gateway | Banyak model, mudah ganti           | Markup, lapisan tambahan            |
| Ollama lokal       | Gratis, privat, offline             | Lambat, JSON lemah                  |

## Rekomendasi

Satu provider cloud dengan JSON mode + `MockProvider` untuk test. Pilihan akhir
ditentukan setelah eksperimen kecil:

1. Jalankan 2 materi fixture dengan 2 kandidat.
2. Ukur: JSON valid rate, jumlah repair, waktu, biaya.
3. Pilih yang lolos validasi paling sering, bukan yang paling murah.

## Konsekuensi apa pun pilihannya

**Wajib:**

- Output tetap divalidasi (JSON mode bukan jaminan schema).
- Kunci hanya di server.
- `MockProvider` tersedia agar test dan onboarding tidak butuh kunci.
- Semua panggilan lewat satu antarmuka `LlmProvider`.

**Yang harus diubah:**

- Status ADR menjadi `Accepted`.
- `docs/03-ai-pipeline/provider-setup.md` status menjadi `stable`.
- `.env.example` diisi nama variabel final.

## Kapan ditinjau ulang

Setelah demo, atau jika biaya/kuota menjadi masalah.

## Referensi

- [`../03-ai-pipeline/provider-setup.md`](../03-ai-pipeline/provider-setup.md)
- [`../03-ai-pipeline/validation-and-repair.md`](../03-ai-pipeline/validation-and-repair.md)
