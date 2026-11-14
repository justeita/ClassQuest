---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0043 — Route Demo Dipindah ke `/demo`

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0042](0042-kode-kelas-masuk-game.md)

## Konteks

Halaman demo Phaser tinggal di `/game` sejak awal, ketika route itu juga menjadi
satu-satunya pintu siswa. Setelah [ADR 0042](0042-kode-kelas-masuk-game.md),
pintu siswa adalah `/play` dan `/play/[storyId]`; `/game` tinggal demo. Nama itu
sekarang membingungkan karena tiga hal memakai kata "game":

- `/game` — halaman demo publik,
- `/guru/game` — koleksi game guru di portal,
- `src/game/` — kode Phaser.

Landing page bahkan sempat menautkan "Arena Siswa" ke `/game`, sehingga demo
terlihat seperti pintu siswa resmi.

## Keputusan

1. **Halaman demo pindah ke `/demo`.** Berkas `src/app/game/page.tsx` menjadi
   `src/app/demo/page.tsx`; metadata dan perilakunya tidak berubah (menu utama +
   `DEMO_STORY`, `noindex`).
2. **`/guru/game` tidak berubah.** Itu halaman portal guru, bukan route siswa.
3. **Semua tautan ke demo memakai `/demo`:** tombol "Coba demo tanpa kode kelas"
   di gerbang `/play`, pintu "Arena Siswa" di halaman 404, dan komentar/dokumen
   yang menyebut route ini.
4. **Tidak ada redirect dari `/game`.** Route lama tidak lagi ada; tautan lama
   ke `/game` menjadi 404. Demo bukan pintu masuk resmi dan sudah `noindex`,
   jadi bookmark lama tidak perlu dipertahankan.

## Konsekuensi

- Nama route sekarang menyatakan fungsinya: `/demo` = coba permainan tanpa
  kelas; `/play` = masuk dengan kode kelas atau tautan guru.
- `/game` tidak lagi menampilkan apa pun. Kalau nanti redirect dibutuhkan untuk
  tautan lama, tambahkan `src/app/game/page.tsx` berisi `redirect("/demo")` dan
  catat sebagai keputusan baru.
- Dokumen dan komentar yang menyebut halaman demo harus memakai `/demo`; jangan
  tertukar dengan `/guru/game` atau `src/game/`.

## Alternatif yang ditolak

- **Tetap `/game` dan hanya memperjelas label.** Nama route tetap bertabrakan
  dengan `/guru/game` dan folder `src/game`, sehingga tautan mudah salah tulis.
- **Redirect `/game` → `/demo`.** Menambah satu route yang harus dirawat untuk
  halaman demo yang tidak diindeks mesin pencari; belum ada tautan publik yang
  perlu dilestarikan.
