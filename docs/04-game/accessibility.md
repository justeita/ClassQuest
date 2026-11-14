---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Aksesibilitas

Game canvas secara alami sulit diakses. Kita tidak akan mencapai WCAG penuh untuk
bagian canvas di MVP, tapi kita bisa membuat **semua keputusan penting** bisa
diakses. Dokumen ini menetapkan batas jujur dan target minimum.

## Prinsip

1. **Semua yang wajib bisa dilakukan tanpa mouse.** Dialog dan tantangan harus
   bisa diselesaikan dengan keyboard.
2. **Informasi penting tidak hanya lewat warna.** Benar/salah juga ditandai teks.
3. **Tantangan ada di DOM**, bukan canvas — ini keuntungan utama UI hybrid.
4. **Jangan menipu.** Kalau canvas tidak terbaca screen reader, nyatakan.

## Target minimum

| Area               | Target                                             |
| ------------------ | -------------------------------------------------- |
| Navigasi keyboard  | Semua aksi utama (lanjut, pilih, jawab, jeda)      |
| Kontras teks       | ≥ 4.5:1 untuk teks utama di atas panel             |
| Ukuran teks dialog | Setara ≥ 16 px pada layar 1280×720                 |
| Fokus              | Terlihat jelas di overlay; tidak hilang            |
| Gerak              | Hormati `prefers-reduced-motion`                   |
| Audio              | Bisa dimatikan; tidak ada informasi hanya di audio |
| Screen reader      | Overlay tantangan terbaca; canvas diberi label     |
| Sentuh             | Semua aksi utama bisa diselesaikan tanpa keyboard  |

## Keyboard

| Aksi           | Tombol                        |
| -------------- | ----------------------------- |
| Lanjut dialog  | `Space`, `Enter`              |
| Pilih opsi     | `1`–`5`, `↑`/`↓` + `Enter`    |
| Submit jawaban | `Enter`                       |
| Menu jeda      | `Esc`                         |
| Lewati dialog  | `Tab` (tahan), "Percepat"     |
| Tutup overlay  | `Esc` (hanya setelah dijawab) |

Aturan:

- Urutan fokus logis: prompt → opsi → tombol jawab → feedback → lanjut.
- Jangan memasang `tabindex` positif.
- **Fokus tidak boleh keluar dari area permainan saat bermain.** `Tab`/
  `Shift+Tab` berputar di kontrol dalam area game (HUD, buku quest) dan kembali
  ke kanvas bila tidak ada kontrol, sehingga fokus tidak lompat ke bilah peramban.
  Jebakan ini lokal: hanya berlaku saat fokus ada di area permainan (atau belum di
  mana pun), dan `Ctrl+Tab`/`Alt+Tab` tetap milik peramban. Selama fase `dialog`,
  `Tab` dipakai untuk "Percepat" dan diambil alih (`preventDefault`). Saat soal,
  panel tantangan mengurus fokusnya sendiri.
- Saat panel tantangan muncul, fokus pindah ke panel itu sendiri (`tabIndex={-1}`).
- Saat panel ditutup, fokus kembali ke area permainan (canvas), bukan hilang ke
  `body`.
- **`Esc` tidak bisa dipakai untuk keluar dari soal yang belum dijawab.** Kalau
  overlay belum dijawab, `Esc` diabaikan (atau hanya mengumumkan "jawab dulu").
  Setelah dijawab, `Esc` sama dengan menekan "Lanjut".

## Kontrol sentuh

Setiap aksi yang bisa dilakukan keyboard juga punya jalur sentuh (ADR 0024),
sehingga siswa di ponsel/tablet tidak ditinggalkan:

| Aksi          | Sentuh                                   |
| ------------- | ---------------------------------------- |
| Gerak         | Joystick 8 arah di sudut kiri bawah      |
| Bicara        | Tombol aksi besar di sudut kanan bawah   |
| Lanjut dialog | Ketuk kotak dialog yang sedang tampil    |
| Pilih jawaban | Ketuk opsi / tombol di overlay tantangan |
| Menu jeda     | Tombol "Jeda" di HUD                     |
| Layar penuh   | Tombol di layar judul / ikon di HUD      |

Aturan:

- Joystick dan tombol aksi hanya muncul saat perangkat terbaca sentuh
  (`pointer: coarse` + `hover: none`), jadi tidak menutupi layar desktop.
- Selama dialog, joystick dan tombol aksi **disembunyikan** (ADR 0027) supaya
  tidak menutupi teks; lanjut dialog cukup dengan mengetuk kotak dialog.
- Memakai pointer events + `setPointerCapture`, jadi jari yang menggeser keluar
  pad tetap menahan tongkat sampai diangkat — tidak "nyangkut".
- Label yang menyebut tombol fisik (`Space`, keycap `Tab`/`B`/`Esc`) diganti atau
  disembunyikan di perangkat sentuh: menyebut tombol yang tidak ada itu menyesatkan.
- Tombol aksi selalu berlabel "Bicara": menyala saat ada warga di jangkauan dan
  tampil redup tetapi tetap bisa ditekan saat belum ada sasaran (ADR 0026);
  menekannya lalu memunculkan pesan `role="status"` "Dekati warga untuk bicara"
  alih-alih command "hantu".
- `touch-action: manipulation` dipasang pada tombol/tautan dan `.area-game` supaya
  ketukan di Android langsung jadi klik, bukan tertahan menunggu zoom ketuk-dua
  kali. Tombol "Layar penuh" tetap tombol biasa: bisa difokuskan dan diaktifkan
  papan tombol, dan menghilang bila peramban tidak mendukungnya (ADR 0025).
- **Di layar potret** tombol HUD (Quest, Percepat, Musik, Catatan, Jeda, layar
  penuh) dipindah ke bar di bawah kanvas, bukan melayang menutupi dunia.
  Tombolnya memakai desain yang sama dengan kotak dialog (gelap `#0b120e`,
  bingkai dan aksen oranye `#E8A87C`, teks krem terang, sudut membulat), jadi
  seragam di desktop maupun HP (ADR 0029, ADR 0031).
  Teks dialog juga diperkecil agar tidak melimpah dari kotak 16:9 yang sempit.
- Tombol "Percepat" di sentuh memantau pelepasan dari `window`
  (`pointerup`/`pointercancel`/`touchend`/`touchcancel`/`blur`) dan memakai
  `touchmove` non-passive selama ditahan, jadi peramban ponsel tidak bisa
  mengambil alih ketukan-tahan sebagai gestur gulir dan mematikan time-lapse
  (ADR 0028).

## Overlay tantangan (DOM)

Struktur yang diharapkan:

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="challenge-title">
  <h2 id="challenge-title">{prompt}</h2>
  <fieldset>
    <legend className="sr-only">Pilih satu jawaban</legend>
    {options.map((o) => (
      <label key={o.id}>
        <input type="radio" name="answer" value={o.id} />
        <span>{o.text}</span>
      </label>
    ))}
  </fieldset>
  <button type="button">Jawab</button>
  <div role="status" aria-live="polite">
    {feedback}
  </div>
</div>
```

Catatan:

- `aria-live="polite"` untuk feedback agar screen reader membacakan hasil.
- Gunakan `fieldset`/`legend` untuk grup opsi.
- `short_answer` memakai `<input type="text">` dengan `<label>`.
- `ordering` menyediakan tombol naik/turun, bukan hanya drag-and-drop.
- Panel diletakkan **di atas dialog**, bukan di tengah layar: baris dialog
  terakhir tetap terlihat sebagai konteks, jadi panel bukan modal penuh layar.
- Isi yang panjang digulir di dalam area isi; tombol aksi menempel di footer
  supaya tidak ikut tergulir.
- Di ruang game yang sangat pendek, panel boleh memakai hampir seluruh tinggi
  dan menutup dialog (fallback) supaya soal tetap terbaca.

## Warna dan kontras

- Jangan mengandalkan hijau/merah saja. Selalu ada ikon atau teks
  ("Tepat", "Belum tepat").
- Teks dialog, kotak jawaban tantangan, dan tombol HUD memakai bahasa visual yang
  sama: teks krem terang `#F7F4EC` di atas latar gelap `#0b120e`, dengan aksen
  oranye `#E8A87C` (ADR 0029, ADR 0030, ADR 0031).
- Penunjuk pilihan aktif adalah tangan menunjuk (glove) pixel-art SVG berwarna
  krem terang `#F7F4EC` dengan outline gelap dan bayangan abu, jadi tetap terbaca
  di atas dunia terang maupun kotak gelap; ukurannya dibatasi `clamp(15px, …,
22px)` agar tidak menabrak margin kotak pilihan. Pilihan aktif juga dibedakan
  lewat latar yang terangkat, bukan warna saja.
- Border fokus: 2 px, warna aksen, offset 2 px.

## Ukuran teks

Canvas berukuran sesuai resolusi internal (sekarang 640×360, ADR 0009) dan
diskalakan lewat `ukuranKanvas()` (`Phaser.Scale.NONE` + `zoom`). Skala **bulat**
dipakai saat sisa ruang kontainer ≤6%; selain itu skala **penuh** supaya kanvas
mengisi bingkai halaman dan teks tidak mengecil di layar pendek. Skala penuh
membuat lebar piksel bisa bergantian 1–2 px, tetapi tidak membuat pola bergeser
karena posisi objek dan `scroll` kamera dikunci ke piksel utuh (lihat
[`world-design.md`](./world-design.md#kamera)). Kamera dunia sendiri sedikit
keluar dari 1:1 (`ZOOM_KAMERA`), dan itu memang bisa menggeser gambar ~0,8 px —
karena itu `CAMERA_LERP` 1 dipakai supaya pergeseran hanya muncul saat pemain
melangkah, bukan terus-menerus.

Teks dialog, nama speaker, indikator lanjut, prompt interaksi, penanda `!`, dan
panel quest **tidak** digambar di canvas: semuanya DOM di atas canvas (ADR 0007),
sehingga huruf dirender browser pada resolusi layar asli dan tidak ikut
bergerigi bersama pixel art.

- Panel quest memakai `aria-label="Daftar quest"` dan status tiap baris
  disampaikan lewat teks tersembunyi (`Selesai`/`Aktif`/`Terkunci`), bukan hanya
  ikon.
- Penanda `!` murni dekoratif (`aria-hidden`); informasinya sudah ada di panel
  quest dan kotak `Space`.

- Ukuran huruf memakai `clamp(min, Ncqw, max)` dari `src/game/layout.ts`, jadi
  teks ikut membesar bersama canvas tetapi tidak pernah turun di bawah `min`.
- Di layar 1280 px, satu baris dialog setara ~30 px; minimum 13 px berlaku di
  layar sempit.
- Isi dialog memakai **Patrick Hand** (OFL, lokal di `public/fonts/`, dimuat
  `next/font/local`); nama pembicara memakai huruf pixel **Pixelify Sans**
  (`font-pixel`) berwarna oranye. Keduanya punya ukuran minimum `clamp()` supaya
  tetap terbaca di layar sempit — lihat
  [`world-design.md`](./world-design.md#teks-dan-font).

Aturan:

- Jangan memakai teks Phaser di bawah 8 px pada resolusi internal 640×360
  (setara 16 px di 720p — batas minimum keterbacaan). Teks permainan sebaiknya
  pindah ke DOM, bukan dinaikkan resolusinya di canvas.
- Overlay React memakai `rem`/`cqw`, bukan px tetap yang tidak ikut skala.
- Sediakan pengaturan "teks lebih besar" yang menaikkan ukuran overlay (bukan canvas).

## Gerak

Hormati `prefers-reduced-motion: reduce`:

- Typewriter → tampilkan teks langsung.
- Fade transisi → cut.
- Getar/shake → nonaktif.
- Parallax → nonaktif.
- Animasi naik-turun penanda `!` → nonaktif.

## Audio

- Tombol mute selalu tersedia: toggle musik di HUD, mute per kanal di menu
  jeda.
- Volume per kanal (musik dan SFX terpisah) disimpan di `localStorage`
  (`classquest:settings:v1`); baca/tulis yang gagal jatuh ke default.
- Slider volume memakai `input[type=range]` dengan `aria-valuetext` berupa
  persen, sehingga pembaca layar tidak membaca angka mentah.
- Jangan memutar suara tiba-tiba keras.
- Tidak ada informasi penting yang hanya disampaikan lewat suara.

## Batasan yang diakui

| Batasan                                      | Dampak                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| Canvas tidak terbaca screen reader           | Siswa dengan screen reader tidak bisa mengikuti dunia visual |
| Tidak ada audio description                  | Perubahan visual tidak dinarasikan                           |
| Tidak ada mode high-contrast untuk pixel art | Kontras mengikuti aset                                       |
| Tidak ada kontrol kecepatan dialog           | Hanya percepatan teks                                        |
| Tidak ada terjemahan UI                      | Teks UI Indonesia                                            |

Mitigasi yang mungkin (backlog):

- **Mode teks:** tampilkan seluruh cerita sebagai halaman teks yang bisa dibaca
  screen reader, dengan tantangan yang sama.
- Narasi audio untuk beat `narration`.
- Mode kontras tinggi (filter Phaser).

## Checklist sebelum demo

- [ ] Seluruh alur bisa diselesaikan hanya dengan keyboard.
- [ ] Seluruh alur bisa diselesaikan hanya dengan sentuh (ponsel).
- [ ] Fokus terlihat dan tidak terjebak.
- [ ] Feedback dibacakan (`aria-live`).
- [ ] Benar/salah tidak hanya warna.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Mute tersedia dan berfungsi.
- [ ] Canvas punya `aria-label` yang menjelaskan konteks.
- [ ] Overlay bisa ditutup dengan `Esc` setelah dijawab.
