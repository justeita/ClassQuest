---
status: draft
last_reviewed: 2026-11-13
owner: tim ClassQuest
---

# Konvensi UI

## Prinsip

1. **Dua wajah, satu rasa.** UI guru bersih dan tenang; game punya karakter pixel.
   Keduanya berbagi palet dan nada bahasa.
2. **Sedikit komponen, dipakai ulang.** Jangan membuat tombol baru untuk setiap
   halaman.
3. **Tailwind dulu.** Jangan menambah CSS-in-JS atau component library baru tanpa
   ADR.
4. **Aksesibilitas bukan hiasan.** Fokus, label, dan kontras dari awal.

## Token desain

Didefinisikan di `src/app/globals.css` memakai `@theme` Tailwind 4.

```css
@import "tailwindcss";

@theme inline {
  --color-surface: #f4efe6;
  --color-surface-raised: #ffffff;
  --color-ink: #1f1e28;
  --color-ink-muted: #5c5a68;
  --color-accent: #e8a87c;
  --color-accent-strong: #c97b4a;
  --color-info: #7fa6c9;
  --color-success: #6f9b7a;
  --color-warning: #c9a227;
  --color-danger: #b4544a;
  --radius-card: 12px;
}
```

Aturan:

- Pakai token (`bg-surface`, `text-ink`), bukan hex langsung di komponen.
- `--color-surface` sengaja sama dengan latar terang palet game (`#F4EFE6`), supaya
  transisi dari dashboard ke preview tidak terasa seperti dua produk berbeda.
  `#F7F4EC` adalah warna **teks** di atas panel gelap game, bukan warna permukaan —
  jangan dipakai sebagai background.
- Warna game (palet pixel) ada di `04-game/game-design.md`; jangan mencampur
  palet game ke form guru, kecuali permukaan netral di atas.
- `--color-danger` hanya untuk UI guru (hapus, gagal). Game tidak memakai merah
  menyala; jawaban salah di game memakai penjelasan, bukan warna alarm.
- Jangan menambah warna baru tanpa memperbarui dokumen ini.

### Palet halaman pemilihan peran (`/`)

Halaman `/` memilih peran lewat dua kartu, jadi ia punya dua palet sendiri di
`@theme inline` `src/app/globals.css`:

| Token     | Kartu       | Nada    | Warna inti                   |
| --------- | ----------- | ------- | ---------------------------- |
| `guru-*`  | Portal Guru | Violet  | 600 `#7c3aed`, 700 `#6d28d9` |
| `siswa-*` | Arena Siswa | Emerald | 500 `#10b981`, 600 `#059669` |

Dipandang sebagai palet halaman peran (`/`) dan halaman 404 (`/_not-found`),
karena keduanya memakai bahasa visual yang sama; jangan mencampurnya ke form guru
atau ke game. Kedua palet ini juga menandai asal tombol (violet = guru, emerald =
siswa).

## Tipografi

| Peran               | Font                                                                 | Ukuran                                |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| UI guru             | Geist Sans                                                           | `text-sm` (14) body, `text-2xl` judul |
| Judul halaman       | Geist Sans                                                           | `text-2xl font-semibold`              |
| Halaman peran (`/`) | Inter (body), Plus Jakarta (`font-heading`), Pixelify (`font-pixel`) | `text-xs`–`text-4xl`                  |
| Teks game           | Patrick Hand (`font-game`)                                           | `clamp()` dari `src/game/layout.ts`   |
| Kode/ID aset        | Geist Mono                                                           | `text-xs`                             |

- `--font-game` = `var(--font-handwriting)` didefinisikan di `@theme inline`
  `src/app/globals.css`; utility `font-game` dipakai HUD, dialog, prompt, dan
  layar overlay game.
- **Patrick Hand hanya punya bobot 400.** Jangan memakai `font-bold` untuk teks
  game — browser akan mensintesis bold dan huruf terlihat kotor. Pakai ukuran,
  warna, atau `tracking` untuk hierarki.
- Ukuran teks game memakai `clamp(min, Ncqw, max)` dari `layout.ts`, bukan `rem`
  tetap, supaya ikut skala canvas tanpa turun di bawah batas baca. Jangan
  menyalin angka internal ke komponen.
- Teks dialog **tidak** digambar di canvas (ADR 0007); panel dan portrait tetap
  Phaser, teksnya DOM. Jangan menambah teks permainan baru di canvas.

Font dimuat di `src/app/layout.tsx`: Geist lewat `next/font/google`, Patrick Hand
lewat `next/font/local` dari `public/fonts/`. Jangan memuat font lewat `<link>`
manual.

Font khusus satu area dimuat di layout area itu, bukan di root, supaya halaman
lain tidak ikut mengunduhnya: portal guru di `src/app/guru/layout.tsx`, halaman
peran di `src/app/(landing)/layout.tsx`.

## Spacing dan layout

- Skala Tailwind (4 px basis). Jangan memakai nilai arbitrer kecuali untuk kanvas.
- Lebar konten guru: `max-w-5xl` dengan padding `px-4 sm:px-6`.
- Jarak antar section: `space-y-8`.
- Kartu: `rounded-xl border border-black/5 bg-white p-5 shadow-sm`.

## Komponen dasar

Terletak di `src/components/ui/`:

| Komponen   | Props minimum                                                                 |
| ---------- | ----------------------------------------------------------------------------- |
| `Button`   | `variant: "primary" \| "secondary" \| "ghost" \| "danger"`, `size`, `loading` |
| `Field`    | `label`, `hint`, `error`, `required`                                          |
| `Input`    | meneruskan props input native                                                 |
| `Textarea` | + `counter` (jumlah karakter)                                                 |
| `Select`   | `options: { value, label }[]`                                                 |
| `Badge`    | `tone: "neutral" \| "success" \| "warning" \| "danger"`                       |
| `Dialog`   | `open`, `onClose`, `title`                                                    |
| `Toast`    | `tone`, `message`                                                             |
| `Skeleton` | `className`                                                                   |

Aturan:

- `Button` dengan `loading` harus `disabled` dan menampilkan teks yang jelas
  ("Menyimpan…"), bukan spinner tanpa konteks.
- `Field` yang membungkus input wajib menghubungkan `id`, `aria-describedby`, dan
  pesan error.
- Jangan memakai `div` yang bisa diklik sebagai tombol.

### Dropdown dan tanggal: selalu custom, tanpa teks bebas

Portal guru **tidak memakai `<select>` maupun `<input type="date">`**. Keduanya
diganti komponen sendiri supaya bisa bertema dan supaya tidak ada teks bebas
yang masuk ke nilai domain:

| Komponen     | Lokasi                               | Menggantikan            |
| ------------ | ------------------------------------ | ----------------------- |
| `SelectMenu` | `src/components/guru/SelectMenu.tsx` | `<select>`              |
| `YearPicker` | `src/components/guru/YearPicker.tsx` | input teks tahun ajaran |

Belum ada field tanggal di UI, jadi belum ada `DatePicker`. Kalau nanti
dibutuhkan (mis. tenggat penugasan game), buat dengan pola yang sama: pilihan
kalender, bukan input teks.

Aturan yang mengikat:

- Pilihan **hanya** datang dari prop `options`; tidak ada field teks di dalam
  komponen. Nilai yang keluar selalu salah satu opsi, sementara server tetap
  memvalidasi ulang (`docs/06-backend/api-contract.md`).
- Tahun ajaran hanya menerima bentuk baku `YYYY/YYYY` lewat
  `normalizeAcademicYear()` (`src/lib/academic-year.ts`). Nilai lain ditolak
  dengan pesan, **bukan** dipotong atau diperbaiki diam-diam.
- Pemilih tanggal di dalam `Modal` harus memanggil `event.stopPropagation()`
  saat `Escape`; tanpa itu satu `Escape` menutup daftar sekaligus dialog induk
  (dan isian form hilang). `Modal` juga memeriksa sendiri apakah masih ada
  `[role="listbox"]`/`[role="dialog"]` terbuka di dalamnya, karena klik
  memindahkan fokus ke `body` sehingga `stopPropagation` saja tidak cukup.
  Dijaga tes di `Modal.test.tsx`.
- Daftar pilihan dirender inline, bukan portal, agar tetap terlihat di dalam
  modal; komponen memilih buka ke atas bila ruang di bawah sempit.
- Keyboard wajib: `↑`/`↓`/`Home`/`End`, `Enter`/`Space` memilih, `Escape`
  menutup tanpa mengubah nilai, dan `Tab` menutup.

## Status

Setiap tampilan data punya empat status:

| Status  | Tampilan                            |
| ------- | ----------------------------------- |
| Loading | Skeleton dengan bentuk mirip konten |
| Empty   | Ilustrasi/teks singkat + aksi utama |
| Error   | Pesan manusia + tombol coba lagi    |
| Success | Konten                              |

### Skeleton atau loading biasa

Dua jenis loading dipakai untuk kebutuhan berbeda; jangan menukarnya.

| Situasi                                              | Yang dipakai                                            | Alasan                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pemuatan pertama suatu area (halaman, daftar, panel) | Skeleton berbentuk konten akhir                         | Guru langsung tahu apa yang akan muncul; tidak ada lompatan tata letak.       |
| Navigasi ke segmen yang bentuknya diketahui          | `loading.tsx` per segmen dengan skeleton yang sama      | Halaman lama tidak tertahan sampai data server siap di jaringan lambat.       |
| Navigasi di boundary induk `(portal)`                | Indikator netral: spinner + "Memuat halaman..."         | Boundary induk tidak tahu halaman tujuan; skeleton di sini bisa salah bentuk. |
| Aksi di halaman yang sudah berisi (simpan/unggah)    | Teks tombol pending, spinner kecil hanya bila perlu     | Konten lama masih valid; skeleton akan berkedip dan menghapus konteks.        |
| Penyegaran latar belakang (`router.refresh()`)       | Indikator kecil "Menyegarkan..." dengan `role="status"` | Data lama tetap tampil sampai data baru tiba.                                 |
| Proses panjang/bertahap (generasi cerita)            | Bilah progres + spinner pada tahap yang berjalan        | Yang dibutuhkan kemajuan, bukan bentuk konten.                                |
| Data kecil di tengah kalimat (mis. nama guru)        | Teks pengganti singkat                                  | Skeleton pada potongan teks menggeser baris dan lebih buruk daripada teks.    |

Aturan:

- Semua kerangka portal berada di `src/components/guru/skeletons.tsx`. Jangan
  mendefinisikan skeleton baru di dalam halaman; `loading.tsx` dan `Suspense`
  harus memakai bentuk yang sama supaya tidak ada dua kerangka berkedip.
- Akar skeleton memakai `aria-hidden`; loading biasa yang perlu diumumkan
  memakai `role="status"` (teks singkat, bukan hanya spinner).
- Jangan memakai spinner di tengah halaman kosong tanpa konteks.

## Dark mode

**MVP: UI guru light-only.** Game memakai palet gelapnya sendiri.

`src/app/globals.css` saat ini punya `@media (prefers-color-scheme: dark)`. Saat
membangun dashboard, netralkan agar UI guru tidak berubah gelap tanpa desain yang
siap:

- hapus blok media query tersebut, atau
- batasi ke komponen game.

Jangan menambahkan varian `dark:` sebelum ada desainnya.

## Copywriting

Bahasa Indonesia, konsisten.

| Konteks       | Sapaan | Contoh                        |
| ------------- | ------ | ----------------------------- |
| UI guru       | "Anda" | "Anda belum membuat cerita."  |
| UI siswa/game | "kamu" | "Kamu menemukan setetes air." |
| Pesan sistem  | netral | "Cerita berhasil disimpan."   |

Aturan:

- Kalimat aktif, pendek.
- Hindari istilah teknis di UI: "job", "payload", "schema", "endpoint".
- Tombol memakai kata kerja: "Simpan", "Buat cerita", "Coba lagi".
- Jangan menyalahkan pengguna: "PDF ini belum bisa dibaca" bukan "PDF Anda salah".
- Angka penting disebut: "4,5 MB dari batas 4 MB".

## Ikon

- Gunakan SVG inline atau aset di `public/icons/`.
- Logo brand **bukan** ikon: pakai `public/brand/classquest_logo.png` lewat
  `next/image` (tinggi 48/56 px), jangan meniru dengan ikon Font Awesome + teks.
  Lihat [`../07-assets/asset-guide.md`](../07-assets/asset-guide.md#aset-brand-bukan-aset-game).
- Ikon dekoratif: `aria-hidden="true"`.
- Ikon yang berdiri sendiri sebagai tombol wajib punya `aria-label`.
- Jangan mencampur banyak gaya ikon.

## Form

- Label selalu di atas input.
- Field wajib ditandai `*` + `aria-required`.
- Error di bawah field, warna danger + teks.
- Jangan memvalidasi saat mengetik untuk error pertama; validasi saat blur/submit.
- Tombol submit di kanan bawah, aksi sekunder di kiri.

## Tabel dan daftar

- Gunakan `<table>` untuk data tabular; jangan grid div.
- Di layar kecil, ubah menjadi kartu.
- Kolom aksi di kanan, konsisten urutannya.

## Animasi

Portal guru punya satu sistem gerak kecil di `src/app/globals.css` (bagian
"Gerak portal guru"). Semua halaman di bawah `/guru` memakainya; jangan
menambah pustaka animasi.

Aturan:

- **Hanya `opacity` dan `transform`.** Jangan menganimasikan `height`, `margin`,
  atau `top`; animasi harus berjalan di compositor tanpa layout shift. Satu
  pengecualian: lebar bilah progres, karena itu memang nilai yang diukur.
- **Durasi 120–300 ms, jarak ≤ 8 px.** Ini portal kerja; gerak tidak boleh
  menunda guru membaca atau menekan tombol.
- **Semua `animation` berada di dalam `@media (prefers-reduced-motion:
no-preference)`.** Di luar blok itu tidak ada animasi sama sekali, jadi
  pengguna yang meminta gerak dikurangi langsung melihat keadaan akhir — bukan
  elemen yang tertahan di `opacity: 0`.
- **Pakai kelas yang sudah ada**, bukan keyframes baru per komponen:
  `guru-page-enter` (dipasang sekali lewat `src/app/guru/(portal)/template.tsx`),
  `guru-enter`/`guru-fade`/`guru-pop`, `guru-stagger` (kartu dan daftar),
  `guru-stagger-fade` (baris tabel), `guru-lift` (kartu yang bisa diangkat),
  `guru-press`/`guru-press-pixel` (tombol), `guru-dropzone` + `data-dragging`
  (area unggah), `guru-skeleton` (kerangka), `guru-progress-fill` (bilah
  progres), dan `guru-step-active` (tahap generasi yang sedang berjalan).
- **Jangan memakai `animate-pulse` untuk kerangka portal**; pakai
  `guru-skeleton` supaya kilaunya sama dan menghormati preferensi gerak.
- **Jangan menunda `onClose` demi animasi keluar.** Modal langsung ditutup;
  animasi keluar yang bergantung pada timer adalah bug, bukan sentuhan.
- **Hover hanya untuk perangkat berpenunjuk** (`@media (hover: hover)`), supaya
  kartu tidak "melayang" menempel setelah diketuk di layar sentuh.

`src/app/guru/(portal)/motion.test.ts` menjaga dua aturan yang paling mahal
kalau rusak: animasi hanya di blok `no-preference`, dan kerangka halaman
memakai `guru-skeleton`.

## Format kode

- Prettier mengatur semuanya (`bun run format`).
- Urutan class Tailwind: ikuti Prettier; jangan menyusun manual.
- Nama komponen `PascalCase`, file komponen `PascalCase.tsx`.
- Satu komponen utama per file; helper kecil boleh di file yang sama bila < 30 baris.

## Checklist review UI

- [ ] Memakai token warna, bukan hex.
- [ ] Semua input berlabel.
- [ ] Fokus terlihat.
- [ ] Ada status loading/empty/error.
- [ ] Teks mengikuti sapaan yang benar.
- [ ] Bisa dipakai dengan keyboard.
- [ ] Gerak memakai kelas `guru-*`, bukan keyframes baru.
- [ ] Dengan `prefers-reduced-motion: reduce`, semua konten terlihat (tidak ada
      elemen transparan yang tertinggal).
- [ ] Tidak ada `dark:` tanpa desain.
- [ ] `bun run format:check` lolos.
