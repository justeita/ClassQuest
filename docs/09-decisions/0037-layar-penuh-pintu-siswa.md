---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0037 - Layar Penuh Mendatar dari Pintu Siswa

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (memperluas [ADR 0025](0025-layar-penuh-lanskap.md),
  tidak membatalkannya)

## Konteks

[ADR 0025](0025-layar-penuh-lanskap.md) menambah tombol "Layar penuh" di layar
judul dan HUD. Pemain ponsel melaporkan langkah tambahan itu terasa mengganggu:
dari halaman utama, satu ketukan pada "Masuk sebagai siswa" idealnya langsung
membuka permainan penuh dan mendatar, seperti game ponsel lain.

Batasan:

- **Permintaan harus dari gestur.** Fullscreen API dan `screen.orientation.lock`
  hanya berjalan bila dipanggil di dalam penanganan klik/ketuk. Setelah navigasi
  atau `await` sebelumnya, peramban menolaknya.
- **Tanpa dependensi baru.** Cukup API peramban yang sudah dipakai ADR 0025.
- **Jangan merusak klik tab baru.** Ctrl/Cmd/Shift/klik tengah pada tautan tetap
  harus membuka tab baru tanpa memaksa layar penuh di tab saat ini.
- **Tetap jujur soal dukungan.** Safari iPhone tidak punya Fullscreen API untuk
  elemen; di sana permintaan dilewati tanpa error dan permainan tetap jalan.

## Opsi

| Opsi                                                              | Kelebihan                                   | Kekurangan                                         | Biaya |
| ----------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- | ----- |
| A. Tautan "Masuk sebagai siswa" meminta layar penuh lalu navigasi | Tetap dalam gestur; satu ketukan; tanpa lib | Tautan kartu jadi komponen klien                   | Kecil |
| B. Minta layar penuh setelah halaman game ter-mount               | Tidak perlu mengubah kartu                  | Ditolak peramban: bukan lagi gestur pengguna       | Kecil |
| C. Pertahankan tombol manual saja                                 | Tidak ada perubahan                         | Keluhan langkah tambahan tetap ada                 | Nol   |
| D. Paksa lanskap lewat CSS atau saran "putar layar"               | Nol tombol                                  | Tidak bisa; sudah ditolak di ADR 0024 dan ADR 0025 | —     |

## Keputusan

Kami memilih **A**.

1. Kartu "Arena Siswa" memakai `TautanLayarPenuh`: `onClick` memanggil
   `masukLayarPenuhLanskap()` sebelum navigasi `next/link` berjalan. Karena
   navigasi App Router tidak mengganti dokumen, layar penuh bertahan saat
   halaman game terbuka.
2. Fungsi permintaan dipindah ke `src/game/layarPenuh.ts` dan dipakai bersama
   tombol "Layar penuh"; urutan layar penuh → kunci lanskap tetap best-effort,
   masing-masing dengan penanganan gagalnya sendiri.
3. Klik dengan tombol pengubah dilewati supaya tab baru tetap wajar.
4. Bila peramban tidak mendukung (`document.fullscreenEnabled` palsu), permintaan
   dilewati; tidak ada tombol mati maupun pesan error.

## Konsekuensi

**Positif:**

- Sekali ketuk dari halaman utama langsung membuka permainan penuh mendatar.
- Satu sumber logika permintaan layar penuh untuk tombol dan tautan; perilaku
  keluar layar penuh tidak berubah.

**Negatif / utang:**

- Halaman utama kini memuat satu komponen klien kecil (`TautanLayarPenuh`),
  walaupun sisa halaman tetap Server Component statis.
- Di peramban tanpa dukungan penuh, hasilnya sama saja dengan sebelumnya:
  pemain memutar ponsel sendiri.

**Yang harus diubah:**

- `src/game/layarPenuh.ts` — `masukLayarPenuhLanskap`.
- `src/components/game/useLayarPenuh.ts` — memakai fungsi bersama.
- `src/components/landing/TautanLayarPenuh.tsx` (baru).
- `src/app/(landing)/page.tsx` — kartu "Arena Siswa".
- `src/game/layarPenuh.test.ts`,
  `src/components/landing/TautanLayarPenuh.test.tsx` — tes perilaku baru.
- [`../05-frontend/routes.md`](../05-frontend/routes.md),
  [`../05-frontend/game-player.md`](../05-frontend/game-player.md), dan
  [`../04-game/accessibility.md`](../04-game/accessibility.md).

## Kapan keputusan ini ditinjau ulang

- Jika pemain mengeluh layar penuh otomatis justru mengganggu saat hanya ingin
  melihat demo sebentar.
- Jika peramban mulai mewajibkan penanganan izin tambahan untuk kunci orientasi.

## Referensi

- [ADR 0025](0025-layar-penuh-lanskap.md) — tombol layar penuh dan kunci lanskap.
- [ADR 0024](0024-kontrol-sentuh-hp.md) — tata letak HP dan kontrol sentuh.
- [`../05-frontend/routes.md`](../05-frontend/routes.md) — route `/game` dan
  tautan landing.
