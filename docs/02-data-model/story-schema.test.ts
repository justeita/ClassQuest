import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

/**
 * Tes ini menjaga dua hal sekaligus:
 *
 * 1. `story.schema.json` benar-benar menerima cerita contoh dan menolak cerita
 *    yang melanggar aturan.
 * 2. Dokumen manusia (`story-schema.md`) dan file mesin tidak saling menjauh.
 *
 * Kalau tes ini gagal karena kamu baru menambah field, perbaiki keduanya:
 * `story-schema.md` dan `story.schema.json`. Jangan hanya salah satu.
 */

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const schema = JSON.parse(read("./story.schema.json"));
const example = JSON.parse(read("./story.example.json"));
const schemaDoc = read("./story-schema.md");
const inventoryDoc = read("../07-assets/inventory.md");

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

const errorsOf = (story: unknown) => {
  validate(story);
  return validate.errors ?? [];
};

const clone = <T>(value: T): T => structuredClone(value);

describe("story.schema.json", () => {
  it("menerima cerita contoh", () => {
    expect(errorsOf(example)).toEqual([]);
  });

  it("menolak cerita yang tidak punya penjelasan jawaban", () => {
    const broken = clone(example);
    delete broken.challenges[0].explanation;
    expect(errorsOf(broken).length).toBeGreaterThan(0);
  });

  it("menolak cerita dengan chapter terlalu sedikit", () => {
    const broken = clone(example);
    broken.chapters = broken.chapters.slice(0, 2);
    expect(errorsOf(broken).length).toBeGreaterThan(0);
  });

  it("menolak id aset yang bentuknya tidak dikenal", () => {
    const broken = clone(example);
    broken.cast[0].spriteId = "";
    expect(errorsOf(broken).length).toBeGreaterThan(0);
  });

  it("mengikuti daftar field di story-schema.md", () => {
    const block = schemaDoc.match(/type Story = \{([\s\S]*?)\n\};/);
    expect(block).not.toBeNull();

    const documented = [...block![1].matchAll(/^\s+(\w+)(\?)?:/gm)].map(
      (match) => ({ name: match[1], optional: match[2] === "?" }),
    );

    expect(Object.keys(schema.properties)).toEqual(
      documented.map((field) => field.name),
    );
    expect(schema.required).toEqual(
      documented.filter((field) => !field.optional).map((field) => field.name),
    );
  });

  it("memakai versi yang sama dengan judul dokumen", () => {
    const version = schemaDoc.match(/# Story Schema \(v([\d.]+)\)/)?.[1];
    expect(version).toBe(schema.properties.schemaVersion.const);
  });
});

/**
 * Kontradiksi yang paling sering lolos: dokumen manusia menulis angka batas yang
 * berbeda dari schema. Contoh nyatanya, `challenge-types.md` pernah menulis "item
 * ≤ 100 karakter" padahal schema memakai 120. Tes di bawah membandingkan angka
 * yang ditulis dokumen dengan angka asli di `story.schema.json`.
 */
describe("angka batas di dokumen sama dengan schema", () => {
  const limitsDoc = read("./validation-rules.md");

  const at = (path: string[]) =>
    path.reduce<Record<string, unknown>>(
      (node, key) => node[key] as Record<string, unknown>,
      schema as Record<string, unknown>,
    );

  const rows: { label: string; docField: string; pointer: string[] }[] = [
    {
      label: "beats[].text",
      docField: "beats[].text",
      pointer: ["$defs", "beat", "oneOf", "0", "properties", "text"],
    },
    {
      label: "meta.title",
      docField: "meta.title",
      pointer: ["$defs", "meta", "properties", "title"],
    },
    {
      label: "meta.synopsis",
      docField: "meta.synopsis",
      pointer: ["$defs", "meta", "properties", "synopsis"],
    },
    {
      label: "chapters[].summary",
      docField: "chapters[].summary",
      pointer: ["$defs", "chapter", "properties", "summary"],
    },
    {
      label: "challenges[].prompt",
      docField: "challenges[].prompt",
      pointer: ["$defs", "challengeBase", "properties", "prompt"],
    },
    {
      label: "challenges[].explanation",
      docField: "challenges[].explanation",
      pointer: ["$defs", "challengeBase", "properties", "explanation"],
    },
    {
      label: "options[].text",
      docField: "options[].text` / `items[].text",
      pointer: ["$defs", "option", "properties", "text"],
    },
  ];

  it.each(rows)(
    "$label cocok dengan tabel Batas teks",
    ({ docField, pointer }) => {
      const line = limitsDoc.split("\n").find((row) => row.includes(docField));
      expect(
        line,
        `baris "${docField}" tidak ada di validation-rules.md`,
      ).toBeTruthy();

      const documented = Number(line!.split("|").at(-2)?.trim());
      expect(documented).toBe(at(pointer).maxLength);
    },
  );

  it("orderingItem.text memakai angka yang sama di dokumen dan schema", () => {
    const challengeTypes = read("./challenge-types.md");
    const documented = Number(
      challengeTypes.match(/Tiap item ≤ (\d+) karakter/)?.[1],
    );
    expect(documented).toBe(
      at(["$defs", "orderingItem", "properties", "text"]).maxLength,
    );
  });

  it("acceptedAnswers[].maxLength sama di dokumen dan schema", () => {
    const documented = Number(
      limitsDoc
        .split("\n")
        .find((row) => row.includes("acceptedAnswers[]"))!
        .split("|")
        .at(-2)
        ?.trim(),
    );
    expect(documented).toBe(
      at(["$defs", "shortAnswer", "properties", "acceptedAnswers", "items"])
        .maxLength,
    );
  });

  it("hints[].maxLength sama di dokumen dan schema", () => {
    const documented = Number(
      limitsDoc
        .split("\n")
        .find((row) => row.includes("hints[]"))!
        .split("|")
        .at(-2)
        ?.trim(),
    );
    expect(documented).toBe(
      at(["$defs", "challengeBase", "properties", "hints", "items"]).maxLength,
    );
  });
});

describe("aset di cerita contoh", () => {
  const inventoryIds = new Set(
    [...inventoryDoc.matchAll(/`((?:bg|char|bgm|sfx|ui)_[a-z0-9_]+)`/g)].map(
      (match) => match[1],
    ),
  );

  const usedIds = new Set<string>([
    ...example.cast.map(
      (character: { spriteId: string }) => character.spriteId,
    ),
    ...example.chapters.flatMap(
      (chapter: {
        backgroundId: string;
        musicId: string;
        scenes: { backgroundId?: string; musicId?: string }[];
      }) => [
        chapter.backgroundId,
        chapter.musicId,
        ...chapter.scenes.flatMap((scene) =>
          [scene.backgroundId, scene.musicId].filter((id): id is string =>
            Boolean(id),
          ),
        ),
      ],
    ),
    ...example.assetUsage.backgrounds,
    ...example.assetUsage.music,
    ...example.assetUsage.sprites,
  ]);

  it("semua id aset yang dipakai ada di inventory", () => {
    const missing = [...usedIds].filter((id) => !inventoryIds.has(id));
    expect(missing).toEqual([]);
  });

  it("assetUsage sama dengan aset yang benar-benar dipakai", () => {
    const backgrounds = new Set<string>();
    const music = new Set<string>();

    for (const chapter of example.chapters) {
      backgrounds.add(chapter.backgroundId);
      music.add(chapter.musicId);
      for (const scene of chapter.scenes) {
        if (scene.backgroundId) backgrounds.add(scene.backgroundId);
        if (scene.musicId) music.add(scene.musicId);
      }
    }

    const sprites = new Set<string>(
      example.cast.map((character: { spriteId: string }) => character.spriteId),
    );

    const sorted = (values: Iterable<string>) => [...values].sort();

    expect(sorted(example.assetUsage.backgrounds)).toEqual(sorted(backgrounds));
    expect(sorted(example.assetUsage.music)).toEqual(sorted(music));
    expect(sorted(example.assetUsage.sprites)).toEqual(sorted(sprites));
  });

  it("setiap konsep di source dipakai minimal satu chapter", () => {
    const used = new Set(
      example.chapters.map((chapter: { concept: string }) => chapter.concept),
    );
    const unused = example.source.concepts.filter(
      (concept: string) => !used.has(concept),
    );
    expect(unused).toEqual([]);
  });

  it("setiap tantangan dipakai tepat satu kali", () => {
    const refs = example.chapters.flatMap(
      (chapter: {
        scenes: { beats: { type: string; challengeId?: string }[] }[];
      }) =>
        chapter.scenes.flatMap((scene) =>
          scene.beats
            .filter((beat) => beat.type === "challenge")
            .map((beat) => beat.challengeId),
        ),
    );

    const declared = example.challenges.map(
      (challenge: { id: string }) => challenge.id,
    );

    expect([...refs].sort()).toEqual([...declared].sort());
  });
});
