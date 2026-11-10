---
status: stable
last_reviewed: 2026-11-10
owner: tim ClassQuest
---

# 0007 — UI Hybrid: Phaser untuk Dunia, DOM untuk Teks dan Tantangan

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Game punya dua jenis permukaan:

1. **Dunia dan dialog** — butuh render loop, sprite, animasi, audio.
2. **Tantangan dan menu** — butuh input teks, pilihan, fokus keyboard, dan
   pembacaan screen reader.

Membuat semuanya di canvas lebih "murni", tetapi memperlambat pengembangan dan
membuat aksesibilitas hampir mustahil.

## Opsi

| Opsi                 | Kelebihan                         | Kekurangan                                                |
| -------------------- | --------------------------------- | --------------------------------------------------------- |
| Semua di Phaser      | Satu render, konsisten            | Form/teks sulit, aksesibilitas buruk, lambat dikembangkan |
| **Hybrid (dipilih)** | Dunia di Phaser, tantangan di DOM | Dua sistem style, butuh jembatan event                    |
| Semua di DOM         | Aksesibilitas terbaik             | Tidak terasa seperti game                                 |

## Keputusan

**Kami memilih hybrid.**

- Phaser: background, sprite, dialog, transisi, musik.
- React DOM: overlay tantangan, HUD, menu jeda, layar hasil.

Alasan:

1. Input teks dan pilihan ganda jauh lebih baik di DOM.
2. Aksesibilitas (fokus, `aria-live`, keyboard) bisa dicapai tanpa membangun
   sistem sendiri di canvas.
3. Kecepatan pengembangan: form React jauh lebih cepat daripada menggambar UI
   di Phaser.

## Konsekuensi

**Positif:**

- Keyboard dan screen reader bekerja untuk bagian yang paling penting (soal).
- Styling overlay memakai Tailwind, konsisten dengan dashboard guru.
- Logika penilaian bisa dites tanpa Phaser.

**Negatif / utang:**

- Dua sistem style harus dijaga selaras (palet + token).
- Butuh jembatan event yang jelas antara Phaser dan React.
- Perlu disiplin: jangan menaruh state penting di Phaser.

**Yang harus diubah:**

- [`../04-game/engine.md`](../04-game/engine.md)
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md)
- [`../04-game/accessibility.md`](../04-game/accessibility.md)

## Kapan ditinjau ulang

Jika overlay DOM menghambat animasi tertentu, atau jika mode "semua canvas"
dibutuhkan untuk performa di perangkat sangat lemah.

## Pembaruan 2026-11-10 — teks dialog dan prompt pindah ke DOM

**Masalah.** `pixelArt: true` memaksa `image-rendering: pixelated` pada seluruh
canvas. Canvas 640×360 di-upscale non-integer (±1,6×), jadi setiap huruf yang
digambar Phaser — termasuk dengan `setResolution` tinggi — tetap bergerigi.
Mengganti font di canvas tidak bisa memperbaikinya.

**Keputusan.** Yang dirender Phaser tinggal **panel dan portrait** dialog
(`ui_textbox`, `ui_portrait_frame`, gambar portrait 64×64). Nama speaker, isi
dialog, dan indikator "lanjut" dirender `DialogueBox.tsx`; chip prompt `Space`
dirender `InteractHint.tsx`. Typewriter tetap di sisi game
(`textbox.ts` + `typewriter.ts`), yang dikirim ke React hanyalah
`DialogueView` bertahap lewat event `dialogue`.

**Detail kontrak.**

- Event: `{ type: "dialogue", view: DialogueView }` dan
  `{ type: "prompt", hint: PromptView | null }`.
- Command: `{ type: "advance" }` dari klik panel/tekanan tombol.
- Geometri panel, portrait, dan rumus ukuran huruf tinggal di
  `src/game/layout.ts`; DOM memakai persen dari angka internal itu dan `cqw`
  untuk ukuran huruf.
- Font game: **Patrick Hand** (OFL) via `next/font/local`, token `font-game`.
  Phaser memakai nama keluarga literal (`fontGame()`) untuk label kecil seperti
  "Memuat…".

**Konsekuensi.** Dialog jadi tajam dan bisa dibaca screen reader
(`aria-live="polite"`), tetapi posisi teks harus dijaga sejalur dengan panel
Phaser lewat `layout.ts`. Jangan menambah teks game baru di canvas.

## Referensi

- [`../04-game/engine.md`](../04-game/engine.md)
- [`../04-game/accessibility.md`](../04-game/accessibility.md)
