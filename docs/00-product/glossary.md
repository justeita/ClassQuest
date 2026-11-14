---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Glosarium

Istilah dipakai konsisten di kode, JSON, dan dokumen. Kalau ingin mengganti nama,
ganti di schema + dokumen + kode sekaligus.

## Istilah produk

| Istilah       | Arti                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| **Materi**    | PDF yang diunggah guru. Sumber isi satu-satunya.                                  |
| **Cerita**    | Hasil konversi materi menjadi game. Direpresentasikan sebagai `Story` (JSON).     |
| **Chapter**   | Bab cerita. Satu chapter = satu konsep materi utama.                              |
| **Scene**     | Adegan di dalam chapter: satu background, satu musik, deretan beat.               |
| **Beat**      | Unit terkecil dalam scene: narasi, dialog, tantangan, atau transisi.              |
| **Tantangan** | Soal/latihan yang muncul di dalam cerita. Disebut `challenge` di kode.            |
| **Cast**      | Daftar karakter yang boleh muncul di cerita.                                      |
| **Manifest**  | Daftar aset yang tersedia beserta id-nya. AI hanya boleh memakai id dari sini.    |
| **Preview**   | Menjalankan cerita versi draft di game yang sama dengan versi siswa.              |
| **Publish**   | Menandai satu versi cerita sebagai versi yang boleh dimainkan siswa.              |
| **Sesi main** | Satu kali siswa memainkan satu cerita.                                            |
| **Fallback**  | Cerita cadangan deterministik yang dipakai bila AI gagal, agar demo tidak kosong. |

Satu hal yang sering tertukar:

- **Materi** = PDF-nya. Tidak punya status, tidak punya versi.
- **Cerita** = record hasil konversi. Punya status, versi, dan tautan yang dibagikan.

Route guru tetap bernama `/guru/materi/[storyId]` demi kompatibilitas URL, tapi
yang ditampilkan di situ adalah **cerita**, bukan PDF-nya. Kalau kamu menulis label
UI, pakai "cerita" untuk hal yang bisa di-publish.

## Istilah teknis

| Istilah              | Arti                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Story schema**     | Kontrak bentuk JSON cerita, versi `1.0`. Lihat `02-data-model/story-schema.md`.                                            |
| **`schemaVersion`**  | Versi schema di dalam JSON. Wajib ada. Perubahan breaking menaikkan versi.                                                 |
| **`assetId`**        | Id aset dari manifest, mis. `bg_classroom_day`, `char_nara`, `bgm_mystery`.                                                |
| **`speakerId`**      | Id karakter dari `cast`, bukan nama tampilan.                                                                              |
| **`conceptTag`**     | Label konsep materi pada tantangan; dipakai untuk ringkasan "perlu diulang".                                               |
| **`beat`**           | Lihat tabel produk. Tipe: `narration`, `dialogue`, `challenge`, `transition`.                                              |
| **`expression`**     | Field opsional beat/varian yang memilih potret pembicara: `neutral`, `happy`, `sad`, `angry`, `shocked`, `thinking`.       |
| **Varian teks**      | `textVariants` pada beat `dialogue`: kalimat alternatif untuk jawaban salah atau flag, boleh membawa `expression` sendiri. |
| **Validator**        | Fungsi yang memeriksa JSON terhadap schema + aturan semantik.                                                              |
| **Repair loop**      | Mengirim error validasi kembali ke AI untuk diperbaiki, dengan batas percobaan.                                            |
| **Outline pass**     | Tahap AI pertama: menentukan chapter dan konsep sebelum menulis isi.                                                       |
| **Generate pass**    | Tahap AI kedua: menulis beat, dialog, dan tantangan per chapter.                                                           |
| **Prompt contract**  | Aturan tetap yang selalu dikirim ke model, termasuk schema dan daftar aset.                                                |
| **Job**              | Proses generasi yang berjalan di server dan punya status sendiri.                                                          |
| **Story version**    | Snapshot cerita setiap kali disimpan; publish menunjuk satu versi.                                                         |
| **ADR**              | Architecture Decision Record, catatan keputusan teknis di `09-decisions/`.                                                 |
| **Proxy**            | Di Next.js 16, pengganti `middleware.ts`. Nama file: `proxy.ts`.                                                           |
| **Server Action**    | Fungsi server yang dipanggil dari client untuk mutasi. Lihat docs Next 16 lokal.                                           |
| **Cache Components** | Fitur Next 16 yang aktif di repo ini (`cacheComponents: true`).                                                            |

## Istilah game

| Istilah            | Arti                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Phaser**         | Framework game 2D HTML5. Proyek ini memakai Phaser 4.2.1, dimuat hanya di halaman game. |
| **Scene (Phaser)** | Objek runtime Phaser (`Phaser.Scene`). Beda dengan "scene" di story JSON!               |
| **Boot scene**     | Scene Phaser untuk memuat aset dan menampilkan progres (di kode: `PreloadScene`).       |
| **Hotspot**        | Area/objek yang bisa diklik untuk memicu interaksi.                                     |
| **Overlay**        | UI DOM (React) di atas canvas, dipakai untuk tantangan dan menu.                        |
| **Pixel art**      | Gaya seni beresolusi rendah; butuh `pixelArt: true` dan `roundPixels: true`.            |
| **Omori-like**     | Arah seni: pixel art, kontras terang-gelap, suasana dreamy/melankolis.                  |

> **Penting:** kata "scene" punya dua arti. Di dokumen cerita, **scene** =
> adegan cerita. Di kode game, `Phaser.Scene` = unit runtime. Kalau ragu, tulis
> "story scene" atau "Phaser scene" secara eksplisit.
