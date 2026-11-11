---
status: draft
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Loop Interaksi

Dokumen ini merinci perilaku runtime: apa yang terjadi saat siswa menekan tombol,
menjawab, menutup tab, atau kehilangan fokus.

## Dua state, bukan satu

Ada dua mesin state yang berbeda, dan dokumen ini sebelumnya menyamakannya. Itu
salah. Yang benar:

| State                  | Dipegang oleh | Isi                                                                          |
| ---------------------- | ------------- | ---------------------------------------------------------------------------- |
| `RunnerState.phase`    | `StoryRunner` | `explore`, `dialog`, `challenge`, `chapter_end`, `done` — murni, tanpa React |
| `GameShellState.phase` | `GameShell`   | `loading`, `ready`, `playing`, `paused`, `finished`, `error`                 |

`StoryRunner` menjawab **"di mana kita di dalam cerita"**. `GameShell` menjawab
**"layar apa yang sedang terlihat"**. Keduanya dipetakan begini:

| `RunnerState.phase` | `GameShellState.phase` | Yang tampil                       |
| ------------------- | ---------------------- | --------------------------------- |
| —                   | `loading`              | progress bar aset                 |
| —                   | `ready`                | layar judul, tombol Mulai         |
| `explore`           | `playing`              | ruangan map + pemain + NPC        |
| `dialog`            | `playing`              | canvas + panel dialog + teks DOM  |
| `challenge`         | `playing`              | canvas + `ChallengeOverlay` (DOM) |
| `chapter_end`       | `playing`              | kartu ringkasan chapter           |
| `done`              | `finished`             | `ResultScreen` (DOM)              |
| —                   | `paused`               | `PauseMenu` (DOM)                 |
| —                   | `error`                | layar error                       |

`paused` dan `error` **tidak** ada di `StoryRunner`, karena keduanya bukan posisi
di dalam cerita — cerita berhenti di tempat yang sama, hanya presentasinya yang
berubah. `challenge` juga bukan fase shell: canvas tetap `playing`, overlay
tantangan hanya menumpang di atasnya.

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> ready: aset siap
    loading --> error: cerita tidak ada / versi tidak didukung
    ready --> playing: Mulai / Lanjutkan
    playing --> paused: Esc
    paused --> playing: Lanjut
    playing --> finished: RunnerState.phase = done
    finished --> [*]
    error --> [*]
```

Dan di dalam `playing`, `StoryRunner` berjalan sendiri:

```mermaid
stateDiagram-v2
    [*] --> explore
    explore --> dialog: interaksi NPC (Space/Enter)
    dialog --> challenge: beat bertipe challenge
    challenge --> dialog: jawaban sudah dinilai
    dialog --> explore: beat habis, masih ada scene berikutnya
    dialog --> chapter_end: beat habis di scene terakhir
    chapter_end --> explore: masih ada chapter berikutnya
    chapter_end --> done: chapter terakhir selesai
    done --> [*]
```

Setiap scene dibuka dalam fase `explore` (ADR 0008): pemain berjalan bebas di
ruangan. Interaksi dengan NPC/objek memutar deretan beat scene itu; ketika deretan
beat habis, kembali ke `explore` (scene berikutnya) atau berhenti di
`chapter_end`. `explore` hanya pernah dijeda oleh textbox, overlay tantangan,
atau menu — cerita tetap berhenti di beat yang sama.

Hanya NPC pemberi quest scene aktif yang bisa memicu dialog. Pemberi quest
adalah pembicara `dialogue` pertama di scene yang ada di daftar NPC ruangan;
bila tidak ada yang cocok, NPC pertama di ruangan dipakai agar alur tidak macet.
NPC lain tetap berdiri sebagai penghalang, tetapi tidak memunculkan prompt dan
tidak memulai scene yang sama.

Scene dan ruangan adalah dua hal berbeda. Scene adalah unit cerita, ruangan
adalah unit peta (`roomId`). Beberapa scene boleh terjadi di ruangan yang sama;
perpindahan scene seperti itu mempertahankan posisi pemain dan tidak membangun
ulang peta. Spawn ruangan hanya dipakai saat masuk `roomId` baru atau saat
"Ulangi chapter". Ini berlaku juga setelah soal dijawab: duduk di depan NPC yang
sama, bukan melompat ke tengah ruangan.

`RunnerState` didefinisikan di [`engine.md`](./engine.md#alur-state); dokumen ini
tidak menyalin tipenya, hanya perilakunya.

## Aksi pengguna

| Aksi                        | State       | Efek                                                       |
| --------------------------- | ----------- | ---------------------------------------------------------- |
| `W`/`A`/`S`/`D`, panah      | `explore`   | Gerakkan pemain 4 arah dalam ruangan                       |
| `Space` / `Enter` dekat NPC | `explore`   | Mulai deretan beat scene (interaksi)                       |
| Klik/tap di mana saja       | `dialog`    | Sedang mengetik → selesaikan teks; sudah → beat berikutnya |
| `Space` / `Enter`           | `dialog`    | Sama seperti klik                                          |
| `1`–`5`                     | `challenge` | Pilih opsi (belum submit)                                  |
| `Enter`                     | `challenge` | Submit jawaban (bila ada pilihan)                          |
| `Esc`                       | `dialog`    | Buka menu jeda                                             |
| Klik "Lanjut"               | `dialog`    | Sama seperti klik di mana saja                             |
| Klik "Ulangi chapter"       | `paused`    | Reset ke awal chapter, simpan progres                      |
| `Tab` / tombol "Percepat"   | `dialog`    | Tahan: time-lapse beat sampai soal atau explore            |

Aturan input:

- **Debounce 150 ms** untuk klik/Spasi, agar satu tekanan tidak melewati dua beat.
- Saat `explore`, gerak bebas; saat `dialog`/`challenge`, input gerak **terkunci**.
- Saat `challenge`, input dialog **diabaikan**.
- Saat transisi/fade, input diabaikan sampai selesai.
- **Percepat tidak pernah melewati soal.** `Tab`/tombol "Percepat" hanya aktif
  saat fase `dialog` dan memakai pola tahan-tombol ala Persona: selama ditahan,
  beat dimajukan bertahap seperti time-lapse (100 ms per beat); dilepas, tempo
  kembali normal. Skip berhenti di beat `challenge`, dan fade transisi tetap
  diputar. Setiap beat yang dilewati tetap masuk buku catatan log.
- Saat tab tidak aktif (`visibilitychange`), game pause otomatis.

## Alur tantangan

```text
1. Phaser kirim { type: "challenge", challengeId }
2. React menampilkan panel di atas dialog (dialog tetap terlihat, typewriter
   dibekukan):
   - prompt
   - opsi/statement/item/input
   - tombol "Jawab" (disabled sampai ada pilihan)
3. Siswa memilih → tombol aktif
4. Siswa submit
5. scoring.isCorrect(challenge, answer)  ← fungsi murni
6. Panel menampilkan feedback:
   - benar/salah (tanpa warna menyala)
   - explanation (selalu)
   - tombol "Lanjut" di footer
7. Klik "Lanjut" → kirim { type: "resolve_challenge", correct }
8. Phaser menutup pause, lanjut beat berikutnya
```

Detail penting:

- **Penilaian terjadi sekali per kemunculan.** Jangan menilai ulang saat render.
- **Satu kemunculan soal hanya bisa dijawab sekali.** Setelah submit, tidak ada
  "coba lagi" di soal yang sama — overlay menampilkan jawaban benar + penjelasan,
  lalu "Lanjut". Ini yang membuat skor punya arti.
- **Tapi mengulang bukan mustahil.** Kalau siswa me-refresh, keluar, atau memilih
  "Ulangi chapter", soal itu akan muncul lagi dari awal. Itu memang disengaja:
  ini game belajar, bukan ujian.
- **Skor memakai percobaan pertama.** Progres menyimpan
  `answers[challengeId] = { correct, at }`; nilai pertama tidak ditimpa saat soal
  dijawab ulang. `weakConcepts` di layar hasil memakai data yang sama, jadi
  mengulang tidak menghapus catatan bahwa konsep itu sempat salah.
- **Penjelasan selalu muncul**, benar maupun salah.
- Fokus keyboard otomatis pindah ke overlay saat muncul, dan kembali ke canvas
  saat ditutup.
- `Esc` **tidak menutup** overlay tantangan. Satu-satunya jalan keluar adalah
  menjawab lalu "Lanjut", supaya siswa tidak bisa melewati soal tanpa dijawab dan
  skor tidak pernah bolong.

## Umpan balik

| Hasil | Suara         | Visual                             | Teks contoh                                                    |
| ----- | ------------- | ---------------------------------- | -------------------------------------------------------------- |
| Benar | `sfx_correct` | Opsi terpilih diberi border aksen  | "Tepat. Uap air naik karena lebih ringan daripada air cair."   |
| Salah | `sfx_wrong`   | Opsi terpilih diberi border netral | "Belum tepat. Yang menarik: uap air naik karena lebih ringan." |

Jangan memakai warna merah menyala, teks "SALAH", atau getaran keras. Nada harus
mendorong rasa ingin tahu.

## Progres dan resume

Disimpan setiap kali beat berubah (di-throttle 500 ms):

```ts
type PlayProgress = {
  storyId: string;
  storyVersion: number;
  chapterIndex: number;
  sceneIndex: number;
  beatIndex: number;
  answers: Record<string, { correct: boolean; at: string }>;
  updatedAt: string;
};
```

Aturan:

- Key: `classquest:progress:{storyId}`.
- **Versi cerita dicek.** Kalau `storyVersion` berbeda, progres lama dibuang dan
  siswa mulai dari awal (dengan konfirmasi).
- Saat resume, game mulai dari **awal scene** tempat beat terakhir, bukan tengah
  beat. Lebih sederhana dan tidak pernah menampilkan tantangan yang sudah dijawab.
- Tombol "Mulai ulang" menghapus progres.

## Menu jeda

Isi:

- Lanjut
- Ulangi chapter
- Pengaturan suara: slider **Musik** dan **Efek suara** terpisah (0–100%, step 5) + tombol mute per baris
- Keluar (kembali ke halaman awal)

Saat menu terbuka: game pause, musik **volume turun** (bukan berhenti), input
dialog diabaikan. Nilai tersimpan di `localStorage`
(`classquest:settings:v1`) dan dipakai lagi saat game dibuat. Mute musik tidak
mematikan efek suara; HUD hanya menampung toggle musik, SFX diatur di menu.

Buku catatan (`B`): dunia dibekukan (`scene.pause()`) **tanpa** menurunkan
musik; log tidak bisa dibuka saat soal aktif; `Esc` atau `B` menutupnya.

## Penanganan error runtime

| Error                         | Perilaku                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| Aset gagal dimuat             | Pakai fallback, tampilkan sekali toast kecil, lanjut            |
| `challengeId` tidak ditemukan | Lewati beat, catat error, jangan crash                          |
| `speakerId` tidak dikenal     | Tampilkan sebagai narasi, catat error                           |
| Audio diblokir browser        | Mulai senyap, tampilkan tombol "Nyalakan suara"                 |
| `localStorage` penuh/ditolak  | Lanjut tanpa simpan, beri tahu sekali                           |
| Story `schemaVersion` beda    | Tampilkan layar "cerita tidak didukung", jangan render sebagian |

Prinsip: **satu error tidak boleh menghentikan seluruh permainan**, kecuali
schema tidak didukung.

## Autoplay audio

Browser memblokir audio sebelum interaksi pengguna. Karena itu:

- Jangan memutar musik di `PreloadScene`.
- Mulai musik setelah aksi pertama (klik "Mulai" atau klik pertama di dialog).
- Kalau tetap gagal, tampilkan ikon suara yang bisa diklik.

## Fokus dan keyboard

- Canvas diberi `tabindex="0"` dan `aria-label` singkat.
- Overlay tantangan memakai focus trap sederhana.
- Setelah overlay ditutup, fokus kembali ke canvas.
- Jangan menangkap `Tab` secara global.

## Skenario tepi

| Skenario                             | Perilaku yang benar                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Siswa klik cepat 5x                  | Hanya 1 beat maju (debounce)                                                        |
| Siswa refresh saat tantangan         | Kembali ke awal scene, tantangan muncul lagi; skor tetap pakai percobaan pertama    |
| Siswa tutup tab, buka besok          | Progres dipulihkan                                                                  |
| Guru mengedit cerita saat siswa main | Siswa tetap di versi lamanya sampai reload                                          |
| Dua tab dibuka bersamaan             | Tab terakhir yang menulis progres menang (dokumentasikan, jangan diperbaiki di MVP) |
| Layar sangat kecil (≤ 360 px)        | Canvas mengecil (FIT) dan teks jadi < 16 px; tampilkan saran putar layar atau zoom  |
| Orientasi landscape di HP            | Disarankan; portrait menampilkan saran memutar layar                                |

## Metrik yang dicatat (lokal)

Tidak dikirim ke mana pun di MVP:

- Waktu per chapter.
- Jumlah jawaban benar.
- Tantangan yang dijawab salah lebih dari sekali (untuk `weakConcepts`).

## Checklist implementasi

- [ ] Debounce input 150 ms.
- [ ] Input dialog diabaikan saat `challenge` dan transisi.
- [ ] Penilaian lewat `src/story/scoring.ts` (tidak diduplikasi).
- [ ] `explanation` selalu tampil.
- [ ] Fokus berpindah ke overlay dan kembali.
- [ ] Progres disimpan dan bisa dipulihkan.
- [ ] Versi cerita dicek saat resume.
- [ ] Audio mulai setelah interaksi pertama.
- [ ] Error aset tidak menghentikan permainan.
