---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0026 — Mode Permainan Dipilih Guru

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0002](0002-story-json-as-contract.md),
  [0017](0017-anggaran-pipeline-per-unit.md)

## Konteks

Sampai sekarang pipeline selalu menghasilkan bentuk yang sama: cerita dengan
tantangan yang diselipkan. Guru tidak punya cara memilih apakah materinya lebih
cocok diceritakan, lebih cocok diujikan, atau keduanya.

Kebutuhan nyata di lapangan berbeda-beda. Materi sejarah atau proses alam sering
lebih kuat sebagai cerita yang menjelaskan. Materi hafalan dan latihan soal lebih
berguna sebagai kuis beruntun. Guru ingin menentukan bentuk itu sebelum generasi,
bukan menambal setelah cerita jadi.

Batasan yang mengikat:

- `Story` adalah kontrak dengan `additionalProperties: false`, jadi bentuk baru
  harus lewat schema dan ADR ([0002](0002-story-json-as-contract.md)).
- `meta.tone` sudah menjadi preseden: parameter guru yang membentuk isi ikut
  tersimpan di cerita, bukan hanya di record job.
- Anggaran pipeline (18 panggilan, 240 detik) tidak berubah; mode hanya
  mengubah isi prompt, bukan jumlah tahap.
- Validator sudah punya aturan bentuk yang tidak boleh dilanggar: 3–6 chapter,
  2–6 scene per chapter, 3–10 beat per scene, dan setiap scene sebaiknya punya
  tantangan (`W_NO_CHALLENGE_IN_SCENE`).

## Opsi

| Opsi | Kelebihan | Kekurangan | Biaya |
| ---- | --------- | ---------- | ----- |
| A. Mode hanya parameter job | Cepat; tidak menyentuh schema | Setelah generasi selesai, mode hilang dari artefak; editor dan halaman review tidak tahu cerita ini kuis atau cerita | Kecil |
| B. Mode di `Story.meta.mode` | Artefak cerita menjelaskan dirinya sendiri; editor, preview, dan ekspor kelak bisa membacanya; konsisten dengan `meta.tone` | Perlu ADR, perubahan schema, dan sinkronisasi dokumen | Sedang |
| C. Mode mengubah struktur `Story` (tipe cerita berbeda) | Paling eksplisit | Perubahan kontrak besar, validator dan game harus bercabang, risiko tinggi di hari code freeze | Besar |

## Keputusan

Kami memilih **B**: mode disimpan sebagai field opsional baru
`Story.meta.mode` dengan nilai `"menjelaskan" | "pertanyaan" | "mix"`.
`schemaVersion` tetap `"1.0"` karena penambahannya additive dan cerita lama tetap
sah.

Alasan utama:

1. Mode adalah keputusan guru yang membentuk isi, sama seperti `tone`; karena itu
   ia pantas tercatat di cerita, bukan hanya di log job.
2. Cerita lama tanpa `mode` tetap valid. Untuk tampilan, cerita tanpa `mode`
   diperlakukan sebagai `mix`, tetapi **tidak** ditulis ulang.
3. Mode tidak mengubah bentuk `Story`. Ia hanya mengubah instruksi TASK di
   prompt, jumlah chapter/tantangan yang diminta, dan isi cerita cadangan,
   sehingga validator dan game tidak perlu bercabang.

**Guru wajib memilih.** Tidak ada nilai default di form maupun di server:
permintaan upload tanpa `mode` yang sah ditolak `400 INVALID_INPUT`. Default
implisit akan membuat guru tidak sadar bentuk game yang dihasilkan.

Arti tiap mode:

| Mode         | Bentuk yang diminta                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `menjelaskan` | Cerita utuh: 3–6 chapter, tantangan 1–2 per chapter, fokus pada alur dan penjelasan konsep lewat adegan.             |
| `pertanyaan` | Kuis padat, cerita tipis: tepat 3 chapter, 3–4 tantangan per chapter, tiap tantangan didahului 1–2 beat pengantar.   |
| `mix`        | Gabungan: cerita agak lebih panjang dari `pertanyaan` (4–6 chapter), tantangan 2–3 per chapter, penjelasan tetap ada. |

## Konsekuensi

**Positif:**

- Guru mengendalikan bentuk game sebelum generasi, sesuai kebutuhan materi.
- Mode terlihat di artefak cerita dan bisa ditampilkan di halaman review.
- Tidak ada perubahan pada validator, game, atau `schemaVersion`.

**Negatif / utang:**

- Tiga jalur prompt menambah permukaan yang harus dites dan dijaga.
- Cerita lama tanpa `mode` ambigu: tampil sebagai `mix`, tetapi tidak pernah
  benar-benar dibuat sebagai `mix`.
- `pertanyaan` dengan 3 chapter membatasi materi panjang; konsep pendukung harus
  masuk lewat `conceptTag`, bukan chapter tambahan.

**Yang harus diubah:**

- `docs/02-data-model/story.schema.json` dan `story-schema.md` (`meta.mode`).
- `src/story/schema.ts` (`storyMetaSchema`, tipe `StoryMode`).
- `src/ai/prompt.ts` (TASK per mode, `PROMPT_VERSION` naik).
- `src/ai/pipeline.ts` dan `src/story/fallback.ts` (mode ikut ke prompt,
  `assemble`, dan cerita cadangan).
- `src/app/api/upload/route.ts` dan `src/server/jobs/run.ts` (field wajib).
- `src/components/guru/AiStudio.tsx` (pemilih mode tanpa default).
- `docs/03-ai-pipeline/prompt-contract.md`, `generation-rules.md`,
  `docs/06-backend/api-contract.md`, `docs/05-frontend/teacher-dashboard.md`.

## Kapan keputusan ini ditinjau ulang

Setelah demo, bila guru meminta mode tambahan (mis. "hanya kuis tanpa cerita")
atau bila data pemakaian menunjukkan satu mode hampir tidak pernah dipilih.

## Referensi

- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../06-backend/api-contract.md`](../06-backend/api-contract.md)
- [`0024-emosi-per-varian-jawaban.md`](0024-emosi-per-varian-jawaban.md) —
  preseden field additive di schema.
