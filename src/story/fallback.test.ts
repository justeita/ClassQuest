import { describe, expect, it } from "vitest";

import { toAssetManifest } from "../assets/manifest";
import { FIXED_CAST } from "./cast";
import { buildFallbackStory, type FallbackStoryInput } from "./fallback";
import { type AssetManifest, validateStory } from "./validate";

/**
 * Kontrak fallback: `docs/03-ai-pipeline/validation-and-repair.md` (bagian
 * Fallback) dan `docs/03-ai-pipeline/pipeline.md` (bagian Fallback).
 *
 * Fallback adalah jaring pengaman: dipakai saat model gagal, timeout, atau
 * anggaran habis. Karena itu test di sini menekankan tiga hal — selalu valid,
 * selalu deterministik, dan tidak pernah melempar.
 */

/** Semua id dari manifest asli (`src/assets/manifest.ts`). */
const INVENTORY: AssetManifest = toAssetManifest();

const INVENTORY_IDS = new Set(INVENTORY.map((asset) => asset.id));

const CONCEPTS = ["Evaporasi", "Kondensasi", "Infiltrasi"];

const build = (input: FallbackStoryInput = {}) => buildFallbackStory(input);

/** Validasi seperti pipeline: manifest lengkap, `pageCount` dari cerita. */
const check = (input: FallbackStoryInput = {}) => {
  const story = build(input);
  return {
    story,
    result: validateStory(story, {
      manifest: INVENTORY,
      pageCount: story.source.pageCount,
    }),
  };
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
};

const assetIdsUsed = (
  story: ReturnType<typeof build>,
): { id: string; where: string }[] => {
  const used: { id: string; where: string }[] = [];

  story.cast.forEach((character, index) => {
    used.push({ id: character.spriteId, where: `cast[${index}].spriteId` });
  });
  story.chapters.forEach((chapter, index) => {
    used.push({
      id: chapter.backgroundId,
      where: `chapters[${index}].backgroundId`,
    });
    used.push({ id: chapter.musicId, where: `chapters[${index}].musicId` });
    chapter.scenes.forEach((scene, sceneIndex) => {
      if (scene.backgroundId) {
        used.push({
          id: scene.backgroundId,
          where: `chapters[${index}].scenes[${sceneIndex}].backgroundId`,
        });
      }
      if (scene.musicId) {
        used.push({
          id: scene.musicId,
          where: `chapters[${index}].scenes[${sceneIndex}].musicId`,
        });
      }
    });
  });

  return used;
};

describe("cerita cadangan lolos validator", () => {
  it("tidak punya error dan tidak punya warning", () => {
    const { result } = check({ concepts: CONCEPTS });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.story).not.toBeNull();
  });

  it("hasil builder sudah ternormalisasi, jadi validator tidak mengubahnya", () => {
    const { story, result } = check({ concepts: CONCEPTS });

    expect(result.story).toEqual(story);
  });

  it("tetap valid tanpa input sama sekali", () => {
    const { result } = check();

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("memakai satu manifest berisi hanya aset yang dipakainya sendiri", () => {
    const story = build({ concepts: CONCEPTS });
    const used = [...new Set(assetIdsUsed(story).map((asset) => asset.id))];
    const manifest: AssetManifest = used.map((id) => ({
      id,
      kind: id.startsWith("bg_")
        ? "background"
        : id.startsWith("char_")
          ? "character"
          : "music",
    }));

    const result = validateStory(story, { manifest });

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("hanya memakai id aset dari inventory", () => {
    const story = build({ concepts: CONCEPTS });

    for (const asset of assetIdsUsed(story)) {
      expect(INVENTORY_IDS.has(asset.id), `${asset.where} → ${asset.id}`).toBe(
        true,
      );
    }
  });

  it("mencantumkan aset yang dipakai di assetUsage", () => {
    const { story } = check({ concepts: CONCEPTS });
    const used = assetIdsUsed(story);

    expect(story.assetUsage.backgrounds).toEqual(
      [
        ...new Set(used.filter((a) => a.id.startsWith("bg_")).map((a) => a.id)),
      ].sort(),
    );
    expect(story.assetUsage.music).toEqual(
      [
        ...new Set(
          used.filter((a) => a.id.startsWith("bgm_")).map((a) => a.id),
        ),
      ].sort(),
    );
    expect(story.assetUsage.sprites).toEqual(
      [
        ...new Set(
          used.filter((a) => a.id.startsWith("char_")).map((a) => a.id),
        ),
      ].sort(),
    );
  });
});

describe("bentuk cerita cadangan", () => {
  it("punya minimal tiga chapter dan satu konsep per chapter", () => {
    const { story } = check({ concepts: CONCEPTS });

    expect(story.chapters.length).toBeGreaterThanOrEqual(3);
    for (const chapter of story.chapters) {
      expect(story.source.concepts).toContain(chapter.concept);
    }
  });

  it("menyebut konsep dari materi, bukan konsep karangan", () => {
    const { story } = check({ concepts: CONCEPTS });

    expect(story.source.concepts).toEqual(CONCEPTS);
    expect(story.chapters.map((chapter) => chapter.concept)).toEqual(CONCEPTS);
  });

  it("memberi setiap scene tantangannya sendiri", () => {
    const { story } = check({ concepts: CONCEPTS });

    for (const chapter of story.chapters) {
      const refs = chapter.scenes.flatMap((scene) =>
        scene.beats.filter((beat) => beat.type === "challenge"),
      );

      // Dua scene, dua tantangan: `W_NO_CHALLENGE_IN_SCENE` tidak boleh muncul
      // di cerita cadangan yang guru tidak minta.
      expect(refs).toHaveLength(2);
    }

    const allRefs = story.chapters.flatMap((chapter) =>
      chapter.scenes.flatMap((scene) =>
        scene.beats.flatMap((beat) =>
          beat.type === "challenge" ? [beat.challengeId] : [],
        ),
      ),
    );
    expect(new Set(allRefs).size).toBe(allRefs.length);
    expect(new Set(allRefs)).toEqual(
      new Set(story.challenges.map((challenge) => challenge.id)),
    );
  });

  it("menyebar dialog ke beberapa NPC, bukan hanya mentor", () => {
    const { story } = check({ concepts: CONCEPTS });
    const playerId = story.cast.find((c) => c.role === "player")?.id;
    const semua = new Set<string>();

    for (const chapter of story.chapters) {
      const pembicara = new Set<string>();

      for (const scene of chapter.scenes) {
        for (const beat of scene.beats) {
          const kandidat =
            beat.type === "dialogue"
              ? [beat]
              : beat.type === "challenge"
                ? (beat.onWrong?.detour ?? [])
                : [];

          for (const dialog of kandidat) {
            if (dialog.type !== "dialogue") continue;
            if (dialog.speakerId === playerId) continue;
            pembicara.add(dialog.speakerId);
            semua.add(dialog.speakerId);
          }
        }
      }

      // Mentor + dua pendamping; cukup untuk menghindari `W_SINGLE_SPEAKER`.
      expect(pembicara.size).toBeGreaterThanOrEqual(2);
    }

    // Bergiliran antar chapter: cerita tiga chapter memakai minimal empat NPC.
    expect(semua.size).toBeGreaterThanOrEqual(4);
  });

  it("memakai tepat satu player dan minimal satu mentor", () => {
    const { story } = check({ concepts: CONCEPTS });

    expect(story.cast.filter((c) => c.role === "player")).toHaveLength(1);
    expect(story.cast.some((c) => c.role === "mentor")).toBe(true);
  });

  it("menyeimbangkan tingkat kesulitan, bukan menumpuk di satu level", () => {
    const { story } = check({ concepts: CONCEPTS });

    expect(new Set(story.challenges.map((c) => c.difficulty))).toEqual(
      new Set([1, 2, 3]),
    );
  });

  it("tidak mengarang fakta: teks hanya menyebut nama konsep", () => {
    const { story } = check({ concepts: CONCEPTS });
    const text = JSON.stringify(story);

    // Tidak ada jejak file asli yang bisa disalahartikan sebagai fakta materi.
    expect(text).not.toContain("siklus-air.pdf");
    expect(text).not.toMatch(/\b\d{4}\b/);
  });

  it("bercerita di desa, bukan di kelas atau gedung sekolah", () => {
    const { story } = check({ concepts: CONCEPTS });
    const text = JSON.stringify(story).toLowerCase();

    for (const asing of [
      "kelas",
      "sekolah",
      "papan tulis",
      "bel berbunyi",
      "papan piket",
    ]) {
      expect(text, asing).not.toContain(asing);
    }
  });
});

describe("mode permainan di cerita cadangan (ADR 0028)", () => {
  it("menulis mode ke meta dan menghormati bentuknya", () => {
    const quiz = check({ concepts: CONCEPTS, meta: { mode: "pertanyaan" } });
    const mix = check({ concepts: CONCEPTS, meta: { mode: "mix" } });

    expect(quiz.result.ok).toBe(true);
    expect(mix.result.ok).toBe(true);
    expect(quiz.story.meta.mode).toBe("pertanyaan");
    expect(mix.story.meta.mode).toBe("mix");
  });

  it("mode pertanyaan memakai tepat tiga chapter dan tiga tantangan per chapter", () => {
    const { story } = check({
      concepts: ["Satu", "Dua", "Tiga", "Empat", "Lima"],
      meta: { mode: "pertanyaan" },
    });

    expect(story.chapters).toHaveLength(3);
    for (const chapter of story.chapters) {
      const refs = chapter.scenes.flatMap((scene) =>
        scene.beats.filter((beat) => beat.type === "challenge"),
      );
      expect(refs).toHaveLength(3);
    }
    expect(story.challenges).toHaveLength(9);
  });

  it("mode mix membuat cerita lebih panjang daripada mode pertanyaan", () => {
    const quiz = check({ concepts: CONCEPTS, meta: { mode: "pertanyaan" } });
    const mix = check({ concepts: CONCEPTS, meta: { mode: "mix" } });

    expect(mix.story.chapters.length).toBeGreaterThan(
      quiz.story.chapters.length,
    );
    expect(mix.story.chapters.length).toBeGreaterThanOrEqual(4);
  });

  it("mode menjelaskan tetap dua tantangan per chapter", () => {
    const { story } = check({
      concepts: CONCEPTS,
      meta: { mode: "menjelaskan" },
    });

    for (const chapter of story.chapters) {
      const refs = chapter.scenes.flatMap((scene) =>
        scene.beats.filter((beat) => beat.type === "challenge"),
      );
      expect(refs).toHaveLength(2);
    }
  });

  it("tanpa mode, meta tidak punya field mode", () => {
    const { story } = check({ concepts: CONCEPTS });

    expect(story.meta.mode).toBeUndefined();
  });
});

describe("percabangan cerita cadangan", () => {
  /** Semua beat `challenge` dari seluruh scene, dengan tipe yang menyempit. */
  const challengeBeats = (story: ReturnType<typeof build>) =>
    story.chapters.flatMap((chapter) =>
      chapter.scenes.flatMap((scene) =>
        scene.beats.filter(
          (beat): beat is Extract<typeof beat, { type: "challenge" }> =>
            beat.type === "challenge",
        ),
      ),
    );

  it("mendeklarasikan paling banyak dua flag flg_* dan tetap valid", () => {
    const { story, result } = check({ concepts: CONCEPTS });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);

    const flags = story.flags ?? [];
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.length).toBeLessThanOrEqual(2);
    for (const flag of flags) {
      expect(flag.id).toMatch(/^flg_[a-z0-9_]+$/);
      expect(flag.default).toBe(false);
    }
  });

  it("memberi minimal satu onWrong pada tantangan chapter pertama", () => {
    const { story } = check({ concepts: CONCEPTS });
    const withOnWrong = challengeBeats(story).filter((beat) => beat.onWrong);

    // Syarat task: fallback harus memuat minimal satu onWrong supaya fitur
    // bercabang bisa didemokan tanpa AI.
    expect(withOnWrong.length).toBeGreaterThanOrEqual(1);

    for (const beat of withOnWrong) {
      expect(beat.maxAttempts).toBe(2);
      expect(beat.onWrong?.retryQuestions).toHaveLength(1);
      expect(beat.onWrong?.retryQuestions?.[0]?.length ?? 0).toBeGreaterThan(0);

      const detour = beat.onWrong?.detour ?? [];
      expect(detour.length).toBeGreaterThanOrEqual(1);
      expect(detour.length).toBeLessThanOrEqual(2);
    }
  });

  it("menyalakan flag yang dideklarasikan lewat setFlags", () => {
    const { story } = check({ concepts: CONCEPTS });
    const declared = new Set((story.flags ?? []).map((flag) => flag.id));

    for (const beat of challengeBeats(story)) {
      for (const flagId of Object.keys(beat.onWrong?.setFlags ?? {})) {
        expect(declared.has(flagId), flagId).toBe(true);
      }
    }
  });

  it("memakai textVariants yang bereaksi pada flag terdeklarasi", () => {
    const { story } = check({ concepts: CONCEPTS });
    const declared = new Set((story.flags ?? []).map((flag) => flag.id));
    const used = new Set<string>();

    for (const chapter of story.chapters) {
      for (const scene of chapter.scenes) {
        for (const beat of scene.beats) {
          if (beat.type !== "dialogue") continue;
          for (const variant of beat.textVariants ?? []) {
            if ("flag" in variant.when) used.add(variant.when.flag);
          }
        }
      }
    }

    expect(used.size).toBeGreaterThan(0);
    for (const flagId of used) expect(declared.has(flagId), flagId).toBe(true);
  });

  it("detour hanya memakai speaker yang sudah ada di cast", () => {
    const { story } = check({ concepts: CONCEPTS });
    const speakerIds = new Set(story.cast.map((character) => character.id));

    for (const beat of challengeBeats(story)) {
      for (const detourBeat of beat.onWrong?.detour ?? []) {
        if (detourBeat.type !== "dialogue") continue;
        expect(speakerIds.has(detourBeat.speakerId), detourBeat.speakerId).toBe(
          true,
        );
      }
    }
  });
});

describe("determinisme dan kemurnian", () => {
  it("dua panggilan dengan input sama menghasilkan cerita yang sama", () => {
    const input: FallbackStoryInput = {
      meta: { title: "Siklus Air", subject: "IPA", fileName: "siklus-air.pdf" },
      concepts: CONCEPTS,
      castSeed: [
        { id: "char_nara", name: "Kael", role: "player" },
        { id: "char_pak_bima", name: "Pak Bima", role: "mentor" },
      ],
      reason: "timeout",
    };

    expect(build(input)).toEqual(build(input));
  });

  it("input yang berbeda tetap menghasilkan id yang berbeda", () => {
    const first = build({ concepts: ["Evaporasi"] });
    const second = build({ concepts: ["Kondensasi"] });

    expect(first.meta.id).not.toBe(second.meta.id);
  });

  it("tidak mengubah input sama sekali", () => {
    const input = deepFreeze({
      meta: { title: "Siklus Air", pageCount: 6 },
      concepts: [...CONCEPTS],
      castSeed: [
        { id: "char_nara", name: "Kael", role: "player" },
        { id: "char_pak_bima", name: "Pak Bima", role: "mentor" },
      ],
      reason: "anggaran habis",
    });
    const snapshot = structuredClone(input);

    build(input);

    expect(input).toEqual(snapshot);
  });
});

describe("input aneh tidak membuat fallback melempar", () => {
  const nastyInputs: unknown[] = [
    undefined,
    null,
    "bukan objek",
    42,
    [],
    { meta: null, concepts: null, castSeed: null },
    { meta: "bukan objek", concepts: "bukan larik" },
    { concepts: [null, 42, "", "   ", "Evaporasi"] },
    { concepts: ["Evaporasi", "evaporasi", "EVAPORASI"] },
    { concepts: ["x".repeat(500)] },
    { concepts: Array.from({ length: 40 }, (_, i) => `Konsep ${i}`) },
    { meta: { title: "", fileName: "", pageCount: Number.NaN } },
    { meta: { pageCount: Number.POSITIVE_INFINITY, estimatedMinutes: -99 } },
    { meta: { pageCount: 10_000, estimatedMinutes: 10_000 } },
    { meta: { language: "bukan-kode-bahasa" } },
    { castSeed: "bukan larik" },
    { castSeed: [{ id: "bukan-id", name: "", role: "raja" }] },
    {
      castSeed: Array.from({ length: 9 }, (_, i) => ({
        id: `char_x${i}`,
        name: `Orang ${i}`,
        role: "antagonist",
      })),
    },
    {
      castSeed: [
        { id: "char_nara", name: "Kael", role: "player" },
        { id: "char_nara", name: "Kael Kembar", role: "player" },
      ],
    },
  ];

  it.each(nastyInputs.map((input, index) => [index, input] as const))(
    "input #%i tetap menghasilkan cerita valid",
    (_index, input) => {
      expect(() => build(input as FallbackStoryInput)).not.toThrow();

      const story = build(input as FallbackStoryInput);
      const result = validateStory(story, {
        manifest: INVENTORY,
        pageCount: story.source.pageCount,
      });

      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );

  it("membatasi panjang konsep sesuai schema", () => {
    const story = build({ concepts: ["x".repeat(500)] });

    expect(story.source.concepts[0]).toHaveLength(60);
    expect(story.chapters[0].concept).toHaveLength(60);
  });

  it("membatasi jumlah konsep sesuai schema", () => {
    const story = build({
      concepts: Array.from({ length: 40 }, (_, i) => `Konsep ${i}`),
    });

    expect(story.source.concepts).toHaveLength(12);
    expect(story.chapters.length).toBeLessThanOrEqual(6);
  });

  it("menjepit pageCount dan estimatedMinutes ke rentang schema", () => {
    const high = build({
      meta: { pageCount: 10_000, estimatedMinutes: 10_000 },
    });
    const low = build({ meta: { pageCount: 0, estimatedMinutes: -5 } });

    expect(high.source.pageCount).toBe(40);
    expect(high.meta.estimatedMinutes).toBe(30);
    expect(low.source.pageCount).toBe(1);
    expect(low.meta.estimatedMinutes).toBe(3);
  });

  it("mengabaikan castSeed dan selalu memakai roster tetap", () => {
    const story = build({
      castSeed: [
        { id: "char_nara", name: "Kael", role: "player" },
        { id: "char_nara", name: "Kael Kembar", role: "player" },
        { id: "char_asing", name: "Tokoh Karangan", role: "mentor" },
      ],
    });
    const ids = story.cast.map((character) => character.id);

    expect(ids).toEqual(FIXED_CAST.map((character) => character.id));
    expect(story.cast.map((character) => character.name)).toEqual(
      FIXED_CAST.map((character) => character.name),
    );
    expect(story.cast.filter((c) => c.role === "player")).toHaveLength(1);
    expect(story.cast.some((c) => c.role === "mentor")).toBe(true);
    expect(ids).not.toContain("char_asing");
  });
});

describe("kesesuaian dengan pageCount pemanggil", () => {
  it("meneruskan pageCount materi ke source.pageCount", () => {
    const story = build({ meta: { pageCount: 6 } });

    expect(story.source.pageCount).toBe(6);
    expect(validateStory(story, { manifest: INVENTORY, pageCount: 6 }).ok).toBe(
      true,
    );
  });

  it("tetap valid saat pemanggil tidak memberi pageCount", () => {
    const story = build({ concepts: CONCEPTS });

    expect(validateStory(story, { manifest: INVENTORY }).ok).toBe(true);
  });
});
