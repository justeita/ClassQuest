---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Deploy dan Akses Juri

Sumber: Guidebook LOGICODIX 2026, halaman cetak 20–21 dan 26.

Aplikasi yang tidak bisa dibuka juri sama saja dengan tidak ada. Bagian ini
mengatur apa yang harus hidup, apa yang tidak boleh diminta dari juri, dan bagaimana
membuktikannya.

## Aturan akses

| Aturan                                                                                                           | Artinya untuk kita                                                              |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Seluruh tautan dan berkas wajib valid, lengkap, dan dapat diakses panitia serta juri **tanpa izin tambahan**     | Tidak ada allowlist IP, tidak ada permintaan akses, tidak ada login khusus juri |
| Web: aplikasi wajib **sudah di-deploy** dan dapat diakses lewat browser                                          | Bukan hanya "bisa dijalankan lokal"                                             |
| Mobile: berkas atau tautan distribusi wajib **dapat dipasang dan diuji** juri                                    | APK atau TestFlight/tautan instalasi yang benar-benar bisa dipakai              |
| Akun demonstrasi wajib disediakan **jika aplikasi memakai autentikasi**                                          | Kredensial demo ditulis di README                                               |
| Juri **tidak boleh diwajibkan membayar, berlangganan, atau memiliki akses khusus** untuk menjalankan fitur utama | Tidak ada paywall, tidak ada trial yang habis                                   |
| Tim wajib memastikan layanan pendukung, **termasuk kuota API**, tetap aktif selama penilaian                     | Kunci dan kuota harus hidup sampai pengumuman hasil                             |

Tenggat akses: sampai **seluruh penilaian dan pengumuman hasil selesai**. Itu
berarti sampai setelah 29 November 2026.

## Konsekuensi yang sering dilupakan

1. **Kuota API gratis bisa habis.** Kalau fitur AI bergantung pada kuota gratis,
   penilaian bisa jatuh di saat kuota habis. Sediakan cadangan: kunci kedua, atau
   fallback yang tetap bisa didemokan.
2. **Free tier platform deploy bisa tidur.** Pastikan aplikasi tidak butuh "wake up"
   puluhan detik, atau setidaknya tidak error saat pertama dibuka.
3. **Database gratis bisa kedaluwarsa.** Kalau memakai layanan dengan masa aktif,
   pastikan masa aktifnya melewati 29 November 2026.
4. **Deploy dari branch yang salah.** Deployment wajib dari commit final.
5. **Mengubah deployment setelah code freeze.** Hanya boleh memulihkan
   ketersediaan, tanpa mengubah kode, fitur, atau data.

## Perbedaan Web dan Mobile

Kita memilih kategori **Web**, jadi yang berlaku:

- Aplikasi harus bisa dibuka lewat browser di desktop dan ponsel.
- Tidak perlu APK.
- Jangan menampilkan instruksi "install aplikasi" di README atau video.

Kalau suatu saat kategori berubah, aturan Mobile berlaku: berkas atau tautan
distribusi yang bisa dipasang dan diuji juri.

## Checklist deploy

Sebelum submission:

- [ ] Aplikasi ter-deploy dan bisa dibuka tanpa login.
- [ ] Deploy berasal dari **commit final** yang dicantumkan di form submission.
- [ ] Dites di jendela penyamaran (tanpa sesi, tanpa cache).
- [ ] Dites di ponsel, bukan hanya laptop.
- [ ] Dites dari jaringan seluler, bukan hanya WiFi kampus.
- [ ] Fitur utama berjalan tanpa error di lingkungan bersih.
- [ ] Akun demo tersedia dan dicantumkan di README (bila ada autentikasi).
- [ ] Tidak ada fitur utama yang memerlukan pembayaran atau langganan.
- [ ] Kuota API cukup dan kunci aktif sampai 29 November 2026.
- [ ] Tidak ada halaman error yang membocorkan stack trace atau kunci.
- [ ] URL aplikasi dicatat di [`11-submission-checklist.md`](./11-submission-checklist.md).

## Selama penilaian

| Boleh                                                      | Tidak boleh                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Memulihkan layanan yang down dengan commit final yang sama | Mengubah kode atau fitur                       |
| Menambah kuota API atau merotasi kunci yang bocor          | Mengubah perilaku aplikasi                     |
| Menjawab pertanyaan juri                                   | Mengirim build baru                            |
| Memperbaiki konfigurasi yang tidak mengubah perilaku       | Mengubah data yang memengaruhi hasil penilaian |

Kalau terjadi gangguan, catat di [`13-pelanggaran-dan-sanksi.md`](./13-pelanggaran-dan-sanksi.md)
bagian daftar risiko, beserta waktu dan tindakan pemulihannya. Catatan itu yang
membuktikan pemulihan dilakukan tanpa mengubah kode.

## Cara membuktikan deploy cocok dengan commit final

Simpan bukti ini, karena juri berhak meminta klarifikasi:

1. Commit hash final.
2. Tanggal dan jam deploy.
3. Tanggal dan jam commit (harus sebelum code freeze).
4. Tangkapan layar dashboard deploy yang menunjukkan commit yang di-deploy.
5. Catatan bahwa tidak ada deploy lain setelahnya, kecuali pemulihan.

Tempel di [`11-submission-checklist.md`](./11-submission-checklist.md).
