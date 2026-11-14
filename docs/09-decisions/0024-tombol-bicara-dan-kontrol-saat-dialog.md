---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0024 — Tombol Bicara Selalu Berlabel "Bicara" dan Kontrol Hilang Saat Dialog

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menyesuaikan butir 2 [ADR 0021](0021-kontrol-sentuh-hp.md)
  dan butir 3 [ADR 0023](0023-tombol-aksi-tanpa-sasaran.md), tidak membatalkannya)

## Konteks

Setelah tombol aksi sentuh diperbaiki lewat [ADR 0023](0023-tombol-aksi-tanpa-sasaran.md),
pemain mencoba lagi dan melaporkan dua hal di ponsel:

1. **Label "·" di tombol tanpa sasaran membingungkan.** Tombolnya kini hidup dan
   bisa ditekan, tetapi tulisan "·" membuat pemain tidak yakin itu tombol apa.
   Pemain justru mengharapkan tombol yang sama-sama bertuliskan "Bicara".
2. **Kontrol menutupi dialog.** Selama dialog, joystick dan tombol aksi tetap
   tampil dan menutupi teks cerita. Pemain ingin keduanya hilang saat bercerita.

Batasan yang mengikat:

- **Tetap konsisten dengan papan tombol.** Lanjut dialog di desktop sudah bisa
  lewat `Space`/`Enter`, dan kotak dialog di layar memang bisa diketuk; tidak ada
  aksi yang benar-benar hilang bila tombol sentuh disembunyikan.
- **Tanpa dependensi baru** dan tetap menjaga aksesibilitas (nama tombol harus
  mengandung label yang terlihat, WCAG 2.5.3).

## Opsi

| Opsi                                                      | Kelebihan                 | Kekurangan                                     | Biaya  |
| --------------------------------------------------------- | ------------------------- | ---------------------------------------------- | ------ |
| A. Label "Bicara" + sembunyikan kontrol saat dialog       | Konsisten; dialog lega    | Lanjut dialog harus diketuk di kotak           | Kecil  |
| B. Pertahankan "·" dan biarkan kontrol tampil saat dialog | Nol kerja                 | Bingung di ponsel; kontrol menutupi teks       | Nol    |
| C. Sembunyikan hanya joystick, sisakan tombol "Lanjut"    | Lanjut tetap satu ketukan | Tombol masih menutupi teks dialog              | Kecil  |
| D. Kecilkan/mindahkan kontrol ke tepi saat dialog         | Kontrol tetap ada         | Tata letak makin rumit; tetap menutupi sesuatu | Sedang |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Tombol aksi selalu berlabel "Bicara".** Tidak ada lagi label "·" maupun mode
   "Lanjut": menyala saat ada warga di jangkauan, redup saat belum ada. Nama
   aksesibelnya "Bicara dengan warga" (ada sasaran) atau "Bicara" (belum ada), jadi
   selalu memuat label yang terlihat.
2. **Kontrol sentuh disembunyikan selama dialog.** Joystick dan tombol aksi tidak
   dirender bila `dialog.visible` benar; lanjut dialog dilakukan dengan mengetuk
   kotak dialog di layar.
3. **Command tetap satu jalur.** Tombol hanya mengirim `interact`; jalur `advance`
   dari sentuh dihapus karena sudah dicakup ketukan kotak dialog (DOM) dan
   `Space`/`Enter` (papan tombol).

## Konsekuensi

**Positif:**

- Layar dialog bersih di ponsel; teks cerita tidak lagi tertutup kontrol.
- Label tombol konsisten — pemain tahu tombol itu "Bicara" kapan pun.
- Aksesibilitas terjaga: nama tombol selalu memuat teks yang terlihat.

**Negatif / utang:**

- Lanjut dialog di ponsel bergantung pada ketukan kotak dialog; bila kotak dialog
  suatu saat tidak lagi menerima ketukan, tidak ada tombol cadangan.
- Ini menyimpang dari butir 2 ADR 0021 dan butir 3 ADR 0023, jadi ketiganya harus
  dibaca bersama-sama.

**Yang harus diubah:**

- `src/components/game/TouchControls.tsx` — label tetap "Bicara", konteks
  `"bicara" | null`, tanpa mode "Lanjut".
- `src/components/game/GameCanvas.tsx` — sembunyikan kontrol saat dialog dan
  sederhanakan `aksiSentuh`/`kirimAksiSentuh`.
- `src/components/game/TouchControls.test.tsx` dan
  `src/components/game/GameShell.test.tsx` — tes perilaku baru.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md),
  [`../04-game/accessibility.md`](../04-game/accessibility.md), dan
  [`../05-frontend/game-player.md`](../05-frontend/game-player.md).

## Kapan keputusan ini ditinjau ulang

- Jika pemain mengeluh tidak menemukan cara lanjut dialog di ponsel.
- Jika dialog kembali perlu tombol tersendiri karena kotak dialog berubah.

## Referensi

- [ADR 0021](0021-kontrol-sentuh-hp.md) — kontrol sentuh dan tata letak HP.
- [ADR 0023](0023-tombol-aksi-tanpa-sasaran.md) — tombol aksi yang tetap hidup.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#input-sentuh) —
  perilaku input sentuh di dalam loop permainan.
