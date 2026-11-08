import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tes kepatuhan aturan LOGICODIX 2026.
 *
 * Yang dicek di sini hanya aturan yang bisa diperiksa mesin. Aturan yang butuh
 * penilaian manusia (orisinalitas ide, isi README, isi video) tetap dicek manual
 * lewat checklist di folder ini.
 *
 * Kalau tes ini gagal, jangan mencari cara mematikannya — perbaiki penyebabnya.
 *
 * Pemeriksaan riwayat git butuh clone penuh. Di CI dengan `fetch-depth: 1`
 * bagian itu otomatis dilewati, bukan gagal.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");

/**
 * Repo ini dimulai dari nol, jadi seluruh riwayatnya diperiksa. Tidak ada commit
 * lama yang perlu dikecualikan.
 */
const BASELINE = "";

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: REPO, encoding: "utf8" });

const hasHistory = (() => {
  try {
    git("rev-parse", "--verify", "HEAD");
    return true;
  } catch {
    return false;
  }
})();

const tracked = (() => {
  try {
    return git("ls-files")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
})();

const TEXT = /\.(md|json|ts|tsx|js|mjs|cjs|yml|yaml|txt|css|svg|html|example)$/;
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

describe("kredensial (halaman 15)", () => {
  const SECRETS: Array<[string, RegExp]> = [
    ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY/],
    ["GitHub token", /\bghp_[A-Za-z0-9]{36}\b/],
    ["GitHub token (fine-grained)", /\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
    ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
    ["API key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
    ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
    [
      "connection string dengan password",
      /\b(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^:\s]+:[^@\s]+@/,
    ],
  ];

  it("tidak ada file .env yang ter-commit", () => {
    const leaked = tracked.filter(
      (path) =>
        /(^|\/)\.env($|\.)/.test(path) && !path.endsWith(".env.example"),
    );
    expect(leaked).toEqual([]);
  });

  it("tidak ada kredensial di file yang ter-commit", () => {
    const found: string[] = [];

    for (const path of tracked.filter((path) => TEXT.test(path))) {
      const content = read(path);
      for (const [label, pattern] of SECRETS) {
        if (pattern.test(content)) found.push(`${path}: ${label}`);
      }
    }

    expect(found).toEqual([]);
  });

  it(".gitignore mengabaikan .env tapi menyimpan .env.example", () => {
    const ignore = read(".gitignore");
    expect(ignore).toMatch(/^\.env\*$/m);
    expect(ignore).toMatch(/^!\.env\.example$/m);
  });

  it(".env.example tidak memuat nilai asli", () => {
    const SAFE = new Set(["mock", "60000", "true", "false", "3000", "0", "1"]);

    const suspicious = read(".env.example")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("="))
      .filter(([key, value]) => key && value?.trim())
      .filter(([, value]) => !SAFE.has(value.trim()))
      .map(([key, value]) => `${key.trim()}=${value.trim()}`);

    expect(suspicious).toEqual([]);
  });

  it("tidak memakai NEXT_PUBLIC_ untuk nilai rahasia", () => {
    const suspicious = tracked
      .filter((path) => TEXT.test(path))
      .flatMap((path) =>
        [
          ...read(path).matchAll(
            /NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)/g,
          ),
        ].map((match) => `${path}: ${match[0]}`),
      );

    expect(suspicious).toEqual([]);
  });

  it.skipIf(!hasHistory)("tidak ada kredensial di riwayat commit", () => {
    const history = git("log", "-p", "--all");
    const found = SECRETS.filter(([, pattern]) => pattern.test(history)).map(
      ([label]) => label,
    );

    expect(found).toEqual([]);
  });
});

describe("riwayat commit (halaman 15-16)", () => {
  const PREFIX =
    /^(feat|fix|docs|style|refactor|chore)(\([a-z0-9._-]+\))?!?: .+/;
  const MERGE = /^Merge (pull request|branch) /;
  const BANNED =
    /^(update|test|final|wip|fixup|asdf|minor|changes?|perbaikan)\.?$/i;

  const commits = (() => {
    if (!hasHistory) return [];
    return git(
      "log",
      `${BASELINE ? `${BASELINE}..` : ""}HEAD`,
      "--format=%h\x1f%an\x1f%ae\x1f%s",
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, name, email, subject] = line.split("\x1f");
        return { hash, name, email, subject };
      });
  })();

  it.skipIf(!hasHistory)("setiap commit baru memakai awalan resmi", () => {
    const wrong = commits
      .filter((c) => !MERGE.test(c.subject) && !PREFIX.test(c.subject))
      .map((c) => `${c.hash} "${c.subject}"`);

    expect(wrong).toEqual([]);
  });

  it.skipIf(!hasHistory)("tidak ada pesan commit yang kabur", () => {
    const wrong = commits
      .filter((c) => BANNED.test(c.subject.trim()))
      .map((c) => `${c.hash} "${c.subject}"`);

    expect(wrong).toEqual([]);
  });

  it.skipIf(!hasHistory)("tidak ada commit dari akun bot", () => {
    const bot = /(\[bot\]|dependabot|renovate|github-actions)/i;
    const wrong = commits
      .filter((c) => bot.test(c.name) || bot.test(c.email))
      .map((c) => `${c.hash} ${c.name} <${c.email}>`);

    expect(wrong).toEqual([]);
  });

  it.skipIf(!hasHistory)(
    "tidak ada commit berisi seluruh proyek sekaligus",
    () => {
      const wrong = commits.flatMap((c) => {
        const lines = git("show", "--numstat", "--format=", c.hash)
          .split("\n")
          .filter(Boolean);

        const files = lines.length;
        const added = lines.reduce(
          (sum, line) => sum + (Number.parseInt(line.split("\t")[0], 10) || 0),
          0,
        );

        // Satu commit yang menambah puluhan file sekaligus hampir selalu berarti
        // seluruh proyek diunggah dalam satu langkah.
        return files > 40 && added > 2000
          ? [`${c.hash}: ${files} file, ${added} baris`]
          : [];
      });

      expect(wrong).toEqual([]);
    },
  );
});

describe("kebersihan repositori", () => {
  it("hanya memakai satu lockfile: bun.lock", () => {
    const other = tracked.filter((path) =>
      /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(path),
    );

    expect(other).toEqual([]);
    expect(tracked).toContain("bun.lock");
  });

  it("tidak ada dependency, build, atau catatan editor yang ter-commit", () => {
    const junk = tracked.filter((path) =>
      /(^|\/)(node_modules|\.next|out|coverage|\.obsidian|\.idea|\.vscode)\//.test(
        path,
      ),
    );

    expect(junk).toEqual([]);
  });

  it("tidak ada berkas besar yang tidak disengaja", () => {
    const LIMIT = 5 * 1024 * 1024;
    const big = tracked
      .filter((path) => existsSync(resolve(REPO, path)))
      .filter((path) => statSync(resolve(REPO, path)).size > LIMIT);

    expect(big).toEqual([]);
  });

  it("README ada di direktori utama (halaman 19-20)", () => {
    expect(tracked).toContain("README.md");
  });
});

describe("dokumen aturan tidak boleh hilang", () => {
  const REQUIRED = [
    "README.md",
    "01-ringkasan-guidebook.md",
    "02-ketentuan-peserta-dan-karya.md",
    "03-jadwal-dan-code-freeze.md",
    "04-orisinalitas-dan-riwayat-repo.md",
    "05-aturan-commit-dan-git.md",
    "06-keamanan-kredensial.md",
    "07-readme-wajib.md",
    "08-video-demo.md",
    "09-deploy-dan-akses-juri.md",
    "10-surat-pernyataan.md",
    "11-submission-checklist.md",
    "12-rubrik-penilaian.md",
    "13-pelanggaran-dan-sanksi.md",
    "14-ai-dan-atribusi.md",
    "15-babak-final.md",
  ];

  it("semua dokumen aturan ada", () => {
    const missing = REQUIRED.filter((file) => !existsSync(resolve(HERE, file)));
    expect(missing).toEqual([]);
  });

  it("setiap dokumen menyebut halaman guidebook sebagai rujukan", () => {
    const withoutPages = REQUIRED.filter((file) => file !== "README.md").filter(
      (file) => !/halaman \d/i.test(read(resolve(HERE, file))),
    );

    expect(withoutPages).toEqual([]);
  });
});
