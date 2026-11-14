---
status: stable
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# 0017 — Potret Berekspresi, Dipasang di Atas Kotak Dialog

- **Status:** Accepted
- **Tanggal:** 2026-11-13
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** — (memperluas ADR 0007 dan ADR 0016, tidak membatalkannya)

## Konteks

Sampai sekarang setiap karakter hanya punya **satu** potret 64×64 yang digambar
Phaser di dalam bingkai `ui_portrait_frame` di atas panel dialog. Akibatnya:

- semua kalimat terlihat sama, padahal cerita punya momen marah, kaget, sedih,
  dan berpikir;
- umpan balik jawaban tantangan hanya berupa suara dan teks; potret tidak ikut
  bereaksi;
- AI tidak punya cara memilih wajah yang cocok dengan kalimat yang ditulisnya.

Aset potret anime berekspresi untuk sepuluh karakter (MC dari `anime/2`, NPC
lain dari `anime/N`) sudah tersedia. Yang belum ada adalah kontrak datanya dan
cara menampilkannya.

Batasan yang mengikat:

- Cerita adalah data ([ADR 0002](0002-story-json-as-contract.md)); pilihan
  ekspresi harus bisa ditulis AI dan guru lewat JSON, bukan dipilih di kode.
- Kanvas game hanya 640×360 dan di-upscale non-integer. Potret anime harus
  **tajam**, sedangkan apa pun yang digambar Phaser ikut `image-rendering:
pixelated` ([ADR 0009](0009-resolution-and-scale.md)).
- Tidak boleh ada jalur potret ganda: kalau Phaser masih memuat potret, DOM dan
  canvas akan berebut menampilkannya.

## Opsi

| Opsi                                                    | Kelebihan                           | Kekurangan                                          |
| ------------------------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| A. Tetap satu potret per karakter                       | Tidak ada perubahan kontrak         | Ekspresi cerita tidak pernah terlihat               |
| B. Ganti potret di canvas Phaser, bingkai dipertahankan | Memakai jalur gambar yang sudah ada | Tetap 64×64 bergerigi; bingkai kecil menutupi wajah |
| **C. Potret DOM di atas panel, field `expression`**     | Tajam, gaya Persona, data-driven    | Panel dialog harus ikut pindah ke DOM               |
| D. Potret DOM di dalam bingkai `ui_portrait_frame`      | Tidak menyentuh tata letak panel    | Bingkai justru membatasi; bukan gaya yang dituju    |

Opsi B mempertahankan tekstur 64 px yang, setelah upscale, membuat mata dan
mulut tidak terbaca — justru bagian yang membawa ekspresi. Opsi D menyelesaikan
ketajaman tetapi tetap memaksa potret kecil di dalam kotak.

## Keputusan

**Kami memilih opsi C: enam ekspresi per karakter, dirender DOM tanpa bingkai,
berdiri di atas panel dialog.**

Aturan bentuknya:

- `src/story/expression.ts` adalah satu-satunya daftar ekspresi:
  `neutral`, `happy`, `sad`, `angry`, `shocked`, `thinking`. Modul ini bebas
  dependensi supaya bisa dipakai zod, manifest, dan prompt tanpa saling
  menarik.
- Berkas potret hidup di
  `public/assets/portrait/<nama>/<ekspresi>.png` dengan `<nama>` = `mc`,
  `npc_1`, `npc_3`, … (bukan id manifest). Nama folder mengikuti sumber aset,
  sedangkan pemetaannya ke `char_*` ada di manifest.
- Manifest karakter memakai `portraits: Record<Expression, string>` yang
  menggantikan `portraitPath`. Semua ekspresi wajib ada untuk setiap karakter,
  jadi game tidak perlu menangani potret bolong.
- Beat `dialogue` boleh punya `expression?: Expression`. Beat `narration` boleh
  memunculkan potret **tanpa nama** lewat `speakerId` + `expression`;
  `expression` pada narration wajib disertai `speakerId`
  (`dependentRequired` di JSON Schema, `.refine` di zod). Default `neutral`.
- Feedback jawaban: benar → `happy`, salah → `angry`, memakai potret pembicara
  soal yang terakhir tampil. Ekspresi dari data cerita menang untuk beat biasa.
- Panel, potret, nama, dan teks semuanya dirender `DialogueBox.tsx`; Phaser
  hanya memegang state typewriter (`textbox.ts`). Panel digambar CSS sebagai
  kotak navy gelap membulat — bukan lagi gambar `ui_textbox` — dan nama pembicara
  memakai huruf pixel teal; `ui_textbox` dan `ui_portrait_frame` tidak dipakai
  runtime dan tidak dimuat `PreloadScene`.
- Potret pembicara menyala (glow teal berdenyut) selama sesi dialog, dan potret
  lawan bicara tetap tampil tetapi diredupkan — saat MC bicara, potret NPC
  meredup, begitu pula sebaliknya. Selama soal belum dijawab, kedua potret
  disembunyikan supaya tidak menutupi pilihan jawaban; setelah dinilai keduanya
  tampil lagi untuk umpan balik senang/marah.
- Potret MC hanya menemani dialog di scene yang memang memberi giliran bicara
  kepada MC (`beats.some(speakerId === id pemain)`, lihat `src/game/potret.ts`).
  Dialog antar-NPC dan obrolan singkat dengan NPC non-quest (ADR 0016) tampil
  tanpa potret MC karena pemain tidak sedang menanggapi apa pun.
- Panel dialog dan potret punya animasi buka/tutup sendiri: panel menyala seperti
  TV tabung dari garis tipis di tengah, potret terbit dari balik panel; saat
  dialog selesai panel memipih kembali ke tengah dan potret tenggelam.
  `DialogueBox` menahan view terakhir ±360 ms supaya animasi tutup sempat
  berjalan, dan semuanya dimatikan pada `prefers-reduced-motion`.

Alasan:

1. Potret dirender browser pada resolusi layar asli, jadi wajahnya tajam —
   sedangkan panel tetap pixel karena memang dibuat pixel.
2. Tanpa bingkai, dasar potret menempel tepi atas panel: tidak ada bagian potret
   yang tertutup kotak, dan kepalanya menjulang penuh di atas dialog. NPC
   berpangkal di pojok kiri atas panel dan MC — yang dicerminkan agar menghadap
   ke tengah — di pojok kanan; lebarnya setengah panel, jadi keduanya menjulur
   sampai tengah tepi atas. Importer menormalkan tinggi kepala (bukan tinggi
   gambar) dan menggeser semua potret satu karakter dengan **satu nilai tetap**,
   lalu memotong sedikit sisi luarnya; jadi wajah semua karakter sama besar,
   karakternya mentok sejajar sisi kotak, dan potret tidak melompat saat ekspresi
   berganti. Karakter berbadan pendek dinaikkan skalanya sedikit supaya isinya
   menyentuh tepi bawah kanvas — tidak ada celah transparan yang membuat potret
   tampak melayang di atas kotak. Itu siluet dialog Persona yang dituju.
3. Potret disusun ke kanvas 456×360 (rasio sama dengan slot) dan disimpan dengan
   filter PNG adaptif: 60 berkas turun dari ±21 MB ke ±8 MB, jadi potret pertama
   muncul jauh lebih cepat. `DialogueBox` juga memanaskan keenam ekspresi
   karakter begitu dia muncul, sehingga pergantian ekspresi berikutnya langsung
   dari cache.
4. `expression` opsional membuat cerita lama, fixture, dan hasil generator tetap
   valid tanpa migrasi.
5. Satu daftar ekspresi mencegah zod, JSON Schema, manifest, dan prompt
   menyimpang.

## Konsekuensi

**Positif:**

- AI dan guru bisa mengatur wajah per kalimat; narasi juga bisa menyorot reaksi
  karakter tanpa menampilkan namanya.
- Jawaban tantangan punya umpan balik visual yang langsung terbaca.
- Potret tidak lagi beban `PreloadScene`: tidak ada 60 berkas yang dimuat ke
  memori canvas.

**Negatif / utang:**

- Panel dialog sekarang milik DOM, jadi `layout.ts` harus tetap jadi satu
  sumber angka untuk `TEXTBOX` dan `PORTRAIT`.
- 60 berkas potret (±8 MB) ikut di repo. Ukuran itu sudah ditekan lewat kanvas
  456×360 dan filter PNG adaptif; kalau masih terasa berat, kurangi jumlah
  ekspresi atau pindahkan ke CDN — jangan kembali ke canvas.
- `ui_portrait_frame` masih ada di manifest dan `inventory.md` sebagai aset
  siap pakai, walau tidak dipakai runtime. Menghapusnya berarti mengubah
  hitungan aset UI, jadi ditunda.
- Data lama dengan `portraitPath` tidak dikenal lagi; manifest dan tes sudah
  dipindah ke `portraits`.

**Yang harus diubah:**

- `src/story/expression.ts` (baru) dan `src/story/schema.ts` — enum ekspresi
  serta beat `dialogue`/`narration`.
- [`../02-data-model/story.schema.json`](../02-data-model/story.schema.json)
  beserta drift guard dan
  [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md).
- `src/story/validate.ts` — `speakerId` pada narration ikut diperiksa.
- `src/assets/manifest.ts` dan `scripts/import-portraits.mjs` — path potret per
  ekspresi.
- `src/game/textbox.ts`, `src/game/layout.ts`, dan
  `src/components/game/DialogueBox.tsx` — state dialog murni + render DOM.
- `src/game/potret.ts` — aturan scene yang melibatkan pemain (potret MC).
- `src/app/globals.css` — keyframe buka/tutup panel dan potret.
- `src/game/scenes/GameScene.ts` — potret per beat, potret pendamping, dan
  feedback jawaban.
- [`../04-game/scene-format.md`](../04-game/scene-format.md),
  [`../04-game/engine.md`](../04-game/engine.md), dan
  [`../07-assets/inventory.md`](../07-assets/inventory.md).

## Kapan keputusan ini ditinjau ulang

- Jika potret 456×360 terasa terlalu kecil di layar besar: naikkan resolusi
  kanvas importer (bukan mengubah tata letak), lalu ukur ulang berat berkas.
- Jika animasi buka/tutup terasa mengganggu pada perangkat lambat: kurangi
  durasinya atau matikan lewat `prefers-reduced-motion`; jangan menghapus
  penahanan view terakhir tanpa mengganti mekanismenya.
- Jika butuh ekspresi tambahan: tambah ke `expression.ts`, manifest, dan berkas
  aset sekaligus — jangan menambah nilai yang tidak punya gambar.
- Jika `ui_portrait_frame` benar-benar tidak akan dipakai: hapus lewat ADR baru
  beserta penyesuaian hitungan aset UI.

## Referensi

- [`0002-story-json-as-contract.md`](0002-story-json-as-contract.md) — cerita
  adalah data
- [`0007-hybrid-ui.md`](0007-hybrid-ui.md) — pembagian Phaser dan DOM
- [`0009-resolution-and-scale.md`](0009-resolution-and-scale.md) — kanvas
  640×360 dan `pixelated`
- [`0016-obrolan-singkat-npc.md`](0016-obrolan-singkat-npc.md) — obrolan
  singkat NPC (tanpa potret MC)
- [`../07-assets/inventory.md`](../07-assets/inventory.md) — daftar berkas
  potret
