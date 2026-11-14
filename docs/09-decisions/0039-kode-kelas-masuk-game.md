---
status: stable
last_reviewed: 2026-11-14
owner: tim ClassQuest
---

# 0039 — Kode Kelas sebagai Jalan Masuk Game

- **Status:** Accepted
- **Tanggal:** 2026-11-14
- **Pengambil keputusan:** tim ClassQuest
- **Menggantikan:** —
- **Melanjutkan:** [0015](0015-kelas-dan-siswa.md)

## Konteks

Sampai sekarang satu-satunya jalan masuk siswa adalah tautan yang dibagikan guru
(`/play/[storyId]?kelas=QST-XXXX`). Kode kelas sudah dibuat sejak
[ADR 0015](0015-kelas-dan-siswa.md) dan disimpan di tabel `classrooms`, tetapi
hanya dipakai sebagai label di tautan — siswa tidak pernah mengetiknya. Kalau
tautan hilang atau guru hanya menulis kode di papan tulis, siswa tidak punya
cara masuk.

Di sisi lain, kode kelas hanya 4 karakter dari 32 huruf (`QST-XXXX`, sekitar
satu juta kombinasi). Tanpa pembatas, kode bisa ditebak beruntun dan daftar nama
siswa kelas lain ikut terbaca. ADR 0015 juga menyebut bahwa membuka jalan masuk
lewat kode kelas butuh keputusan baru, bukan sekadar menambah kolom di form.

Landing page saat ini menautkan kartu "Arena Siswa" ke `/demo` (demo Phaser),
bukan ke alur siswa yang sesungguhnya.

## Keputusan

1. **Route baru `/play` tanpa `storyId`.** Halaman ini hanya memasang gerbang
   client (`PlayGate`); ia tidak menyentuh database saat dirender dan tidak
   menerima `storyId` di URL. Kolom **kode kelas berada di atas** kolom nama.
   `/play/[storyId]?kelas=...` dan `/demo` tidak berubah.
2. **Kode diselesaikan di server lewat Server Action `masukKelas`.** Server
   mencari kelas dari kode, mengambil **game terbit milik guru pemilik kelas
   itu**, lalu:
   - satu game terbit → langsung dimainkan;
   - lebih dari satu → siswa memilih dari daftar game terbit guru tersebut;
   - tidak ada game terbit → `no_games`.

   Game guru lain tidak pernah bisa dipilih: `storyId` dari siswa harus ada di
   daftar game guru kelas itu, dan `getPlayEntry` memeriksa ulang kepemilikan
   kelas terhadap cerita.

3. **Identitas dari nama yang diketik, dicocokkan di server.** Nama dirapikan
   (spasi, karakter tak terlihat) lalu dibandingkan tanpa memandang huruf
   besar/kecil dengan nama siswa kelas itu. Cocok **tepat satu** → `studentId`,
   sehingga hasil main masuk analytics per siswa. Tidak cocok atau cocok lebih
   dari satu → nama bebas (`nickname`) yang tetap tersimpan di `play_results`
   tetapi **tanpa `classroom_id`**, jadi tidak masuk analytics kelas. UI
   menampilkan catatan singkat dan tombol "Ganti kelas".
4. **Tetap satu layar, tanpa navigasi.** Kode dan nama tidak masuk URL atau
   `sessionStorage`; setelah cocok, `GameShell` dipasang dengan `pemainAwal`
   sehingga menu utama cerita guru langsung tampil tanpa layar nama kedua.
   Refresh mengembalikan siswa ke form kode, sementara progres cerita tetap di
   `localStorage` dan tombol "Lanjutkan" muncul lagi.
5. **Rate limit 30 percobaan per 10 menit per IP, di memori, fail open.**
   Dihitung sebelum kode disentuh. Kelebihan dijawab
   `{ ok: false, reason: "rate_limited" }` karena Server Action tidak bisa
   mengirim HTTP 429. Kegagalan penghitung diperlakukan sebagai izin supaya
   siswa tidak tertahan.
6. **Kartu siswa di landing menunjuk `/play`.** `/demo` tetap menjadi demo
   Phaser, sekarang ditautkan dari dalam gerbang ("Coba demo tanpa kode kelas"),
   bukan sebagai pintu utama siswa. (Nama route-nya dipindah dari `/game` ke
   `/demo`; lihat [0040](0040-route-demo-ke-demo.md).)

## Status keputusan identitas

Poin **3** (identitas dari nama yang diketik) dan poin **4** (satu layar tanpa
konfirmasi) **digantikan** oleh [ADR 0041](0041-masuk-dengan-nis.md): gerbang
`/play` sekarang meminta **NIS** dan menampilkan konfirmasi nama lengkap sebelum
bermain. Sisanya (kode kelas sebagai kunci masuk, game milik guru kelas itu,
satu layar tanpa navigasi, rate limit, kartu landing) tetap berlaku.

## Konsekuensi

- Kode kelas berubah dari label menjadi **kunci masuk**. Kode itu boleh ditulis
  di papan tulis, tetapi tidak boleh dipublikasikan bebas: siapa pun yang tahu
  kodenya bisa memuat daftar nama kelas lewat jalur ini. Isi yang dikirim ke
  client tetap hanya `id`, `name`, dan `nis` siswa — tanpa username, tahun
  ajaran, atau data guru.
- Guru dengan beberapa game terbit mendapat satu layar pilihan tambahan. Ini
  disengaja: membuka game "pertama" diam-diam berisiko siswa masuk ke tugas
  yang salah.
- Nama bebas tidak pernah masuk analytics kelas. Guru yang ingin semua hasil
  terhitung harus memastikan nama siswa terdaftar di `/guru/kelas`.
- Batas tebak kode bersifat **per instance**; beberapa instance berarti batas
  efektif berlipat. Ini perlindungan dasar, bukan jaminan kriptografis.
- Refresh di tengah permainan kembali ke form kode. Progres cerita tidak hilang
  karena disimpan di `localStorage`.

## Alternatif yang ditolak

- **Kode + NIS/password siswa.** Menambah data rahasia yang harus diurus guru
  dan memperlambat masuk; untuk demo, nama yang dicocokkan ke daftar sudah cukup
  memisahkan siswa.
- **Menyimpan kode/nama di `sessionStorage` atau URL.** Membuat tautan yang
  bocor membawa identitas siswa, dan menambah state yang harus dibersihkan.
- **Layar kedua khusus memilih nama setelah kode cocok.** Menambah satu langkah
  tanpa manfaat; nama sudah diketik di form yang sama.
- **Menampilkan semua game terbit semua guru.** Melanggar batas antar-guru dan
  membuat siswa bisa membuka cerita yang bukan tugasnya.
