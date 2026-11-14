---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0029 — Penempatan Tokoh Tetap di Desa

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0010](0010-map-data-and-camera.md),
  [0025](0025-pemilihan-pembicara-keahlian.md)

## Konteks

Dunia desa adalah **satu peta** (`world_map_village`, 2390×1792 px). `GameScene`
membangun peta, objek, dan sembilan NPC sekali di `create()`; posisi tiap NPC
tersimpan sebagai koordinat tetap di `src/game/world/village.json` (ADR 0010).

Posisi itu punya makna cerita. `map.txt` di paket aset menetapkan peran tiap
tempat: Marlow di jembatan sungai, Theo di kebun dekat sumur, Elias di depan
perpustakaan, Edric di rumah beratap merah, Eldric di rumah beratap biru,
Griselda di rumah beratap hijau, Clara di kolam timur, Elian di alun-alun, dan
Leonhardt di pintu masuk selatan. Penempatan di `village.json` sudah cocok
dengan daftar itu.

Masalahnya: **model tidak pernah melihat peta maupun daftar itu.** Prompt hanya
membawa `id`, `name`, `role`, `spriteId`, `description`, `smallTalk`, dan
`keahlian`. Tidak ada satu baris pun yang mengatakan di mana tokoh berada.
Akibatnya chapter hasil AI bisa menulis:

- "Marlow melambai dari balik air mancur" — padahal di peta ia di jembatan.
- "Clara menunggu di alun-alun" — padahal ia di kolam timur.
- "Eldric membuka pintu rumah beratap merah" — padahal itu rumah Edric.

Pemain melihat peta yang sebenarnya, jadi narasi dan tempat tokoh langsung
terlihat tidak cocok. Validator tidak bisa menolong: tidak ada field lokasi di
schema cerita, dan `continuity.characterStates[].location` hanya berisi teks
bebas yang ditulis model sendiri, tanpa acuan.

Batasan tetap: hari code freeze, satu peta, kontrak `Story` yang sudah dipakai
prompt, validator, editor, dan game. Solusinya harus **aditif**.

## Opsi

| Opsi                                                       | Kelebihan                                                  | Kekurangan                                                                            | Biaya |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| A. Blok `LOKASI` + kolom `lokasi` di blok `CAST`           | Aditif; satu sumber data; tanpa perubahan schema atau peta | Probabilistik: mengarahkan, bukan menjamin                                            | 0     |
| B. Field `location` di schema `Character`                  | Bisa divalidasi; editor bisa menampilkan lokasi            | Breaking: zod + JSON Schema + validator + fixture + editor; butuh ADR tersendiri      | > 0   |
| C. Generator menempelkan NPC ke scene secara deterministik | Dijamin benar; narasi tidak bisa menyimpang                | Butuh field scene → tokoh, jalur render baru, dan AI kehilangan peran menyusun adegan | > 0   |
| D. Biarkan; pemain menganggap peta hanya latar             | Nol perubahan                                              | Narasi bertabrakan dengan peta di demo                                                | 0     |

## Keputusan

**Kami memilih A.** Dua penambahan di lapisan prompt:

1. **`CAST_PLACES` di `src/story/cast.ts`.** Satu tempat = satu rumah/bangunan
   atau satu area, berisi `id`, `label` (dipakai kolom `lokasi:` di blok `CAST`),
   `note` (batas tempatnya, mis. "kolam timur bukan air mancur"), dan `members`
   (id tokoh yang menempatinya). `locationOf(id)` mengembalikan label tokoh.
2. **Blok `LOKASI` + aturan `PENEMPATAN TOKOH` di `SYSTEM_PROMPT`.** Blok
   `LOKASI` dikirim setelah `CAST` pada prompt outline **dan** chapter. Aturannya:
   adegan terjadi di tempat tokohnya, tempat tidak boleh ditukar, tokoh hanya
   boleh pindah bila alasannya diceritakan lebih dulu, satu chapter tidak
   menempatkan tokoh di dua tempat tanpa perjalanan, dan
   `continuity.characterStates[].location` harus memakai nama tempat dari blok
   `LOKASI`.

`PROMPT_VERSION` naik ke `story-v12` (dari `story-v11` milik ADR 0028).

Isi tempat diturunkan dari `map.txt` paket aset dan **diverifikasi** terhadap
koordinat NPC di `village.json`: Elian 64 px dari bangku alun-alun, Elias 79 px
dari perpustakaan, Edric 34 px dari rumah merah, Eldric 69 px dari bangku rumah
biru, Clara 77 px dari pohon berbunga, Griselda 132 px dari rumah hijau, Theo
58 px dari petak kebun, Leonhardt 46 px dari lentera bawah.

Alasan utama:

1. **Aditif dan murah.** Tidak ada perubahan schema, peta, game, atau fixture.
   Yang berubah hanya `cast.ts`, `prompt.ts`, dan dokumen.
2. **Satu sumber data.** Label lokasi tidak ditulis ulang di prompt builder;
   `locationOf()` dipakai bersama oleh blok `CAST` dan blok `LOKASI`, dan
   `cast.test.ts` memastikan setiap NPC di `village.json` punya lokasi.
3. **Opsi B dan C terlalu mahal.** B mengubah kontrak cerita di hari code freeze;
   C memindahkan penyusunan adegan dari model ke kode, padahal justru model yang
   tahu konsep mana yang sedang diceritakan.

**Batasan yang diterima:** perbaikan ini **tidak menjamin** tokoh selalu
disebut di tempat yang benar. Ia memberi model daftar tempat yang benar dan
aturan untuk memakainya; kepatuhan tetap probabilistik.

## Konsekuensi

**Positif:**

- Model tahu tata letak desa tanpa melihat peta atau koordinat.
- Kesalahan yang paling sering (Marlow di alun-alun, Clara di air mancur, Edric
  dan Eldric tertukar) punya pencegahan eksplisit di prompt.
- `continuity` antar chapter memakai nama tempat yang sama, sehingga chapter 3
  tidak "memindahkan" tokoh ke nama tempat karangan baru.

**Negatif / utang:**

- Daftar tempat adalah duplikasi pengetahuan yang juga ada di `map.txt` (di luar
  repo) dan `cast-bible.md`. Kalau peta diubah, `CAST_PLACES` harus ikut diubah;
  test hanya memastikan NPC punya lokasi, bukan bahwa labelnya masih cocok
  dengan koordinat.
- Menambah area baru di peta (mis. balai desa) tidak otomatis muncul di prompt.
- Tokoh yang berpindah karena alasan cerita tetap bisa menghasilkan narasi yang
  tidak cocok dengan posisi sprite, karena game tidak memindahkan NPC.

**Yang harus diubah:**

- `src/story/cast.ts` (`CAST_PLACES`, `locationOf`), `src/ai/prompt.ts`
  (`PROMPT_VERSION` → `story-v12`, `castSection()`, `locationSection()`, blok
  `PENEMPATAN TOKOH`).
- `src/ai/prompt.test.ts`, `src/server/jobs/run.test.ts`, dan
  `src/story/cast.test.ts` (baru).
- `docs/03-ai-pipeline/prompt-contract.md`,
  `docs/03-ai-pipeline/generation-rules.md`,
  `docs/07-assets/cast-bible.md`, `docs/04-game/world-design.md`.

## Kapan keputusan ini ditinjau ulang

Bila guru sering memakai materi yang mengharuskan tokoh berpindah tempat
(mis. kunjungan ke balai desa), opsi C perlu ditinjau: menambah field scene →
tokoh supaya game benar-benar memindahkan sprite. Itu perubahan kontrak dan
butuh ADR baru.

## Referensi

- [`0010-map-data-and-camera.md`](0010-map-data-and-camera.md)
- [`0025-pemilihan-pembicara-keahlian.md`](0025-pemilihan-pembicara-keahlian.md)
- [`../03-ai-pipeline/prompt-contract.md`](../03-ai-pipeline/prompt-contract.md)
- [`../04-game/world-design.md`](../04-game/world-design.md)
- [`../07-assets/cast-bible.md`](../07-assets/cast-bible.md)
