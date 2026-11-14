---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0036 - Menu Jeda Dua Kolom di Lanskap Pendek

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** sebagian [ADR 0028](0028-jangkauan-interaksi-dan-bar-hud-potret.md) — butir 2 (menu jeda bergulir)

## Konteks

[ADR 0028](0028-jangkauan-interaksi-dan-bar-hud-potret.md) menjawab menu jeda
yang terpotong di lanskap ponsel dengan membuat wadahnya bisa digulir. Pemain
sekarang melaporkan hasil yang berbeda di peramban ponsel: kartu menu tetap
lebih tinggi dari area game, sehingga tombol "Ulangi chapter" dan "Keluar"
berada di bawah lipatan dan hanya bisa dijangkau dengan menggulir. Gulir itu
juga terasa asing di layar permainan yang seharusnya terkunci.

Batasan:

- **Tanpa dependensi baru.** Cukup CSS dan penanda kelas di komponen.
- **Semua aksi tetap tersedia.** Tidak boleh menyembunyikan pengaturan suara
  atau tombol keluar hanya agar muat.
- **Layar potret dan desktop tidak boleh berubah.** Menu satu kolom di sana
  sudah lapang.

## Opsi

| Opsi                                                            | Kelebihan                                         | Kekurangan                                                | Biaya |
| --------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ----- |
| A. Dua kolom di bawah tinggi 30rem: suara kiri, aksi kanan      | Semua tombol terlihat tanpa gulir; ruang terpakai | Dua jalur tata letak yang harus dijaga                    | Kecil |
| B. Satu kolom dengan padding dan font lebih rapat               | Perubahan paling kecil                            | Masih bisa meluap di viewport sangat pendek               | Kecil |
| C. Pertahankan gulir seperti ADR 0028                           | Tidak ada kode baru                               | Keluhan pemain tetap ada; tombol penting di bawah lipatan | Nol   |
| D. Sembunyikan catatan "Tekan Esc" dan slider saat layar pendek | Cepat muat                                        | Menghilangkan fungsi yang dijanjikan menu                 | Kecil |

## Keputusan

Kami memilih **A**.

1. Di bawah `max-height: 30rem` (±480 px), isi kartu memakai grid dua kolom:
   pengaturan suara di kiri, tombol aksi dan catatan di kanan. Kepala kartu
   membentang penuh.
2. Kartu melebar sampai `30rem` supaya dua kolom tidak sempit; di layar normal
   lebar tetap `max-w-xs`.
3. `overflow-y-auto` pada wadah dipertahankan hanya sebagai jaring pengaman
   untuk tinggi yang benar-benar ekstrem; pada lanskap ponsel normal tidak ada
   scrollbar yang muncul.

Ambang 30rem dipilih karena lanskap ponsel umumnya setinggi 320–430 px,
sedangkan potret dan desktop berada di atasnya.

## Konsekuensi

**Positif:**

- Semua pilihan menu terlihat sekaligus di lanskap ponsel; tidak perlu menggulir.
- Area game tetap terkunci dan tidak memantulkan-scroll.

**Negatif / utang:**

- Ada dua jalur tata letak (satu kolom dan dua kolom) yang harus dijaga saat
  isi menu berubah.
- Ambang dihitung dari tinggi viewport, bukan tinggi area game; padding
  `.area-game` membuat selisih kecil yang tidak berarti pada ambang ini.

**Yang harus diubah:**

- `src/components/game/PauseMenu.tsx` — kelas `menu-jeda*` dan struktur kepala,
  suara, serta aksi.
- `src/app/globals.css` — aturan `@media (max-height: 30rem)`.
- `src/components/game/PauseMenu.test.tsx` — tes isi menu dan penanda tata letak.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md) dan
  [`../05-frontend/game-player.md`](../05-frontend/game-player.md) — perilaku
  menu jeda di layar pendek.

## Kapan keputusan ini ditinjau ulang

- Jika tinggi lanskap ponsel turun di bawah ±240 px sehingga dua kolom pun
  masih meluap.
- Jika isi menu bertambah (misalnya pengaturan baru) sampai dua kolom tidak
  cukup.

## Referensi

- [ADR 0028](0028-jangkauan-interaksi-dan-bar-hud-potret.md) — menu jeda
  bergulir yang sebagian digantikan keputusan ini.
- [ADR 0029](0029-desain-hud-dan-tombol-bicara.md) — bahasa visual kartu menu.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md#paused) —
  perilaku menu jeda.
