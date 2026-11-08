---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Aturan untuk AI Agent

Dokumen ini mengikat **semua** AI agent (dan manusia) yang mengubah repo ini.
Tujuannya satu: perubahan tetap konsisten dengan kontrak, walaupun dikerjakan
oleh banyak agent dalam waktu singkat.

> Ini **satu-satunya** tempat aturan kerja lengkap. `AGENTS.md`,
> `CONTRIBUTING.md`, dan `docs/README.md` boleh memuat **ringkasan 2–3 poin** yang
> paling mahal kalau salah, tapi tidak boleh memuat aturan versi berbeda. Kalau
> kamu menemukan aturan yang bertentangan, file ini yang benar — dan file lain itu
> yang perlu diperbaiki.

## 0. Onboarding 5 menit

1. Baca [`../00-product/vision.md`](../00-product/vision.md) — paham produknya.
2. Baca [`../00-product/mvp-scope.md`](../00-product/mvp-scope.md) — paham batasnya.
3. Baca [`../01-architecture/overview.md`](../01-architecture/overview.md) — paham bentuk sistem.
4. Baca [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md) — paham kontrak utama.
5. Baca [`../11-logicodix/README.md`](../11-logicodix/README.md) — paham aturan lomba yang mengikat.
6. Cek [`../10-roadmap/hackathon-plan.md`](../10-roadmap/hackathon-plan.md) — paham prioritas.

Lalu pilih dokumen sesuai tugas lewat tabel di [`../README.md`](../README.md).
Sebelum menulis kode, cek juga
[`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md#status-kode-sekarang)
supaya tahu file mana yang sudah ada dan mana yang masih rencana.

## 1. Aturan yang tidak bisa dinegosiasikan

### MUST

1. **Baca dokumen terkait sebelum menulis kode.** Jangan menebak nama route,
   bentuk data, atau perintah.
2. **Pakai kontrak yang ada.** `Story` mengikuti
   [`story-schema.md`](../02-data-model/story-schema.md); aset mengikuti
   [`asset-manifest.md`](../02-data-model/asset-manifest.md).
3. **Validasi semua output AI** dengan validator yang sama di client dan server.
4. **Jalankan `bun run check` dan `bun run build`** sebelum menyatakan selesai.
5. **Perbarui docs** bila mengubah kontrak, route, API, perintah, atau dependency.
6. **Tambahkan test** untuk perilaku baru dan bug fix.
7. **Jaga rahasia di server.** `import "server-only"` untuk modul berkredensial.
8. **Hormati batas scope** di [`mvp-scope.md`](../00-product/mvp-scope.md).
9. **Satu fakta, satu tempat.** Daftar aset hanya di
   [`../07-assets/inventory.md`](../07-assets/inventory.md); aturan kerja hanya di
   file ini; daftar dokumen hanya di [`../README.md`](../README.md). Kalau butuh
   aturan yang sama di file lain, tulis tautan, jangan salin.

### MUST NOT

1. **Jangan mengarang `assetId`.** Hanya dari manifest.
2. **Jangan mengubah schema tanpa ADR** di [`../09-decisions/`](../09-decisions/).
3. **Jangan memakai API Phaser 3.** Target proyek ini Phaser 4.2.1 — lihat
   [`../04-game/engine.md`](../04-game/engine.md).
4. **Jangan menambah dependency** tanpa alasan kuat dan update
   [`tech-stack.md`](../01-architecture/tech-stack.md).
5. **Jangan memakai npm/yarn/pnpm.** Hanya Bun.
6. **Jangan menaruh kunci API di client** atau prefix `NEXT_PUBLIC_`.
7. **Jangan memakai `export const runtime`** (tidak didukung Cache Components).
8. **Jangan memakai `middleware.ts`**; di Next 16 namanya `proxy.ts`.
9. **Jangan menghapus test/CI step** untuk membuat PR hijau.
10. **Jangan menyentuh file di luar tugas** tanpa alasan yang dijelaskan.
11. **Jangan mengklaim sesuatu sudah jalan** tanpa menjalankan verifikasi.
12. **Jangan menambahkan fitur di luar MVP** tanpa bertanya.
13. **Jangan mengubah riwayat git yang sudah di-push** — force push, rebase,
    squash, amend. Ini pelanggaran lomba, bukan preferensi gaya.
    Lihat [`../11-logicodix/05-aturan-commit-dan-git.md`](../11-logicodix/05-aturan-commit-dan-git.md).
14. **Jangan membuat repositori baru, fork, atau memindahkan proyek.** Satu repo
    kanonik saja. Lihat [`../11-logicodix/04-orisinalitas-dan-riwayat-repo.md`](../11-logicodix/04-orisinalitas-dan-riwayat-repo.md).
15. **Jangan membuat commit dari akun bot** atau mengaktifkan Dependabot yang
    membuat commit.

## 2. Protokol perubahan

### Mengubah schema cerita

Wajib berurutan:

1. Buat ADR baru (atau perbarui 0002) yang menjelaskan alasan dan dampak.
2. Perbarui [`story-schema.md`](../02-data-model/story-schema.md).
3. Perbarui `story.example.json` agar tetap valid.
4. Perbarui `src/story/schema.ts` dan `validate.ts`.
5. Perbarui editor, game, dan prompt.
6. Tambah/ubah test.
7. Naikkan `schemaVersion` bila breaking.

Jangan mengubah schema hanya di kode.

### Menambah tipe tantangan

1. Tambah di [`challenge-types.md`](../02-data-model/challenge-types.md).
2. Tambah tipe di schema + validator.
3. Tambah scoring + test.
4. Tambah editor form.
5. Tambah overlay UI.
6. Tambah aturan di prompt.

Keenam langkah itu satu paket. Setengah jalan = bug.

### Menambah route

1. Tambah di [`routes.md`](../05-frontend/routes.md).
2. Implementasi halaman + loading/error state.
3. Otorisasi (`requireTeacher()` bila guru).
4. `PageProps<"/...">` + `await params`.
5. Test minimal untuk logika yang bisa dites.

### Menambah endpoint

1. Tambah di [`api-contract.md`](../06-backend/api-contract.md).
2. Bentuk error `ApiError`.
3. `Cache-Control` eksplisit.
4. Test happy path + satu error.

### Menambah aset

1. File sesuai [`asset-guide.md`](../07-assets/asset-guide.md).
2. Entri manifest + inventory.
3. `bun run test`.
4. Jangan mengubah `id` yang sudah dipakai.

### Menambah dependency

1. Pastikan tidak bisa diselesaikan < 50 baris kode sendiri.
2. `bun add`.
3. Update [`tech-stack.md`](../01-architecture/tech-stack.md).
4. Jelaskan alasan di PR.

### Menambah atau mengubah dokumen

1. **Kepala dokumen wajib.** `status`, `last_reviewed`, `owner`. Ubah
   `last_reviewed` ke tanggal hari ini setiap kali isinya berubah.
2. **Tambahkan barisnya di indeks** `docs/README.md` (di dalam blok
   `<!-- docs-index:start -->`). Tes akan gagal kalau lupa.
3. **Diagram pakai Mermaid**, bukan gambar ASCII. GitHub merendernya otomatis.
   Jangan mencampur: blok ` ```mermaid ` harus berisi sintaks Mermaid saja.
4. **Gambar ASCII hanya untuk sketsa layar** (wireframe). Itu memang lebih jelas
   sebagai teks, dan tes mengizinkannya di luar blok Mermaid.
5. **Satu fakta, satu tempat.** Kalau aturan yang sama sudah ada di dokumen lain,
   tulis tautan, jangan salin.
6. **Jangan hapus `TBD`.** Ubah statusnya setelah ada keputusan.

Kalau kamu menambah file kode yang masih ditandai `rencana` di
[`repo-structure.md`](../01-architecture/repo-structure.md#status-kode-sekarang),
perbarui tabel itu di PR yang sama.

## 3. Aturan khusus Phaser 4

- Phaser **hanya** di client: `"use client"` + dynamic import di `useEffect`.
- `game.destroy(true)` di cleanup.
- `pixelArt: true`, `roundPixels: true` (default v4 `false`).
- Jangan memakai `setTintFill()`, `Phaser.Geom.Point`, `Phaser.Struct.Map`,
  `Phaser.Struct.Set`, `Camera3D`, `Layer3D`, `Mesh`, `Plane`.
- `DynamicTexture` butuh `render()`.
- Jangan mengandalkan state di Phaser untuk progres; simpan di `localStorage`.
- Verifikasi API di docs resmi: <https://phaser.io/oss/docs/>. Jangan buka contoh
  Phaser 3 dari internet — API-nya berbeda dan akan lolos typecheck hanya kalau
  tipenya kebetulan sama.

## 4. Aturan khusus Next.js 16.4.5

- Baca `node_modules/next/dist/docs/` untuk API yang berubah.
- `params`/`searchParams` adalah **Promise** → `await`.
- `PageProps<"/route">`, `LayoutProps<"/">`, `RouteContext<"/api/...">`.
- Cache Components aktif: `use cache` opt-in, butuh `Suspense`, Node runtime saja.
- Server Actions wajib cek otorisasi sendiri.
- Route Handler tidak di-cache by default.

## 5. Saat ragu

Urutan yang benar:

1. **Cari di docs** (`docs/`, lalu `node_modules/next/dist/docs/`).
2. **Cari di kode** (`grep`/graph) untuk pola yang sudah ada.
3. **Kalau tetap tidak ada keputusan**, jangan mengarang. Pilih salah satu:
   - tulis `TBD` + opsi di dokumen yang relevan, atau
   - tanyakan ke manusia dengan menyebutkan opsi dan rekomendasi.

Jangan membuat keputusan arsitektur diam-diam.

## 6. Definition of Done

Sebuah tugas selesai hanya jika:

- [ ] Perilaku sesuai dokumen terkait.
- [ ] `bun run format:check` lolos.
- [ ] `bun run lint` lolos.
- [ ] `bun run typecheck` lolos.
- [ ] `bun run test` lolos.
- [ ] `bun run build` lolos.
- [ ] Test baru mencakup perilaku baru.
- [ ] Docs diperbarui bila perlu (`last_reviewed` ikut diubah).
- [ ] Tidak ada rahasia/temp code.
- [ ] Ringkasan perubahan menyebut file dan cara verifikasi.

Catatan: `bun run check` menjalankan format, lint, typecheck, dan test — **tidak**
menjalankan build. Jadi "sudah `bun run check`" belum cukup; build tetap wajib.

## 7. Menjaga docs tetap jujur

Docs ini punya tes sendiri, dan tes itu ikut jalan di `bun run test`:

| Tes                                       | Yang dijaga                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `docs/docs.test.ts`                       | Kepala dokumen lengkap, tidak ada tautan rusak, indeks dokumen lengkap, klaim "ada/rencana" sesuai isi folder |
| `docs/02-data-model/story-schema.test.ts` | `story.schema.json` menerima contoh cerita, menolak cerita rusak, dan tidak menyimpang dari `story-schema.md` |

Kalau tes itu gagal setelah kamu menambah file, biasanya yang perlu diperbarui
adalah tabel di `docs/README.md` atau tabel status di `repo-structure.md`. Itu
memang tujuannya: docs yang berbohong harus terasa mengganggu.

## 8. Cara melaporkan hasil

Format yang diharapkan:

```text
Selesai: <ringkasan satu baris>

Perubahan:
- <file>: <apa dan kenapa>

Verifikasi:
- bun run check (hijau)
- bun run build (hijau)
- test baru: <nama test>

Catatan:
- <keputusan, batasan, atau TBD yang tersisa>
```

Jangan menulis "sudah selesai" tanpa daftar verifikasi.

## 9. Kesalahan umum agent (dan cara menghindarinya)

| Kesalahan                                  | Kenyataan                                           |
| ------------------------------------------ | --------------------------------------------------- |
| Memakai API Phaser 3 dari ingatan          | v4 berbeda; baca docs                               |
| `props.params.id` langsung                 | Harus `await props.params`                          |
| Membuat `middleware.ts`                    | Next 16: `proxy.ts`                                 |
| Menambah `runtime = "edge"`                | Tidak didukung dengan Cache Components              |
| Mengarang aset `bg_lab`                    | Validator menolak; pilih dari manifest              |
| Menyimpan status di dalam `Story`          | Status hidup di record DB                           |
| Menilai soal di komponen UI                | Penilaian di `src/story/scoring.ts`                 |
| Menganggap `JSON.parse` berhasil = valid   | Struktur bisa salah                                 |
| Menambah `dangerouslySetInnerHTML`         | XSS; render sebagai teks                            |
| Menulis `docs` belakangan                  | Kontrak berubah tanpa catatan = utang               |
| Mengubah banyak hal sekaligus              | Sulit direview, mudah konflik                       |
| Menyalin aturan ke file kedua              | Dua versi aturan = salah satunya pasti basi         |
| Menambah field di `story.schema.json` saja | `story-schema.md` ikut berubah, atau tes docs gagal |

## 10. Prompt bootstrap untuk sesi AI baru

Salin ini ke awal sesi:

```text
Kamu bekerja di repo ClassQuest (Next.js 16.4.5, React 19, Tailwind 4, Bun 1.4.0,
Phaser 4.2.1). Sebelum menulis kode:

1. Baca docs/README.md dan docs/08-workflow/ai-agent-rules.md.
2. Baca dokumen yang relevan dengan tugas ini (lihat tabel reading order).
3. Jangan mengarang aset, schema, route, atau dependency.
4. Ikuti aturan Phaser 4 dan Next 16 (params adalah Promise, Cache Components,
   proxy.ts, bukan middleware.ts).
5. Verifikasi dengan `bun run check` dan `bun run build`.
6. Laporkan perubahan + verifikasi, dan sebutkan TBD yang tersisa.

Kalau ada keputusan yang belum ada di docs, tanyakan atau tulis TBD — jangan
mengarang.
```

## 11. Prioritas saat waktu terbatas

Kalau harus memilih, urutan kepentingan:

1. Alur demo bisa jalan end-to-end.
2. Validasi + fallback (demo tidak boleh kosong).
3. Review/edit guru.
4. Game bisa dimainkan.
5. Kualitas visual.
6. Fitur tambahan.

Mengorbankan nomor 1–2 untuk nomor 5 adalah kesalahan strategi.
