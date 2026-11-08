---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Rencana Hackathon

Dokumen ini mengatur urutan kerja agar alur demo selesai lebih dulu, fitur
tambahan belakangan.

## Prinsip

1. **End-to-end dulu, baru dalam.** Alur upload → cerita → main harus jalan
   dengan data dummy sebelum kualitas ditingkatkan.
2. **Paralel hanya setelah kontrak disepakati.** Schema dan manifest adalah
   kontrak; begitu disepakati, pekerjaan bisa berjalan bersamaan.
3. **Setiap fase menghasilkan sesuatu yang bisa didemokan.**
4. **Sisakan waktu untuk demo,** bukan menghabiskan semua waktu untuk kode.

## Fase

Nomor fase **bukan** urutan kaku. Fase 1–4 punya jendela waktu yang tumpang
tindih (4–10, 6–14, 10–18 jam) dan dikerjakan dua track paralel. Yang mengikat
adalah **gerbang**: jangan masuk fase berikutnya sebelum gerbang fase sebelumnya
lolos. Kalau waktu mepet dan harus memilih, ikuti
[urutan prioritas](../08-workflow/ai-agent-rules.md#11-prioritas-saat-waktu-terbatas)
— di sana validasi + fallback ada di atas game, walaupun Fase 3 (pipeline) diberi
nomor setelah Fase 2 (game). Alasannya praktis: game bisa dibangun dengan fixture
tanpa pipeline, jadi keduanya jalan bersamaan, bukan berurutan.

### Gerbang keputusan (ADR)

Dua hal di bawah ini **belum diputuskan** dan tidak boleh dianggap selesai:

| Sebelum                 | ADR                                                                          | Kalau belum diputuskan                                                                         |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fase 1 (upload + job)   | [0005](../09-decisions/0005-persistence-and-storage.md) — database & storage | Pakai penyimpanan in-memory/file lokal, dan **tulis di README** bahwa data hilang saat restart |
| Fase 3 (provider nyata) | [0006](../09-decisions/0006-ai-provider.md) — provider LLM                   | Tetap di `AI_PROVIDER=mock`; demo memakai fallback                                             |

Artinya: Fase 1 **boleh** dikerjakan sebelum ADR 0005 `Accepted`, asalkan
sementara memakai storage sementara dan tidak mengklaim persistence sudah final.
Fase 3 **tidak** boleh mengunci provider sebelum ADR 0006 `Accepted`.

### Fase 0 — Fondasi (0–2 jam)

| Pekerjaan                  | Output                                 |
| -------------------------- | -------------------------------------- |
| Sepakati schema & manifest | `story-schema.md`, `asset-manifest.md` |
| Buat placeholder aset      | 25 file placeholder + manifest         |
| Scaffold folder target     | `src/story`, `src/assets`, `src/game`  |
| Buat `story.example.json`  | Fixture valid                          |
| Validator + test           | `validate.ts` lolos fixture            |

**Gerbang:** validator menerima contoh dan menolak fixture rusak.

Fase 0 tidak menyentuh game. `phaser@4.2.1` dan boot scene kosong dikerjakan di
Fase 2 (lihat
[`../01-architecture/tech-stack.md`](../01-architecture/tech-stack.md)).

### Fase 1 — Jalur guru tanpa AI (2–6 jam)

| Pekerjaan                       | Output                           |
| ------------------------------- | -------------------------------- |
| Halaman `/guru` + daftar materi | Bisa melihat daftar (data dummy) |
| Form upload + route handler     | Upload tersimpan, job dibuat     |
| Status job (mock pipeline)      | Progres per tahap                |
| Halaman detail + tombol preview | Navigasi lengkap                 |

**Gerbang:** guru bisa upload dan melihat cerita contoh (dari fixture) tanpa AI.

### Fase 2 — Game bisa dimainkan (4–10 jam)

| Pekerjaan                   | Output                            |
| --------------------------- | --------------------------------- |
| `bun add phaser@4.2.1`      | Terpasang di `package.json`       |
| `GameCanvas` + Phaser boot  | Halaman dev `/game`, scene kosong |
| `StoryRunner` + dialog      | Dialog berjalan dengan contoh     |
| Overlay tantangan + scoring | 4 tipe tantangan bisa dijawab     |
| Progres lokal + hasil       | Selesai → layar hasil             |

**Gerbang:** cerita contoh bisa dimainkan dari awal sampai hasil di browser.

Bisa dikerjakan paralel dengan Fase 1 setelah schema disepakati.

### Fase 3 — Pipeline AI nyata (6–14 jam)

| Pekerjaan                      | Output                   |
| ------------------------------ | ------------------------ |
| Ekstraksi PDF                  | Teks per halaman         |
| Outline + generate (mock dulu) | Pipeline tersambung      |
| Provider nyata                 | Output JSON dari model   |
| Repair + fallback              | Demo tidak pernah kosong |

**Gerbang:** PDF nyata → cerita valid tanpa intervensi manual.

Kalau ADR 0006 belum `Accepted`, baris "Provider nyata" diganti dengan
`MockProvider` yang membaca fixture, dan gerbangnya menjadi "PDF nyata → pipeline
memilih chapter dan memakai fixture". Demo tetap jalan; yang belum terbukti hanya
kualitas model.

### Fase 4 — Editor guru (10–18 jam)

| Pekerjaan                   | Output                     |
| --------------------------- | -------------------------- |
| Editor beat (narasi/dialog) | Teks bisa diubah           |
| Editor tantangan            | Soal & jawaban bisa diubah |
| Validasi inline + publish   | Publish hanya bila valid   |
| Simpan versi                | Riwayat minimal            |

**Gerbang:** guru bisa memperbaiki satu dialog dan satu soal, lalu publish.

### Fase 5 — Polish demo (18–24 jam)

| Pekerjaan                        | Output                       |
| -------------------------------- | ---------------------------- |
| Aset final (prioritas inventory) | Layar tidak lagi placeholder |
| Transisi, musik, SFX             | Terasa seperti game          |
| Empty/error/loading states       | Tidak ada layar rusak        |
| Latihan demo 3 menit             | Naskah + cadangan            |
| Bekukan fitur                    | Hanya perbaikan bug          |

**Gerbang:** demo berjalan 3 kali berturut-turut tanpa intervensi. Naskah dan
sketsa layarnya sudah disiapkan di [`demo-script.md`](./demo-script.md) — pakai
itu, jangan menyusun naskah baru di menit terakhir.

## Pembagian kerja (2 orang)

| Track             | Isi                                             |
| ----------------- | ----------------------------------------------- |
| **A — Guru/Data** | Upload, job, persistence, pipeline AI, editor   |
| **B — Game/UI**   | Phaser, dialog, tantangan, hasil, aset, styling |

Titik integrasi:

1. **Akhir Fase 0:** schema + manifest disepakati (wajib sinkron).
2. **Awal Fase 2:** `Story` fixture diserahkan ke track B.
3. **Awal Fase 4:** API/Server Action cerita siap dipakai editor.

Jangan menunggu integrasi sempurna; gunakan fixture sebagai kontrak sementara.

## Urutan commit yang disarankan

1. `docs(workflow): tambah dokumentasi proyek dan aturan AI`
2. `feat(story): schema, validator, dan fixture`
3. `feat(assets): manifest dan placeholder`
4. `feat(game): boot phaser dan story runner`
5. `feat(upload): form dan route handler`
6. `feat(ai): pipeline dengan mock provider`
7. `feat(editor): edit beat dan tantangan`
8. `feat(game): overlay tantangan dan hasil`
9. `feat(ai): provider nyata dan fallback`
10. `style(demo): polish aset dan transisi`

## Risiko dan rencana cadangan

| Risiko                       | Tanda awal              | Rencana                                      |
| ---------------------------- | ----------------------- | -------------------------------------------- |
| Phaser + Next tidak jalan    | `window is not defined` | Dynamic import + `useEffect`; tes lebih awal |
| AI jarang menghasilkan valid | Banyak repair           | Turunkan ambisi cerita; fallback lebih awal  |
| Aset belum selesai           | Masih placeholder H-12  | Pakai placeholder berlabel; jangan menunggu  |
| Editor terlalu lama          | Fase 4 melewati 18 jam  | Cut: hanya edit teks, bukan struktur         |
| Demo gagal karena jaringan   | Provider timeout        | Fallback story tersimpan + mode mock         |

## Cut line

Lihat [`../00-product/mvp-scope.md`](../00-product/mvp-scope.md). Ringkasnya:
korbankan `short_answer`/`ordering`, preview terpisah, hasil di server, lalu
musik per scene. Jangan korbankan validasi, fallback, editor, dan game end-to-end.

## Definisi selesai hackathon

- [ ] Alur upload → generate → edit → publish → main berjalan.
- [ ] `bun run check` dan `bun run build` hijau.
- [ ] Tidak ada placeholder **tanpa label** di layar demo utama. Kalau aset final
      belum selesai, placeholder berlabel boleh — lihat baris risiko di atas.
- [ ] Fallback teruji (matikan provider, demo tetap jalan).
- [ ] Demo 3 menit dikuasai tanpa membaca catatan —
      lihat [`demo-script.md`](./demo-script.md).
- [ ] Docs diperbarui dengan keputusan yang diambil selama hackathon.

Poin placeholder sengaja dibuat kondisional. Rencana risiko di atas mengizinkan
"pakai placeholder berlabel; jangan menunggu", jadi DoD yang menuntut nol
placeholder akan bertabrakan dengan rencana itu sendiri.

## Setelah hackathon

1. Ubah ADR 0005/0006 dari `Proposed` menjadi `Accepted` (atau ganti). Tiga
   tempat harus diubah bersamaan: badan ADR, front-matter `status:`, dan baris
   indeks di [`../09-decisions/README.md`](../09-decisions/README.md). Front-matter
   memakai `tbd` (bukan `Proposed`) karena hanya mengenal `stable|draft|tbd`;
   pemetaannya: `Proposed` → `tbd`, `Accepted` → `stable`.
2. Tulis retro singkat: apa yang berhasil, apa yang menjadi utang.
3. Prioritaskan: OCR, auth nyata, analitik konsep, bank cerita.
