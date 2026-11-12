---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Aturan Commit dan Git

Sumber: Guidebook LOGICODIX 2026, halaman cetak 15–16 dan 24.

Dokumen ini mengikat semua anggota. Tujuannya menuliskan aturan git kompetisi
secara eksplisit, karena banyak kebiasaan git yang normal di proyek lain justru
pelanggaran di sini.

## 1. Format pesan commit

Guidebook mewajibkan pesan commit menjelaskan perubahan secara jelas dengan awalan
`feat`, `fix`, `docs`, `style`, `refactor`, atau `chore`.

### Aturan

1. **Wajib** diawali salah satu dari enam awalan resmi. Tidak ada pengecualian.
2. Mengikuti format `tipe(scope): deskripsi` atau `tipe: deskripsi`.
3. Deskripsi huruf kecil, kalimat perintah, tanpa titik di akhir.
4. Maksimal 72 karakter untuk baris pertama.
5. Satu commit = satu perubahan logis. Kalau judulnya butuh kata "dan", mungkin
   harus dipecah.

### Enam awalan resmi

| Awalan     | Dipakai untuk                                                    | Contoh                                              |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| `feat`     | Fitur baru yang terlihat pengguna atau menambah kemampuan sistem | `feat(editor): tambah validasi draf sebelum simpan` |
| `fix`      | Perbaikan bug                                                    | `fix(login): tolak sandi kosong`                    |
| `docs`     | Perubahan dokumentasi saja                                       | `docs(logicodix): tambah checklist submission`      |
| `style`    | Formatting, spasi, urutan import — tanpa mengubah perilaku       | `style(game): rapikan format tipe`                  |
| `refactor` | Ubah struktur kode tanpa mengubah perilaku                       | `refactor(ai): pisahkan adapter provider`           |
| `chore`    | Tooling, konfigurasi, dependency, CI                             | `chore(deps): tambah phaser 4.2.1`                  |

Awalan di luar daftar (`update`, `test`, `final`, `wip`, `perbaikan`, `add`, `tambah`)
**tidak boleh** dipakai. Guidebook menyebut `update`, `test`, dan `final` secara
khusus sebagai pesan yang tidak menjelaskan perubahan.

### Contoh yang benar

```text
feat(auth): tambah login guru dengan akun
feat(ai): integrasi Gemini untuk ringkasan cerita otomatis
fix(validation): perbaiki skema cerita yang null pada choices
docs(readme): lengkapi bagian atribusi aset
chore(ci): jalankan typecheck sebelum build
refactor(game): pisahkan konfigurasi scene ke modul sendiri
style(ui): samakan ukuran radius kartu
```

### Contoh yang salah

```text
update                      ❌ tidak menjelaskan apa pun
test                        ❌ tidak menjelaskan apa pun
final                       ❌ tidak menjelaskan apa pun
add feature                 ❌ tidak ada awalan, bahasa tidak konsisten
Feat: Tambah Fitur Baru.    ❌ huruf besar dan titik di akhir
feat: tambah login dan ubah database dan perbaiki css   ❌ tiga perubahan
```

### Exception 1: merge commit

Merge commit dari pull request dibuat otomatis oleh GitHub dengan format
`Merge pull request #N from ...`. Itu tidak bisa diberi awalan resmi tanpa menulis
pesan sendiri.

Aturan kita:

- Merge commit otomatis GitHub **dibiarkan** apa adanya. Jangan diedit.
- Kalau ingin memberi awalan, merge manual dengan
  `git merge --no-ff -m "chore(merge): gabungkan feature/..."`.
- Merge commit **dilarang** diubah setelah di-push. Kalau pesannya salah, biarkan.
  Memperbaikinya dengan `--amend` lebih berbahaya daripada pesan yang tidak
  sempurna.

Commit merge yang sudah ada sebelum aturan ini tidak boleh di-rewrite. Aturannya
berlaku untuk merge berikutnya.

### Exception 2: commit bot

Guidebook melarang commit dari akun non-anggota. Karena itu **Dependabot tidak
boleh membuat commit di repo ini**. Set dependabot untuk melaporkan saja lewat
issue, atau nonaktifkan selama kompetisi. Commit dari `dependabot[bot]`,
`renovate[bot]`, atau `github-actions[bot]` dianggap pelanggaran.

## 2. Branch

Repo ini memakai satu branch jangka panjang, `main`, dan branch pendek per
pekerjaan.

| Aturan                                                    | Alasan                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| `main` selalu bisa di-build dan dites                     | Juri bisa memeriksa kapan saja             |
| Pekerjaan dilakukan di branch `tipe/deskripsi`            | Menghindari commit setengah jadi di `main` |
| Branch pendek, maksimal 2 hari                            | Hacking Week hanya 7 hari                  |
| Branch yang sudah di-merge tidak dihapus selama kompetisi | Bukti proses pengembangan                  |

Format nama branch:

```text
feat/editor-validation
fix/login-empty-code
docs/logicodix-rules
chore/stop-dependabot-commits
```

## 3. Pull request

| Aturan                                         | Alasan                              |
| ---------------------------------------------- | ----------------------------------- |
| **Merge commit**, jangan squash, jangan rebase | Squash menghapus commit asli        |
| Judul PR memakai awalan resmi                  | Konsisten dengan commit             |
| Deskripsi PR menjelaskan apa dan kenapa        | Bukti pengembangan                  |
| CI hijau sebelum merge                         | `main` harus selalu bisa dijalankan |
| Reviewer minimal satu anggota lain             | Empat mata untuk klaim fitur        |
| PR ditutup, jangan dihapus branch-nya          | Branch adalah bukti                 |

Konfigurasi repo yang **wajib** disetel di GitHub:

- Settings → General → Pull Requests → **matikan** "Allow squash merging".
- Settings → General → Pull Requests → **matikan** "Allow rebase merging".
- Sisakan hanya "Allow merge commits".

## 4. Larangan rewrite

Daftar perintah yang **tidak boleh** dijalankan pada commit yang sudah di-push.
Ini bukan preferensi gaya; ini masuk kategori "memanipulasi riwayat commit".

| Perintah                                            | Status   | Pengganti yang benar                  |
| --------------------------------------------------- | -------- | ------------------------------------- |
| `git commit --amend` pada commit yang sudah di-push | Dilarang | Buat commit `fix:` baru               |
| `git rebase` pada branch yang sudah di-push         | Dilarang | `git merge main` ke branch            |
| `git pull --rebase`                                 | Dilarang | `git pull` biasa (merge)              |
| `git push --force`                                  | Dilarang | Tidak ada pengganti; jangan lakukan   |
| `git push --force-with-lease`                       | Dilarang | Tidak ada pengganti                   |
| `git reset --hard` lalu push                        | Dilarang | `git revert` untuk membatalkan commit |
| `git cherry-pick` untuk memindahkan riwayat         | Hindari  | Tulis commit baru di branch tujuan    |
| Menghapus branch yang sudah di-push                 | Dilarang | Biarkan sampai pengumuman hasil       |
| Menghapus dan membuat ulang repo                    | Dilarang | Tidak ada pengganti                   |
| Mengubah `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`     | Dilarang | Tidak ada pengganti                   |

`git rebase` dan `git commit --amend` **masih boleh** untuk commit yang belum
pernah di-push. Bedanya hanya itu: sudah di-push atau belum. Kalau ragu, anggap
sudah di-push.

Cara membatalkan commit yang sudah di-push, dengan benar:

```bash
# Batalkan isi commit lama, tapi jangan hapus riwayatnya
git revert <sha>
git commit --no-edit
```

## 5. Merge dari `main` ke branch

Karena rebase dilarang, cara menyamakan branch dengan `main`:

```bash
git checkout feat/nama-branch
git fetch origin
git merge origin/main          # merge, bukan rebase
git push
```

Kalau ada konflik, selesaikan dan commit merge-nya. Itu tidak masalah; merge commit
adalah bagian sah dari riwayat.

## 6. Ritme commit

Guidebook meminta commit **berkala** dan mencerminkan perubahan nyata. Ritme yang
sehat untuk Hacking Week 7 hari:

| Hari | Target commit per anggota aktif |
| ---- | ------------------------------- |
| 1–2  | 2–4                             |
| 3–5  | 3–6                             |
| 6–7  | 2–3, didominasi `fix`           |

Yang **tidak** boleh:

- Satu commit berisi seluruh proyek di akhir periode.
- Commit kosong untuk "mengisi riwayat".
- Commit dengan pesan sama berulang tanpa perubahan berarti.
- Commit besar berisi hasil generate yang tidak pernah di-review.

Yang boleh dan justru bagus:

- Commit kecil yang menambah satu fitur, satu test, satu perbaikan.
- Commit `fix:` setelah review menemukan masalah.
- Commit `docs:` yang memperbarui kontrak saat implementasi berubah.

## 7. Checklist sebelum push

- [ ] Pesan commit diawali `feat`/`fix`/`docs`/`style`/`refactor`/`chore`.
- [ ] Commit berisi satu perubahan logis.
- [ ] `bun run check` lolos secara lokal.
- [ ] Tidak ada `.env`, kredensial, atau file besar tak terpakai.
- [ ] Tidak ada `--force`, `--amend`, atau `rebase` pada commit yang sudah di-push.
- [ ] Kalau ini PR, merge memakai **merge commit**.
