---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# 0004 — Phaser 4.2.1 sebagai Game Engine

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Game perlu: render 2D pixel art, sprite, textbox dialog, transisi, audio, dan
kontrol keyboard/sentuh — di browser, di dalam aplikasi Next.js, dalam waktu
hackathon.

## Opsi

| Opsi                  | Kelebihan                                                           | Kekurangan                                       |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| **Phaser 4.2.1**      | Matang, dokumentasi luas, sprite/audio/scale siap, TypeScript types | Bundle besar, API v4 berbeda dari v3             |
| Custom Canvas + React | Kontrol penuh, bundle kecil                                         | Semua harus dibuat: loop, input, audio, tekstur  |
| PixiJS                | Renderer 2D cepat                                                   | Bukan engine game; dialog/audio/input manual     |
| Godot (export web)    | Tooling lengkap                                                     | Build besar, alur kerja berbeda, integrasi berat |
| DOM/CSS saja          | Paling sederhana                                                    | Tidak terasa seperti game                        |

Phaser 4.2.1 dipilih juga karena merupakan versi stabil terbaru saat keputusan
diambil (rilis 9 Juli 2026, kode "Giedi", lisensi MIT).

## Keputusan

**Kami memilih Phaser 4.2.1, dimuat hanya di client.**

Alasan:

1. Semua kebutuhan inti (sprite, text, audio, scale, input) tersedia tanpa
   membangun engine sendiri.
2. TypeScript types resmi memudahkan agent menulis kode yang benar.
3. Pixel art didukung langsung (`pixelArt` membuat tekstur memakai nearest-neighbor
   dan `roundPixels` menjaga posisi di grid).

## Konsekuensi

**Positif:**

- Fokus waktu pada cerita dan alur, bukan pada renderer.
- Ekosistem contoh dan dokumentasi besar.

**Negatif / utang:**

- **API v4 berbeda dari v3.** Contoh lama di internet sering salah. Wajib cek
  docs resmi.
- `roundPixels` default `false` di v4; harus diset eksplisit.
- Bundle Phaser besar; hanya boleh dimuat di halaman game.
- Tidak bisa dirender di server maupun di jsdom → test harus fokus pada logika
  murni.

**Yang harus diubah:**

- `package.json` (belum ditambahkan saat ADR ini dibuat).
- [`../04-game/engine.md`](../04-game/engine.md)
- [`../01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)

## Kapan ditinjau ulang

Jika ukuran bundle menjadi masalah, atau jika kebutuhan 3D/efek berat muncul.

## Referensi

- https://phaser.io/download/release/v4.2.1
- https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know
- https://phaser.io/oss/docs/
