---
status: stable
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# 0008 — Gerak Bebas Top-Down dalam Scene

- **Status:** Accepted
- **Tanggal:** 2026-11-08
- **Menggantikan:** —

## Konteks

Keputusan awal MVP ([`../04-game/game-design.md`](../04-game/game-design.md))
memilih loop visual-novel statis: scene → beat dialog → tantangan → scene
berikutnya, dan secara eksplisit mengeluarkan "gerak bebas top-down dengan
collision" dari MVP.

Tim kemudian memutuskan konsep game lebih dekat ke Undertale untuk proyek
edutech ini: siswa berjalan bebas di dalam map, mendekati NPC atau objek, lalu
interaksi memicu dialog dan tantangan. Alur cerita tetap linear mengikuti
`Story` — yang berubah adalah cara siswa berpindah antar beat, bukan urutan
ceritanya.

Batasan nyata: waktu hackathon, ukuran tim, dan inventaris aset yang masih todo.
Karena itu keputusan ini harus bisa dijalankan dengan map dan aset dummy.

## Opsi

| Opsi                                  | Kelebihan                                                                    | Kekurangan                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Visual-novel statis (semula)          | Paling cepat; scene-format sudah matang                                      | Terasa kurang seperti game; kurang menarik untuk demo juri                                    |
| **Top-down per scene (map dummy)**    | Terasa seperti game; sesuai visi tim; tetap linear sehingga StoryRunner bisa | Butuh fase `explore`, collision, penempatan NPC; pekerjaan render tambahan                    |
| Dunia terbuka terhubung antar chapter | Rasa jelajah paling kuat                                                     | Kamera, transisi area, mapping cerita→dunia jauh lebih kompleks; risiko scope hackathon besar |

## Keputusan

**Kami memilih gerak bebas top-down per scene dengan map dummy.**

Alasan:

1. Sesuai konsep tim: eksplorasi ala Undertale yang menyatu dengan materi
   pelajaran.
2. Alur cerita tetap linear — `StoryRunner` (sudah ada) hanya perlu fase
   `explore` tambahan, bukan penulisan ulang.
3. Arcade physics (gravity 0) sudah terkonfigurasi di `src/game/config.ts`
   sejak shell Phaser; collision cukup dipakai apa adanya.

Asumsi: untuk MVP, data penempatan NPC, spawn, dan collision didefinisikan **di
sisi game** (`src/game/`, map dummy) dan **tidak mengubah kontrak Story JSON**
(ADR 0002). Jika nanti kontraknya perlu diperluas, itu keputusan terpisah yang
dikomunikasikan dengan track data.

## Konsekuensi

**Positif:**

- Demo lebih hidup: siswa bergerak, menjelajah, dan menemukan soal lewat
  interaksi — bukan hanya membaca.
- Keputusan ADR 0004 (Phaser) dan 0007 (UI hybrid) tidak berubah; eksplore
  murni di sisi Phaser, textbox/overlay tetap DOM.

**Negatif / utang:**

- Pekerjaan render dan input bertambah: karakter, gerak 4 arah, collision,
  penempatan NPC — dikerjakan dengan aset dummy (kotak/til warna) sampai
  inventaris aset nyata tersedia.
- Fase `explore` menambah kompleksitas `StoryRunner` dan dokumen runtime.
- Risiko scope hackathon: kalau waktu mepet, jalur fallback adalah kembali ke
  presentasi statis (lihat "Kapan ditinjau ulang").

**Yang harus diubah:**

- [`../04-game/game-design.md`](../04-game/game-design.md) — hapus eksklusi
  top-down, tambah mekanik eksplorasi.
- [`../04-game/interaction-loop.md`](../04-game/interaction-loop.md) — tambah
  fase `explore` pada `RunnerState.phase`.
- [`../04-game/scene-format.md`](../04-game/scene-format.md) — scene sebagai
  ruangan: spawn, penempatan NPC, collision.
- [`../04-game/engine.md`](../04-game/engine.md) — catatan arcade physics.
- [`../01-architecture/repo-structure.md`](../01-architecture/repo-structure.md)
  — file rencana movement/map.
- [`../00-product/mvp-scope.md`](../00-product/mvp-scope.md) dan
  [`../10-roadmap/hackathon-plan.md`](../10-roadmap/hackathon-plan.md).

## Kapan ditinjau ulang

- Jika waktu hackathon menyisakan kurang dari dua hari untuk PR HUD, tantangan,
  dan hasil: fase `explore` dikurangi kembali ke presentasi statis, keputusan
  ini direvisi jadi **Superseded** oleh ADR baru.
- Jika track data ingin memindahkan penempatan NPC ke kontrak Story JSON.

## Referensi

- [`../04-game/game-design.md`](../04-game/game-design.md) — eksklusi semula
- [`0007-hybrid-ui.md`](0007-hybrid-ui.md) — UI hybrid Phaser + DOM
- [`0002-story-json-as-contract.md`](0002-story-json-as-contract.md) — kontrak
  Story JSON yang tidak diubah
