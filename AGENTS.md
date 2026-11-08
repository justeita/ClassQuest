<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ClassQuest — agent entry point

Baca ini sebelum mengubah repo:

1. [docs/README.md](docs/README.md) — peta dokumentasi dan kondisi kode.
2. [docs/08-workflow/ai-agent-rules.md](docs/08-workflow/ai-agent-rules.md) —
   aturan kerja lengkap (MUST / MUST NOT, protokol perubahan, definition of done).
3. [docs/11-logicodix/README.md](docs/11-logicodix/README.md) — aturan kompetisi
   yang mengikat, termasuk larangan menulis ulang riwayat git.

Verifikasi dengan `bun run check` dan `bun run build` sebelum menyatakan selesai.
