---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0024 - Kontrol Sentuh dan Tata Letak HP

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (memperluas ADR 0008 dan ADR 0009, tidak membatalkannya)

## Konteks

Sampai sekarang ClassQuest **hanya** bisa dimainkan dengan papan tombol: panah/WASD
untuk gerak, `Space`/`Enter` untuk lanjut dan bicara, `Tab` untuk mempercepat, `Esc`
untuk jeda. Padahal target pemakainya siswa sekolah yang banyak membuka tautan
`/play/[storyId]` langsung dari ponsel. Tanpa kontrol sentuh, halaman itu praktis
tidak bisa dimainkan di sana.

Dokumen lama justru menyerah pada kasus ini: [`game-player.md`](../05-frontend/game-player.md)
menjanjikan saran "Putar layar untuk pengalaman terbaik", dan
[`interaction-loop.md`](../04-game/interaction-loop.md) menyebut orientasi lanskap
"disarankan". Saran itu tidak menyelesaikan apa pun — memutar layar tidak
memunculkan tombol gerak.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Waktu lomba tinggal sedikit; joystick pihak ketiga
  menambah berat bundel dan permukaan bug.
- **Satu jalur gerak.** Dunia sudah punya aturan gerak, tabrakan, dan animasi yang
  sudah diuji (`movement.ts`, ADR 0008). Kontrol sentuh tidak boleh membawa aturan
  kedua yang harus dijaga sinkron.
- **Keyboard tetap utama.** Laptop berlayar sentuh tetap memakai papan tombol dan
  tetikus; kontrol sentuh di sana cuma menutupi dunia.
- **Canvas tetap 16:9.** Teks dialog sudah di-DOM dan memakai `clamp()`; memaksa
  kanvas memenuhi tinggi layar potret justru membuatnya sempit dan teks mengecil.

## Opsi

| Opsi                                            | Kelebihan                            | Kekurangan                                              | Biaya  |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ------ |
| A. Joystick 8 arah + tombol aksi kontekstual    | Satu arah = satu `ArahGerak`; ringan | Perlu deteksi perangkat & tata letak baru               | Kecil  |
| B. Vektor analog bebas (kecepatan proporsional) | Terasa lebih halus                   | Aturan gerak kedua; animasi 8 arah tidak cocok          | Sedang |
| C. D-pad tombol virtual                         | Paling mudah dibayangkan             | Empat target kecil; tetap butuh lapisan tombol keyboard | Sedang |
| D. Pustaka joystick pihak ketiga                | Cepat jadi                           | Dependensi baru; gaya visual tidak menyatu              | Sedang |
| E. Tetap saran "putar layar"                    | Nol kerja                            | Ponsel tetap tidak bisa dimainkan                       | Nol    |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Joystick menynap ke delapan arah.** Tongkat analog diubah jadi salah satu dari
   delapan `ArahGerak` lewat sektor 45° (`arahSentuh.ts`), bukan vektor bebas.
   Scene menyimpannya sebagai satu arah dan menggabungkannya di `arahGerak()` yang
   sama dengan tombol papan tombol — jadi kecepatan, tabrakan, dan animasi tetap
   satu jalur (`move` command).
2. **Satu tombol aksi kontekstual.** Di dekat NPC jadi "Bicara" (command
   `interact`, sama dengan `Space`/`Enter`); saat dialog menunggu jadi "Lanjut"
   (command `advance`); saat tidak ada yang bisa dilakukan, mati. Pemain tidak
   perlu menebak.
3. **Tata letak dua mode.** Layar potret: panggung 16:9 di atas + **dek kontrol**
   di bawah. Layar lanskap: kontrol **mengapung** di dalam bingkai kanvas.
4. **Deteksi `pointer: coarse` + `hover: none`.** Bukan `maxTouchPoints > 0`, supaya
   laptop berlayar sentuh tetap desktop. Tanpa `matchMedia` (SSR/jsdom) jatuh ke
   `maxTouchPoints`.
5. **Label menyesuaikan perangkat.** Prompt `Space` jadi "Sentuh"; keycap keyboard
   (`Tab`/`B`/`Esc`) tidak dirender.
6. **Safe-area & `viewport-fit=cover`.** HUD dan tombol tidak tertutup notch atau
   bar sistem di ponsel.

## Konsekuensi

**Positif:**

- Halaman siswa bisa dimainkan penuh di ponsel dan tablet, tanpa keyboard.
- Gerak sentuh dan gerak keyboard berbagi kode yang sama — tidak ada logika
  duplikat yang bisa melenceng.
- Tanpa dependensi baru; deteksi perangkat dan joystick ditulis sendiri dan diuji
  (`arahSentuh.test.ts`, `sentuh.test.ts`, `TouchControls.test.tsx`).

**Negatif / utang:**

- Dua tata letak (`dek`/`mengapung`) harus dijaga tetap rapi di dua orientasi.
- Deteksi `pointer: coarse` bergantung pada dukungan peramban; perangkat tanpa
  `matchMedia` memakai heuristik `maxTouchPoints`.
- Joystick hanya 8 arah: tidak ada gerak setengah kecepatan ala analog.

**Yang harus diubah:**

- `src/components/game/TouchControls.tsx`, `useSentuh.ts`, `src/game/arahSentuh.ts`,
  `src/game/sentuh.ts` — kontrol baru.
- `src/game/gameBus.ts` (`move`/`interact`) dan `src/game/scenes/GameScene.ts`
  (`mulaiInteraksiTerdekat()`).
- `src/game/createGame.ts` (`ResizeObserver`) — tata letak sentuh mengubah tinggi
  kontainer tanpa memicu `resize` jendela.
- `src/app/layout.tsx` (`viewport`), `src/app/globals.css` (`.area-game`), dan kedua
  halaman game (`/demo`, `/play/[storyId]`).
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md),
  [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md),
  [`../04-game/accessibility.md`](../04-game/accessibility.md), dan
  [`../04-game/engine.md`](../04-game/engine.md).

## Kapan keputusan ini ditinjau ulang

- Jika pemain mengeluh tongkat 8 arah terlalu kaku untuk bermanuver.
- Jika perangkat utan `matchMedia` terbukti sering salah dideteksi.
- Jika muncul kebutuhan gerak analog penuh (mis. kontrol racing).

## Referensi

- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#input-sentuh) —
  perilaku input sentuh di dalam loop permainan.
- [`../04-game/accessibility.md`](../04-game/accessibility.md) — kelengkapan jalur
  akses non-keyboard.
- [ADR 0008](0008-top-down-movement.md) dan [ADR 0009](0009-resolution-and-scale.md).
