---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0028 - Jangkauan Interaksi Luas, Menu Jeda Bergulir, dan Bar HUD Potret

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menyesuaikan butir tata letak [ADR 0024](0024-kontrol-sentuh-hp.md),
  [ADR 0026](0026-tombol-aksi-tanpa-sasaran.md), dan [ADR 0027](0027-tombol-bicara-dan-kontrol-saat-dialog.md),
  tidak membatalkannya)

## Konteks

Setelah kontrol sentuh dan tombol aksi diperbaiki
([ADR 0026](0026-tombol-aksi-tanpa-sasaran.md),
[ADR 0027](0027-tombol-bicara-dan-kontrol-saat-dialog.md)), pemain mencoba lagi di
ponsel dan melaporkan empat keluhan tata letak:

1. **Jangkauan interaksi NPC terlalu sempit.** Pemain harus menempel persis ke
   sprite warga sebelum tombol "Bicara" menyala.
2. **Menu jeda keluar layar di lanskap ponsel.** Tinggi viewport lanskap sangat
   pendek, sedangkan panel menu lebih tinggi dari layar, sehingga pilihan bawah
   terpotong dan tidak bisa dijangkau.
3. **HUD menutupi dunia di layar potret.** Kanvas 16:9 selebar layar potret hanya
   setinggi ±56% layar, jadi deretan tombol HUD di dalamnya menutupi sebagian
   besar gambar.
4. **Tombol "Percepat" (skip) terasa mati di peramban ponsel.** Menahan jempol
   membuat jari bergeser beberapa piksel; `pointerleave` lalu tersulut dan
   time-lapse berhenti sendiri hampir seketika.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Perbaikan harus memakai API peramban yang sudah ada.
- **Tetap aksesibilitas.** Tombol HUD tetap harus kontras dan punya nama yang
  terbaca; teks dialog yang diperkecil tetap di atas batas keterbacaan.
- **Deteksi perangkat sudah ada.** `useSentuh` dan `useLayarPotret` sudah dipakai
  game; keputusan ini hanya mengubah tata letak yang bergantung padanya.

## Opsi

| Opsi                                                                 | Kelebihan                          | Kekurangan                                    | Biaya  |
| -------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------- | ------ |
| A. Perluas zona, menu bisa digulir, HUD ke bar potret + skip capture | Menjawab keempat keluhan sekaligus | Lebih banyak state tata letak di `GameCanvas` | Sedang |
| B. Hanya perluas zona interaksi                                      | Perubahan paling kecil             | Tiga keluhan lain tetap ada                   | Kecil  |
| C. Perbaiki tiap keluhan dengan angka lokal di komponen              | Cepat                              | Angka tercecer; HUD dan quest cepat melenceng | Sedang |
| D. Paksa lanskap penuh sebagai satu-satunya tata letak ponsel        | Tidak perlu tata letak potret      | Safari iPhone tidak mendukung kunci orientasi | Sedang |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Zona interaksi NPC diperluas ke 44 px** (`ZONA_RADIUS`), dengan histeresis
   keluar 8 px seperti sebelumnya. Angka ini masih membuat NPC terdekat yang
   menang bila dua berdekatan, tetapi pemain tidak lagi harus menempel.
2. **Menu jeda selalu bisa digulir.** Wadah menu memakai `overflow-y-auto` +
   `overscroll-contain`, dan panelnya `m-auto` supaya tetap center saat muat dan
   mulai dari atas saat tidak. Tidak ada pilihan yang benar-benar hilang di
   lanskap pendek.
3. **Tombol HUD pindah ke bar bawah di luar kanvas saat potret.** Prop `letak`
   (`overlay` | `bar`) dipakai bersama `Hud`, `QuestTracker`, dan
   `TombolLayarPenuh`; gaya tombol disatukan di `gayaHud.ts`. Di `bar` tombol
   memakai gaya **cerah** (kertas terang + teks gelap) karena latar halaman di
   bawah kanvas hitam.
4. **Teks dialog diperkecil di potret.** Prop `kecil` pada `DialogueBox`
   menurunkan ukuran nama dan teks agar tidak cepat melimpah dari kotak 16:9
   yang sempit.
5. **Tombol "Percepat" memantau pelepasan dari `window`.** `pointerup`,
   `pointercancel`, `touchend`, `touchcancel`, dan `blur` semuanya
   menghentikan time-lapse, sementara listener `touchmove` non-passive menahan
   gulir selama tombol ditahan. Peramban ponsel dapat mengubah ketukan-tahan
   menjadi gestur gulir — memancarkan `pointercancel` dan berhenti mengirim
   `pointerup` — jadi mengandalkan `pointerup` elemen saja membuat tombol terasa
   mati. `pointerleave` sengaja tidak dipakai supaya jitter jempol tidak
   mematikan time-lapse.

## Konsekuensi

**Positif:**

- Berinteraksi dengan warga jauh lebih nyaman; skip berjalan selama jempol
  ditahan, bukan berhenti sendiri.
- Tidak ada lagi pilihan menu jeda yang tak terjangkau di lanskap pendek.
- Layar potret bersih: dunia tidak tertutup HUD, dan dialog tetap terbaca.

**Negatif / utang:**

- `GameCanvas` kini memegang dua jalur render HUD (overlay dan bar); keduanya
  harus dijaga tetap sinkron saat tombol HUD berubah.
- Zona interaksi 44 px bisa sedikit menumpuk dengan objek dekat; urutan "yang
  terdekat menang" tetap menjadi penjaga.
- Tombol cerah khusus dipakai di bar potret, jadi tema HUD tidak lagi seragam
  antara lanskap dan potret.

**Yang harus diubah:**

- `src/game/interaction.ts` — `ZONA_RADIUS` 44.
- `src/components/game/gayaHud.ts` (baru), `HUD.tsx`, `QuestTracker.tsx`,
  `TombolLayarPenuh.tsx`, `DialogueBox.tsx` — prop `letak`/`kecil` dan gaya
  bersama.
- `src/components/game/TombolPercepat.tsx` (baru) — tahan-lepas lintas peramban.
- `src/components/game/GameCanvas.tsx` — `hudBawah` dan bar bawah di luar kanvas.
- `src/components/game/PauseMenu.tsx` — gulir pada layar pendek.
- `src/components/game/GameShell.test.tsx`, `DialogueBox.test.tsx`,
  `TombolPercepat.test.tsx`, `src/game/interaction.test.ts` — tes perilaku baru.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md),
  [`../04-game/accessibility.md`](../04-game/accessibility.md), dan
  [`../05-frontend/game-player.md`](../05-frontend/game-player.md).

## Kapan keputusan ini ditinjau ulang

- Jika pemain mengeluh zona 44 px membuat interaksi "magnet" yang salah sasaran.
- Jika bar HUD bawah di potret justru menutupi konten penting atau menghabiskan
  ruang layar yang sempit.
- Jika ada laporan keterbacaan teks dialog kecil di perangkat beresolusi rendah.

## Referensi

- [ADR 0024](0024-kontrol-sentuh-hp.md) — kontrol sentuh dan tata letak HP.
- [ADR 0026](0026-tombol-aksi-tanpa-sasaran.md) — tombol aksi yang tetap hidup.
- [ADR 0027](0027-tombol-bicara-dan-kontrol-saat-dialog.md) — tombol Bicara dan
  kontrol yang hilang saat dialog.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md#responsif) —
  tata letak responsif pemutar game.
