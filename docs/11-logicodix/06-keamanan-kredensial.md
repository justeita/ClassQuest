---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Keamanan Kredensial

Sumber: Guidebook LOGICODIX 2026, halaman cetak 15–16. Bobot penilaian "Etika & Keamanan
Digital" 10% juga menilai keamanan dasar aplikasi.

## Aturan

1. **Dilarang menuliskan** API key, token, password database, atau kredensial
   rahasia lain secara langsung (hardcoded) di repositori.
2. Kredensial **wajib** disimpan sebagai environment variable di file `.env`.
3. File `.env` **wajib** masuk `.gitignore` dan **tidak boleh** ter-push.
4. Tim **wajib** menyediakan `.env.example` berisi **nama variabel tanpa nilai
   asli**.
5. Kebocoran kredensial menjadi **tanggung jawab tim**.

Poin 5 penting: tidak ada "kami tidak tahu". Kalau kunci bocor, yang dinilai bukan
niatnya, tapi kejadiannya.

## Apa yang dianggap kredensial

Jangan hanya memikirkan API key. Semua ini termasuk:

| Jenis                        | Contoh di proyek ini                          |
| ---------------------------- | --------------------------------------------- |
| Kunci API model              | `AI_API_KEY` untuk Gemini/OpenAI/Anthropic    |
| Token akses layanan          | token deploy platform, token storage          |
| Kredensial database          | connection string dengan password di dalamnya |
| Sandi akun guru/siswa        | hash scrypt di tabel `teachers`/`students`    |
| Secret signing               | session secret, JWT secret                    |
| Kredensial storage           | `STORAGE_BUCKET` beserta key-nya              |
| Kunci privat                 | `*.pem`, `*.key`, `id_rsa`                    |
| Kredensial pihak ketiga lain | webhook secret, service account JSON          |

Yang **bukan** kredensial dan boleh ada di repo:

- Nama variabel (`AI_PROVIDER`, `AI_MODEL`).
- Nilai non-rahasia yang memang publik (`AI_PROVIDER=mock`).
- URL publik yang tidak mengandung token.

## Pola file

```text
.env.example    ← di-commit. Nama variabel saja, tanpa nilai asli.
.env.local      ← tidak di-commit. Dipakai `next dev` untuk lokal.
.env            ← tidak di-commit. Dipakai tooling/deploy.
```

`.gitignore` di repo ini sudah menangani ini:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

Arti baris kedua: `.env.example` dikecualikan dari pola ignore, jadi tetap
ter-commit. **Jangan mengubah dua baris itu.** Kalau ada yang menghapusnya, semua
file `.env` akan ikut ter-commit.

## Isi `.env.example`

`.env.example` sudah memuat nama variabel yang dibaca `src/server/config.ts`
(`AI_PROVIDER`, `AI_API_KEY`, `TEACHER_SESSION_SECRET`, `DATABASE_URL`, dst.)
tanpa nilai asli. Aturan di bawah tetap berlaku: setiap `process.env.X` baru di kode
wajib punya `X=` di `.env.example` pada commit yang sama.

Bentuk yang harus ada ketika fitur AI dan penyimpanan masuk:

```bash
# Provider AI (lihat docs/03-ai-pipeline/provider-setup.md)
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
AI_TIMEOUT_MS=60000

# Akun seed guru/siswa (sementara, sampai auth nyata). Kosong = akun demo.
TEACHER_SEED_USERNAME=
TEACHER_SEED_PASSWORD=
TEACHER_SESSION_SECRET=

# Database/storage (TBD, lihat docs/06-backend/persistence.md)
DATABASE_URL=
STORAGE_BUCKET=
```

Aturan isi `.env.example`:

| Boleh                                       | Tidak boleh                                         |
| ------------------------------------------- | --------------------------------------------------- |
| `AI_PROVIDER=mock` (nilai non-rahasia)      | `AI_API_KEY=AIza...` (nilai asli)                   |
| `AI_API_KEY=` (kosong)                      | `AI_API_KEY=changeme` (terlihat seperti nilai asli) |
| Komentar penjelas                           | Contoh kunci yang valid                             |
| Nama variabel yang benar-benar dipakai kode | Variabel yang tidak dipakai kode mana pun           |

Kebiasaan yang aman: **setiap kali menambah `process.env.X` di kode, tambahkan
`X=` di `.env.example` pada commit yang sama.**

## Aturan pemakaian di kode

1. Semua pembacaan env lewat satu modul: `src/server/config.ts`.
2. Modul itu wajib `import "server-only"`.
3. Jangan pernah memakai prefix `NEXT_PUBLIC_` untuk nilai rahasia — prefix itu
   membocorkan nilai ke bundle browser.
4. Jangan menaruh nilai env di `next.config.ts` yang terekspos ke client.
5. Jangan menempelkan nilai env di issue, PR, chat, atau screenshot.

> **Sudah sesuai (2026-11-10):** paket `server-only` terpasang dan
> `src/server/config.ts`, `src/server/auth.ts`, `src/server/db/client.ts`, serta
> `src/ai/providers/anthropic.ts` memuat `import "server-only"` sebagai import
> pertama. Di Vitest, specifier itu dialihkan ke stub kosong
> (`src/test/server-only-stub.ts` lewat `vitest.config.mjs`); skrip Bun yang
> mengimpor modul server (mis. `bun run db:migrate`) memakai
> `--conditions=react-server`. Guard-nya dijaga test regresi
> `src/server/server-only.test.ts`.

## Cara memeriksa tidak ada yang bocor

Jalankan sebelum setiap PR dan sebelum submission:

```bash
# 1. Tidak ada file .env yang ter-track
git ls-files | grep -E '^\.env' | grep -v '\.env\.example$'

# 2. Tidak ada pola kredensial di file yang ter-track
git grep -nIE 'sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY'

# 3. Tidak ada password di connection string
git grep -nIE '(postgres|postgresql|mysql|mongodb)://[^:]+:[^@]+@'

# 4. Cek riwayat, bukan hanya file sekarang
git log -p --all -S 'AI_API_KEY=' -- . | head -50
```

Perintah nomor 4 penting: file yang sekarang bersih bisa berasal dari commit lama
yang masih menyimpan nilai asli di riwayat.

## Kalau kredensial bocor

Urutannya tidak boleh dibalik.

1. **Rotasi kunci dulu.** Anggap sudah bocor ke publik begitu ter-push.
2. Hapus nilainya dari kode dan commit perbaikan.
3. **Jangan** force push atau rewrite riwayat untuk "membersihkan" — itu
   pelanggaran tersendiri dan tidak menghapus jejak di GitHub.
4. Catat kejadiannya di [`13-pelanggaran-dan-sanksi.md`](./13-pelanggaran-dan-sanksi.md)
   bagian daftar risiko.
5. Kalau kunci itu dipakai saat penilaian, pastikan kuota dan aksesnya masih hidup
   setelah rotasi.

Untuk hackathon, langkah 1 dan 2 sudah cukup. Rewrite riwayat lebih berbahaya
daripada kunci yang sudah dirotasi.

## Perintah pemeriksaan

Aturan di atas wajib dijalankan sebelum setiap PR. Perintah pemeriksaan cepat:

```bash
# File .env tidak boleh ter-track
git ls-files | grep -E '^\.env' | grep -v '\.env\.example$'

# Pola kredensial di file ter-track
git grep -nIE 'sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY'

# Kredensial di riwayat commit
git log -p --all -- . | grep -nE 'sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}'
```

Keluaran kosong berarti bersih.

## Checklist

- [ ] Tidak ada nilai rahasia di file yang ter-track.
- [ ] Tidak ada nilai rahasia di riwayat commit.
- [ ] `.gitignore` masih mengecualikan `.env.example`.
- [ ] `.env.example` memuat semua variabel yang dibaca kode, tanpa nilai asli.
- [ ] Tidak ada `NEXT_PUBLIC_` untuk nilai rahasia.
- [ ] Kunci yang pernah dipakai di demo sudah dirotasi setelah kompetisi.
