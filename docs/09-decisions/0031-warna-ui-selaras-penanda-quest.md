---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0031 - Warna UI selaras dengan penanda quest dan penunjuk tangan SVG

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menyesuaikan:** butir warna pada [ADR 0029](0029-desain-hud-dan-tombol-bicara.md)
  dan butir warna serta penunjuk pada
  [ADR 0030](0030-desain-tantangan-seragam-dialog.md); arsitektur kedua ADR itu
  (token bersama, penunjuk di luar kotak, fit text) tetap berlaku.

## Konteks

ADR 0029 dan 0030 menyatukan HUD, dialog, dan kotak tantangan memakai palet
**navy `#0f172b` + teks `#EFF2F7` + aksen teal `#55D0A5`**. Setelah dipakai, dua
masalah muncul:

1. **Palet tidak seragam dengan penanda quest.** Kotak `!` dan `Space` di atas
   NPC sudah lebih dulu memakai keluarga **latar gelap `#0b120e` + aksen oranye
   `#E8A87C`** dengan sudut membulat. Karena itu HUD dan dialog terlihat seperti
   dua bahasa visual yang berbeda dari penanda quest, padahal keduanya muncul
   berdampingan di layar yang sama.
2. **Penunjuk pilihan masih kurang jelas.** Segitiga penunjuk dari border CSS
   (ADR 0030) bergantung pada ukuran tetap yang kecil dan tidak mudah dikenali
   sebagai penunjuk; pemain meminta penanda yang lebih tegas.
3. **Sudut dan scrollbar belum konsisten.** Kotak `!`/`Space` masih bersudut
   tegas, sedangkan jendela **buku catatan** dan **menu jeda** memakai bingkai
   kotak tanpa membulat dan **scrollbar bawaan peramban** yang warnanya di luar
   palet game.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Penunjuk digambar sendiri, bukan ikon dari paket.
- **Hanya warna dan bentuk permukaan** yang boleh berubah pada HUD dan dialog;
  tata letak, ukuran, dan perilakunya tetap.
- **Perilaku tidak berubah.** Navigasi keyboard, pengiriman jawaban, fokus, alur
  buka/tutup menu, dan pembekuan dunia tetap sama.

## Opsi

| Opsi                                                 | Kelebihan                          | Kekurangan                             | Biaya  |
| ---------------------------------------------------- | ---------------------------------- | -------------------------------------- | ------ |
| A. Samakan token dengan penanda quest + penunjuk SVG | Seragam, presisi, tanpa dependensi | Menyentuh banyak komponen UI sekaligus | Sedang |
| B. Pertahankan navy + teal, hanya perjelas penunjuk  | Perubahan paling kecil             | Konsistensi dengan penanda quest gagal | Kecil  |
| C. Pakai ikon tangan dari paket ikon pihak ketiga    | Cepat, banyak pilihan bentuk       | Menambah dependensi dan ukuran bundel  | Sedang |
| D. Biarkan scrollbar bawaan peramban                 | Tanpa kode CSS tambahan            | Warna di luar palet, terlihat asing    | Kecil  |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Palet bersama mengikuti kotak penanda quest.** Token di `gayaDialog.ts`
   (`KOTAK_DIALOG`, `KOTAK_DIALOG_AKTIF`, `KOTAK_DIALOG_HOVER`,
   `KOTAK_DIALOG_FOKUS`) memakai latar `#0b120e`, bingkai dan aksen oranye
   `#E8A87C`, serta teks krem terang `#F7F4EC`. Karena `gayaHud.ts`,
   `DialogueBox.tsx`, dan `ChallengeOverlay.tsx` membaca token yang sama, warna
   HUD, dialog, dan kotak tantangan ikut berubah tanpa disentuh satu per satu.
   Warna status kartu umpan balik tetap (`#6F9B7A` benar, `#C9A227` belum tepat).
2. **Penunjuk pilihan menjadi tangan menunjuk (glove) SVG.** Komponen lokal
   `Penunjuk` di `ChallengeOverlay.tsx` menggambar telapak krem dengan outline
   gelap dan manset oranye, dipakai **semua tipe soal** (opsi kolom/baris/kartu,
   pengurutan, dan di depan input `short_answer`). Arah `bawah` memutar 90° untuk
   kartu; keadaan tidak aktif tetap `opacity-0` agar tata letak tidak bergeser.
   Opsi C ditolak: SVG digambar sendiri, jadi tanpa dependensi.
3. **Kotak penanda quest dibulatkan.** `KotakSeru` (`!`) dan `KotakSpace` diberi
   `rounded-md` supaya sejalan dengan tombol HUD dan kotak dialog yang membulat.
4. **Buku catatan dan menu jeda diperbagus dan dibulatkan.** Keduanya memakai
   kartu `rounded-2xl` dengan garis aksen oranye, dan area gulirnya memakai kelas
   **`.scrollbar-tema`** di `globals.css` (`scrollbar-width`/`scrollbar-color`
   untuk Firefox, `::-webkit-scrollbar*` untuk Chromium/Safari/Edge) dengan jalur
   `#0b120e` dan ibu jari `#E8A87C` — menggantikan scrollbar bawaan peramban.
5. **Perilaku tidak berubah.** Yang berubah hanya warna, pembulatan permukaan,
   bentuk penunjuk, dan tampilan scrollbar.

## Konsekuensi

**Positif:**

- HUD, dialog, kotak tantangan, penanda quest, buku catatan, dan menu jeda
  tampil sebagai satu bahasa visual: gelap + oranye + sudut membulat.
- Penunjuk pilihan lebih tegas dan tidak bergantung pada metrik font.
- Warna bersama tetap hanya diubah di satu tempat (`gayaDialog.ts`).

**Negatif / utang:**

- `gayaDialog.ts` kini jadi ketergantungan bersama lebih banyak komponen;
  mengubahnya berdampak luas.
- Scrollbar bertema memakai dua jalur (standar dan `-webkit-`) yang harus
  dijaga bersama.

**Yang harus diubah:**

- `src/components/game/gayaDialog.ts` — nilai token palet baru.
- `src/components/game/DialogueBox.tsx` — warna panel, nama, dan indikator lanjut.
- `src/components/game/ChallengeOverlay.tsx` — warna kotak jawaban dan komponen
  `Penunjuk` (tangan SVG).
- `src/components/game/NpcMarker.tsx` & `KotakSpace.tsx` — penanda quest membulat.
- `src/components/game/PauseMenu.tsx` & `DialogueLog.tsx` — kartu membulat dan
  scrollbar bertema.
- `src/app/globals.css` — kelas `.scrollbar-tema`.
- Tes warna di `ChallengeOverlay.test.tsx` dan `GameShell.test.tsx`.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) dan
  [`../04-game/accessibility.md`](../04-game/accessibility.md).

## Kapan keputusan ini ditinjau ulang

- Jika penunjuk tangan SVG terlihat kabur di layar ber-DPI rendah.
- Jika aksen oranye kehilangan kontras pada perangkat tertentu.
- Jika scrollbar bertema berperilaku beda di peramban yang dipakai sekolah.

## Referensi

- [ADR 0029](0029-desain-hud-dan-tombol-bicara.md) — desain HUD seragam dengan
  kotak dialog.
- [ADR 0030](0030-desain-tantangan-seragam-dialog.md) — desain tantangan seragam
  dan penunjuk pilihan.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) — dokumen hidup
  UI pemutar game.
