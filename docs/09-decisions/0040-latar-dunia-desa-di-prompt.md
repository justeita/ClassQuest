---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0040 — Latar Dunia Desa di Prompt

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0035](0035-penempatan-tokoh-tetap.md)

## Konteks

Game ClassQuest hanya punya **satu peta**: `world_map_village`
(`src/game/world/village.json`). `GameScene` membangunnya sekali dan tidak
pernah mengganti gambar latar saat chapter atau scene berganti — yang berubah
hanya musik dan NPC pemegang quest (`docs/04-game/scene-format.md`). Karena itu
`backgroundId` di Story JSON tidak dipakai untuk menggambar latar di dalam game.

Prompt `story-v13` tidak pernah menyatakan fakta itu. Blok `LOKASI` hanya
menyebut tempat tiap tokoh, sedangkan system prompt tidak menyebut latar desa
sama sekali. Model lalu mengikuti kebiasaan materi pelajaran dan menulis adegan
"di kelas", "di halaman sekolah", atau "guru menulis di papan tulis". Cerita
yang dihasilkan valid secara schema, tetapi tidak bisa dipasangkan dengan dunia
yang digambar game: siswa melihat peta desa sementara narasi menyebut ruang
kelas.

Cerita cadangan (`src/story/fallback.ts`) dan fixture mock
(`src/ai/__fixtures__/outputs/`) mengalami masalah yang sama, sehingga bahkan
tanpa kunci API hasil yang dilihat guru tetap terasa "sekolah".

## Keputusan

1. **Latar adalah bagian dari kontrak prompt, bukan detail gaya.** System prompt
   mendapat blok `TEMPAT DAN WAKTU` yang menyebut Desa Sukamaju sebagai
   satu-satunya latar, mendaftar tempat yang ada di peta, dan melarang tegas
   ruangan di dalam gedung (kelas, koridor, laboratorium, kantor, aula) beserta
   kata "papan tulis", "bel sekolah", dan "halaman sekolah".
2. **Blok `DUNIA` dikirim di pesan pengguna**, setelah `CAST` dan sebelum
   `LOKASI`. Isinya menegaskan satu peta, daftar tempat, dan larangan adegan di
   dalam gedung. `LOKASI` tetap menjadi sumber penempatan tokoh.
3. **Belajar terjadi di luar ruangan.** Adegan "guru menulis di papan tulis"
   diganti dengan tokoh yang menunjukkan benda nyata (daun, air sumur, biji,
   keranjang ikan), sehingga cerita bisa dipasangkan dengan peta.
4. **`continuity.characterStates[].location` wajib memakai nama tempat dari
   `LOKASI`.** Validator menambah peringatan `W_LOCATION_UNKNOWN` untuk lokasi
   yang tidak dikenal; ini peringatan, bukan penolakan.
5. **Cerita cadangan dan fixture mock ikut diperbaiki.** Keduanya adalah jalur
   yang paling sering dilihat saat pengembangan (`AI_PROVIDER=mock`), jadi
   keduanya harus bercerita di desa.

Prompt naik ke `story-v14`. Tidak ada perubahan schema cerita.

## Konsekuensi

- Model menerima fakta dunia yang sama dengan yang digambar runtime, jadi narasi
  dan peta tidak lagi bertentangan.
- Ruangan di dalam gedung tidak bisa dipakai sebagai latar sampai game punya
  peta interior. Kalau nanti ada, ADR baru harus memperbarui blok `DUNIA`.
- `backgroundId` tetap ada di schema demi kompatibilitas dan layar judul/hasil,
  tetapi bukan lagi cara model "mengganti latar".
- Guru tetap bisa mengedit cerita; peringatan `W_LOCATION_UNKNOWN` hanya
  menandai lokasi yang tidak bisa ditampilkan game.
