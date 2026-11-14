---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Architecture Decision Records

ADR mencatat **keputusan** dan alasannya, bukan sekadar hasil. Tujuannya agar
agent dan manusia berikutnya tidak mengulang perdebatan yang sama.

## Daftar

| #    | Judul                                                                                                              | Status       | Dampak                |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------ | --------------------- |
| 0001 | [Next.js App Router](0001-nextjs-app-router.md)                                                                    | Accepted     | Seluruh aplikasi      |
| 0002 | [Story JSON sebagai kontrak](0002-story-json-as-contract.md)                                                       | Accepted     | AI, editor, game      |
| 0003 | [Aset tetap dari manifest](0003-fixed-asset-library.md)                                                            | Accepted     | AI, game, aset        |
| 0004 | [Phaser 4.2.1 sebagai engine](0004-phaser-4.md)                                                                    | Accepted     | Game                  |
| 0005 | [Persistence dan storage](0005-persistence-and-storage.md)                                                         | **Proposed** | Backend               |
| 0006 | [Provider AI](0006-ai-provider.md)                                                                                 | **Proposed** | Pipeline              |
| 0007 | [UI hybrid Phaser + DOM](0007-hybrid-ui.md)                                                                        | Accepted     | Game, aksesibilitas   |
| 0008 | [Gerak bebas top-down dalam scene](0008-top-down-movement.md)                                                      | Accepted     | Game                  |
| 0009 | [Resolusi internal dan skala karakter](0009-resolution-and-scale.md)                                               | **Accepted** | Game, aset            |
| 0010 | [Map data-driven dan kamera](0010-map-data-and-camera.md)                                                          | **Accepted** | Game                  |
| 0011 | [Sub-collider prop besar](0011-large-prop-subcollider.md)                                                          | **Accepted** | Game                  |
| 0012 | [Peta ruangan sebagai satu gambar](0012-room-map-image.md)                                                         | Accepted     | Game, aset            |
| 0013 | [Hosting Vercel dan database Turso](0013-hosting-vercel-turso.md)                                                  | Accepted     | Deploy, backend       |
| 0014 | [Auth akun guru dan siswa](0014-auth-akun-guru-siswa.md)                                                           | **Proposed** | Auth, backend         |
| 0015 | [Tabel kelas dan siswa](0015-kelas-dan-siswa.md)                                                                   | **Proposed** | Kelas, backend        |
| 0016 | [Obrolan singkat NPC di luar perannya](0016-obrolan-singkat-npc.md)                                                | Accepted     | Game, cerita          |
| 0017 | [Anggaran pipeline per unit dan reasoning dimatikan](0017-anggaran-pipeline-per-unit.md)                           | Accepted     | AI, pipeline          |
| 0018 | [Plafon output, batas eksplisit outline, dan reasoning default mati](0018-plafon-output-thinking.md)               | Accepted     | AI, pipeline          |
| 0019 | [Percabangan konsekuensi jawaban salah](0019-branching-konsekuensi-jawaban-salah.md)                               | Accepted     | AI, validator, cerita |
| 0020 | [Potret berekspresi ala Persona](0020-potret-ekspresi-persona.md)                                                  | Accepted     | Game, aset, cerita    |
| 0021 | [Kontrol sentuh dan tata letak HP](0021-kontrol-sentuh-hp.md)                                                      | Accepted     | Game, aksesibilitas   |
| 0022 | [Layar penuh, kunci lanskap, dan ketukan responsif](0022-layar-penuh-lanskap.md)                                   | Accepted     | Game, aksesibilitas   |
| 0023 | [Tombol aksi sentuh tetap hidup tanpa sasaran](0023-tombol-aksi-tanpa-sasaran.md)                                  | Accepted     | Game, aksesibilitas   |
| 0024 | [Tombol Bicara dan kontrol yang hilang saat dialog](0024-tombol-bicara-dan-kontrol-saat-dialog.md)                 | Accepted     | Game, aksesibilitas   |
| 0025 | [Jangkauan interaksi luas, menu jeda bergulir, dan bar HUD potret](0025-jangkauan-interaksi-dan-bar-hud-potret.md) | Accepted     | Game, aksesibilitas   |

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

ADR berikut statusnya masih `Proposed` (lihat tabel Daftar di atas):

| Pertanyaan                                  | ADR  | Target                |
| ------------------------------------------- | ---- | --------------------- |
| Persistence sisa: eksekusi job & hasil main | 0005 | Saat butuh produksi   |
| Provider LLM apa?                           | 0006 | Sebelum pipeline      |
| Auth akun guru (ganti kode akses bersama)   | 0014 | Sebelum demo publik   |
| Skema kelas dan siswa                       | 0015 | Sebelum kelas dipakai |

Bagian database dan storage dari ADR 0005 sudah dijawab
[ADR 0013](0013-hosting-vercel-turso.md) yang `Accepted` (Turso/libSQL, tanpa
storage PDF); yang tersisa di 0005 adalah eksekusi job dan penyimpanan hasil
main. ADR 0014 dan 0015 sudah diimplementasikan di kode, tetapi statusnya masih
`Proposed` sampai ditinjau ulang setelah hackathon.

## Aturan

- Satu ADR = satu keputusan.
- Jangan mengedit ADR `Accepted` untuk mengubah keputusan; buat ADR baru yang
  men-`Supersede` yang lama.
- ADR yang `Proposed` **tidak boleh** dijadikan alasan mengunci implementasi.
