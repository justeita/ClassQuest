---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0026 — Desain HUD Seragam dengan Kotak Dialog dan Tombol Bicara Menjauh dari Tepi

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menyesuaikan butir desain HUD pada
  [ADR 0025](0025-jangkauan-interaksi-dan-bar-hud-potret.md), tidak membatalkannya)

## Konteks

Setelah tata letak HUD dipindah ke bar bawah di potret
([ADR 0025](0025-jangkauan-interaksi-dan-bar-hud-potret.md)), pemain mencoba lagi
di desktop dan ponsel lalu melaporkan empat keluhan tampilan:

1. **Petunjuk "Tahan untuk mempercepat" mengganggu.** Keterangan di atas panel
   dialog itu terasa berisik; tombol "Percepat" di HUD sudah cukup jelas.
2. **Tombol HUD di desktop terasa kecil.** Di layar lebar tombolnya sama persis
   dengan versi HP, padahal ruangnya jauh lebih lega.
3. **Desain HUD tidak seragam dengan kotak dialog.** Tombol HUD bergaya hijau
   gelap bersudut tegas, sedangkan kotak dialog navy gelap bersudut membulat —
   keduanya tampak dari keluarga visual yang berbeda.
4. **Tombol "Bicara" terpotong tepi layar di lanskap.** Posisinya terlalu mepet
   sudut kanan bawah sehingga sebagian badan tombol tertutup tepi.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Semua perbaikan cukup dengan kelas utilitas CSS yang
  sudah ada.
- **Perubahan ukuran hanya di desktop.** Di HP tombol HUD sudah pas dan tidak
  boleh membesar supaya tidak menghabiskan ruang.
- **Perubahan desain berlaku di mana-mana.** Keseragaman dengan kotak dialog
  diinginkan baik di desktop maupun HP.

## Opsi

| Opsi                                                                     | Kelebihan                          | Kekurangan                                | Biaya  |
| ------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------- | ------ |
| A. Hapus petunjuk, satukan desain HUD, besarkan di desktop, geser Bicara | Menjawab keempat keluhan sekaligus | HUD kehilangan penanda gaya lama          | Sedang |
| B. Hanya hapus petunjuk                                                  | Perubahan paling kecil             | Tiga keluhan lain tetap ada               | Kecil  |
| C. Samakan desain dan besarkan di semua perangkat                        | Konsisten dan seragam              | Tombol membesar di HP, ruang jadi sesak   | Sedang |
| D. Geser seluruh sudut (joystick + Bicara)                               | Paling sederhana                   | Joystick ikut bergeser dari posisi nyaman | Kecil  |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Petunjuk "Tahan untuk mempercepat" dihapus.** Komponen `SkipHint` dan
   pemakaiannya dibuang; tombol dan pintasan `Tab` tetap berfungsi seperti biasa,
   dan `SpeedLines` tetap menyala saat time-lapse berjalan sebagai umpan balik.
2. **Desain tombol HUD disatukan mengikuti panel kotak dialog.** Latar navy gelap
   `#0f172b`, bingkai tipis putih transparan, sudut membulat, dan teks terang
   `#EFF2F7`; gaya bersama tinggal di `gayaHud.ts` sehingga varian `overlay` dan
   `bar` memakai desain yang sama (menggantikan gaya cerah khusus bar).
3. **Tombol HUD diperbesar hanya di desktop.** Varian `overlay` menambah padding,
   jarak, dan ukuran huruf pada breakpoint `lg` (≥1024px); ukuran dasar di HP dan
   varian `bar` potret tidak berubah.
4. **Tombol "Bicara" digeser menjauh dari sudut di lanskap.** Wadah kontrol
   mengapung memberi margin ekstra ke kiri dan ke atas (`mr-6 mb-6`) supaya badan
   tombol tidak lagi terpotong tepi layar. Dek potret tidak diubah.

## Konsekuensi

**Positif:**

- HUD dan kotak dialog terlihat sebagai satu bahasa visual di semua perangkat.
- Tombol HUD di desktop lebih nyaman diklik; di HP tetap hemat ruang.
- Tombol "Bicara" tidak lagi terpotong tepi di lanskap.
- Bahasa UI lebih bersih tanpa petunjuk yang berulang.

**Negatif / utang:**

- Tombol HUD kini navy di atas bar bawah yang gelap; kontras tetap dari teks
  terang, tetapi tidak lagi "kertas terang" seperti sebelumnya.
- `gayaHud.ts` memikul dua ukuran (dasar dan `lg`) yang harus dijaga sinkron.

**Yang harus diubah:**

- `src/components/game/gayaHud.ts` — desain bersama navy dan ukuran `lg`.
- `src/components/game/TombolLayarPenuh.tsx` — ikon ikut membesar di desktop.
- `src/components/game/TouchControls.tsx` — margin tombol "Bicara" di lanskap.
- `src/components/game/GameCanvas.tsx` — pemakaian `SkipHint` dibuang.
- `src/components/game/SkipHint.tsx` — dihapus.
- `src/components/game/GameShell.test.tsx`, `TouchControls.test.tsx` — tes
  disesuaikan.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) dan
  [`../04-game/accessibility.md`](../04-game/accessibility.md).

## Kapan keputusan ini ditinjau ulang

- Jika tombol HUD navy kurang kontras terhadap latar bar di perangkat tertentu.
- Jika pemain mengeluh tombol HUD desktop yang besar justru menutupi dunia.
- Jika posisi baru tombol "Bicara" mengganggu jangkauan jempol di lanskap.

## Referensi

- [ADR 0021](0021-kontrol-sentuh-hp.md) — kontrol sentuh dan tata letak HP.
- [ADR 0023](0023-tombol-aksi-tanpa-sasaran.md) — tombol aksi yang tetap hidup.
- [ADR 0024](0024-tombol-bicara-dan-kontrol-saat-dialog.md) — tombol Bicara dan
  kontrol yang hilang saat dialog.
- [ADR 0025](0025-jangkauan-interaksi-dan-bar-hud-potret.md) — jangkauan
  interaksi, menu jeda bergulir, dan bar HUD potret.
