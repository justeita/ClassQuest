---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0038 - Soal tantangan diketik lebih dulu, jawaban menyusul

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (melengkapi [ADR 0030](0030-desain-tantangan-seragam-dialog.md)
  dan [ADR 0023](0023-potret-ekspresi-persona.md), tidak membatalkannya)

## Konteks

[ADR 0030](0030-desain-tantangan-seragam-dialog.md) memindahkan soal ke dalam
kotak dialog (`DialogueBox`) dan hanya menyisakan pilihan jawaban yang melayang
di atasnya. Menjelang demo, pemain melaporkan tiga hal:

1. **Soal tidak terasa seperti dialog.** Saat beat `challenge` dibuka, teks soal
   langsung tampil utuh dan pilihan jawaban langsung muncul, padahal semua
   dialog lain diketik mesin tik. Peralihan mendadak itu memecah ritme.
2. **Potret NPC hilang.** Demi memberi ruang pilihan jawaban, potret pembicara
   sempat disembunyikan selama soal, jadi adegan kehilangan wajah yang berbicara.
3. **Elemen tantangan muncul/hilang mendadak.** Pilihan jawaban, hint, chip
   pintasan, dan kartu umpan balik berganti tanpa transisi.

Batasan:

- **Tanpa dependensi baru.** Animasi cukup CSS keyframes yang sudah dipakai
  panel dialog (`crt-masuk`, `potret-masuk`).
- **Jangan mengubah kontrak cerita.** `challenge` tetap beat biasa; tidak ada
  field baru di `Story`.
- **Tetap ramah aksesibilitas.** Gerak dimatikan saat `prefers-reduced-motion`,
  dan pilihan jawaban tidak boleh bisa dikirim sebelum soal selesai diketik.
- **Ujian/event tanpa dialog soal tetap jalan.** Sebagian alur mengirim event
  `challenge` tanpa `textbox.show` lebih dulu.

## Opsi

| Opsi                                                             | Kelebihan                                      | Kekurangan                                         | Biaya |
| ---------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | ----- |
| A. Ketik soal lewat textbox yang ada, gate opsi dengan `waiting` | Satu mesin tik; ritme seragam; tanpa kode baru | Butuh prop `siap` di overlay                       | Kecil |
| B. Tampilkan soal utuh, tetapi tunda opsi dengan timer           | Tidak menyentuh scene                          | Timer menebak-nebak; tidak sinkron dengan ketikan  | Kecil |
| C. Buat typewriter terpisah di overlay React                     | Overlay mandiri                                | Dua sumber state teks; blip/kecepatan bisa berbeda | Besar |
| D. Biarkan seperti sekarang (soal langsung tampil)               | Nol perubahan                                  | Ritme rusak; potret tetap hilang                   | Nol   |

## Keputusan

Kami memilih **A**.

1. `GameScene.bukaTantangan` memanggil `textbox.show` **tanpa** `complete()`,
   jadi soal diketik seperti dialog. Selama fase `challenge`, `tick` textbox
   tetap berjalan dan satu tekanan Space/Enter menuntaskan ketikan, tetapi tidak
   memajukan beat.
2. `GameCanvas` menghitung `dialogSoal` (dialog yang teksnya awalan dari teks
   soal) dan menurunkan `soalSiap = dialogSoal ? dialogSoal.waiting : true`.
   `ChallengeOverlay` menerima prop `siap`; opsi, hint, dan chip pintasan baru
   dirender setelah `siap` benar.
3. Potret pembicara soal **tidak lagi disembunyikan**. Panel jawaban memang
   duduk di kanan atas, jadi sisi kiri (potret NPC) tetap terlihat.
4. Area jawaban memakai keyframes `challenge-masuk`/`challenge-keluar`
   (opacity + transform). Saat dinilai, opsi menyingkir ±180 ms sebelum dilepas
   dari DOM, lalu kartu umpan balik masuk dengan animasi yang sama. Hint,
   chip pintasan, dan kartu konfirmasi hint ikut beranimasi.
5. Bunyi lanjut dialog memakai `sfx_type` yang sama dengan blip ketik, dengan
   `rate` 0,78 dan volume 0,5×, sehingga satu keluarga bunyi dan tidak lebih
   keras daripada mesin tik.

## Konsekuensi

**Positif:**

- Soal terbaca sebagai dialog: mengetik dulu, baru pilihan jawaban muncul.
- Potret NPC tetap hadir selama soal maupun saat umpan balik.
- Pergantian elemen tantangan terasa halus; kartu umpan balik tidak "muncul
  dari udara".
- Satu mesin tik dan satu sampel SFX untuk seluruh dialog, termasuk soal.

**Negatif / utang:**

- Overlay kini punya state transisi keluar (`useTampilKeluar`) yang harus
  diseimbangkan agar elemen tidak tersangkut di DOM.
- `GameCanvas` perlu mencocokkan teks dialog dengan teks soal untuk tahu apakah
  soal sedang diketik; event `challenge` tanpa dialog tetap memakai fallback
  `siap = true`.

**Yang harus diubah:**

- `src/game/scenes/GameScene.ts` — typewriter soal, `lanjutSfx`, volume SFX.
- `src/components/game/GameCanvas.tsx` — `dialogSoal`/`soalSiap`, potret soal.
- `src/components/game/ChallengeOverlay.tsx` — prop `siap`, animasi masuk/keluar.
- `src/app/globals.css` — `challenge-masuk`/`challenge-keluar` + reduced motion.
- `src/components/game/ChallengeOverlay.test.tsx`,
  `src/components/game/GameShell.test.tsx` — tes perilaku baru.
- [`../04-game/scene-format.md`](../04-game/scene-format.md) § `challenge` dan
  § Typewriter, [`../05-frontend/game-player.md`](../05-frontend/game-player.md)
  § Challenge.

## Kapan keputusan ini ditinjau ulang

- Jika soal yang sangat panjang membuat siswa menunggu terlalu lama sebelum
  bisa menjawab (pertimbangkan mempercepat ketikan khusus soal).
- Jika `prefers-reduced-motion` ternyata belum cukup dan perlu opsi "kurangi
  animasi" di menu pengaturan.

## Referensi

- [ADR 0007](0007-hybrid-ui.md) — UI hybrid Phaser + DOM.
- [ADR 0023](0023-potret-ekspresi-persona.md) — potret berekspresi.
- [ADR 0030](0030-desain-tantangan-seragam-dialog.md) — tantangan memakai kotak
  dialog.
- [`../04-game/scene-format.md`](../04-game/scene-format.md) — perilaku beat
  `challenge` dan typewriter.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md) — komponen
  `ChallengeOverlay`.
