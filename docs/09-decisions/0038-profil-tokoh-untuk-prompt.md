---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0038 — Profil Tokoh untuk Prompt

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0016](0016-obrolan-singkat-npc.md),
  [0033](0033-pemilihan-pembicara-keahlian.md)

## Konteks

`characterSchema` hanya menerima `id`, `name`, `role`, `spriteId`,
`description` (maks 160 karakter), dan `smallTalk` (maks 240). Batas itu ketat
karena `Character` adalah bagian dari kontrak cerita yang dilihat editor guru
dan disimpan di database.

Akibatnya blok `CAST` yang dikirim ke model hanya berisi penampilan singkat,
keahlian, lokasi, dan satu kalimat obrolan. Watak dan cara bicara tokoh tidak
pernah sampai ke prompt. Model lalu menulis dialog dengan pola yang sama untuk
semua orang: Marlow berbicara sepanjang Edric, Clara menjawab setajam Leonhardt,
dan tokoh hanya dibedakan oleh nama. Deskripsi penampilan juga jarang dipakai,
sehingga narasi tidak menyebut topi jerami atau helm perak yang jelas terlihat
di sprite.

Detail persona sebenarnya sudah ada di `docs/07-assets/cast-bible.md`, tetapi
dokumen itu dokumentasi untuk manusia dan tidak dibaca runtime.

## Keputusan

1. **Profil prompt-only di `src/story/cast.ts`.** Tiga peta baru hidup di
   samping `FIXED_CAST`:
   - `CAST_TRAITS` — sifat khas tiap tokoh,
   - `CAST_VOICE` — pola bicara konkret (panjang kalimat, kebiasaan,
     perumpamaan),
   - `CAST_EXPERTISE` dan `CAST_PLACES` yang sudah ada tetap dipakai.
     Tidak ada field baru di `characterSchema` dan tidak ada perubahan
     `story.schema.json`.
2. **Blok `CAST` menjadi multi-baris per tokoh**: `penampilan`, `sifat`,
   `bicara`, `keahlian`, `lokasi`, dan `obrolan`. Kolom prompt-only tetap
   dilarang disalin ke keluaran JSON.
3. **Aturan narasi penampilan**: saat tokoh pertama kali muncul di sebuah
   chapter, narasi menyebut satu ciri yang terlihat di sprite. Satu ciri cukup;
   model tidak mendeskripsikan seluruh pakaian.
4. **Test menjaga kelengkapan.** `src/story/cast.test.ts` memastikan setiap
   tokoh tetap punya sifat dan cara bicara, dan tidak ada dua tokoh dengan cara
   bicara identik. Schema tidak bisa menegur kekurangan ini.

## Konsekuensi

- Dialog lebih mudah dibedakan antar tokoh tanpa menambah field cerita.
- `cast-bible.md` tetap menjadi sumber lengkap untuk manusia, tetapi sekarang
  ringkasan yang dipakai model punya tempat yang jelas di `cast.ts`.
- Menambah tokoh berarti menambah entri di empat peta prompt
  (`CAST_EXPERTISE`, `CAST_TRAITS`, `CAST_VOICE`, `CAST_PLACES`); test akan
  gagal kalau salah satu terlewat.
