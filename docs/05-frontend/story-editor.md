---
status: draft
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Story Editor

Editor adalah tempat guru memastikan AI tidak ngawur. Ini bukan fitur tambahan:
ini kontrol kualitas dan kontrol keamanan produk.

Target: guru bisa memperbaiki satu dialog dan satu soal dalam **kurang dari 60
detik**, tanpa melihat JSON.

## Status implementasi

Implementasi: `src/app/guru/(portal)/materi/[storyId]/edit/page.tsx` (halaman) +
`src/components/guru/StoryEditor.tsx` (client) di atas logika murni
`src/components/guru/storyEditorState.ts`.

Yang **sudah** ada:

- Form meta cerita, chapter, scene, dan beat; guru tidak melihat JSON.
- Dropdown aset (latar/musik) hanya berisi manifest, dikelompokkan per kind.
- Semua tipe tantangan bisa disunting, termasuk mengganti tipe.
- Hitungan karakter per field dengan peringatan saat mendekati/melampaui batas.
- Validasi client dengan `validateStory` yang sama dengan server, debounce
  300 ms; error dan saran tampil di panel bawah dalam bahasa manusia.
- Klik masalah di panel bawah membuka scene/beat terkait.
- Undo/redo (tombol dan `Ctrl/Cmd+Z`), stack di-reset setelah simpan.
- Simpan eksplisit ke `saveStoryDraft` + pemulihan darurat `localStorage`
  (namespace `classquest:editor:{storyId}`) dan dialog konflik versi.
- `assetUsage` diturunkan ulang setiap perubahan, jadi `E_ASSET_USAGE_MISMATCH`
  tidak pernah muncul karena edit guru.

Yang **belum** ada (di luar cakupan MVP, lihat "Yang tidak dikerjakan"):

- Preview draft (`/guru/materi/[storyId]/preview`) — tombol publish tetap di
  halaman detail materi.
- Tambah/hapus chapter dan scene.
- Diff antar versi.
- Drag-and-drop.

Aturan validator yang membentuk UI (lihat
[`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md)):

- **Satu soal hanya boleh dirujuk satu beat** (`E_DUPLICATE_CHALLENGE_REF`).
  Karena itu "Tambah soal" selalu membuat soal baru, dan dropdown "Soal yang
  dipakai" hanya menawarkan soal yang belum dipakai beat lain.
- **Tidak boleh ada soal yatim** (`E_ORPHAN_CHALLENGE`). Menghapus beat
  `challenge`, menggantinya dengan soal lain, atau menekan "Buat soal baru"
  ikut membuang soal yang tidak lagi dirujuk.
- **Beat terakhir tidak boleh `transition`** (`E_TRANSITION_LAST`). Editor tidak
  melarang, tetapi panel validasi menandainya dan tombol naik sudah tersedia.

## Prinsip

1. **Guru tidak pernah melihat JSON.** Semua lewat form.
2. **Semua perubahan bisa dibatalkan.** Undo + versi tersimpan.
3. **Validasi terlihat, tapi tidak menghalangi eksplorasi.** Error memblokir
   publish, bukan mengetik.
4. **Pilihan aset terbatas.** Dropdown berisi manifest, bukan input bebas.
5. **Preview selalu satu klik.** Guru harus bisa melihat hasil editannya.

## Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Judul cerita            [Preview]  [Simpan]  [Publish]               │
├────────────────────┬─────────────────────────────────────────────────┤
│ Chapter 1          │  Chapter 1 — Pagi yang Menguap                  │
│  • Scene 1         │  Konsep: Evaporasi                              │
│  • Scene 2  ←      │  Background: [Kelas, siang ▾]                   │
│  • Scene 3         │  Musik:      [Sekolah tenang ▾]                 │
│ Chapter 2          │                                                 │
│ Chapter 3          │  ┌─ Beat 1 ────────────────────────────────┐    │
│                    │  │ Narasi                        [↑][↓][×] │    │
│ + Tantangan        │  │ [Bel berbunyi. Di depan kelas...]       │    │
│                    │  └─────────────────────────────────────────┘    │
│                    │  ┌─ Beat 2 ────────────────────────────────┐    │
│                    │  │ Dialog · Pak Bima        [↑][↓][×]     │    │
│                    │  │ [Genangan itu tadi pagi masih penuh...] │    │
│                    │  └─────────────────────────────────────────┘    │
│                    │  + Narasi   + Dialog   + Tantangan              │
├────────────────────┴─────────────────────────────────────────────────┤
│ ⚠ 2 peringatan · 0 error                              [Lihat detail] │
└──────────────────────────────────────────────────────────────────────┘
```

Panel kiri: struktur (chapter → scene). Panel kanan: isi scene.
Di layar kecil: panel kiri jadi drawer.

## Model state editor

Editor bekerja pada **salinan** cerita, bukan langsung ke server:

```ts
type EditorState = {
  story: Story;
  baseVersion: number; // versi server saat dibuka
  dirty: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  undoStack: Story[]; // maksimal 20
  redoStack: Story[];
  selected: { chapterId: string; sceneId: string } | null;
};
```

Aturan:

- Setiap perubahan push snapshot ke `undoStack` (maks 20, buang yang paling lama).
- Validasi dijalankan **debounced 300 ms** setelah perubahan, di client, memakai
  validator yang sama dengan server.
- Simpan eksplisit (tombol). Autosave hanya ke `localStorage` sebagai pemulihan
  darurat, bukan pengganti simpan.
- Kalau `baseVersion` di server sudah berubah (tab lain menyimpan), tawarkan
  "muat versi terbaru" atau "simpan sebagai versi baru". Jangan menimpa diam-diam.

## Edit beat

| Tipe         | Field yang bisa diedit                         |
| ------------ | ---------------------------------------------- |
| `narration`  | teks                                           |
| `dialogue`   | pembicara (dropdown cast), teks                |
| `challenge`  | pilih tantangan yang sudah ada, atau buat baru |
| `transition` | efek (fade/cut), teks opsional                 |

Batasan UI:

- Textarea menampilkan hitungan karakter: `182/240`, berubah warna saat > 220.
- Tombol simpan tetap aktif, tapi error ditandai di beat terkait.
- Menghapus beat terakhir yang bertipe `challenge` di sebuah chapter memunculkan
  **error** `E_CHAPTER_NO_CHALLENGE`, bukan sekadar peringatan: guru tetap boleh
  menyimpan draft, tapi **publish diblokir** sampai chapter itu punya tantangan
  lagi. Ini mengikuti aturan `errors` vs `warnings` di
  [`../02-data-model/validation-rules.md`](../02-data-model/validation-rules.md#bentuk-hasil).
- Beat `challenge` tidak boleh dipindah ke chapter lain tanpa konfirmasi.

## Edit tantangan

Form berbeda per tipe, tapi header sama: prompt, konsep, kesulitan, penjelasan,
poin.

### `multiple_choice`

- Daftar opsi (2–5), masing-masing teks.
- Radio "jawaban benar" — tepat satu.
- Tombol tambah/hapus opsi.
- Peringatan bila opsi < 2 atau tidak ada yang ditandai.
- Pratinjau: "Siswa akan melihat opsi dalam urutan acak." Urutan di editor
  adalah urutan JSON, bukan urutan yang dilihat siswa.

### `true_false`

- Textarea `statement`.
- Toggle Benar/Salah.

### `ordering`

- Daftar item (2–5).
- Urutan benar diatur dengan tombol naik/turun (bukan drag, agar aksesibel).
- Pratinjau: "Siswa akan melihat item dalam urutan acak."

### `short_answer`

- Daftar jawaban diterima (1–5).
- Toggle "bedakan huruf besar/kecil".
- Peringatan: "Jenis soal ini sulit dinilai otomatis. Pertimbangkan menambah soal
  pilihan di chapter yang sama."

## Pemilih aset

- Background/musik: dropdown dari manifest, dikelompokkan per kind.
- Menampilkan `label` (mis. "Kelas, siang"), bukan `id`.
- `id` terlihat sebagai teks kecil di bawah label (untuk debugging).
- Tidak ada input bebas. Tidak ada upload aset dari editor.
- Pilihan default mengikuti chapter; mengosongkan berarti "ikut chapter".

## Validasi di editor

| Level   | Tampilan                                  | Efek           |
| ------- | ----------------------------------------- | -------------- |
| Error   | Badge merah di item terkait + panel bawah | Blokir publish |
| Warning | Badge kuning + panel bawah                | Tidak blokir   |
| Info    | Catatan kecil (mis. "memakai fallback")   | Tidak blokir   |

Klik item di panel bawah → scroll & fokus ke field terkait.

Pesan harus menyebut lokasi dalam bahasa manusia:
"Chapter 2, Scene 1, beat ke-3: teks 312 karakter, maksimal 240."

## Publish

Publish hanya bisa jika:

- [ ] Tidak ada error validasi.
- [ ] Minimal 3 chapter.
- [ ] Setiap chapter punya tantangan.
- [ ] Semua aset ada di manifest.

Konfirmasi publish menampilkan:

- jumlah chapter & tantangan,
- peringatan yang masih ada (boleh lanjut),
- perubahan dari versi yang sedang published (ringkas).

Setelah publish:

- Versi lama tetap tersimpan.
- Siswa baru memakai versi baru; siswa yang sedang bermain tetap di versi lama
  sampai reload.

## Preview

- Membuka `/guru/materi/[storyId]/preview`.
- Memakai **draft saat ini** (disimpan sementara di `sessionStorage` atau
  disimpan sebagai versi draft), bukan versi published.
- Banner "Mode preview" selalu terlihat.
- Tombol "Kembali ke editor" mempertahankan posisi terakhir.

## Aksi server

```ts
"use server";

export async function saveStoryDraft(input: {
  storyId: string;
  story: Story;
  baseVersion: number;
}): Promise<SaveStoryResult>;

export async function publishStory(input: {
  storyId: string;
  version: number;
}): Promise<{ ok: true } | { ok: false; errors: ValidationIssue[] }>;
```

Aturan:

- `requireTeacher()` di baris pertama.
- Validasi ulang di server; jangan percaya hasil validasi client.
- `story.meta.id` tidak boleh diubah dari client.
- Simpan versi baru; jangan update baris lama.

## Undo/redo

- `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo.
- Undo tidak melintasi operasi simpan (stack di-reset setelah simpan sukses).
- Undo saat ada perubahan yang belum disimpan tidak memunculkan dialog.

## Aksesibilitas editor

- Semua field berlabel.
- Panel struktur bisa dinavigasi dengan keyboard.
- Tombol naik/turun beat punya `aria-label` yang jelas ("Pindahkan beat 2 ke atas").
- Status simpan diumumkan lewat `aria-live`.
- Jangan memakai warna saja untuk error.

## Yang tidak dikerjakan (MVP)

- Drag-and-drop urutan scene.
- Mengubah struktur chapter (tambah/hapus chapter) — AI yang menentukan; guru
  hanya mengedit isi. (Bisa ditambahkan nanti.)
- Mengganti cast.
- Editor visual untuk menempatkan karakter di layar.
- Komentar/review antar guru.
- Diff visual antar versi.

## Checklist implementasi

- [x] Editor memakai validator yang sama dengan server.
- [x] Hitungan karakter per beat terlihat.
- [x] Dropdown aset hanya dari manifest.
- [x] Publish diblokir saat ada error.
- [x] Konflik versi ditangani.
- [ ] Preview memakai draft.
- [x] Undo/redo berfungsi.
- [x] Semua aksi server memanggil `requireTeacher()`.
