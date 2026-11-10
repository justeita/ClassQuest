---
status: draft
last_reviewed: 2026-11-10
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

## Tipografi

| Peran         | Font                       | Ukuran                                |
| ------------- | -------------------------- | ------------------------------------- |
| UI guru       | Geist Sans                 | `text-sm` (14) body, `text-2xl` judul |
| Judul halaman | Geist Sans                 | `text-2xl font-semibold`              |
| Teks game     | Patrick Hand (`font-game`) | `clamp()` dari `src/game/layout.ts`   |
| Kode/ID aset  | Geist Mono                 | `text-xs`                             |

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

## Status

Setiap tampilan data punya empat status:

| Status  | Tampilan                            |
| ------- | ----------------------------------- |
| Loading | Skeleton dengan bentuk mirip konten |
| Empty   | Ilustrasi/teks singkat + aksi utama |
| Error   | Pesan manusia + tombol coba lagi    |
| Success | Konten                              |

Jangan memakai spinner di tengah halaman kosong tanpa konteks.

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
- Angka penting disebut: "24 MB dari batas 20 MB".

## Ikon

- Gunakan SVG inline atau aset di `public/icons/`.
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

- Durasi 150–200 ms untuk hover/fokus.
- Hormati `prefers-reduced-motion`.
- Jangan memakai animasi untuk menutupi loading.

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
- [ ] Tidak ada `dark:` tanpa desain.
- [ ] `bun run format:check` lolos.
