---
status: stable
last_reviewed: 2026-11-12
owner: tim ClassQuest
---

# Persona dan Peran

## Ringkasan peran

| Peran     | Tujuan utama                                    | Yang dia lihat                            |
| --------- | ----------------------------------------------- | ----------------------------------------- |
| **Guru**  | Mengubah materi jadi game dan mengontrol isinya | Dashboard, upload, editor cerita, preview |
| **Siswa** | Bermain dan belajar lewat cerita                | Game fullscreen, tantangan, hasil         |
| **Tim**   | Membangun dan mendemokan                        | Repo, docs, panel admin minimal           |

Tidak ada peran "admin sekolah" di MVP. Akun guru dibuat lewat `bun run db:seed`
lalu login dengan username + sandi; siswa belum diminta login, cukup memakai
tautan yang dibagikan. Detail teknis ada di
[`../06-backend/persistence.md`](../06-backend/persistence.md).

## Guru (persona utama)

**Konteks:** guru SMP/SMA, terbiasa menyusun materi sendiri, tidak nyaman dengan
alat teknis yang rumit, waktu terbatas.

**Yang dia butuhkan:**

- Upload materi tanpa membaca dokumentasi.
- Melihat hasil AI dengan cepat dan tahu mana yang perlu diperbaiki.
- Mengedit teks cerita, soal, dan jawaban tanpa menyentuh JSON mentah.
- Yakin bahwa siswa tidak akan melihat materi yang salah.

**Yang membuat dia frustrasi:**

- Menunggu lama tanpa progres yang jelas.
- Hasil AI yang mengarang fakta di luar materinya.
- Harus mengisi formulir panjang sebelum melihat hasil apa pun.
- Tidak bisa membatalkan atau mengulang generasi.

**Kebutuhan UX yang mengikat:**

1. Progres generasi harus terlihat (per tahap, bukan spinner kosong).
2. Setiap perubahan AI harus bisa di-undo lewat versi cerita.
3. Editor harus menampilkan kesalahan validasi dalam bahasa manusia, bukan kode.

## Siswa

**Konteks:** pelajar, mungkin memakai laptop sekolah atau HP, durasi perhatian
pendek, tidak sabar dengan instruksi panjang.

**Yang dia butuhkan:**

- Langsung bisa main, tanpa daftar akun.
- Tahu harus melakukan apa (indikator interaksi yang jelas).
- Umpan balik cepat saat menjawab tantangan.
- Rasa progres (chapter selesai, skor).

**Yang membuat dia frustrasi:**

- Dialog panjang tanpa interaksi.
- Soal yang jawabannya tidak ada di cerita.
- Kontrol yang tidak jelas di layar kecil.
- Kehilangan progres saat refresh.

**Kebutuhan UX yang mengikat:**

1. Klik/tap di mana saja untuk lanjut dialog, plus tombol "lanjut".
2. Tantangan bisa dijawab dengan keyboard maupun sentuh.
3. Progres disimpan lokal, bisa dilanjutkan setelah refresh.
4. Tidak ada hukuman keras: jawaban salah memberi penjelasan, bukan game over.

## Tim (internal)

**Yang dia butuhkan:**

- Satu tempat untuk tahu keputusan yang sudah diambil (docs + ADR).
- Cara cepat menjalankan & memverifikasi (`bun run check` lalu `bun run build` —
  check saja belum cukup).
- Kejelasan siapa mengerjakan apa saat hackathon.

**Aturan kerja tim:** lihat [`../08-workflow/git-and-pr.md`](../08-workflow/git-and-pr.md)
dan [`../08-workflow/ai-agent-rules.md`](../08-workflow/ai-agent-rules.md).

## Matriks izin

Guru masuk dengan **akun guru** (username + sandi). Tabel `students` dan akun
siswa demo sudah ada, tetapi siswa **belum** diminta login: cukup memakai
**tautan yang dibagikan** atau mengetik **kode kelas** di `/play`. Guru bisa
membuat kelas dan menambah siswa di `/guru/kelas`; kode kelas (`QST-XXXX`)
sekarang menjadi jalan masuk siswa (ADR 0042), bukan sekadar label.

| Aksi                    | Guru | Siswa (punya tautan) | Tanpa tautan |
| ----------------------- | ---- | -------------------- | ------------ |
| Upload materi           | ✅   | ❌                   | ❌           |
| Generate cerita         | ✅   | ❌                   | ❌           |
| Edit cerita             | ✅   | ❌                   | ❌           |
| Melihat preview         | ✅   | ❌                   | ❌           |
| Melihat dashboard guru  | ✅   | ❌                   | ❌           |
| Memainkan game          | ✅   | ✅                   | ❌           |
| Melihat hasil permainan | ✅   | ✅                   | ❌           |
| Menghapus cerita        | ✅   | ❌                   | ❌           |

"Tanpa tautan" berarti tidak tahu `storyId`; halaman `/play/[storyId]` hanya
melayani cerita `published`, dan endpoint publik menolak selain itu. Siswa tanpa
tautan tetap bisa masuk bila gurunya memberi **kode kelas**: `/play` mencari
game terbit milik guru kelas itu (ADR 0042). Tanpa tautan **dan** tanpa kode
kelas, tidak ada jalan masuk. Ini bukan keamanan sungguhan untuk data rahasia —
hanya pembatas agar siswa tidak menemukan cerita yang belum siap.

Implementasi izin guru: cookie sesi bertanda tangan HMAC-SHA256 (berlaku 8 jam)
yang diperiksa `requireTeacher()` di setiap halaman portal dan Server Action. Ini
penghalang demo, bukan sistem keamanan produksi. Jangan menganggap ini sudah aman
untuk data nyata; lihat
[`../01-architecture/security-and-privacy.md`](../01-architecture/security-and-privacy.md).
