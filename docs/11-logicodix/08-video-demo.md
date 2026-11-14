---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Video Demo

Sumber: Guidebook LOGICODIX 2026, halaman cetak 18–21.

Video demo bukan pelengkap. Kalau video tidak memenuhi syarat, submission
dinyatakan **tidak memenuhi persyaratan demonstrasi** — apa pun kualitas kodenya.

## Spesifikasi wajib

| Item            | Ketentuan                                                   |
| --------------- | ----------------------------------------------------------- |
| Durasi          | Minimal **3 menit 00 detik**, maksimal **5 menit 00 detik** |
| Isi rekaman     | Aplikasi yang **benar-benar berjalan** dari commit final    |
| Media rekam     | Browser untuk kategori Web; perangkat/emulator untuk Mobile |
| Platform unggah | YouTube                                                     |
| Status video    | **Unlisted atau Public**                                    |
| Akses           | Bisa diputar tanpa login atau izin tambahan                 |
| Daya tahan      | Tidak dihapus sampai pengumuman hasil akhir                 |
| Narasi          | Opsional; demo visual tanpa penjelasan lisan diperbolehkan  |

Durasi di luar rentang itu otomatis gagal. Tidak ada toleransi yang disebut
guidebook, jadi jangan mengandalkan "hampir 5 menit".

## Urutan yang wajib ditampilkan

Guidebook menyebut urutannya. Ikuti persis, karena juri menilai kelengkapan alur.

1. **Tampilan awal dan identitas aplikasi** — nama aplikasi terlihat.
2. **Alur penggunaan fitur utama** — dari input, proses, sampai output.
3. **Pembuktian fungsi utama yang diklaim tim** — fitur yang disebut di README
   harus muncul di video.
4. **Proses dan hasil integrasi AI atau API pihak ketiga secara langsung** — bila
   integrasi itu menjadi fitur utama.

Poin 4 sering terlewat. Menampilkan hasil akhir tanpa menunjukkan prosesnya tidak
cukup: rekam saat permintaan dikirim, saat loading, dan saat hasil muncul.

## Aturan penyuntingan

| Boleh                                                                  | Dilarang                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Memotong waktu tunggu (loading, buffering)                             | Mengubah urutan kejadian                                  |
| Menambah narasi, voice-over, atau teks penjelas                        | Menambah hasil yang tidak benar-benar muncul saat direkam |
| Menambah musik                                                         | Mengganti hasil dengan tangkapan layar hasil edit         |
| Mempercepat bagian yang lambat, selama hasil akhir tetap terlihat asli | Menyembunyikan error yang muncul                          |

Kalimat kunci guidebook: rekaman harus **utuh dan berkesinambungan**, dan
penyuntingan tidak boleh **mengubah atau menambah hasil yang ditampilkan**.

## Yang dilarang sebagai pengganti demo

Semua ini membuat video tidak sah:

- Slide presentasi
- Desain UI/UX
- Prototipe Figma
- Mockup
- Animasi
- Simulasi
- Hasil yang direkayasa

Artinya: **tidak boleh ada mockup di video.** Kalau sebuah fitur belum jalan,
jangan tampilkan mockup-nya — hilangkan fitur itu dari video dan dari daftar fitur
README.

## Shot list untuk ClassQuest

Total target 3 menit 40 detik. Isi waktu dengan demo nyata, bukan penjelasan.

| Waktu       | Isi                                                              | Yang harus terlihat                       |
| ----------- | ---------------------------------------------------------------- | ----------------------------------------- |
| 0:00 – 0:15 | Halaman awal ClassQuest                                          | Nama aplikasi, tagline, tombol masuk      |
| 0:15 – 0:35 | Identitas dan konteks: subtema, masalah, target pengguna         | Teks di layar atau narasi                 |
| 0:35 – 1:10 | Guru upload PDF materi                                           | Pilih file, progress, status job          |
| 1:10 – 1:55 | Proses generasi: panggilan AI terlihat, lalu hasil cerita muncul | Request, loading, output cerita           |
| 1:55 – 2:20 | Guru review dan edit satu bagian cerita                          | Perubahan tersimpan, preview              |
| 2:20 – 3:10 | Siswa membuka cerita dan memainkan satu scene + satu tantangan   | Input jawaban, umpan balik, skor          |
| 3:10 – 3:30 | Layar hasil                                                      | Ringkasan skor, konsep yang perlu diulang |
| 3:30 – 3:40 | Penutup: tautan repo dan nama tim                                | Teks di layar                             |

Sesuaikan dengan fitur yang benar-benar selesai. **Jangan merekam fitur yang masih
placeholder** — yang ada di `/demo` saat ini baru shell kosong.

## Persiapan merekam

Sebelum menekan record:

- [ ] Aplikasi dijalankan dari **commit final**, bukan dari working tree yang kotor.
- [ ] `bun run build` lalu `bun run start` — bukan `next dev`, supaya tidak ada
      overlay debug.
- [ ] Data demo sudah disiapkan: satu PDF contoh dengan jumlah halaman wajar.
- [ ] Kuota API cukup untuk beberapa kali percobaan.
- [ ] Browser dalam mode bersih: tanpa ekstensi, tanpa tab lain, tanpa bookmark
      bar yang memperlihatkan hal pribadi.
- [ ] Resolusi minimal 1280×720, teks terbaca.
- [ ] Notifikasi sistem dimatikan.
- [ ] Rekaman satu take per segmen besar, digabung dengan potongan di batas
      segmen — jangan menyambung hasil yang berbeda.
- [ ] Tidak ada kredensial yang terlihat di layar (file `.env`, terminal dengan
      API key, dashboard provider).

## Setelah merekam

1. Periksa durasi dengan pemutar, bukan dengan perkiraan.
2. Tonton ulang dari awal: apakah setiap fitur yang diklaim README muncul?
3. Unggah ke YouTube sebagai **Unlisted**.
4. Pastikan tautan bisa dibuka di jendela penyamaran tanpa login.
5. Catat tautannya di [`11-submission-checklist.md`](./11-submission-checklist.md).
6. **Jangan mengedit atau menghapus video** setelah submission.

## Kesalahan yang paling sering terjadi

| Kesalahan                                                 | Akibat                                  |
| --------------------------------------------------------- | --------------------------------------- |
| Durasi 2:50                                               | Tidak memenuhi syarat demonstrasi       |
| Durasi 5:20                                               | Tidak memenuhi syarat demonstrasi       |
| Hanya menampilkan hasil AI tanpa prosesnya                | Poin integrasi tidak terbukti           |
| Memakai mockup untuk fitur yang belum jadi                | Dianggap manipulasi visual              |
| Video dari commit sebelum code freeze, bukan commit final | Tidak sesuai ketentuan                  |
| Video di-private setelah submission                       | Submission tidak dapat diakses          |
| Suara hilang dan tidak ada teks                           | Boleh secara aturan, tapi sulit dinilai |
| Rekaman terputus di tengah alur utama                     | Dianggap tidak berkesinambungan         |

## Checklist

- [ ] Durasi antara 3:00 dan 5:00.
- [ ] Direkam dari commit final.
- [ ] Menampilkan identitas aplikasi, alur utama, bukti fungsi, dan integrasi AI.
- [ ] Tidak ada slide, mockup, animasi, atau simulasi.
- [ ] Penyuntingan hanya memotong waktu tunggu dan menambah narasi/teks/musik.
- [ ] YouTube Unlisted atau Public, bisa diputar tanpa login.
- [ ] Tautan dicatat dan diuji di jendela penyamaran.
- [ ] Tidak diubah atau dihapus sampai pengumuman hasil akhir.
