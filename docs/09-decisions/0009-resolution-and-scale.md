---
status: stable
last_reviewed: 2026-11-09
owner: tim ClassQuest
---

# 0009 — Resolusi Internal dan Skala Karakter

- **Status:** Accepted
- **Tanggal:** 2026-11-09
- **Pengambil keputusan:** developer frontend game + track aset
- **Menggantikan:** — (melengkapi ADR 0008)

## Konteks

Resolusi internal game hari ini **480×270** (`GAME_WIDTH`/`GAME_HEIGHT` di
`src/game/config.ts`), mengikuti spesifikasi di
[`../04-game/game-design.md`](../04-game/game-design.md#resolusi-dan-skala) dan
[`../07-assets/asset-guide.md`](../07-assets/asset-guide.md#background).

Setelah layar judul, HUD, dan menu jeda masuk, ada dua masalah visual yang
terlihat saat dimainkan di browser:

1. **Karakter terlalu besar.** Sprite berukuran frame **48×72**, sementara layar
   internal tingginya hanya 270 px. Pemain menutup sekitar **27% tinggi layar**.
   Di Omori dan Undertale, karakter yang bisa dimainkan hanya sekitar 15–20%
   tinggi layar; itulah yang membuat ruangan terasa luas dan dunia terasa besar.
2. **Tampilan kurang tajam di layar besar.** 720p (1280×720) menuntut skala
   sekitar 2.67×, dan 1080p menuntut 4×. Skala pecahan memang aman karena
   `pixelArt: true`, tetapi area bermain tetap terasa "kotak kecil" karena isi
   layar menampung terlalu sedikit dunia.

Dokumen desain juga belum menetapkan **ukuran tile** sebagai satuan dasar.
Tanpa satuan itu, map top-down, ukuran karakter, kecepatan gerak, dan layout
ruangan sulit konsisten.

Batasan: hackathon — aset dibuat generator sendiri (`scripts/generate-assets.mjs`)
tanpa dependensi, jadi menaikkan resolusi berarti mengganti angka generator,
bukan menggambar ulang manual. Seluruh latar dan sprite ikut dibuat ulang di PR
aset.

## Opsi

Resolusi internal:

| Opsi          | Kelebihan                                                                      | Kekurangan                                                                   | Biaya                                              |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| A 480×270     | Tidak ada perubahan aset; semua tes tetap                                      | Karakter tetap besar; layar terasa sempit; upscale hingga 4× di 1080p        | 0                                                  |
| **B 640×360** | +78% area; upscale 2× pas di 720p; generator cukup cepat; masih aman di laptop | Semua latar 480×270 harus dibuat ulang                                       | Menengah; angka di `scenes.mjs`, `map.ts`, textbox |
| C 960×540     | Paling tajam (2× di 1080p, 1.33× di 720p)                                      | Generator lebih lambat; detail tile harus lebih rapat; risiko overdraw di HP | Tinggi; bentrok dengan tenggat hackathon           |

Skala karakter (pada opsi B):

| Opsi            | Kelebihan                                                         | Kekurangan                                          |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| Frame 16×24     | Paling kompak; ruang dunia terasa luas                            | Wajah sulit terbaca di 640×360                      |
| **Frame 24×32** | Sekitar 8% tinggi layar — setara Undertale; proporsi mudah dibaca | Perlu menggambar ulang semua karakter di grid kecil |
| Frame 32×48     | Detail wajah nyaman                                               | Masih terasa besar; mundur dari tujuan awal         |

## Keputusan

**Kami memilih opsi B: resolusi internal 640×360, ukuran tile 16×16, frame
sprite karakter 24×32, dan portrait 64×64.** Keputusan ini **Accepted** dan
angkanya mengikat PR implementasi.

Alasan:

1. **Karakter masuk rentang Omori/Undertale.** 32 px di layar 360 px ≈ 8.9%
   tinggi layar, dan setelah ruangan diperluas (ADR 0010) ruang di sekitarnya
   terasa lapang tanpa karakter jadi tidak terbaca.
2. **Skala bersih di layar umum.** 640×360 naik tepat 2× di 720p dan 3× di
   1080p, sehingga pixel tetap tajam dan tidak ada sisa garis pecahan.
3. **Masih bisa dibangun generator.** Semua latar tetap digambar pada grid
   1 px pada resolusi ini; yang berubah adalah konstanta di `scenes.mjs`,
   `characters.mjs`, dan `textbox.ts`.

Asumsi: satu tile = 16×16 px. Peta, zona interaksi, kecepatan pemain, dan
ketebalan dinding dinyatakan dalam kelipatan tile supaya konsisten dan mudah
diubah.

## Konsekuensi

**Positif:**

- Dunia terasa lebih luas dan tajam; karakter tidak lagi mendominasi layar.
- Satu satuan (tile 16 px) untuk map, gerak, dan collision — menghapus angka
  ajaib yang sekarang tersebar di `map.ts`, `movement.ts`, dan `textbox.ts`.
- Satu putaran generator ulang menghasilkan seluruh aset baru yang konsisten.

**Negatif / utang:**

- **Semua aset dibuat ulang** (`public/assets/bg`, `char`, `portrait`, `ui`).
  Id manifest tidak berubah, jadi cerita dan tes manifest tetap aman.
- Ukuran file berpotensi naik karena kanvas lebih besar (±2× piksel latar);
  batas ≤ 80 KB di `asset-guide.md` perlu dicek ulang setelah generator jalan.
- Font pixel minimum 12 px di `accessibility.md` perlu dihitung ulang untuk
  640×360 — lihat ADR 0010 dan `world-design.md` bagian teks.

**Yang harus diubah (pada PR implementasi, bukan PR ini):**

- [`../04-game/game-design.md`](../04-game/game-design.md#resolusi-dan-skala) —
  angka resolusi dan ukuran karakter.
- [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md) — spesifikasi
  background, sprite, portrait, textbox, dan aturan grid.
- [`../04-game/accessibility.md`](../04-game/accessibility.md#ukuran-teks) —
  perhitungan skala, batas layar kecil, dan ukuran font minimum.
- `src/game/config.ts`, `src/game/map.ts`, `src/game/movement.ts`,
  `src/game/textbox.ts`, `scripts/lib/{scenes,characters,pixel}.mjs`.
- [`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md) —
  catatan resolusi di baris `config.ts`.

## Kapan keputusan ini ditinjau ulang

- Jika waktu tersisa kurang dari **dua hari** sebelum submission dan PR aset
  belum hijau: turunkan ke opsi A (480×270) untuk PR implementasi, dan
  kembalikan ADR ini ke **Proposed** dengan catatan penyebabnya.
- Jika hasil generator 640×360 ternyata melewati batas ukuran file aset.

## Referensi

- [`0008-top-down-movement.md`](0008-top-down-movement.md) — gerak top-down yang
  memunculkan kebutuhan skala baru
- [`../04-game/world-design.md`](../04-game/world-design.md) — spesifikasi world
  look yang memakai angka dari ADR ini
- [`../04-game/game-design.md`](../04-game/game-design.md#resolusi-dan-skala) —
  aturan resolusi yang berlaku sekarang
