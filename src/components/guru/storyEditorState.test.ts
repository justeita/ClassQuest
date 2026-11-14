import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toAssetManifest } from "@/assets/manifest";
import type { Story } from "@/story/schema";
import { validateStory, type ValidationIssue } from "@/story/validate";

import {
  addAcceptedAnswer,
  addBeat,
  addChallengeBeat,
  addOption,
  addOrderingItem,
  canAddBeat,
  challengeUsageCount,
  changeChallengeType,
  charCount,
  createChallengeForBeat,
  deriveAssetUsage,
  describeIssuePath,
  issuesAt,
  moveBeat,
  moveOrderingItem,
  moveScene,
  nextId,
  orderingSequence,
  removeBeat,
  removeOption,
  selectableChallenges,
  setAcceptedAnswer,
  setBeatChallenge,
  setOptionText,
  setOrderingText,
  setTrueFalseAnswer,
  splitIssues,
  updateBeat,
  updateChallenge,
  updateChallengeBase,
  updateChapter,
  updateMeta,
  updateScene,
} from "./storyEditorState";

/**
 * Logika murni story editor.
 *
 * Yang dijaga di sini adalah janji yang membuat editor aman untuk guru
 * non-teknis: setiap perubahan menghasilkan cerita yang **tetap lolos
 * validator**, `assetUsage` selalu ikut berubah, dan hapus beat tidak
 * meninggalkan soal yatim.
 *
 * Cerita uji memakai `docs/02-data-model/story.example.json` — sumber yang sama
 * dengan tes validator — supaya perubahan struktural schema ikut terdeteksi.
 */
const loadExample = async (): Promise<Story> => {
  const raw = readFileSync(
    join(process.cwd(), "docs/02-data-model/story.example.json"),
    "utf8",
  );
  return JSON.parse(raw) as Story;
};

type Challenge = Story["challenges"][number];
type MultipleChoice = Extract<Challenge, { type: "multiple_choice" }>;
type Ordering = Extract<Challenge, { type: "ordering" }>;
type ShortAnswer = Extract<Challenge, { type: "short_answer" }>;
type TrueFalse = Extract<Challenge, { type: "true_false" }>;

const manifest = toAssetManifest();

const errorsOf = (story: Story): ValidationIssue[] =>
  validateStory(story, { manifest, pageCount: story.source.pageCount }).errors;

const expectValid = (story: Story) => {
  const result = validateStory(story, {
    manifest,
    pageCount: story.source.pageCount,
  });
  expect(
    result.errors.map((issue) => `${issue.code} di ${issue.path}`),
  ).toEqual([]);
  expect(result.ok).toBe(true);
};

const firstMultipleChoice = (story: Story): MultipleChoice => {
  const found = story.challenges.find(
    (challenge): challenge is MultipleChoice =>
      challenge.type === "multiple_choice",
  );
  if (!found) throw new Error("cerita contoh tanpa soal pilihan ganda");
  return found;
};

const firstOrdering = (story: Story): Ordering => {
  const found = story.challenges.find(
    (challenge): challenge is Ordering => challenge.type === "ordering",
  );
  if (!found) throw new Error("cerita contoh tanpa soal urutan");
  return found;
};

const firstShortAnswer = (story: Story): ShortAnswer => {
  const found = story.challenges.find(
    (challenge): challenge is ShortAnswer => challenge.type === "short_answer",
  );
  if (!found) throw new Error("cerita contoh tanpa soal jawaban singkat");
  return found;
};

const firstTrueFalse = (story: Story): TrueFalse => {
  const found = story.challenges.find(
    (challenge): challenge is TrueFalse => challenge.type === "true_false",
  );
  if (!found) throw new Error("cerita contoh tanpa soal benar/salah");
  return found;
};

/** Scene pertama yang memuat beat bertipe `challenge`. */
const sceneWithChallenge = (story: Story) => {
  for (
    let chapterIndex = 0;
    chapterIndex < story.chapters.length;
    chapterIndex += 1
  ) {
    const chapter = story.chapters[chapterIndex];
    if (!chapter) continue;
    for (
      let sceneIndex = 0;
      sceneIndex < chapter.scenes.length;
      sceneIndex += 1
    ) {
      const scene = chapter.scenes[sceneIndex];
      if (!scene) continue;
      const beatIndex = scene.beats.findIndex(
        (beat) => beat.type === "challenge",
      );
      if (beatIndex >= 0) return { chapterIndex, sceneIndex, beatIndex };
    }
  }
  throw new Error("cerita contoh tanpa beat challenge");
};

describe("deriveAssetUsage", () => {
  it("mengumpulkan latar, musik, dan sprite tanpa duplikat", async () => {
    const story = await loadExample();

    const usage = deriveAssetUsage(story);

    expect(usage.backgrounds).toContain(story.chapters[0]!.backgroundId);
    expect(new Set(usage.backgrounds).size).toBe(usage.backgrounds.length);
    expect(usage.music).toContain(story.chapters[0]!.musicId);
    expect(usage.sprites).toEqual([
      ...new Set(story.cast.map((character) => character.spriteId)),
    ]);
    // Daftar yang diturunkan harus sama dengan yang diharapkan validator.
    // Perbandingan berbasis himpunan: urutan sprite di berkas contoh tidak
    // dijamin sama dengan urutan cast.
    const sorted = (list: readonly string[]) => [...list].sort();
    expect({
      backgrounds: sorted(usage.backgrounds),
      music: sorted(usage.music),
      sprites: sorted(usage.sprites),
    }).toEqual({
      backgrounds: sorted(story.assetUsage.backgrounds),
      music: sorted(story.assetUsage.music),
      sprites: sorted(story.assetUsage.sprites),
    });
  });
});

describe("perubahan tidak mengubah input asli", () => {
  it("updateMeta mengembalikan salinan baru", async () => {
    const story = await loadExample();
    const original = structuredClone(story);

    const next = updateMeta(story, { title: "Judul Baru" });

    expect(next).not.toBe(story);
    expect(next.meta.title).toBe("Judul Baru");
    expect(story).toEqual(original);
    expect(next.meta.id).toBe(story.meta.id);
  });

  it("updateMeta menghapus field saat nilainya undefined", async () => {
    const story = await loadExample();

    const next = updateMeta(story, { mode: undefined });

    expect("mode" in next.meta).toBe(false);
  });
});

describe("assetUsage", () => {
  it("latar scene dikosongkan berarti ikut chapter, bukan latar kosong", async () => {
    const story = await loadExample();

    const next = updateScene(story, 0, 0, { backgroundId: undefined });

    expect("backgroundId" in next.chapters[0]!.scenes[0]!).toBe(false);
    expectValid(next);
  });

  it("latar dan musik chapter yang diganti muncul di daftar aset", async () => {
    const story = await loadExample();
    const backgrounds = manifest
      .filter((asset) => asset.kind === "background")
      .map((asset) => asset.id);
    const music = manifest
      .filter((asset) => asset.kind === "music")
      .map((asset) => asset.id);

    // Id baru ditambahkan ke manifest agar perubahan tetap sah: yang diuji di
    // sini adalah penurunan daftar, bukan keberadaan aset.
    const extraBackground = { id: "bg_uji_baru", kind: "background" as const };
    const next = updateChapter(story, 0, {
      backgroundId: extraBackground.id,
      musicId: music[0] ?? story.chapters[0]!.musicId,
    });

    expect(backgrounds).toContain(story.chapters[0]!.backgroundId);
    expect(next.assetUsage.backgrounds).toContain(extraBackground.id);
    expect(next.assetUsage).toEqual(deriveAssetUsage(next));

    const withAsset = validateStory(next, {
      manifest: [...manifest, extraBackground],
      pageCount: next.source.pageCount,
    });
    expect(withAsset.errors).toEqual([]);
  });
});

describe("scene dan beat", () => {
  it("moveScene menukar posisi dan menolak geser di luar batas", async () => {
    const story = await loadExample();
    const scenes = story.chapters[0]!.scenes;
    const [first, second] = [scenes[0]!.id, scenes[1]!.id];

    const moved = moveScene(story, 0, 0, 1);
    expect(
      moved.chapters[0]!.scenes.slice(0, 2).map((scene) => scene.id),
    ).toEqual([second, first]);

    expect(moveScene(story, 0, 0, -1)).toBe(story);
    expect(moveScene(story, 0, scenes.length - 1, 1)).toBe(story);
  });

  it("moveBeat memindahkan beat dan berhenti di ujung scene", async () => {
    const story = await loadExample();
    const beats = story.chapters[0]!.scenes[0]!.beats;

    const moved = moveBeat(story, 0, 0, 0, 1);
    expect(moved.chapters[0]!.scenes[0]!.beats[1]).toEqual(beats[0]);

    expect(moveBeat(story, 0, 0, 0, -1)).toBe(story);
    expect(moveBeat(story, 0, 0, beats.length - 1, 1)).toBe(story);
  });

  it("narasi, dialog, dan transisi baru tetap lolos validator", async () => {
    const story = await loadExample();

    // Scene dengan beat paling sedikit, supaya ada ruang menambah.
    let target = { chapterIndex: 0, sceneIndex: 0 };
    for (
      let chapterIndex = 0;
      chapterIndex < story.chapters.length;
      chapterIndex += 1
    ) {
      story.chapters[chapterIndex]!.scenes.forEach((scene, sceneIndex) => {
        const current =
          story.chapters[target.chapterIndex]!.scenes[target.sceneIndex]!;
        if (scene.beats.length < current.beats.length) {
          target = { chapterIndex, sceneIndex };
        }
      });
    }

    let next = addBeat(
      story,
      target.chapterIndex,
      target.sceneIndex,
      "narration",
    );
    next = addBeat(next, target.chapterIndex, target.sceneIndex, "dialogue");
    next = addBeat(next, target.chapterIndex, target.sceneIndex, "transition");

    const scene =
      next.chapters[target.chapterIndex]!.scenes[target.sceneIndex]!;
    const transitionIndex = scene.beats.length - 1;
    expect(scene.beats.slice(-3).map((beat) => beat.type)).toEqual([
      "narration",
      "dialogue",
      "transition",
    ]);

    // Transisi di akhir scene memang ditolak validator; editor tidak
    // menghalangi guru menambahkannya, tetapi panel validasi menandainya dan
    // tombol naik sudah tersedia untuk memperbaikinya.
    expect(errorsOf(next).map((issue) => issue.code)).toContain(
      "E_TRANSITION_LAST",
    );

    next = moveBeat(
      next,
      target.chapterIndex,
      target.sceneIndex,
      transitionIndex,
      -1,
    );
    expectValid(next);
  });

  it("addBeat menolak scene yang sudah mencapai batas 10 beat", async () => {
    let story = await loadExample();

    // Isi satu scene sampai batas.
    let guard = 0;
    while (canAddBeat(story.chapters[0]!.scenes[0]!) && guard < 20) {
      story = addBeat(story, 0, 0, "narration");
      guard += 1;
    }

    expect(canAddBeat(story.chapters[0]!.scenes[0]!)).toBe(false);
    expect(addBeat(story, 0, 0, "narration")).toBe(story);
    expect(errorsOf(story)).toEqual([]);
  });

  it("menghapus beat menolak scene yang sudah minimal 3 beat", async () => {
    const story = await loadExample();
    const scene = story.chapters[0]!.scenes[0]!;
    expect(scene.beats.length).toBeGreaterThanOrEqual(3);

    let next = story;
    for (let index = scene.beats.length - 1; index >= 0; index -= 1) {
      next = removeBeat(next, 0, 0, 0);
    }

    const after = next.chapters[0]!.scenes[0]!;
    expect(after.beats.length).toBeGreaterThanOrEqual(3);
  });

  it("menghapus beat challenge ikut menghapus soalnya bila tidak dipakai lagi", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");
    expect(challengeUsageCount(story, beat.challengeId)).toBe(1);

    const next = removeBeat(story, chapterIndex, sceneIndex, beatIndex);

    expect(next.challenges.some((item) => item.id === beat.challengeId)).toBe(
      false,
    );
    expect(
      next.chapters.some((chapter) =>
        chapter.scenes.some((scene) =>
          scene.beats.some(
            (item) =>
              item.type === "challenge" &&
              item.challengeId === beat.challengeId,
          ),
        ),
      ),
    ).toBe(false);
    // Soal tidak ditinggal sebagai yatim. Masalah lain (mis. chapter jadi tanpa
    // tantangan) memang mungkin dan muncul di panel validasi.
    expect(errorsOf(next).map((issue) => issue.code)).not.toContain(
      "E_ORPHAN_CHALLENGE",
    );
  });

  it("menghapus beat challenge mempertahankan soal yang masih dirujuk beat lain", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");

    // Keadaan ini tidak bisa dibuat lewat editor (validator menolak rujukan
    // ganda), tetapi bisa datang dari cerita lama. `removeBeat` tetap harus
    // defensif: soal yang masih dirujuk beat lain tidak boleh ikut terhapus.
    const shared: Story = structuredClone(story);
    const target = shared.chapters[1]!.scenes[0]!;
    target.beats.push({ type: "challenge", challengeId: beat.challengeId });

    const next = removeBeat(shared, chapterIndex, sceneIndex, beatIndex);

    expect(next.challenges.some((item) => item.id === beat.challengeId)).toBe(
      true,
    );
    expect(challengeUsageCount(next, beat.challengeId)).toBe(1);
  });

  it("updateBeat menyimpan teks baru tanpa kehilangan field lain", async () => {
    const story = await loadExample();
    const beat = story.chapters[0]!.scenes[0]!.beats[0]!;

    const next = updateBeat(story, 0, 0, 0, {
      type: "narration",
      text: "Teks baru dari guru.",
    });

    expect(next.chapters[0]!.scenes[0]!.beats[0]).toEqual({
      type: "narration",
      text: "Teks baru dari guru.",
    });
    expect(beat).toBe(story.chapters[0]!.scenes[0]!.beats[0]);
  });
});

describe("soal", () => {
  it("addChallengeBeat menambah soal baru dan beat sekaligus", async () => {
    const story = await loadExample();

    const { story: next, challengeId } = addChallengeBeat(story, 0, 0);

    expect(challengeId).not.toBeNull();
    expect(challengeUsageCount(next, challengeId!)).toBe(1);
    expect(next.challenges).toHaveLength(story.challenges.length + 1);
    expectValid(next);
  });

  it("addChallengeBeat tidak memakai ulang soal yang sudah ada", async () => {
    const story = await loadExample();
    const existing = firstMultipleChoice(story);

    const { story: next, challengeId } = addChallengeBeat(story, 0, 0);

    // `E_DUPLICATE_CHALLENGE_REF`: satu soal hanya boleh dirujuk satu beat,
    // jadi beat baru tidak pernah memakai soal lama.
    expect(challengeId).not.toBe(existing.id);
    expect(challengeUsageCount(next, existing.id)).toBe(
      challengeUsageCount(story, existing.id),
    );
    expectValid(next);
  });

  it("addChallengeBeat menolak scene yang sudah penuh", async () => {
    let story = await loadExample();
    let guard = 0;
    while (canAddBeat(story.chapters[0]!.scenes[0]!) && guard < 20) {
      story = addChallengeBeat(story, 0, 0).story;
      guard += 1;
    }

    expect(canAddBeat(story.chapters[0]!.scenes[0]!)).toBe(false);
    const result = addChallengeBeat(story, 0, 0);
    expect(result.challengeId).toBeNull();
    expect(result.story).toBe(story);
  });

  it("updateChallengeBase mengubah prompt, konsep, dan menghapus poin", async () => {
    const story = await loadExample();
    const challenge = firstMultipleChoice(story);
    const concept = story.source.concepts[1]!;

    const next = updateChallengeBase(story, challenge.id, {
      prompt: "Pertanyaan baru dari guru?",
      conceptTag: concept,
      points: undefined,
    });
    const updated = next.challenges.find((item) => item.id === challenge.id)!;

    expect(updated.prompt).toBe("Pertanyaan baru dari guru?");
    expect(updated.conceptTag).toBe(concept);
    expect("points" in updated).toBe(false);
    expectValid(next);
  });

  it("setOptionText hanya mengubah opsi yang dituju", async () => {
    const story = await loadExample();
    const challenge = firstMultipleChoice(story);

    const next = updateChallenge(story, challenge.id, (current) =>
      current.type === "multiple_choice"
        ? setOptionText(current, 1, "Opsi kedua baru")
        : current,
    );
    const updated = next.challenges.find(
      (item): item is MultipleChoice => item.id === challenge.id,
    )!;

    expect(updated.options[1]!.text).toBe("Opsi kedua baru");
    expect(updated.options[0]).toEqual(challenge.options[0]);
  });

  it("removeOption memindahkan jawaban benar bila opsi itu yang benar", async () => {
    const story = await loadExample();
    const challenge = firstMultipleChoice(story);
    const correctIndex = challenge.options.findIndex(
      (option) => option.id === challenge.correctOptionId,
    );

    const next = updateChallenge(story, challenge.id, (current) =>
      current.type === "multiple_choice"
        ? removeOption(current, correctIndex)
        : current,
    );
    const updated = next.challenges.find(
      (item): item is MultipleChoice => item.id === challenge.id,
    )!;

    expect(updated.correctOptionId).not.toBe(challenge.correctOptionId);
    expect(
      updated.options.some((option) => option.id === updated.correctOptionId),
    ).toBe(true);
    expectValid(next);
  });

  it("addOption berhenti di lima pilihan", async () => {
    let story = await loadExample();
    const challenge = firstMultipleChoice(story);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      story = updateChallenge(story, challenge.id, (current) =>
        current.type === "multiple_choice" ? addOption(current) : current,
      );
    }
    const updated = story.challenges.find(
      (item): item is MultipleChoice => item.id === challenge.id,
    )!;

    expect(updated.options).toHaveLength(5);
    expectValid(story);
  });

  it("changeChallengeType menghasilkan bentuk yang lolos schema", async () => {
    const story = await loadExample();
    const challenge = firstMultipleChoice(story);

    for (const type of [
      "true_false",
      "ordering",
      "short_answer",
      "multiple_choice",
    ] as const) {
      const next = updateChallenge(story, challenge.id, (current) =>
        changeChallengeType(current, type),
      );
      const updated = next.challenges.find((item) => item.id === challenge.id)!;

      expect(updated.type).toBe(type);
      expect(errorsOf(next)).toEqual([]);
    }
  });

  it("urutan item: tambah, ganti teks, dan geser menjaga correctOrder", async () => {
    let story = await loadExample();
    const challenge = firstOrdering(story);

    story = updateChallenge(story, challenge.id, (current) =>
      current.type === "ordering" ? addOrderingItem(current) : current,
    );
    const withItem = story.challenges.find(
      (item): item is Ordering => item.id === challenge.id,
    )!;
    const added = withItem.correctOrder.at(-1)!;
    expect(withItem.items.map((item) => item.id)).toContain(added);

    story = updateChallenge(story, challenge.id, (current) =>
      current.type === "ordering"
        ? setOrderingText(current, added, "Langkah terakhir")
        : current,
    );
    story = updateChallenge(story, challenge.id, (current) =>
      current.type === "ordering"
        ? moveOrderingItem(current, added, -1)
        : current,
    );

    const moved = story.challenges.find(
      (item): item is Ordering => item.id === challenge.id,
    )!;
    expect(moved.correctOrder.at(-2)).toBe(added);
    expect(orderingSequence(moved).at(-2)?.text).toBe("Langkah terakhir");
    expect(moved.correctOrder).toHaveLength(moved.items.length);
    expect(errorsOf(story)).toEqual([]);
  });

  it("jawaban singkat: ubah, tambah sampai lima, dan hapus", async () => {
    let story = await loadExample();
    const challenge = firstShortAnswer(story);

    story = updateChallenge(story, challenge.id, (current) =>
      current.type === "short_answer"
        ? setAcceptedAnswer(current, 0, "empat")
        : current,
    );
    for (let attempt = 0; attempt < 6; attempt += 1) {
      story = updateChallenge(story, challenge.id, (current) =>
        current.type === "short_answer" ? addAcceptedAnswer(current) : current,
      );
    }

    const updated = story.challenges.find(
      (item): item is ShortAnswer => item.id === challenge.id,
    )!;
    expect(updated.acceptedAnswers[0]).toBe("empat");
    expect(updated.acceptedAnswers).toHaveLength(5);
    expect(errorsOf(story)).toEqual([]);
  });

  it("benar/salah: toggle jawaban tidak mengubah pernyataan", async () => {
    const story = await loadExample();
    const challenge = firstTrueFalse(story);

    const next = updateChallenge(story, challenge.id, (current) =>
      current.type === "true_false"
        ? setTrueFalseAnswer(current, !current.correctAnswer)
        : current,
    );
    const updated = next.challenges.find(
      (item): item is TrueFalse => item.id === challenge.id,
    )!;

    expect(updated.correctAnswer).toBe(!challenge.correctAnswer);
    expect(updated.statement).toBe(challenge.statement);
  });

  it("setBeatChallenge mengarahkan beat ke soal lain tanpa memindahkannya", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");
    const other = story.challenges.find(
      (item) => item.id !== beat.challengeId,
    )!;

    const next = setBeatChallenge(
      story,
      chapterIndex,
      sceneIndex,
      beatIndex,
      other.id,
    );
    const updated =
      next.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;

    expect(updated).toMatchObject({
      type: "challenge",
      challengeId: other.id,
    });
    expect(next.chapters[chapterIndex]!.scenes[sceneIndex]!.beats).toHaveLength(
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats.length,
    );
  });

  it("createChallengeForBeat membuat soal baru untuk beat yang sudah ada", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");
    const originalId = beat.challengeId;

    const { story: next, challengeId } = createChallengeForBeat(
      story,
      chapterIndex,
      sceneIndex,
      beatIndex,
    );

    expect(challengeId).not.toBeNull();
    expect(challengeUsageCount(next, challengeId!)).toBe(1);
    // Soal lama tidak ditinggal yatim: beat satu-satunya pemakainya sudah
    // diarahkan ke soal baru, jadi soal lama ikut dibuang.
    expect(next.challenges.some((item) => item.id === originalId)).toBe(false);
    expect(next.challenges).toHaveLength(story.challenges.length);
    expectValid(next);
  });

  it("setBeatChallenge membuang soal lama yang tidak dipakai lagi", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");
    const originalId = beat.challengeId;

    // Soal pengganti harus yang belum dipakai beat mana pun, karena validator
    // menolak satu soal dirujuk dua kali. Cerita contoh tidak punya soal
    // yatim, jadi satu soal ditambahkan sebagai soal menganggur.
    const spare: Challenge = {
      ...structuredClone(firstMultipleChoice(story)),
      id: "chl_menganggur",
    };
    const withOrphan: Story = {
      ...story,
      challenges: [...story.challenges, spare],
    };

    const next = setBeatChallenge(
      withOrphan,
      chapterIndex,
      sceneIndex,
      beatIndex,
      spare.id,
    );

    expect(challengeUsageCount(next, spare.id)).toBe(1);
    expect(next.challenges.some((item) => item.id === originalId)).toBe(false);
    expect(errorsOf(next).map((issue) => issue.code)).not.toContain(
      "E_ORPHAN_CHALLENGE",
    );
  });

  it("selectableChallenges tidak menawarkan soal yang sudah dipakai beat lain", async () => {
    const story = await loadExample();
    const { chapterIndex, sceneIndex, beatIndex } = sceneWithChallenge(story);
    const beat =
      story.chapters[chapterIndex]!.scenes[sceneIndex]!.beats[beatIndex]!;
    if (beat.type !== "challenge") throw new Error("bukan beat challenge");

    const spare: Challenge = {
      ...structuredClone(firstMultipleChoice(story)),
      id: "chl_menganggur",
    };
    const withOrphan: Story = {
      ...story,
      challenges: [...story.challenges, spare],
    };

    const options = selectableChallenges(withOrphan, beat.challengeId).map(
      (item) => item.id,
    );

    // Soal milik beat ini dan soal menganggur boleh dipilih; soal milik beat
    // lain tidak (akan memicu `E_DUPLICATE_CHALLENGE_REF`).
    expect(options).toEqual([beat.challengeId, spare.id]);
  });
});

describe("id dan hitungan", () => {
  it("nextId memilih nomor yang belum dipakai", () => {
    expect(nextId("chl_baru", [])).toBe("chl_baru1");
    expect(nextId("chl_baru", ["chl_baru1", "chl_baru2"])).toBe("chl_baru3");
  });

  it("charCount menghitung per code point seperti validator", () => {
    expect(charCount("ab")).toBe(2);
    expect(charCount("😀")).toBe(1);
  });
});

describe("lokasi masalah", () => {
  it("describeIssuePath menyebut chapter, scene, beat, dan field", async () => {
    const story = await loadExample();

    const location = describeIssuePath(
      story,
      "chapters[1].scenes[0].beats[2].text",
    );

    expect(location.chapterIndex).toBe(1);
    expect(location.sceneIndex).toBe(0);
    expect(location.beatIndex).toBe(2);
    expect(location.label).toContain("Chapter 2");
    expect(location.label).toContain("teks");
  });

  it("describeIssuePath memakai label umum untuk masalah non-chapter", () => {
    const story = {
      chapters: [],
    } as unknown as Parameters<typeof describeIssuePath>[0];

    expect(describeIssuePath(story, "meta.title").label).toBe("judul");
  });

  it("issuesAt mengambil issue di bawah satu prefix saja", () => {
    const issues: ValidationIssue[] = [
      {
        code: "E_MISSING_FIELD",
        severity: "error",
        path: "chapters[0].title",
        message: "a",
      },
      {
        code: "E_MISSING_FIELD",
        severity: "error",
        path: "chapters[0].scenes[0].id",
        message: "b",
      },
      {
        code: "E_MISSING_FIELD",
        severity: "error",
        path: "chapters[10].title",
        message: "c",
      },
    ];

    expect(issuesAt(issues, "chapters[0]")).toHaveLength(2);
    expect(issuesAt(issues, "chapters[0].scenes[0].id")).toHaveLength(1);
  });

  it("splitIssues memisahkan error dan warning", () => {
    const issues: ValidationIssue[] = [
      { code: "E_MISSING_FIELD", severity: "error", path: "a", message: "a" },
      {
        code: "W_DIALOGUE_NO_EXPRESSION",
        severity: "warning",
        path: "b",
        message: "b",
      },
    ];

    expect(splitIssues(issues).errors).toHaveLength(1);
    expect(splitIssues(issues).warnings).toHaveLength(1);
  });
});
