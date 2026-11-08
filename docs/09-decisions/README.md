---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Architecture Decision Records

ADR mencatat **keputusan** dan alasannya, bukan sekadar hasil. Tujuannya agar
agent dan manusia berikutnya tidak mengulang perdebatan yang sama.

## Daftar

| #    | Judul                                                        | Status       | Dampak              |
| ---- | ------------------------------------------------------------ | ------------ | ------------------- |
| 0001 | [Next.js App Router](0001-nextjs-app-router.md)              | Accepted     | Seluruh aplikasi    |
| 0002 | [Story JSON sebagai kontrak](0002-story-json-as-contract.md) | Accepted     | AI, editor, game    |
| 0003 | [Aset tetap dari manifest](0003-fixed-asset-library.md)      | Accepted     | AI, game, aset      |
| 0004 | [Phaser 4.2.1 sebagai engine](0004-phaser-4.md)              | Accepted     | Game                |
| 0005 | [Persistence dan storage](0005-persistence-and-storage.md)   | **Proposed** | Backend             |
| 0006 | [Provider AI](0006-ai-provider.md)                           | **Proposed** | Pipeline            |
| 0007 | [UI hybrid Phaser + DOM](0007-hybrid-ui.md)                  | Accepted     | Game, aksesibilitas |

## Status

| Status     | Arti                                         |
| ---------- | -------------------------------------------- |
| Proposed   | Sedang dipertimbangkan; belum mengikat       |
| Accepted   | Mengikat; perubahan butuh ADR baru           |
| Superseded | Digantikan ADR lain (sebutkan nomornya)      |
| Rejected   | Ditolak; simpan alasannya agar tidak diulang |

## Kapan membuat ADR

Buat ADR bila keputusan:

- mengubah kontrak (`Story`, API, route),
- menambah dependency besar,
- memilih vendor/layanan,
- mengubah arsitektur (mis. menambah worker, mengubah rendering),
- sulit dibalik (data, biaya, keamanan).

Tidak perlu ADR untuk: rename variabel, perbaikan bug, penambahan test.

## Alur

1. Salin [`template.md`](./template.md) menjadi `NNNN-judul-singkat.md`.
2. Isi konteks, opsi, keputusan, konsekuensi.
3. Ubah status menjadi `Proposed`.
4. Diskusikan di PR.
5. Setelah disepakati, ubah ke `Accepted` dan perbarui dokumen terkait.

## Keputusan yang masih terbuka

| Pertanyaan                            | ADR  | Target              |
| ------------------------------------- | ---- | ------------------- |
| Database & storage apa?               | 0005 | Sebelum backend     |
| Provider LLM apa?                     | 0006 | Sebelum pipeline    |
| Auth guru seperti apa?                | 0005 | Setelah demo        |
| Job async pakai `after()` atau queue? | 0005 | Saat butuh produksi |

## Aturan

- Satu ADR = satu keputusan.
- Jangan mengedit ADR `Accepted` untuk mengubah keputusan; buat ADR baru yang
  men-`Supersede` yang lama.
- ADR yang `Proposed` **tidak boleh** dijadikan alasan mengunci implementasi.
