---
status: draft
last_reviewed: 2026-11-10
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

## Keyboard

| Aksi           | Tombol                        |
| -------------- | ----------------------------- |
| Lanjut dialog  | `Space`, `Enter`              |
| Pilih opsi     | `1`–`5`, `↑`/`↓` + `Enter`    |
| Submit jawaban | `Enter`                       |
| Menu jeda      | `Esc`                         |
| Tutup overlay  | `Esc` (hanya setelah dijawab) |

Aturan:

- Urutan fokus logis: prompt → opsi → tombol jawab → feedback → lanjut.
- Jangan memasang `tabindex` positif.
- Jangan menangkap `Tab`; biarkan browser memindahkan fokus.
- Saat panel tantangan muncul, fokus pindah ke panel itu sendiri (`tabIndex={-1}`).
- Saat panel ditutup, fokus kembali ke area permainan (canvas), bukan hilang ke
  `body`.
- **`Esc` tidak bisa dipakai untuk keluar dari soal yang belum dijawab.** Kalau
  overlay belum dijawab, `Esc` diabaikan (atau hanya mengumumkan "jawab dulu").
  Setelah dijawab, `Esc` sama dengan menekan "Lanjut".

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
- Teks dialog: `#1F1E28` di atas `#F4EFE6` (kontras tinggi) atau `#F7F4EC` di atas
  `#14201A`.
- Border fokus: 2 px, warna aksen, offset 2 px.

## Ukuran teks

Canvas berukuran sesuai resolusi internal (sekarang 640×360, ADR 0009) dan
diskalakan dengan `Phaser.Scale.FIT`, jadi skalanya mengikuti lebar kontainer.

Teks dialog, nama speaker, indikator lanjut, prompt interaksi, penanda `!`, dan
panel quest **tidak** digambar di canvas: semuanya DOM di atas canvas (ADR 0007),
sehingga huruf dirender browser pada resolusi layar asli dan tidak ikut
bergerigi bersama pixel art.

- Panel quest memakai `aria-label="Daftar quest"` dan status tiap baris
  disampaikan lewat teks tersembunyi (`Selesai`/`Aktif`/`Terkunci`), bukan hanya
  ikon.
- Penanda `!` murni dekoratif (`aria-hidden`); informasinya sudah ada di panel
  quest dan chip `Space`.

- Ukuran huruf memakai `clamp(min, Ncqw, max)` dari `src/game/layout.ts`, jadi
  teks ikut membesar bersama canvas tetapi tidak pernah turun di bawah `min`.
- Di layar 1280 px, satu baris dialog setara ~30 px; minimum 13 px berlaku di
  layar sempit.
- Font yang dipakai adalah **Patrick Hand** (OFL, lokal di `public/fonts/`,
  dimuat `next/font/local`) — lihat
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
- [ ] Fokus terlihat dan tidak terjebak.
- [ ] Feedback dibacakan (`aria-live`).
- [ ] Benar/salah tidak hanya warna.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Mute tersedia dan berfungsi.
- [ ] Canvas punya `aria-label` yang menjelaskan konteks.
- [ ] Overlay bisa ditutup dengan `Esc` setelah dijawab.
