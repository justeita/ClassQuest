---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Architecture Decision Records

ADR mencatat **keputusan** dan alasannya, bukan sekadar hasil. Tujuannya agar
agent dan manusia berikutnya tidak mengulang perdebatan yang sama.

## Daftar

| #    | Judul                                                                                                                     | Status       | Dampak                |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------- |
| 0001 | [Next.js App Router](0001-nextjs-app-router.md)                                                                           | Accepted     | Seluruh aplikasi      |
| 0002 | [Story JSON sebagai kontrak](0002-story-json-as-contract.md)                                                              | Accepted     | AI, editor, game      |
| 0003 | [Aset tetap dari manifest](0003-fixed-asset-library.md)                                                                   | Accepted     | AI, game, aset        |
| 0004 | [Phaser 4.2.1 sebagai engine](0004-phaser-4.md)                                                                           | Accepted     | Game                  |
| 0005 | [Persistence dan storage](0005-persistence-and-storage.md)                                                                | **Proposed** | Backend               |
| 0006 | [Provider AI](0006-ai-provider.md)                                                                                        | **Proposed** | Pipeline              |
| 0007 | [UI hybrid Phaser + DOM](0007-hybrid-ui.md)                                                                               | Accepted     | Game, aksesibilitas   |
| 0008 | [Gerak bebas top-down dalam scene](0008-top-down-movement.md)                                                             | Accepted     | Game                  |
| 0009 | [Resolusi internal dan skala karakter](0009-resolution-and-scale.md)                                                      | **Accepted** | Game, aset            |
| 0010 | [Map data-driven dan kamera](0010-map-data-and-camera.md)                                                                 | **Accepted** | Game                  |
| 0011 | [Sub-collider prop besar](0011-large-prop-subcollider.md)                                                                 | **Accepted** | Game                  |
| 0012 | [Peta ruangan sebagai satu gambar](0012-room-map-image.md)                                                                | Accepted     | Game, aset            |
| 0013 | [Hosting Vercel dan database Turso](0013-hosting-vercel-turso.md)                                                         | Accepted     | Deploy, backend       |
| 0014 | [Auth akun guru dan siswa](0014-auth-akun-guru-siswa.md)                                                                  | **Proposed** | Auth, backend         |
| 0015 | [Tabel kelas dan siswa](0015-kelas-dan-siswa.md)                                                                          | **Proposed** | Kelas, backend        |
| 0016 | [Obrolan singkat NPC di luar perannya](0016-obrolan-singkat-npc.md)                                                       | Accepted     | Game, cerita          |
| 0017 | [Anggaran pipeline per unit dan reasoning dimatikan](0017-anggaran-pipeline-per-unit.md)                                  | Accepted     | AI, pipeline          |
| 0018 | [Plafon output, batas eksplisit outline, dan reasoning default mati](0018-plafon-output-thinking.md)                      | Accepted     | AI, pipeline          |
| 0019 | [Percabangan konsekuensi jawaban salah](0019-branching-konsekuensi-jawaban-salah.md)                                      | Accepted     | AI, validator, cerita |
| 0020 | [Kutipan jawaban siswa di dialog](0020-kutipan-jawaban-siswa-di-dialog.md)                                                | Accepted     | AI, validator, cerita |
| 0021 | [Varian dialog per jawaban salah](0021-varian-dialog-per-jawaban-salah.md)                                                | Accepted     | AI, validator, cerita |
| 0022 | [Pemain mengucapkan jawabannya di dialog](0022-pemain-mengucapkan-jawaban-di-dialog.md)                                   | Accepted     | AI, game, cerita      |
| 0023 | [Potret berekspresi ala Persona](0023-potret-ekspresi-persona.md)                                                         | Accepted     | Game, aset, cerita    |
| 0024 | [Kontrol sentuh dan tata letak HP](0024-kontrol-sentuh-hp.md)                                                             | Accepted     | Game, aksesibilitas   |
| 0025 | [Layar penuh, kunci lanskap, dan ketukan responsif](0025-layar-penuh-lanskap.md)                                          | Accepted     | Game, aksesibilitas   |
| 0026 | [Tombol aksi sentuh tetap hidup tanpa sasaran](0026-tombol-aksi-tanpa-sasaran.md)                                         | Accepted     | Game, aksesibilitas   |
| 0027 | [Tombol Bicara dan kontrol yang hilang saat dialog](0027-tombol-bicara-dan-kontrol-saat-dialog.md)                        | Accepted     | Game, aksesibilitas   |
| 0028 | [Jangkauan interaksi luas, menu jeda bergulir, dan bar HUD potret](0028-jangkauan-interaksi-dan-bar-hud-potret.md)        | Accepted     | Game, aksesibilitas   |
| 0029 | [Desain HUD seragam dengan kotak dialog dan tombol Bicara menjauh dari tepi](0029-desain-hud-dan-tombol-bicara.md)        | Accepted     | Game, aksesibilitas   |
| 0030 | [Desain tantangan seragam dengan kotak dialog dan penunjuk pilihan yang presisi](0030-desain-tantangan-seragam-dialog.md) | Accepted     | Game, aksesibilitas   |
| 0031 | [Warna UI selaras dengan penanda quest dan penunjuk tangan SVG](0031-warna-ui-selaras-penanda-quest.md)                   | Accepted     | Game, aksesibilitas   |
| 0032 | [Emosi per varian jawaban](0032-emosi-per-varian-jawaban.md)                                                              | Accepted     | AI, validator, cerita |
| 0033 | [Pemilihan pembicara menurut keahlian](0033-pemilihan-pembicara-keahlian.md)                                              | Accepted     | AI, prompt            |
| 0034 | [Mode permainan dipilih guru](0034-mode-permainan.md)                                                                     | Accepted     | AI, cerita, backend   |
| 0035 | [Penempatan tokoh tetap di desa](0035-penempatan-tokoh-tetap.md)                                                          | Accepted     | AI, prompt            |
| 0036 | [Menu jeda dua kolom di lanskap pendek](0036-menu-jeda-dua-kolom.md)                                                      | Accepted     | Game, aksesibilitas   |
| 0037 | [Layar penuh mendatar dari pintu siswa](0037-layar-penuh-pintu-siswa.md)                                                  | Accepted     | Game, aksesibilitas   |
| 0038 | [Soal tantangan diketik lebih dulu, jawaban menyusul](0038-soal-diketik-lalu-jawaban.md)                                  | Accepted     | Game, aksesibilitas   |
| 0039 | [Sebaran pembicara antar tokoh](0039-sebaran-pembicara.md)                                                                | Accepted     | AI, validator, cerita |
| 0040 | [Latar dunia desa di prompt](0040-latar-dunia-desa-di-prompt.md)                                                          | Accepted     | AI, prompt, cerita    |
| 0041 | [Profil tokoh untuk prompt](0041-profil-tokoh-untuk-prompt.md)                                                            | Accepted     | AI, prompt, cerita    |
| 0042 | [Kode kelas sebagai jalan masuk game](0042-kode-kelas-masuk-game.md)                                                      | Accepted     | Game, backend         |
| 0043 | [Route demo dipindah ke `/demo`](0043-route-demo-ke-demo.md)                                                              | Accepted     | Route, game           |
| 0044 | [Masuk game dengan NIS dan konfirmasi nama lengkap](0044-masuk-dengan-nis.md)                                             | Accepted     | Game, backend         |

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
