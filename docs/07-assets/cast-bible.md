---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Character Bible — Cast Pesta Panen

Persona lengkap sepuluh karakter tetap ClassQuest, disusun dari berkas persona
sumber (`*.odt`) yang diserahkan bersama paket aset karakter.

- **Sumber kebenaran data:** `src/story/cast.ts` (`FIXED_CAST`).
- **Sumber kebenaran persona:** sepuluh berkas ODT — `kael.odt`, `edric.odt`,
  `elian.odt`, `elias.odt`, `clara.odt`, `griselda.odt`, `eldric.odt`,
  `marlow.odt`, `Leonhardt.odt`, `theo.odt`. Berkas itu berada di luar repo
  (paket aset karakter), jadi dokumen ini adalah salinan kerjanya.
- **Sumber kebenaran visual:** potret di
  `public/assets/portrait/<nama>/<ekspresi>.png` dan spritesheet di
  `public/assets/char/<nama>.png`.
- **Daftar aset:** [`inventory.md`](./inventory.md).

## Status dokumen ini

Dokumen ini **dokumentasi, bukan kontrak**. Schema cerita tidak punya field
gender, usia, rambut, atau outfit — `characterSchema` hanya menerima `id`,
`name`, `role`, `spriteId`, `description` (maks 160 karakter), dan `smallTalk`
(maks 240 karakter). Lihat
[`../02-data-model/story-schema.md`](../02-data-model/story-schema.md).

Konsekuensi yang perlu diingat:

- **AI hanya membaca `description`, `smallTalk`, keahlian, dan lokasi.** Pipeline
  mengirim blok `CAST` berisi satu baris per tokoh (`src/ai/prompt.ts`), jadi
  detail di bawah ini **tidak** ikut ke model. Kalau sebuah ciri wajib muncul di
  cerita, ciri itu harus ada di `description`.
- **Keahlian yang sampai ke model ada di `CAST_EXPERTISE`.** Peta di
  `src/story/cast.ts` itu berisi satu frasa bidang per tokoh dan dikirim sebagai
  kolom `keahlian:` di blok `CAST`; fungsinya memilih pembicara yang tepat
  (mis. topik ikan → Marlow), bukan menambah kontrak schema. Kalau kamu mengubah
  pekerjaan atau domain seorang tokoh di dokumen ini, perbarui `CAST_EXPERTISE`
  juga — lihat [ADR 0025](../09-decisions/0025-pemilihan-pembicara-keahlian.md).
- **Tempat tokoh yang sampai ke model ada di `CAST_PLACES`.** Peta tetap di
  `src/game/world/village.json`, tetapi model tidak menerima koordinat. Lokasi
  dikirim sebagai kolom `lokasi:` di blok `CAST` plus blok `LOKASI` per tempat.
  Kalau peta desa berubah, perbarui `CAST_PLACES` juga — lihat
  [ADR 0029](../09-decisions/0029-penempatan-tokoh-tetap.md) dan tabel di bawah.
- **Nama marga tidak dipakai di game.** Nama yang tampil di panel dialog adalah
  `cast.name` (`Kael`, `Edric`, …), bukan nama lengkap. `name` dibatasi 40
  karakter, dan panel dialog didesain untuk nama pendek.
- Menambah field persona ke schema adalah perubahan kontrak: butuh ADR baru,
  perubahan zod + JSON Schema, validator, prompt, fixture, dan dokumen.

## Catatan atas berkas sumber

Empat ODT menyebut nama tokoh lain di paragraf **Appearance**-nya — sisa
penyalinan saat berkas dibuat. Nama yang benar adalah yang ada di judul dan
field `Nama:`:

| Berkas          | Tertulis di Appearance   | Seharusnya |
| --------------- | ------------------------ | ---------- |
| `clara.odt`     | "Elara adalah gadis…"    | Clara      |
| `griselda.odt`  | "Eleanor adalah wanita…" | Griselda   |
| `Leonhardt.odt` | "Kael adalah pemuda…"    | Leonhardt  |
| `theo.odt`      | "Haru adalah pemuda…"    | Theo       |

Dokumen ini memakai nama yang benar. Isi deskripsinya sendiri tetap dipakai
apa adanya.

Dua hal yang **tidak** ada di ODT mana pun dan karenanya dikosongkan di sini:
nama marga untuk Griselda, Marlow, Leonhardt, dan Theo. Jangan mengarang marga
baru — itu akan bertabrakan dengan prinsip "materi satu-satunya sumber fakta".

## Ringkasan

| id            | Nama      | Nama lengkap        | Role   | Gender    | Usia         | Pekerjaan      | Potret             |
| ------------- | --------- | ------------------- | ------ | --------- | ------------ | -------------- | ------------------ |
| `char_mc`     | Kael      | Kael Arvand         | player | Laki-laki | 16–19 tahun  | Siswa Akademi  | `portrait/mc/`     |
| `char_npc_10` | Edric     | Edric Valemont      | mentor | Laki-laki | 60–70 tahun  | Tetua Desa     | `portrait/npc_10/` |
| `char_npc_1`  | Elian     | Elian Veyr          | npc    | Laki-laki | 17–18 tahun  | Siswa Akademi  | `portrait/npc_1/`  |
| `char_npc_3`  | Elias     | Elias Whitmore      | npc    | Laki-laki | 18–22 tahun  | Siswa Akademi  | `portrait/npc_3/`  |
| `char_npc_4`  | Clara     | Clara Bellwyn       | npc    | Perempuan | 16–18 tahun¹ | Siswa Akademi  | `portrait/npc_4/`  |
| `char_npc_5`  | Griselda  | —                   | npc    | Perempuan | 65–75 tahun  | Tetua Desa     | `portrait/npc_5/`  |
| `char_npc_6`  | Eldric    | Eldric Greenwhisper | npc    | Laki-laki | 65–75 tahun  | Tetua Desa     | `portrait/npc_6/`  |
| `char_npc_7`  | Marlow    | —                   | npc    | Laki-laki | 25–35 tahun¹ | Nelayan        | `portrait/npc_7/`  |
| `char_npc_8`  | Leonhardt | —                   | npc    | Laki-laki | 18–22 tahun  | Calon Kesatria | `portrait/npc_8/`  |
| `char_npc_9`  | Theo      | —                   | npc    | Laki-laki | 18–22 tahun  | Petani Muda    | `portrait/npc_9/`  |

¹ ODT menandainya "(perkiraan)".

> **Jangan tertukar:** `char_npc_6` bernama **Eldric**, `char_npc_10` bernama
> **Edric**. Selisihnya satu huruf dan keduanya tetua desa. Saat menulis dialog,
> periksa `speakerId`-nya, bukan namanya. Perbandingan ciri fisik ada di
> [bagian bawah](#eldric-vs-edric).

---

## Kael Arvand — `char_mc`

Pemain. Satu-satunya tokoh yang bicara mewakili siswa.

| Hal       | Isi                                |
| --------- | ---------------------------------- |
| Nama      | Kael Arvand                        |
| Gender    | Laki-laki                          |
| Usia      | 16–19 tahun                        |
| Pekerjaan | Siswa Akademi                      |
| Sprite    | `char_mc` (38×66, 4 idle + 8 walk) |
| Potret    | `public/assets/portrait/mc/`       |

**Appearance.** Pemuda bertubuh ramping dengan wajah oval, kulit cerah, dan mata
cokelat keabu-abuan. Memiliki ekspresi tenang, sedikit serius, dan agak pemalu.

**Hair.** Rambut berwarna cokelat kastanye (_chestnut brown_), tebal, bervolume,
dan sedikit berantakan. Poninya panjang dan jatuh tidak beraturan di dahi, dengan
beberapa helai rambut mencuat ke atas.

**Outfit.**

- **Jubah:** jubah biru navy dengan tudung di belakang dan hiasan tepi berwarna
  emas.
- **Pengait:** ornamen emas berbentuk heksagon di bagian tengah dada.
- **Tunik:** tunik putih gading dengan kerah sedikit terbuka.
- **Aksesori:** tali kulit cokelat yang melintang diagonal di dada dengan gesper
  persegi keemasan.

**Personality.** Tenang, pendiam, sedikit pemalu, sederhana, dan memiliki rasa
ingin tahu yang tinggi.

**Key Visual Details.**

1. Rambut cokelat kastanye yang tebal dan berantakan.
2. Mata cokelat keabu-abuan.
3. Jubah biru navy dengan hiasan emas.
4. Pengait jubah berbentuk heksagon.
5. Tunik putih gading.
6. Tali kulit cokelat diagonal di dada.

**Catatan penulisan.** Kael adalah tokoh yang bertanya dan mengamati, bukan yang
langsung menyimpulkan. Kalimatnya pendek. Ia memakai "aku", bukan "saya".

---

## Edric Valemont — `char_npc_10`

Mentor chapter. Pemandu yang menyampaikan konsep.

| Hal       | Isi                              |
| --------- | -------------------------------- |
| Nama      | Edric Valemont                   |
| Gender    | Laki-laki                        |
| Usia      | 60–70 tahun                      |
| Pekerjaan | Tetua Desa                       |
| Sprite    | `char_npc_10` (37×63)            |
| Potret    | `public/assets/portrait/npc_10/` |

**Appearance.** Pria lanjut usia dengan wajah oval, kulit cerah, mata hijau
zamrud, dan kumis putih tipis yang rapi. Memiliki ekspresi tenang, tatapan tajam,
serta pembawaan yang elegan dan berwibawa.

**Hair.** Rambut berwarna putih keperakan (_silver-white_), tebal, bergelombang,
dan sedikit bervolume. Ditata ke belakang dengan poni menyamping dan sebagian
rambut diikat menggunakan pita hijau tua.

**Outfit.**

- **Mantel:** mantel formal hijau hutan gelap (_dark forest green_) dengan kerah
  tinggi dan ornamen emas.
- **Rompi:** rompi berwarna cokelat tua.
- **Kemeja:** kemeja putih dengan dasi leher berenda.
- **Detail:** kancing emas dan aksen dekoratif pada mantel.

**Personality.** Bijaksana, cerdas, tenang, berwibawa, berpengalaman, dan
memiliki pengetahuan luas.

**Key Visual Details.**

1. Rambut putih keperakan bergelombang.
2. Mata hijau zamrud dan kumis putih tipis.
3. Pita rambut hijau tua.
4. Mantel hijau gelap dengan ornamen emas.
5. Rompi cokelat dan kemeja putih berenda.
6. Ekspresi tenang dan berwibawa.

---

## Elian Veyr — `char_npc_1`

Pelajar akademi. Teman sebaya Kael yang gemar membaca.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Elian Veyr                      |
| Gender    | Laki-laki                       |
| Usia      | 17–18 tahun                     |
| Pekerjaan | Siswa Akademi                   |
| Sprite    | `char_npc_1` (33×61)            |
| Potret    | `public/assets/portrait/npc_1/` |

**Appearance.** Pemuda bertubuh ramping dengan wajah lembut, kulit cerah, dan mata
cokelat.

**Hair.** Rambut cokelat tua (_dark brown_), berpotongan medium-short, tebal,
sedikit berantakan, dengan poni berlapis.

**Outfit.**

- **Topi:** topi biru tua dengan pita emas dan ornamen emas di bagian samping.
- **Kemeja:** kemeja putih lengan pendek.
- **Vest:** rompi biru tua dengan aksen dan tepian emas.
- **Dasi:** pita dasi berwarna emas.
- **Aksesori:** tali tas selempang cokelat dan buku sihir.

**Personality.** Cerdas, pendiam, pemalu, lembut, penasaran, dan gemar membaca.

**Key Visual Details.**

1. Topi biru tua dengan aksen emas.
2. Rambut cokelat tua yang sedikit berantakan.
3. Mata cokelat.
4. Seragam biru-putih dengan detail emas.
5. Pita dasi berwarna emas.
6. Tas selempang dan buku sihir.

---

## Elias Whitmore — `char_npc_3`

Pelajar akademi. Teman yang teliti dan suka mencatat.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Elias Whitmore                  |
| Gender    | Laki-laki                       |
| Usia      | 18–22 tahun                     |
| Pekerjaan | Siswa Akademi                   |
| Sprite    | `char_npc_3` (33×62)            |
| Potret    | `public/assets/portrait/npc_3/` |

**Appearance.** Pemuda bertubuh ramping dengan kulit cerah, wajah oval, dagu
ramping, dan ekspresi tenang.

**Hair.** Rambut berwarna cokelat kemerahan (_reddish brown_), tebal,
bergelombang, sedikit panjang, dan berantakan alami. Poninya menjuntai tidak
beraturan di dahi.

**Outfit.**

- **Kacamata:** kacamata persegi panjang dengan bingkai hitam.
- **Kemeja:** kemeja lengan panjang berwarna krem dengan kerah lebar.
- **Dasi:** dasi berwarna kuning keemasan.
- **Rompi:** rompi biru navy dengan aksen garis emas dan kancing keemasan.
- **Tas:** tali selempang kulit cokelat dengan gesper kuningan dan kantong kecil.
- **Aksesori:** membawa buku tebal berwarna hijau tua dengan ornamen emas.

**Personality.** Cerdas, tenang, serius, sopan, sedikit introvert, dan memiliki
rasa ingin tahu yang tinggi.

**Key Visual Details.**

1. Rambut cokelat kemerahan yang tebal dan berantakan.
2. Kacamata persegi panjang berbingkai hitam.
3. Mata abu-abu keunguan.
4. Kemeja krem dengan dasi kuning keemasan.
5. Rompi biru navy dengan aksen emas.
6. Tas selempang kulit cokelat.
7. Buku hijau tua dengan ornamen emas.

---

## Clara Bellwyn — `char_npc_4`

Pelajar akademi. Tenang dan tekun.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Clara Bellwyn                   |
| Gender    | Perempuan                       |
| Usia      | 16–18 tahun (perkiraan)         |
| Pekerjaan | Siswa Akademi                   |
| Sprite    | `char_npc_4` (34×62)            |
| Potret    | `public/assets/portrait/npc_4/` |

**Appearance.** Gadis bertubuh mungil dengan kulit cerah, wajah oval, dan mata
besar berwarna biru safir. Ia memiliki ekspresi lembut, tenang, dan sedikit
pemalu.

**Hair.** Rambut berwarna cokelat kastanye (_chestnut brown_), panjang, sedikit
bergelombang, dengan kepang di bagian samping. Poninya jatuh tidak beraturan
membingkai wajah, dengan satu helai rambut mencuat di bagian atas kepala.

**Outfit.**

- **Pita:** dua pita besar berwarna biru royal di kedua sisi kepala.
- **Jubah:** jubah pendek berwarna biru royal dengan tepian dan hiasan emas.
- **Blus:** blus putih gading dengan kerah renda dan lengan sedikit mengembang.
- **Aksesori:** bros bulat keemasan di bagian depan jubah dan buku bersampul
  cokelat tua.

**Personality.** Cerdas, pendiam, sopan, lembut, sedikit pemalu, dan tekun
belajar.

**Key Visual Details.**

1. Rambut panjang cokelat kastanye dengan kepang samping.
2. Dua pita besar berwarna biru royal.
3. Mata besar berwarna biru safir.
4. Jubah biru royal dengan tepian emas.
5. Blus putih dengan kerah renda.
6. Membawa buku bersampul cokelat tua.

---

## Griselda — `char_npc_5`

Tetua desa. Ramah dan penyayang.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Griselda                        |
| Gender    | Perempuan                       |
| Usia      | 65–75 tahun                     |
| Pekerjaan | Tetua Desa (_Village Elder_)    |
| Sprite    | `char_npc_5` (40×62)            |
| Potret    | `public/assets/portrait/npc_5/` |

**Appearance.** Wanita lanjut usia dengan wajah oval, kulit _peach_ cerah, kerutan
halus, dan mata cokelat keemasan. Ia memiliki senyum lembut dan ekspresi ramah.

**Hair.** Rambut berwarna putih keperakan (_silver-white_), tebal, dan disanggul
besar di bagian belakang atas kepala. Beberapa helai rambut terurai di kedua sisi
wajah.

**Outfit.**

- **Jubah:** jubah berwarna merah marun gelap dengan tudung besar di belakang dan
  pita besar di bagian dada.
- **Pakaian:** baju bagian dalam berwarna hijau zaitun (_olive green_) dengan
  kerah tinggi dan aksen emas kecokelatan.
- **Tongkat:** tongkat kayu berwarna cokelat tua dengan pegangan melengkung.

**Personality.** Bijaksana, ramah, penyayang, sabar, lembut, dan dihormati oleh
penduduk desa.

**Key Visual Details.**

1. Rambut putih keperakan yang disanggul besar.
2. Mata cokelat keemasan dan senyum lembut.
3. Jubah merah marun dengan pita besar.
4. Pakaian hijau zaitun berkerah tinggi.
5. Tongkat kayu cokelat tua.

---

## Eldric Greenwhisper — `char_npc_6`

Tetua desa. Penjaga cerita lama.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Eldric Greenwhisper             |
| Gender    | Laki-laki                       |
| Usia      | 65–75 tahun                     |
| Pekerjaan | Tetua Desa (_Village Elder_)    |
| Sprite    | `char_npc_6` (36×61)            |
| Potret    | `public/assets/portrait/npc_6/` |

**Appearance.** Pria tua dengan wajah sedikit oval, kulit cerah, dan ekspresi
tenang serta bijaksana. Memiliki mata berwarna cokelat dengan tatapan hangat.

**Hair.** Rambut putih keperakan, sedikit panjang dan bergelombang di bagian
samping. Bagian atas kepalanya botak. Memiliki alis tebal, kumis melengkung, dan
janggut putih lebat.

**Outfit.**

- **Jubah:** jubah hijau tua dengan kerah lebar yang menutupi bahu.
- **Pakaian:** tunik sederhana berwarna krem.
- **Sabuk:** tali kulit cokelat dengan gesper keemasan.
- **Tongkat:** tongkat kayu sederhana yang selalu dibawanya.

**Personality.** Bijaksana, tenang, ramah, sabar, berpengalaman, dan sedikit
misterius.

**Key Visual Details.**

1. Kepala botak dengan rambut putih di bagian samping.
2. Kumis dan janggut putih lebat.
3. Mata berwarna cokelat.
4. Jubah hijau tua.
5. Tunik berwarna krem.
6. Tongkat kayu dan tali kulit cokelat.

**Terlihat di potret, tidak tertulis di ODT.** Rambut putih di kedua sisi kepala
diikat **pita hijau tua**. Berguna untuk membedakannya dari Edric.

---

## Marlow — `char_npc_7`

Nelayan desa. Santai dan sabar.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Marlow                          |
| Gender    | Laki-laki                       |
| Usia      | 25–35 tahun (perkiraan)         |
| Pekerjaan | Nelayan (_Fisherman_)           |
| Sprite    | `char_npc_7` (52×63)            |
| Potret    | `public/assets/portrait/npc_7/` |

**Appearance.** Pria dewasa muda dengan wajah agak oval, kulit cerah, rahang
sedikit tegas, serta kumis dan janggut pendek berwarna cokelat. Ia memiliki mata
heterokromia, satu berwarna cokelat dan satu berwarna biru.

**Hair.** Rambut berwarna cokelat tua (_dark brown_), tebal, sedikit berantakan,
dan berpotongan medium. Poninya jatuh tidak beraturan di dahi.

**Outfit.**

- **Topi:** topi jerami berwarna krem dengan pinggiran lebar dan pita cokelat
  tua.
- **Kemeja:** kemeja lengan panjang berwarna biru tua dengan kerah terbuka.
- **Rompi:** rompi cokelat dengan beberapa kantong, kancing, dan pengait logam.
- **Aksesori:** anting biru berbentuk tetesan air pada kedua telinga.
- **Peralatan:** joran pancing di punggung dengan pelampung, serta keranjang untuk
  membawa hasil tangkapan.

**Personality.** Ramah, santai, sabar, penyabar, berpengalaman, dan menyukai
aktivitas memancing serta kehidupan di sekitar perairan.

**Key Visual Details.**

1. Topi jerami krem dengan pita cokelat tua.
2. Rambut cokelat tua yang sedikit berantakan.
3. Mata heterokromia, cokelat dan biru.
4. Kumis dan janggut pendek.
5. Kemeja biru dengan rompi cokelat berkantong.
6. Anting biru berbentuk tetesan air.
7. Joran pancing dan keranjang ikan.

---

## Leonhardt — `char_npc_8`

Calon kesatria. Sopan dan pemberani.

| Hal       | Isi                             |
| --------- | ------------------------------- |
| Nama      | Leonhardt                       |
| Gender    | Laki-laki                       |
| Usia      | 18–22 tahun                     |
| Pekerjaan | Calon Kesatria (_Squire_)       |
| Sprite    | `char_npc_8` (48×62)            |
| Potret    | `public/assets/portrait/npc_8/` |

**Appearance.** Pemuda bertubuh ramping dengan wajah oval, kulit cerah, dan mata
berwarna cokelat gelap. Ekspresinya terlihat tenang, polos, dan sedikit serius.

**Hair.** Rambut berwarna cokelat gelap (_dark brown_), tebal, sedikit
berantakan, dengan potongan medium-short. Poninya jatuh tidak beraturan di dahi.

**Outfit.**

- **Helm:** helm baja berwarna perak bergaya _medieval_ dengan pelindung kepala.
- **Pakaian:** tunik lengan panjang berwarna biru dengan kerah tinggi dan syal
  biru.
- **Armor:** pelindung dada dari kulit cokelat dengan detail dan pengait logam
  perak.
- **Pelindung Lengan:** armor logam berwarna perak.

**Personality.** Tenang, pendiam, polos, sopan, pemberani, dan memiliki jiwa
kesatria.

**Key Visual Details.**

1. Helm baja berwarna perak.
2. Rambut cokelat gelap sedikit berantakan.
3. Mata cokelat gelap.
4. Tunik dan syal berwarna biru.
5. Armor dada kulit cokelat dengan detail logam.
6. Ekspresi tenang dan sedikit serius.

---

## Theo — `char_npc_9`

Petani muda. Pekerja keras.

| Hal       | Isi                                  |
| --------- | ------------------------------------ |
| Nama      | Theo                                 |
| Gender    | Laki-laki                            |
| Usia      | 18–22 tahun                          |
| Pekerjaan | Petani Muda (_Young Village Farmer_) |
| Sprite    | `char_npc_9` (44×61)                 |
| Potret    | `public/assets/portrait/npc_9/`      |

**Appearance.** Pemuda bertubuh ramping dengan wajah oval, kulit cerah, dan pipi
sedikit kemerahan. Ia memiliki mata besar berwarna cokelat hangat dengan tatapan
lembut dan polos.

**Hair.** Rambut berwarna cokelat tua (_dark brown_), tebal, sedikit berantakan,
dan berpotongan medium-short. Poninya jatuh tidak beraturan di dahi, sementara
bagian samping dan belakang terlihat berlapis.

**Outfit.**

- **Topi:** topi jerami berwarna krem kekuningan dengan pinggiran lebar dan pita
  cokelat tua.
- **Kemeja:** kemeja lengan panjang berwarna hijau zaitun (_olive green_),
  berkerah dan memiliki kancing kecil berwarna krem.
- **Overall:** overall berwarna cokelat tua dengan dua tali bahu, pengait logam
  keemasan, dan kantong besar di bagian dada.

**Personality.** Ramah, polos, kalem, sedikit pemalu, pekerja keras, dan menyukai
kehidupan pedesaan.

**Key Visual Details.**

1. Topi jerami lebar dengan pita cokelat tua.
2. Rambut cokelat tua yang sedikit berantakan.
3. Mata besar berwarna cokelat.
4. Kemeja hijau zaitun.
5. Overall cokelat tua dengan pengait keemasan.
6. Ekspresi lembut dan sedikit polos.

---

## Eldric vs Edric

Dua tetua desa dengan nama berbeda satu huruf. Salah `speakerId` akan membuat
tokoh yang salah muncul di layar.

| Ciri        | Eldric — `char_npc_6`        | Edric — `char_npc_10`                |
| ----------- | ---------------------------- | ------------------------------------ |
| Usia        | 65–75 tahun                  | 60–70 tahun                          |
| Rambut      | Botak di atas, putih di sisi | Putih perak bergelombang, penuh      |
| Wajah       | Kumis **dan** janggut lebat  | Kumis putih tipis saja               |
| Mata        | Cokelat                      | Hijau zamrud                         |
| Jubah       | Hijau tua, kerah lebar       | Hijau hutan gelap, kerah tinggi      |
| Dalaman     | Tunik krem                   | Rompi cokelat + kemeja putih berenda |
| Pita rambut | Hijau tua, di kedua sisi     | Hijau tua, mengikat ke belakang      |
| Tongkat     | Ya                           | Tidak                                |
| Peran       | NPC                          | **Mentor**                           |
| Rumah       | Biru gelap, barat daya       | Merah, utara tengah                  |
| Di peta     | `x=1183`, `y=1135`           | `x=1199`, `y=466`                    |

## Lokasi tetap di desa

Dunia desa adalah **satu peta tetap**. `GameScene` memasang sembilan NPC sekali
di `src/game/world/village.json`, dan cerita tidak memindahkan mereka. Tabel ini
adalah salinan kerja dari `map.txt` paket aset, sudah dicocokkan dengan koordinat
NPC di peta; sumber yang dikirim ke model adalah `CAST_PLACES` di
`src/story/cast.ts` (ADR 0029).

| Tokoh                    | Tempat tetap                                          | Koordinat kaki |
| ------------------------ | ----------------------------------------------------- | -------------- |
| Kael (`char_mc`)         | Berjalan bebas mengikuti cerita                       | `1247`, `1523` |
| Elian (`char_npc_1`)     | Bangku kiri bawah air mancur, alun-alun utama         | `1111`, `818`  |
| Elias (`char_npc_3`)     | Halaman depan perpustakaan, timur laut                | `1804`, `532`  |
| Clara (`char_npc_4`)     | Bangku samping pohon berbunga merah muda, kolam timur | `1693`, `866`  |
| Griselda (`char_npc_5`)  | Halaman depan rumah beratap hijau, tenggara           | `1820`, `1177` |
| Eldric (`char_npc_6`)    | Bangku depan rumah beratap biru gelap, barat daya     | `1183`, `1135` |
| Marlow (`char_npc_7`)    | Jembatan kayu di atas sungai, selatan                 | `721`, `1637`  |
| Leonhardt (`char_npc_8`) | Pintu masuk selatan, dekat lentera dan papan arah     | `1334`, `1350` |
| Theo (`char_npc_9`)      | Kebun sayuran dekat sumur batu, barat                 | `538`, `794`   |
| Edric (`char_npc_10`)    | Halaman depan rumah beratap merah, utara tengah       | `1199`, `466`  |

Jarak ke patokan peta (dari `village.json`, dihitung ke titik kaki objek):
Elian 64 px dari bangku alun-alun dan 154 px dari air mancur, Elias 79 px dari
perpustakaan, Edric 34 px dari rumah merah, Eldric 69 px dari bangku rumah biru,
Clara 77 px dari pohon berbunga, Griselda 132 px dari rumah hijau, Theo 58 px
dari petak kebun, Leonhardt 46 px dari lentera bawah.

**Tempat yang mudah tertukar:**

| Kalau materinya tentang | Jangan taruh di            | Taruh di                                           |
| ----------------------- | -------------------------- | -------------------------------------------------- |
| Ikan dan sungai         | Kolam timur atau alun-alun | Jembatan kayu (Marlow)                             |
| Bunga dan kolam         | Air mancur alun-alun       | Kolam timur (Clara)                                |
| Tetua di rumah merah    | Rumah biru Eldric          | Rumah merah (Edric)                                |
| Tetua di rumah biru     | Rumah merah Edric          | Rumah biru (Eldric)                                |
| Buku dan pelajaran      | Rumah warga                | Perpustakaan (Elias) atau bangku alun-alun (Elian) |

## Pemakaian potret

Setiap karakter punya enam berkas potret, satu per ekspresi, di
`public/assets/portrait/<nama>/`:

| Ekspresi   | Berkas         |
| ---------- | -------------- |
| `neutral`  | `neutral.png`  |
| `happy`    | `happy.png`    |
| `sad`      | `sad.png`      |
| `angry`    | `angry.png`    |
| `shocked`  | `shocked.png`  |
| `thinking` | `thinking.png` |

Cerita memilih ekspresi lewat field `expression` pada beat atau varian teks —
bukan lewat path. Lihat
[`../02-data-model/story-schema.md`](../02-data-model/story-schema.md) bagian
"Emosi per varian jawaban" dan
[ADR 0023](../09-decisions/0023-potret-ekspresi-persona.md).

Karakterisasi tiap ekspresi (berguna saat menulis dialog yang cocok):

| Ekspresi   | Terbaca sebagai             | Cocok untuk                               |
| ---------- | --------------------------- | ----------------------------------------- |
| `neutral`  | Tenang, menahan diri        | Penjelasan, kalimat biasa, transisi       |
| `happy`    | Senang, bangga, menyambut   | Jawaban benar, pujian, sapaan             |
| `sad`      | Kecewa, menyesal            | Jawaban salah berulang, kabar kurang enak |
| `angry`    | Tegas, serius (bukan kasar) | Menegaskan aturan, mengingatkan bahaya    |
| `shocked`  | Kaget, tak menduga          | Temuan, angka yang jauh meleset           |
| `thinking` | Bingung, ragu, menimbang    | Mendengar jawaban keliru, soal yang sulit |

## Referensi

- [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md) — kontrak `cast` dan `expression`
- [`inventory.md`](./inventory.md) — daftar id karakter, sprite, dan folder potret
- [`asset-guide.md`](./asset-guide.md) — spesifikasi teknis potret dan spritesheet
- [`../03-ai-pipeline/generation-rules.md`](../03-ai-pipeline/generation-rules.md) — aturan karakter konsisten
- [`../09-decisions/0023-potret-ekspresi-persona.md`](../09-decisions/0023-potret-ekspresi-persona.md) — potret berekspresi di atas panel
- [`../09-decisions/0025-pemilihan-pembicara-keahlian.md`](../09-decisions/0025-pemilihan-pembicara-keahlian.md) — keahlian tokoh untuk memilih pembicara
- [`../09-decisions/0029-penempatan-tokoh-tetap.md`](../09-decisions/0029-penempatan-tokoh-tetap.md) — tempat tetap tokoh untuk menyusun adegan
