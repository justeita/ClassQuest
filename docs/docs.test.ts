import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tes ini menjaga kerapian folder `docs/`.
 *
 * Yang diperiksa:
 * 1. Setiap file punya kepala dokumen (front-matter) yang lengkap dan masuk akal.
 * 2. Tidak ada tautan relatif yang rusak.
 * 3. Tabel "Daftar semua dokumen" di `docs/README.md` benar-benar memuat
 *    semua file, dengan status yang sama seperti isi file.
 * 4. Tabel status kode di `docs/01-architecture/repo-structure.md` tidak bohong:
 *    yang ditandai "ya" memang ada, yang ditandai "rencana" memang belum ada.
 *
 * Kalau kamu menambah atau menghapus dokumen, tes ini akan mengingatkan sampai
 * indeksnya ikut diperbarui.
 */

const DOCS = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(DOCS, "..");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".md") ? [path] : [];
  });

const files = walk(DOCS).sort();
const relativePath = (path: string) =>
  relative(DOCS, path).split(sep).join("/");

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

type Meta = { status?: string; owner?: string; last_reviewed?: string };

const metaOf = (path: string): Meta => {
  const raw = readFileSync(path, "utf8");
  const block = raw.match(FRONT_MATTER)?.[1] ?? "";
  const meta: Meta = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === "status" || key === "owner" || key === "last_reviewed") {
      meta[key] = value.trim();
    }
  }
  return meta;
};

const stripFences = (text: string) =>
  text.replace(/^```[\s\S]*?^```$/gm, "").replace(/`[^`\n]*`/g, "");

describe("kepala dokumen", () => {
  it("tidak ada file yang lupa diberi kepala dokumen", () => {
    const missing = files.filter(
      (path) => !FRONT_MATTER.test(readFileSync(path, "utf8")),
    );
    expect(missing.map(relativePath)).toEqual([]);
  });

  it("status hanya stable, draft, atau tbd", () => {
    const wrong = files
      .map((path) => [relativePath(path), metaOf(path).status] as const)
      .filter(
        ([, status]) => !["stable", "draft", "tbd"].includes(status ?? ""),
      );
    expect(wrong).toEqual([]);
  });

  it("owner dan last_reviewed selalu diisi dengan benar", () => {
    const today = new Date();
    const wrong = files.flatMap((path) => {
      const { owner, last_reviewed } = metaOf(path);
      const problems: string[] = [];
      if (!owner) problems.push(`${relativePath(path)}: owner kosong`);
      if (!last_reviewed || !/^\d{4}-\d{2}-\d{2}$/.test(last_reviewed)) {
        problems.push(`${relativePath(path)}: last_reviewed bukan YYYY-MM-DD`);
      } else if (new Date(`${last_reviewed}T00:00:00Z`) > today) {
        problems.push(`${relativePath(path)}: last_reviewed di masa depan`);
      }
      return problems;
    });
    expect(wrong).toEqual([]);
  });

  /**
   * Tanggal yang tidak pernah diperbarui sama saja dengan tidak ada tanggal.
   * Dokumen `stable` dipakai sebagai acuan kerja, jadi umurnya dibatasi lebih
   * ketat daripada `draft`/`tbd`.
   *
   * Kalau tes ini gagal, jangan ubah tanggalnya tanpa membaca ulang isinya.
   * Periksa apakah dokumen itu masih sesuai kode, perbaiki kalau perlu, baru
   * perbarui `last_reviewed`.
   */
  it("tidak ada dokumen yang terlalu lama tidak dicek", () => {
    const today = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const MAX_AGE: Record<string, number> = {
      stable: 180,
      draft: 365,
      tbd: 365,
    };

    const stale = files
      .map((path) => ({ path: relativePath(path), ...metaOf(path) }))
      .filter((doc) => {
        if (!doc.last_reviewed || !doc.status) return false;
        const age =
          (today - new Date(`${doc.last_reviewed}T00:00:00Z`).getTime()) / DAY;
        return age > (MAX_AGE[doc.status] ?? 365);
      })
      .map(
        (doc) =>
          `${doc.path}: status ${doc.status}, terakhir dicek ${doc.last_reviewed}`,
      );

    expect(stale).toEqual([]);
  });
});

describe("tautan", () => {
  it("tidak ada tautan relatif yang rusak", () => {
    const broken: string[] = [];

    for (const path of files) {
      const text = stripFences(readFileSync(path, "utf8"));
      for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = match[1];
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const clean = target.split("#")[0].split("?")[0];
        if (!clean) continue;
        const resolved = resolve(dirname(path), clean);
        if (!existsSync(resolved)) {
          broken.push(`${relativePath(path)} → ${target}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });
});

describe("indeks dokumen di docs/README.md", () => {
  const readme = readFileSync(join(DOCS, "README.md"), "utf8");
  const block = readme.match(
    /<!-- docs-index:start -->([\s\S]*?)<!-- docs-index:end -->/,
  )?.[1];

  type Row = { path: string; status: string };

  const rows: Row[] =
    block === undefined
      ? []
      : [...block.matchAll(/^\|\s*\[[^\]]*\]\(([^)]+)\)\s*\|\s*(\w+)\s*\|/gm)]
          .map((match) => ({
            path: match[1].replace(/^\.\//, ""),
            status: match[2],
          }))
          .filter((row) => row.path.endsWith(".md"));

  it("blok indeks ada di README", () => {
    expect(
      block,
      "tambahkan penanda <!-- docs-index:start/end -->",
    ).toBeDefined();
  });

  it("setiap dokumen muncul tepat satu kali", () => {
    const listed = rows.map((row) => row.path);
    expect([...new Set(listed)].sort()).toEqual(files.map(relativePath).sort());
    expect(listed.length).toBe(new Set(listed).size);
  });

  it("status di indeks sama dengan status di dalam file", () => {
    const wrong = rows
      .filter((row) => {
        const meta = metaOf(join(DOCS, row.path));
        return meta.status !== row.status;
      })
      .map((row) => `${row.path}: indeks "${row.status}"`);
    expect(wrong).toEqual([]);
  });
});

describe("diagram Mermaid", () => {
  const files = walk(DOCS);

  type Block = { file: string; index: number; text: string };

  const blocks: Block[] = files.flatMap((path) =>
    [
      ...readFileSync(path, "utf8").matchAll(/^```mermaid\n([\s\S]*?)^```$/gm),
    ].map((match, index) => ({
      file: relativePath(path),
      index,
      text: match[1],
    })),
  );

  it("setiap blok dimulai dengan jenis diagram yang dikenal", () => {
    const allowed =
      /^(flowchart|graph|sequenceDiagram|stateDiagram-v2|erDiagram|classDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|xychart)\b/;

    const broken = blocks
      .filter((block) => {
        const first = block.text
          .split("\n")
          .map((line) => line.trim())
          .find(Boolean);
        return !first || !allowed.test(first);
      })
      .map((block) => `${block.file} (blok ${block.index + 1})`);

    expect(broken).toEqual([]);
  });

  it("tidak ada gambar ASCII yang nyasar ke dalam blok Mermaid", () => {
    const art = /[│┌└├┬┴┼─]/;

    const wrong = blocks
      .filter((block) => art.test(block.text))
      .map((block) => `${block.file} (blok ${block.index + 1})`);

    expect(wrong).toEqual([]);
  });

  it("tanda kutip di setiap blok berpasangan", () => {
    const wrong = blocks
      .filter((block) => (block.text.match(/"/g) ?? []).length % 2 !== 0)
      .map((block) => `${block.file} (blok ${block.index + 1})`);

    expect(wrong).toEqual([]);
  });
});

describe("indeks ADR", () => {
  const adrDir = join(DOCS, "09-decisions");
  const adrReadme = readFileSync(join(adrDir, "README.md"), "utf8");

  const adrFiles = readdirSync(adrDir)
    .filter((file) => /^\d{4}-.+\.md$/.test(file))
    .sort();

  const listed = [...adrReadme.matchAll(/^\|\s*(\d{4})\s*\|/gm)].map(
    (match) => match[1],
  );

  it("setiap ADR terdaftar di tabel README", () => {
    const files = adrFiles.map((file) => file.slice(0, 4));
    expect(listed).toEqual(files);
  });

  it("status di tabel README sama dengan status di dalam ADR", () => {
    const STATUSES = ["proposed", "accepted", "superseded", "rejected"];
    // "Proposed (belum diputuskan)" dan "**Proposed**" dianggap sama: yang
    // dibandingkan kata statusnya saja, bukan keterangannya.
    const normalize = (value: string) =>
      value
        .replace(/\*/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .split(/[\s(]/)[0];

    const wrong = adrFiles.flatMap((file) => {
      const text = readFileSync(join(adrDir, file), "utf8");
      const number = file.slice(0, 4);
      const inFile = text.match(/^- \*\*Status:\*\*\s*(.+)$/m)?.[1]?.trim();
      const row = adrReadme
        .split("\n")
        .find((line) => line.startsWith(`| ${number} `));

      if (!inFile || !row) return [`${file}: tidak ada status`];

      const fromFile = normalize(inFile);
      const fromRow = normalize(row.split("|")[3] ?? "");

      const problems: string[] = [];
      if (!STATUSES.includes(fromFile)) {
        problems.push(`${file}: status "${inFile}" tidak dikenal`);
      }
      if (fromFile !== fromRow) {
        problems.push(
          `${file}: isi "${inFile}", tabel "${row.split("|")[3]?.trim()}"`,
        );
      }
      return problems;
    });

    expect(wrong).toEqual([]);
  });
});

describe("status kode di repo-structure.md", () => {
  const doc = readFileSync(
    join(DOCS, "01-architecture/repo-structure.md"),
    "utf8",
  );

  const claims = [...doc.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(ya|rencana)\s*\|/gm)]
    .map((match) => ({ path: match[1], exists: match[2] === "ya" }))
    .filter((claim) => claim.path.includes("/"));

  it("tabel status kode terisi", () => {
    expect(claims.length).toBeGreaterThan(5);
  });

  it("klaim 'ya' dan 'rencana' sesuai isi folder src/", () => {
    const wrong = claims
      .filter((claim) => existsSync(join(REPO, claim.path)) !== claim.exists)
      .map(
        (claim) =>
          `${claim.path}: ditulis "${claim.exists ? "ya" : "rencana"}", kenyataannya ${existsSync(join(REPO, claim.path)) ? "ada" : "belum ada"}`,
      );
    expect(wrong).toEqual([]);
  });
});
