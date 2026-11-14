---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Batas MVP

Dokumen ini adalah **kontrak scope**. Kalau sebuah ide tidak ada di bagian
"In scope", ide itu tidak dikerjakan sampai MVP selesai dan demo aman.

## Definition of Done (MVP)

MVP dianggap selesai jika alur ini berjalan tanpa intervensi manual:

1. Guru upload PDF berisi teks.
2. Sistem menghasilkan cerita JSON valid dengan minimal **3 chapter**.
3. Guru bisa mengedit teks dan soal, lalu menyimpan.
4. Guru bisa preview.
5. Siswa bisa memainkan game sampai selesai dan melihat hasil.
6. Seluruh aset yang tampil berasal dari manifest.
7. `bun run check` dan `bun run build` lolos.

## In scope

| Area              | Yang dikerjakan                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload            | Satu file PDF per cerita, metadata minimal                                                                                                                  |
| Ekstraksi         | Teks dari PDF digital (bukan scan)                                                                                                                          |
| AI                | Outline + generate JSON + validasi + repair + fallback                                                                                                      |
| Cerita            | 3–6 chapter, tiap chapter 2–6 scene, tiap scene 3–10 beat                                                                                                   |
| Tantangan         | `multiple_choice`, `true_false`, `ordering`, `short_answer`                                                                                                 |
| Editor guru       | Edit teks, pilih aset dari daftar, edit soal & jawaban, urutkan scene                                                                                       |
| Preview           | Preview dalam game yang sama dengan yang dipakai siswa                                                                                                      |
| Game              | Alur linear per chapter dengan eksplorasi top-down per scene (map dummy, ADR 0008), gerak 4 arah + collision, interaksi NPC memicu dialog, tantangan, hasil |
| Aset              | Sprite karakter, background, musik, SFX, UI — jumlah terbatas                                                                                               |
| Penyimpanan lokal | Progres siswa di `localStorage`                                                                                                                             |
| Kelas & siswa     | Guru membuat kelas dan menambah siswa (nama + NIS opsional); kode `QST-XXXX` hanya label                                                                    |
| Persistence       | Satu database libSQL/Turso; PDF tidak disimpan (ADR 0013)                                                                                                   |
| Akses             | Tautan publik, tanpa akun siswa. Kode kelas hanya label; alur "siswa memasukkan kode": **backlog**                                                          |
| Deployment        | Satu environment (production demo)                                                                                                                          |

## Out of scope (tegas)

- Login/akun siswa, SSO sekolah, integrasi Google Classroom.
- Multiplayer, leaderboard global, kelas real-time.
- Nilai, rapor, analitik guru mendalam (hanya ringkasan hasil per sesi).
- OCR untuk PDF hasil scan (boleh disebut sebagai backlog).
- AI membuat gambar, musik, suara, atau animasi baru.
- Voice-over / text-to-speech.
- Percabangan cerita dinamis (pilihan dialog yang mengubah alur). Konsekuensi
  otomatis dari jawaban salah (soal ulang + detour singkat) bukan bagian dari
  larangan ini.
- Editor visual drag-and-drop untuk peta/tilemap.
- Mobile app native.
- Internasionalisasi UI (teks UI Indonesia; isi cerita mengikuti materi).
- Aksesibilitas penuh (screen reader untuk canvas) — hanya best effort, lihat
  [`../04-game/accessibility.md`](../04-game/accessibility.md).

## Cut line (urutan yang dikorbankan saat waktu kurang)

Korbankan dari atas, bukan dari bawah.

1. `short_answer` dan `ordering` → sisakan `multiple_choice` + `true_false`.
2. Preview terpisah → cukup tombol "mainkan versi draft".
3. Ringkasan hasil di server → cukup tampil lokal.
4. Musik per scene → satu musik per chapter.
5. Animasi transisi → cut/fade sederhana.
6. Edit urutan scene → cukup edit teks & soal.
7. Kode kelas dipakai siswa untuk bergabung → cukup tautan. (Kode `QST-XXXX`
   tetap dibuat sebagai label kelas, tetapi tidak dipakai untuk bergabung.)
8. Ringkasan `weakConcepts` lintas sesi → cukup ringkasan per sesi.

Riwayat versi **tidak** ada di cut line. Setiap simpan di server selalu membuat
baris `story_versions` baru (lihat
[`../06-backend/persistence.md`](../06-backend/persistence.md)); "satu versi +
undo di client" akan bertentangan dengan itu, jadi jangan dijanjikan.

Yang **tidak boleh** dikorbankan:

- Validasi + fallback (tanpa ini demo bisa kosong).
- Review/edit guru (ini inti nilai produk).
- Game bisa dimainkan end-to-end.
- Semua aset yang direferensikan benar-benar ada.

## Skenario demo (3 menit)

Naskah lengkapnya ada di satu tempat:
[`../10-roadmap/demo-script.md`](../10-roadmap/demo-script.md). Jangan menyalin
versi lain di sini — dua naskah yang berbeda adalah cara tercepat membuat
presentasi kacau.

Yang penting dari sisi scope: demo harus memperlihatkan **upload → generate →
review/edit → publish → main → layar hasil**, dan punya cerita cadangan yang sudah
tersimpan kalau generasi langsung gagal.

## Backlog (setelah MVP)

- OCR PDF scan.
- Percabangan dialog.
- Analitik per konsep untuk guru.
- Bank cerita yang bisa dipakai ulang antar kelas.
- Ekspor/impor cerita JSON untuk berbagi antar guru.
- Mode "siswa membuat cerita" dari rangkuman.
