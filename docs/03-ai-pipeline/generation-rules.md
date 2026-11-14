---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# Aturan Generasi Cerita

Inilah yang membuat cerita **nyambung** dan **tidak ngawur**. Aturan ini masuk ke
system prompt, dan sebagian diperiksa validator.

## 10 aturan inti

1. **Satu chapter, satu konsep.** Jangan mencampur dua konsep besar dalam satu
   chapter. Kalau materi punya banyak konsep, buat banyak chapter.
2. **Set fakta hanya dari materi.** Tidak ada angka, nama, atau teori baru.
   Kebutuhan yang tidak terpenuhi dicatat di `source.gaps`.
3. **Aset yang ada, bukan yang dibayangkan.** Pilih `backgroundId`, `musicId`,
   `spriteId` hanya dari manifest.
4. **Karakter konsisten.** Nama, peran, penampilan, dan lokasi mengikuti roster
   tetap di blok `CAST`; jangan mengganti nama atau menambah tokoh baru.
5. **Setiap chapter punya tantangan.** Materi tanpa latihan bukan game.
6. **Jawaban tantangan ada di cerita.** Siswa tidak boleh ditebak-tebakan.
7. **Kalimat pendek.** Maksimal 240 karakter per beat; idealnya 1–2 kalimat.
8. **Tunjukkan, jangan ceramahi.** Alih-alih "evaporasi adalah proses...", buat
   karakter mengamati genangan yang mengecil.
9. **Tutup dengan perubahan.** Akhir chapter harus mengubah sesuatu: pengetahuan
   karakter, lokasi, atau pertanyaan baru.
10. **Aman untuk sekolah.** Tidak ada kekerasan, horor, romansa, atau tema depresi.

## Cast tetap

Sepuluh tokoh desa (Kael dan sembilan warga) adalah roster tetap di
`src/story/cast.ts`. Nama, id, role, sprite, deskripsi, dan obrolan singkat tidak
boleh diubah model. Prompt mengirim blok `CAST` lengkap, termasuk deskripsi
penampilan yang terlihat di sprite (topi, kacamata, jubah, tongkat), supaya aksi
dan dialog cocok dengan gambar. Pipeline menimpa `outline.cast` sebelum validasi
dan `assemble()` memakai roster yang sama, jadi nama tidak bisa berubah lewat
keluaran model.

Deskripsi yang dikirim ke model dibatasi 160 karakter per tokoh. Detail visual
yang lebih kaya (rambut, outfit, pengait jubah, sifat) didokumentasikan di
[`../07-assets/cast-bible.md`](../07-assets/cast-bible.md) untuk manusia, **bukan**
untuk prompt. Kalau satu ciri wajib muncul di cerita, ciri itu harus masuk ke
`description` di `src/story/cast.ts`.

## Pemilihan pembicara

Setiap tokoh punya bidangnya. Blok `CAST` membawa kolom `keahlian` dari
`CAST_EXPERTISE` (`src/story/cast.ts`), dan system prompt punya blok
`PEMILIHAN PEMBICARA` yang memerintahkan dialog bidang tertentu jatuh ke tokoh
yang tepat (lihat
[ADR 0025](../09-decisions/0025-pemilihan-pembicara-keahlian.md)).

| Topik materi            | Pembicara yang tepat                           |
| ----------------------- | ---------------------------------------------- |
| Ikan, sungai, perahu    | Marlow (`char_npc_7`)                          |
| Ladang, tanaman, panen  | Theo (`char_npc_9`)                            |
| Menjaga, aturan, bahaya | Leonhardt (`char_npc_8`)                       |
| Sejarah dan cerita lama | Eldric (`char_npc_6`)                          |
| Nasihat dan adat desa   | Edric (`char_npc_10`), Griselda (`char_npc_5`) |
| Konsep pelajaran umum   | Edric (`char_npc_10`) sebagai mentor           |

Elian (`char_npc_1`), Elias (`char_npc_3`), dan Clara (`char_npc_4`) adalah
pelajar yang gemar membaca. Mereka **bukan** sumber jawaban soal ikan, ladang,
atau keamanan desa. Kalau tidak ada tokoh yang benar-benar ahli, pakai mentor —
jangan mengarang keahlian baru.

Ini aturan prompt, bukan jaminan. Model masih bisa salah memilih pembicara,
terutama bila materi mencampur banyak domain. Yang bisa diperiksa manusia:
`speakerId` di setiap dialog harus masuk akal untuk topiknya, bukan hanya ada di
cast.

## Struktur satu chapter (formula 5 scene)

Dipakai sebagai default; boleh 2–6 scene sesuai batas validator.

```text
Scene 1 — HOOK
  Situasi normal + satu hal yang aneh/berubah.
  Beat: narasi pembuka, dialog singkat, pertanyaan karakter.

Scene 2 — PENEMUAN
  Karakter menemukan gejala yang berkaitan dengan konsep.
  Tantangan pertama (level 1) mengunci pemahaman dasar.

Scene 3 — PENJELASAN
  Mentor atau karakter menjelaskan konsep — lewat aksi, bukan kuliah.
  Tantangan kedua (level 2) meminta menghubungkan/mengurutkan.

Scene 4 — PENERAPAN
  Konsep dipakai pada situasi baru di dalam cerita.
  Tantangan ketiga (level 2–3), opsional bila sudah cukup.

Scene 5 — PENUTUP
  Ringkasan alami lewat dialog + jembatan ke chapter berikutnya.
  Transisi tempat/waktu.
```

Bukan aturan kaku: yang wajib adalah **ada tantangan** dan **ada perubahan**.

## Alur keseluruhan (3 act)

| Act     | Chapter        | Fungsi                                              |
| ------- | -------------- | --------------------------------------------------- |
| Pembuka | Chapter 1      | Memperkenalkan tokoh, dunia, dan pertanyaan besar   |
| Tengah  | Chapter 2..N-1 | Menaikkan taruhan; konsep makin dalam               |
| Penutup | Chapter N      | Menjawab pertanyaan besar; kembali ke awal (siklus) |

Untuk cerita bergaya Omori-like, gunakan **kembali ke titik awal dengan pemahaman
baru** sebagai penutup. Ini murah, memuaskan, dan cocok untuk materi apa pun.

## Kontinuitas

Ini penyebab utama cerita terasa "ngawur". Pipeline mengirim `ContinuityState` dan
model wajib mematuhinya.

| Yang harus konsisten | Contoh pelanggaran                                   |
| -------------------- | ---------------------------------------------------- |
| Lokasi karakter      | Kael tiba-tiba di kelas padahal chapter lalu di awan |
| Pengetahuan karakter | Kael menjelaskan konsep yang belum ia temui          |
| Nama & peran         | "Bima" padahal cast-nya "Edric"                      |
| Waktu & cuaca        | Sore tiba-tiba jadi pagi tanpa transisi              |
| Aset yang dipakai    | Chapter di pantai tapi background kelas              |

Cara mencegah:

- Kirim ringkasan chapter sebelumnya di setiap panggilan.
- Larang pengenalan ulang karakter setelah chapter 1.
- Setiap chapter **harus** membuka dengan kalimat yang melanjutkan, bukan memulai
  dunia baru.
- `openThreads` harus ditutup sebelum cerita selesai.

## Aturan per beat

| Tipe         | Aturan                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| `narration`  | 1–2 kalimat. Fokus penglihatan/pendengaran. Jangan menjelaskan istilah. |
| `dialogue`   | Maks 2 kalimat per beat. Satu pembicara. Jangan menumpuk tiga ide.      |
| `challenge`  | Berdiri sendiri sebagai beat. Jangan digabung dengan dialog.            |
| `transition` | Maks satu per scene, bukan beat terakhir.                               |

Rasio yang sehat dalam satu scene: 1 tantangan + 2–6 beat narasi/dialog (total
3–10 beat, sesuai schema).

## Menulis dialog yang hidup

**Buruk:**

```text
"Evaporasi adalah proses perubahan air menjadi uap akibat pemanasan."
```

**Baik:**

```text
Pak Bima: "Lihat genangan itu. Pagi tadi masih penuh."
Kael: "Sekarang tinggal bercak gelap. Padahal tidak ada yang mengepel."
Pak Bima: "Berarti airnya pergi ke suatu tempat. Ke mana?"
```

Bedanya: yang kedua memberi **pengamatan**, bukan definisi. Definisi tetap muncul,
tapi setelah siswa punya pengalaman.

## Emosi percakapan

Percakapan adalah adegan, dan adegan punya wajah. Setiap beat `dialogue` **wajib**
punya `expression`, dan emosinya harus mengikuti reaksi tokoh pada kalimat itu —
bukan dipilih acak, bukan diulang terus sepanjang scene (ADR 0024).

| Ekspresi   | Kapan dipakai                                                 |
| ---------- | ------------------------------------------------------------- |
| `neutral`  | Kalimat biasa, penjelasan, atau saat tokoh menahan diri       |
| `happy`    | Senang, bangga, menyambut, atau menguatkan teman              |
| `sad`      | Kecewa, sedih, menyesal, atau kehilangan sesuatu              |
| `angry`    | Kesal atau tegas — tidak pernah kasar, tidak pernah mengancam |
| `shocked`  | Kaget karena hal tak terduga, temuan, atau kejadian mendadak  |
| `thinking` | Bingung, ragu, menimbang, atau mencari jawaban                |

Aturan yang paling sering dilanggar:

- **Jangan menempelkan satu emosi ke seluruh scene.** Ganti emosi ketika reaksi
  tokoh berubah; enam dialog dengan emosi sama membuat adegan terasa mati.
- **Emosi harus cocok dengan kalimat.** Kalimat "Aku tidak mengerti" tidak boleh
  memakai `happy`.
- **Reaksi jawaban salah punya emosi sendiri.** `textVariants[]` boleh membawa
  `expression`; itulah yang membuat tokoh bingung (`thinking`) hanya ketika siswa
  menjawab keliru, lalu kembali senang (`happy`) pada teks utama untuk jawaban
  benar.
- **`narration` bukan percakapan.** Narasi hanya boleh memakai `expression` bila
  punya `speakerId`, dan itu berarti memunculkan potret tanpa nama.

Validator tidak memblokir dialog tanpa emosi — cerita tetap sah dan dimainkan
dengan potret `neutral` — tetapi `W_DIALOGUE_NO_EXPRESSION` muncul per chapter
supaya guru tahu percakapan mana yang masih datar.

## Suara, sudut pandang, dan nada

Cerita ini dimainkan, jadi tulisannya harus terasa seperti roleplay, bukan buku
pelajaran.

- **Sudut pandang.** Pilih satu dan pakai konsisten: narasi menyapa pemain dengan
  "kamu", atau menyebut nama tokoh pemain (mis. "Kael"). Jangan mencampur
  keduanya dalam satu cerita.
- **Register.** Pakai bahasa sehari-hari siswa. Hindari "Anda" dan "Saya" yang
  kaku; bentuk formal hanya untuk tokoh yang memang sengaja formal. Kalau semua
  tokoh bicara formal, ceritanya terasa jauh dan aneh.
- **Suara tokoh.** Tiap tokoh punya pilihan kata dan panjang kalimat sendiri.
  Mentor boleh lebih tenang dan suka bertanya; pemain boleh lebih spontan dan
  penasaran. Jangan sampai semua tokoh terdengar sama.
- **Dialog diucapkan, bukan ditulis.** Potongan pendek, ada reaksi dan jeda.
  Dialog yang berbunyi seperti definisi kamus selalu salah.
- **Ikuti nada guru.** `meta.tone` dari formulir upload menentukan suasana (mis.
  "hangat dan penasaran", "lucu", "misterius"). Kata, irama, dan detail harus
  selaras; ini yang membuat cerita cocok dengan tema yang dipilih guru.

## Menulis tantangan yang adil

- Jawaban benar harus muncul di beat-beat sebelumnya, atau merupakan penerapan
  langsung dari konsep yang sudah dijelaskan.
- Pengecoh harus berasal dari miskonsepsi yang masuk akal.
- `explanation` menjawab "mengapa", bukan mengulang jawaban.
- Jangan memakai jebakan bahasa (kata "tidak" ganda, istilah yang belum
  diperkenalkan).

## Cakupan konsep

`source.concepts` boleh berisi sampai 12 konsep, sedangkan chapter maksimal 6.
Karena itu konsep dibagi dua peran, dan **tidak** semua konsep boleh jadi chapter:

| Peran                | Jumlah           | Aturan                                                                                                                  |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Konsep utama**     | ≤ jumlah chapter | Idealnya satu konsep berbeda per chapter. Boleh diulang hanya bila konsep yang tersedia lebih sedikit daripada chapter. |
| **Konsep pendukung** | sisanya          | Tidak punya chapter sendiri; wajib muncul di `conceptTag` ≥ 1 tantangan.                                                |

Contoh: materi punya 8 konsep dan 4 chapter. Empat konsep terpenting jadi konsep
utama (satu per chapter); empat sisanya jadi konsep pendukung dan masing-masing
muncul sebagai `conceptTag` di tantangan mana pun — boleh di chapter yang
membahas konsep utama yang berkaitan.

Kalau materi hanya punya 2 konsep tapi butuh 3 chapter, chapter ketiga
**memperdalam** salah satu konsep (mis. contoh penerapan), bukan mengarang konsep
baru. Catat di `source.gaps`.

Aturan yang tetap berlaku:

- **Satu chapter, satu konsep utama.** Jangan menggabungkan dua konsep utama dalam
  satu chapter, walaupun keduanya pendek.
- Kalau sebuah konsep pendukung hanya disebut sepintas, catat di `source.gaps`.
- Konsep pendukung **tidak** boleh jadi alasan menambah chapter melebihi 6.

Yang diperiksa validator: setiap `chapter.concept` dan setiap
`challenge.conceptTag` harus ada di `source.concepts` (`E_UNKNOWN_CONCEPT`).
Keunikan `chapter.concept` **tidak** ditegakkan validator — ia aturan kualitas di
dokumen ini, bukan kode error. Jangan mengarang kode seperti `E_DUPLICATE_CONCEPT`.

## Keselamatan konten

Gaya visual Omori sering diasosiasikan dengan tema gelap. Untuk produk ini:

**Boleh:** misteri ringan, rasa sepi, ruangan kosong, cuaca mendung, teka-teki.

**Tidak boleh:** kekerasan, darah, kematian, buli-buli, depresi, kecemasan
klinis, romansa, alkohol, atau kiasan menakut-nakuti.

Ketegangan hanya boleh berasal dari **rasa ingin tahu**, bukan ancaman.

## Checklist kualitas (dicek sebelum publish)

- [ ] Setiap chapter punya satu konsep utama yang jelas.
- [ ] Setiap konsep di `source.concepts` terpakai: sebagai konsep utama chapter,
      atau sebagai `conceptTag` tantangan.
- [ ] Tidak ada fakta di luar materi.
- [ ] Semua aset ada di manifest.
- [ ] Tidak ada karakter yang muncul tiba-tiba.
- [ ] Nama, peran, dan penampilan tokoh sesuai blok `CAST`; tidak ada nama baru.
- [ ] Setiap tantangan bisa dijawab dari cerita.
- [ ] Tidak ada beat > 240 karakter.
- [ ] Cerita ditutup, tidak menggantung tanpa alasan.
- [ ] Tidak ada konten yang melanggar aturan keselamatan.
- [ ] Bahasa konsisten dengan `meta.language`.

## Kesalahan umum dan perbaikannya

| Gejala                         | Penyebab                                  | Perbaikan                                    |
| ------------------------------ | ----------------------------------------- | -------------------------------------------- |
| Chapter terasa terpisah        | Kontinuitas tidak dikirim                 | Kirim `ContinuityState`, larang reset dunia  |
| Dialog seperti buku teks       | Tidak ada sensory detail                  | Ganti definisi dengan pengamatan             |
| Dialog terasa formal/jauh      | Register "Anda/Saya" tidak diatur         | Pakai bahasa sehari-hari; ikuti nada guru    |
| Tantangan tidak nyambung       | Challenge ditulis terpisah                | Tulis tantangan tepat setelah konsep muncul  |
| Semua chapter sama strukturnya | Model meniru contoh                       | Variasikan hook; jangan kirim contoh panjang |
| Nama karakter berubah          | Cast tidak ditegaskan                     | Kirim blok CAST + timpa `outline.cast`       |
| Aset karangan                  | Daftar aset tidak dikirim/terlalu panjang | Kirim hanya aset relevan + validasi ketat    |
| Cerita menggantung             | Tidak ada instruksi menutup               | Wajibkan penutupan `openThreads`             |
