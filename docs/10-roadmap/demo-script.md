---
status: draft
last_reviewed: 2026-11-08
owner: tim ClassQuest
---

# Naskah Demo 3 Menit

Dokumen ini untuk **kamu yang akan presentasi**, bukan untuk programmer. Isinya:
apa yang diucapkan, apa yang diklik, dan apa yang dilakukan kalau ada yang gagal.

Target sederhana: **tiga menit, tanpa membaca catatan, tanpa layar error.**

## Sebelum naik panggung

Jangan pernah demo dari laptop yang baru pertama kali dipakai. Lakukan ini
30 menit sebelumnya:

- [ ] `bun run build && bun start` sudah jalan, dan sudah kamu coba sendiri.
- [ ] Satu PDF materi sudah diunduh ke Desktop dengan nama yang jelas, misalnya
      `siklus-air.pdf`. Jangan mencari file saat presentasi.
- [ ] Satu cerita sudah selesai dibuat dan sudah **publish**. Ini cadangan kalau
      generasi langsung gagal.
- [ ] Progres siswa di browser demo sudah dihapus, supaya game mulai dari awal.
- [ ] Tab kedua sudah terbuka di halaman game, siap dipakai kapan saja.
- [ ] Suara perangkat menyala, volume sedang.
- [ ] Notifikasi, Slack, dan WhatsApp dimatikan.
- [ ] Zoom browser 100%, bukan 125%.
- [ ] Hafal satu kalimat pembuka dan satu kalimat penutup. Sisanya boleh improvisasi.

## Naskah

Total 180 detik. Waktu di tabel patokan, bukan harga mati.

| Waktu     | Yang kamu ucapkan                                                                                             | Yang kamu lakukan                                     |
| --------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0:00–0:20 | "Setiap guru punya materi bagus di PDF. Siswa dapat PDF. Yang terjadi setelah itu: biasanya tidak ada."       | Berdiri di halaman depan, jangan menyentuh apa pun    |
| 0:20–0:50 | "ClassQuest mengubah PDF itu jadi game pixel yang bisa dimainkan. Guru upload, isi judul dan kelas, selesai." | Buka halaman guru, klik "Buat cerita baru", pilih PDF |
| 0:50–1:10 | "Sistem membaca teks per halaman, menyusun kerangka bab, lalu menulis cerita per bab."                        | Tunjukkan halaman status yang bergerak                |
| 1:10–1:30 | "Kalau AI gagal, kami tidak menampilkan layar error. Ada cerita cadangan, dan guru tetap bisa mengeditnya."   | Tunjukkan ringkasan hasil                             |
| 1:30–1:55 | "Guru tetap pegang kendali. Ini bukan kotak hitam."                                                           | Edit satu dialog, edit satu soal, simpan              |
| 1:55–2:15 | "Preview-nya persis game yang dimainkan siswa."                                                               | Klik Preview, lewati satu dialog                      |
| 2:15–2:50 | "Siswa buka tautan, langsung main. Tidak perlu akun."                                                         | Buka halaman game, mainkan 2–3 beat + 1 soal          |
| 2:50–3:00 | "Dan yang paling penting: salah itu bagian dari belajar. Setiap jawaban dapat penjelasan."                    | Tunjukkan penjelasan setelah menjawab                 |

Kalau kamu punya waktu lebih, tambahkan layar hasil dan kalimat ini: _"Coba ulang
bagian ini: Kondensasi."_ Bagian itu yang paling sering membuat guru di ruangan
mengangguk.

## Sketsa layar

Sketsa di bawah bukan desain final. Fungsinya supaya kamu ingat susunan layar
tanpa harus membuka laptop.

### 1. Daftar materi guru

```text
+---------------------------------------------------------------+
|  ClassQuest                              [ + Buat cerita ]    |
|---------------------------------------------------------------|
|  Siklus Air            IPA · SMP 7      Perlu direview        |
|  3 bab · 6 soal        diubah 2 menit lalu                    |
|                                        [ Edit ] [ Preview ]   |
|---------------------------------------------------------------|
|  Fotosintesis          IPA · SMP 7      Sudah dibagikan       |
|  4 bab · 8 soal        diubah kemarin                         |
|                                        [ Edit ] [ Bagikan ]   |
+---------------------------------------------------------------+
```

Kalau daftar masih kosong, tampilkan ajakan tiga langkah besar: _Upload PDF →
Review cerita → Bagikan tautan_.

### 2. Sedang dibuat

```text
+---------------------------------------------------------------+
|  Ke Mana Perginya Genangan Itu?                               |
|                                                               |
|   [v] Membaca PDF                                             |
|   [v] Menyusun kerangka bab                                   |
|   [>] Menulis cerita...                                       |
|   [ ] Memeriksa hasil                                         |
|                                                               |
|   Boleh ditinggal. Proses jalan di server.                     |
+---------------------------------------------------------------+
```

Yang penting diucapkan: **boleh ditinggal**. Guru tidak disuruh menatap progress
bar. Tapi jangan bilang "prosesnya pasti selesai" — job berjalan di instance
server yang sama, jadi kalau instance mati, job bisa terputus. Untuk demo, itu
risiko yang diterima; lihat
[`../06-backend/jobs-and-limits.md`](../06-backend/jobs-and-limits.md#pilihan-eksekusi).

### 3. Layar judul game (480×270, diperbesar)

```text
+---------------------------------------+
|                                       |
|        Ke Mana Perginya               |
|          Genangan Itu?                |
|                                       |
|      Nara dan setetes air yang        |
|      ingin pulang ke langit           |
|                                       |
|            [ MULAI ]                  |
|          [ LANJUTKAN ]   (jika ada)   |
|                              (suara)  |
+---------------------------------------+
```

### 4. Dialog di dalam game

```text
+---------------------------------------+
|  latar: kelas, siang                  |
|                                       |
|    (Pak Bima)            (Nara)       |
|                                       |
|  +---------------------------------+  |
|  | Pak Bima                        |  |
|  | Genangan itu tadi pagi masih    |  |
|  | penuh. Ke mana airnya?          |  |
|  +---------------------------------+  |
|   Bab 1/3                     (Esc)   |
+---------------------------------------+
```

### 5. Tantangan (muncul di atas cerita, bukan halaman baru)

```text
+---------------------------------------+
|  (cerita tetap terlihat, gelap 60%)   |
|  +---------------------------------+  |
|  | Apa yang terjadi pada air       |  |
|  | genangan saat kena matahari?    |  |
|  |                                 |  |
|  | ( ) Menguap menjadi uap air     |  |
|  | ( ) Membeku menjadi es          |  |
|  | ( ) Berubah menjadi tanah       |  |
|  |                     [ JAWAB ]   |  |
|  +---------------------------------+  |
+---------------------------------------+
```

Setelah dijawab, panel yang sama menampilkan **penjelasan** dulu, baru tombol
"Lanjut". Jangan langsung menutup. Penjelasan itu inti produknya, dan itu yang
membedakan ClassQuest dari kuis biasa.

### 6. Layar hasil

```text
+---------------------------------------+
|           Cerita selesai              |
|                                       |
|           5 dari 6 benar              |
|              60 poin                  |
|                                       |
|   Coba ulang bagian ini: Kondensasi   |
|                                       |
|      [ MAIN LAGI ]   [ KE AWAL ]      |
+---------------------------------------+
```

Tidak ada peringkat, tidak ada perbandingan dengan siswa lain. Itu keputusan
produk, bukan fitur yang belum jadi.

Soal angka: **jangan mengarang skor.** Poin mengikuti `points` tiap tantangan
(default 10; di cerita contoh `ordering` dan `short_answer` bernilai 15). Dengan 6
soal di `story.example.json`, total maksimumnya 70 — jadi "5 dari 6 benar" wajar
menghasilkan 55–60 poin, bukan 80. Kalau nanti angkanya berubah, ubah cerita
contohnya dulu, baru sketsa ini.

## Kalau ada yang gagal

Jangan minta maaf panjang-panjang. Sebut satu kalimat, lalu pindah ke rencana B.

| Yang gagal                 | Yang kamu lakukan                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Upload lambat atau macet   | "Jaringan di ruangan ini sedang ramai." Langsung buka cerita yang sudah publish.                |
| Generasi AI lama           | "Sambil menunggu, saya tunjukkan hasil yang tadi sudah jadi." Pindah ke tab kedua.              |
| AI memakai cerita cadangan | Jadikan bahan cerita: "Banner ini muncul kalau materinya sulit diproses. Guru tetap bisa edit." |
| Game tidak mau dimuat      | Refresh sekali. Masih gagal? Pakai tab kedua yang sudah dibuka sejak awal.                      |
| Suara tidak keluar         | "Suara memang baru aktif setelah klik pertama." Klik sekali, lanjut bicara.                     |
| Proyektor memotong layar   | Tekan fullscreen. Kalau tetap, jelaskan sambil menunjuk bagian yang penting.                    |

Aturan mutlak: **jangan men-debug di depan penonton.** Semua perbaikan dilakukan
setelah demo selesai.

## Pertanyaan yang biasanya muncul

| Pertanyaan                                  | Jawaban singkat                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Isinya bisa salah?"                        | "Bisa. Karena itu guru wajib review sebelum publish, dan setiap soal wajib punya penjelasan." |
| "Gambarnya dibuat AI?"                      | "Tidak. Aset disiapkan di awal, AI hanya menyusun cerita dari aset itu. Hasilnya konsisten."  |
| "Bagaimana kalau materinya bahasa Inggris?" | "Cerita mengikuti bahasa materinya."                                                          |
| "Siswa butuh akun?"                         | "Tidak. Cukup tautan atau kode kelas."                                                        |
| "Berapa biayanya per cerita?"               | Sebut angka nyata dari percobaan terakhir. Kalau belum diukur, katakan belum diukur.          |
| "Bisa untuk semua mata pelajaran?"          | "Bisa, selama materinya teks yang bisa dibaca. PDF hasil scan belum, itu backlog."            |

## Latihan

- [ ] Tiga kali berturut-turut tanpa melihat tabel naskah.
- [ ] Sekali dengan sengaja mematikan jaringan di tengah generasi (uji rencana B).
- [ ] Sekali memakai cerita yang jatuh ke fallback (uji kalimat penjelasannya).
- [ ] Catat durasi sebenarnya tiap bagian, lalu potong bagian paling lambat.
- [ ] Minta satu orang yang belum pernah melihat produk ini menonton dan bertanya.
