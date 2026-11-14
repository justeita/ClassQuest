---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0025 - Layar Penuh, Kunci Lanskap, dan Ketukan yang Responsif

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (memperluas [ADR 0024](0024-kontrol-sentuh-hp.md), tidak membatalkannya)

## Konteks

Setelah kontrol sentuh masuk ([ADR 0024](0024-kontrol-sentuh-hp.md)), pemain
mencoba langsung dari ponsel Android dan melaporkan dua hal:

1. **Tombol menu utama terasa mati.** Ketukan tidak menghasilkan apa-apa; perlu
   beberapa kali coba. Penyebabnya ada dua:
   - Elemen dengan `touch-action` bawaan (`auto`) ditahan sebentar oleh Chrome
     Android untuk menunggu ketuk-dua-kali zoom. Ketukan kedua yang cepat malah
     dianggap awal zoom, jadi kliknya batal.
   - Di dalam permainan, `GameCanvas` memasang `touch-action: none` pada akarnya.
     Di Chrome Android, area `none` diketahui membuat klik setelahnya tidak
     terdaftar sampai beberapa detik — jadi tombol HUD dan ketukan-untuk-lanjut
     dialog ikut tersendat.
2. **Permainan terasa sempit.** Bilah alamat peramban memakan tinggi layar.
   Pemain ingin satu tombol yang langsung memenuhkan layar **dan** memutar
   perangkat ke mendatar, seperti game ponsel lain.

Batasan yang mengikat:

- **Tanpa dependensi baru.** Fullscreen API dan `screen.orientation` sudah ada di
  peramban; tidak perlu pustaka.
- **Tidak memaksa orientasi.** Memutar layar tidak boleh terjadi diam-diam;
  hanya saat pemain menekan tombolnya.
- **Tetap jujur soal dukungan.** Safari iPhone tidak punya Fullscreen API untuk
  elemen. Menampilkan tombol yang tidak berfungsi lebih buruk daripada tidak
  menampilkannya.

## Opsi

| Opsi                                                 | Kelebihan                          | Kekurangan                                          | Biaya |
| ---------------------------------------------------- | ---------------------------------- | --------------------------------------------------- | ----- |
| A. `touch-action: manipulation` + tombol layar penuh | Ketukan langsung; imersif          | Perlu stubbing API di uji                           | Kecil |
| B. Kunci `main` ke `touch-action: none`              | Tidak ada gulir/zoom di dalam game | Klik di Chrome Android justru tersendat             | Kecil |
| C. Paksa lanskap lewat CSS/medan magnet              | Nol tombol                         | Tak bisa memaksa peramban; melawan kehendak pemain  | —     |
| D. Saran "putar layar"                               | Nol kerja                          | Tidak menyelesaikan apa pun (sudah ditolak di 0024) | Nol   |

## Keputusan

Kami memilih **A**, dengan aturan:

1. **Ketukan memakai `touch-action: manipulation`.** Tombol, tautan, dan `input`
   di seluruh aplikasi, serta `.area-game`, memakai `manipulation` — mematikan
   zoom ketuk-dua-kali saja sehingga klik langsung terdaftar tanpa mengorbankan
   gulir. Di dalam permainan, akar `GameCanvas` berubah dari `touch-none` menjadi
   `touch-manipulation`; hanya pad tongkat yang tetap `touch-none` (memang perlu
   menahan gulir saat jempol menggeser).
2. **Tombol "Layar penuh" meminta Fullscreen API lalu mencoba mengunci lanskap.**
   `requestFullscreen({ navigationUI: "hide" })`, lalu
   `screen.orientation.lock("landscape")`. Keduanya dibungkus percobaan
   sendiri-sendiri: gagal mengunci lanskap tidak membatalkan layar penuh, dan
   sebaliknya. Saat keluar, kunci orientasi dilepas lebih dulu supaya ponsel
   boleh kembali tegak.
3. **Tombol menghilang bila tidak didukung.** `document.fullscreenEnabled` yang
   menentukan; di Safari iPhone tombolnya tidak dirender, bukan dirender mati.
4. **Dua tempat.** Tombol fullscreen ada di layar judul (pojok kanan atas,
   terpisah dari menu supaya urutan fokus Mulai → Kontrol → Kembali tetap) dan
   di HUD dalam permainan (ikon saja, karena HUD di ponsel sudah penuh).

## Konsekuensi

**Positif:**

- Ketukan di menu dan di dalam permainan langsung terdaftar di Android.
- Permainan bisa dibuka penuh dan mendatar dalam satu ketukan; tata letak
  `mengapung` (ADR 0024) langsung terpakai.
- Tanpa dependensi baru; status dibaca lewat `useSyncExternalStore` sehingga
  label tombol ikut berubah saat pemain keluar lewat tombol sistem.

**Negatif / utang:**

- Kunci orientasi tidak didukung semua peramban; di sebagian perangkat pemain
  tetap harus memutar ponsel sendiri.
- `manipulation` masih mengizinkan cubit-zoom; kanvas bisa ter-zoom tak sengaja
  walau halaman tidak bisa digulir.
- Menambah tombol di HUD mengurangi ruang tombol lain di layar sempit.

**Yang harus diubah:**

- `src/app/globals.css` — aturan `touch-action: manipulation` + `.area-game`.
- `src/components/game/GameCanvas.tsx` — akar `touch-manipulation`.
- `src/game/layarPenuh.ts`, `src/components/game/useLayarPenuh.ts`,
  `src/components/game/TombolLayarPenuh.tsx` — status dan tombol baru.
- `src/components/game/TitleScreen.tsx` dan `src/components/game/HUD.tsx` — titik
  pasang tombol.
- [`../05-frontend/game-player.md`](../05-frontend/game-player.md),
  [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md), dan
  [`../04-game/accessibility.md`](../04-game/accessibility.md).

## Kapan keputusan ini ditinjau ulang

- Jika `touch-action: manipulation` ternyata masih menyisakan ketukan yang gagal
  di peramban tertentu.
- Jika pemain mengeluh kanvas tak sengaja ter-zoom.
- Jika kunci orientasi dianggap terlalu memaksa (mis. pemain ingin tetap tegak).

## Referensi

- [ADR 0024](0024-kontrol-sentuh-hp.md) — kontrol sentuh dan tata letak HP.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md#input-sentuh) —
  perilaku input sentuh di dalam loop permainan.
