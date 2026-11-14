---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0027 — Desain tantangan seragam dengan kotak dialog dan penunjuk pilihan yang presisi

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (menyesuaikan butir desain bersama pada
  [ADR 0026](0026-desain-hud-dan-tombol-bicara.md), tidak membatalkannya)

## Konteks

[ADR 0026](0026-desain-hud-dan-tombol-bicara.md) menyatukan **tombol HUD** dengan
bahasa visual panel kotak dialog navy (`#0f172b`, bingkai tipis putih transparan,
sudut membulat, teks `#EFF2F7`). Setelah itu pemain memeriksa bagian **tantangan**
dan menemukan tiga hal:

1. **Kotak soal dan kotak jawaban masih hijau gelap.** Opsi pilihan, kartu jawaban
   matriks, dan kartu umpan balik setelah dijawab masih memakai panel hijau
   `#14201a` dengan bingkai tebal `#F7F4EC`, jadi berbeda dari kotak dialog dan HUD
   yang kini navy.
2. **UI setelah menjawab terasa terpisah.** Kartu umpan balik "Tepat/Belum tepat"
   tidak tampak satu keluarga dengan sisa dialog.
3. **Penunjuk pilihan kurang jelas.** Segitiga penunjuk masih memakai glyph `▶`
   yang ukurannya bergantung metrik font dan warnanya gelap di atas dunia yang
   bisa gelap, sehingga sulit dibaca — meleset dari prinsip HCI soal penanda fokus
   yang harus jelas dan presisi.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Cukup kelas utilitas CSS dan border CSS.
- **Satu bahasa visual.** Kotak soal, kotak jawaban, kartu umpan balik, dan HUD
  harus terbaca sebagai satu keluarga dengan kotak dialog.
- **Penunjuk tetap di luar kotak** dan tidak boleh menggeser tata letak saat
  keadaan aktif/idle berganti.

## Opsi

| Opsi                                                  | Kelebihan                          | Kekurangan                              | Biaya  |
| ----------------------------------------------------- | ---------------------------------- | --------------------------------------- | ------ |
| A. Token bersama + penunjuk dari border CSS           | Seragam, presisi, tanpa dependensi | Satu modul token baru yang harus dijaga | Sedang |
| B. Salin kelas navy langsung ke tiap elemen tantangan | Perubahan lokal, tanpa modul baru  | Warna tersebar, rawan menyimpang lagi   | Kecil  |
| C. Biarkan hijau, perjelas penunjuk saja              | Perubahan paling kecil             | Konsistensi dengan dialog/HUD gagal     | Kecil  |
| D. Tukar segitiga dengan ikon SVG dari paket ikon     | Bebas bentuk                       | Menambah dependensi dan ukuran bundel   | Sedang |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Token kotak dialog jadi sumber bersama.** Kelas navy bersama diletakkan di
   `gayaDialog.ts` (`KOTAK_DIALOG`, `KOTAK_DIALOG_AKTIF`, `KOTAK_DIALOG_HOVER`,
   `KOTAK_DIALOG_FOKUS`) dan dipakai `gayaHud.ts` serta `ChallengeOverlay.tsx`.
   Keadaan diam dan aktif dipilih lewat **percabangan**, bukan menumpuk dua kelas
   warna Tailwind yang bentrok.
2. **Kotak jawaban, kartu matriks, kartu umpan balik, dan tombol aksi tantangan
   memakai token yang sama.** Petunjuk pintasan dan tombol "Lewati" juga navy;
   aksen aksi memakai teal `#55D0A5` yang sama dengan nama di kotak dialog.
3. **Penunjuk pilihan digambar dari border CSS**, bukan glyph `▶`. Komponen lokal
   `Penunjuk` menghasilkan segitiga tajam berukuran tetap (lebar 10, tinggi 14),
   krem terang dengan bayangan gelap tipis, arah `kanan` (daftar) atau `bawah`
   (kartu), dan `opacity-0` saat tidak aktif supaya tata letak tidak bergeser.
4. **Perilaku tidak berubah.** Navigasi keyboard, pengiriman jawaban, penyembunyian
   pilihan setelah dinilai, dan alur lanjut tetap sama; yang berubah hanya tampilan.

## Konsekuensi

**Positif:**

- Kotak soal, kotak jawaban, kartu umpan balik, dan HUD tampil sebagai satu bahasa
  visual dengan kotak dialog.
- Penunjuk pilihan lebih tajam dan tetap terbaca di latar terang maupun gelap.
- Warna bersama hanya diubah di satu tempat (`gayaDialog.ts`).

**Negatif / utang:**

- `gayaDialog.ts` menjadi ketergantungan bersama HUD dan tantangan; mengubahnya
  berdampak ke dua tempat sekaligus.
- Umpan balik tetap memakai warna status (`#6F9B7A` benar, `#C9A227` belum tepat)
  yang berbeda dari bingkai dialog netral; ini disengaja agar status terbaca.

**Yang harus diubah:**

- `src/components/game/gayaDialog.ts` — token kotak dialog baru.
- `src/components/game/gayaHud.ts` — memakai token kotak dialog.
- `src/components/game/ChallengeOverlay.tsx` — kotak jawaban, kartu umpan balik,
  short answer, ordering, dan komponen `Penunjuk`.
- `src/components/game/ChallengeOverlay.test.tsx` — tes kelas opsi dan penunjuk.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) — bagian
  Challenge.
- [`../04-game/accessibility.md`](../04-game/accessibility.md) — catatan kontras.

## Kapan keputusan ini ditinjau ulang

- Jika penunjuk dari border CSS terlihat kabur di layar ber-DPI rendah.
- Jika warna status kartu umpan balik menyatu dengan latar navy di perangkat
  tertentu.
- Jika token bersama meluas ke komponen lain dan mulai sulit dijaga.

## Referensi

- [ADR 0020](0020-potret-ekspresi-persona.md) — potret berekspresi.
- [ADR 0026](0026-desain-hud-dan-tombol-bicara.md) — desain HUD seragam dengan
  kotak dialog.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) — dokumen hidup
  UI pemutar game.
