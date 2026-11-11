---
status: stable
last_reviewed: 2026-11-11
owner: tim ClassQuest
---

# Git dan Pull Request

## Branch

| Tipe        | Pola                 | Contoh                     |
| ----------- | -------------------- | -------------------------- |
| Fitur       | `feat/{singkat}`     | `feat/story-editor`        |
| Perbaikan   | `fix/{singkat}`      | `fix/upload-validation`    |
| Dokumentasi | `docs/{singkat}`     | `docs/ai-agent-guide`      |
| Refactor    | `refactor/{singkat}` | `refactor/story-validator` |
| Chore       | `chore/{singkat}`    | `chore/update-phaser`      |

- Branch dari `main`.
- Nama branch huruf kecil, dipisah tanda hubung.
- Jangan push langsung ke `main`; `main` menerima perubahan lewat PR.

## Commit

Format: `type(scope): ringkasan`

Awalan yang sah: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`. Aturan
lengkap dan larangan rewrite ada di
[`../11-logicodix/05-aturan-commit-dan-git.md`](../11-logicodix/05-aturan-commit-dan-git.md).

```text
feat(editor): tambah edit tantangan short_answer
fix(upload): tolak PDF tanpa text layer
docs(ai): jelaskan aturan repair
refactor(story): pisahkan scoring dari validator
feat(manifest): tolak aset yang tidak ditemukan saat build
chore(deps): pasang phaser 4.2.1
```

Awalan `test` **tidak** dipakai meskipun isinya test. Guidebook halaman cetak 15
menyebut `test` sebagai pesan yang tidak menjelaskan perubahan, dan
`compliance.test.ts` menolaknya. Tambahan test masuk ke `chore(scope)` bila berdiri
sendiri, atau ikut commit fitur yang diujinya.

Aturan:

- Ringkasan imperatif, huruf kecil, tanpa titik di akhir.
- Satu commit = satu perubahan logis.
- Jangan mencampur format ulang seluruh repo dengan perubahan fitur.
- Jangan commit `.env.local`, `.next`, atau lockfile dari package manager lain.

## Sebelum membuka PR

```bash
bun run format
bun run check
bun run build
```

Checklist:

- [ ] `bun run check` hijau.
- [ ] `bun run build` hijau.
- [ ] Tidak ada `console.log` sisa debugging.
- [ ] Tidak ada kunci/rahasia di diff.
- [ ] Test baru untuk perilaku baru.
- [ ] Docs diperbarui bila kontrak/route/perintah berubah.
- [ ] `bun.lock` ikut berubah hanya bila dependency berubah.
- [ ] Perubahan fokus, tidak mencampur refactor besar.

## Isi PR

Gunakan template di `.github/pull_request_template.md`. Minimal:

1. **Masalah** — apa yang salah/kurang.
2. **Solusi** — pendekatan yang dipilih dan alasannya.
3. **Cara verifikasi** — langkah manual + test yang dijalankan.
4. **Dampak** — route, schema, env var, atau data yang berubah.
5. **Screenshot** — untuk perubahan UI.

Kalau mengubah kontrak (`Story`, API, route), sebutkan dokumen yang diperbarui.

## Review

- CODEOWNERS: `@justeita`, `@Gerraldd`. Minimal satu approval.
- Fokus review: kebenaran, penanganan error, aksesibilitas, test, dan dampak ke
  bagian lain.
- Jangan menyetujui PR yang menonaktifkan CI atau test.
- Komentar review harus spesifik; hindari "rapikan saja".
- **Merge memakai merge commit. Jangan squash, jangan rebase** — keduanya menulis
  ulang riwayat dan dilarang guidebook. Matikan opsi itu di Settings repo.

## Aturan khusus dokumen

- Perubahan schema cerita → wajib ADR + update
  [`../02-data-model/story-schema.md`](../02-data-model/story-schema.md) +
  fixture + validator.
- Perubahan route/API → update
  [`../05-frontend/routes.md`](../05-frontend/routes.md) atau
  [`../06-backend/api-contract.md`](../06-backend/api-contract.md).
- Perubahan perintah → update [`commands.md`](./commands.md).
- Perubahan dependency → update
  [`../01-architecture/tech-stack.md`](../01-architecture/tech-stack.md).

## Dependency

- Tambah dengan `bun add` / `bun add -d`.
- Commit `bun.lock`.
- Jangan menambah dependency untuk hal yang bisa ditulis < 50 baris.
- Dependency baru butuh alasan di PR (ukuran, lisensi, maintenance).

## Keamanan

- Jangan pernah commit nilai `.env`.
- Jangan menempelkan kunci di issue/PR/chat.
- Kalau kunci bocor: rotasi segera, lalu bersihkan riwayat bila perlu.
- Laporkan kerentanan lewat kanal privat di `SECURITY.md`, bukan issue publik.

## Rilis/demo

- Tag `demo-{tanggal}` untuk snapshot yang dipakai saat presentasi.
- Jangan deploy dari branch yang belum lolos CI.
