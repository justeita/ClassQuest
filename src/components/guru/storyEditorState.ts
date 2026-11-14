/**
 * Logika murni story editor guru.
 *
 * Kontrak: `docs/05-frontend/story-editor.md` dan
 * `docs/02-data-model/story-schema.md`. Modul ini **tidak** menyentuh React,
 * server, atau `localStorage`; semuanya fungsi murni supaya bisa dites tanpa
 * browser dan dipakai ulang oleh komponen editor.
 *
 * Dua aturan yang dijaga di sini:
 *
 * 1. **`assetUsage` selalu diturunkan ulang** setiap cerita berubah. Validator
 *    menolak cerita yang daftar asetnya tidak sama dengan aset yang dipakai
 *    (`E_ASSET_USAGE_MISMATCH`), jadi editor tidak boleh membiarkan guru
 *    memperbarui latar/musik tanpa memperbarui daftarnya.
 * 2. **Cerita tidak pernah diubah di tempat.** Setiap fungsi mengembalikan
 *    salinan baru, supaya undo/redo cukup menyimpan snapshot.
 */

import type {
  AssetUsage,
  Beat,
  Challenge,
  ChallengeBase,
  Chapter,
  Difficulty,
  MultipleChoiceChallenge,
  OrderingChallenge,
  Scene,
  ShortAnswerChallenge,
  Story,
  StoryMeta,
  TrueFalseChallenge,
} from "@/story/schema";
import type { ValidationIssue } from "@/story/validate";

/* -------------------------------------------------------------------------- */
/* Batas yang sama dengan schema                                              */
/* -------------------------------------------------------------------------- */

/** Batas teks beat (`narration`/`dialogue`), `story-schema.md`. */
export const BEAT_TEXT_MAX = 240;
/** Batas `prompt` tantangan. */
export const CHALLENGE_PROMPT_MAX = 300;
/** Batas `explanation` tantangan. */
export const CHALLENGE_EXPLANATION_MAX = 400;
/** Batas `statement` soal benar/salah. */
export const CHALLENGE_STATEMENT_MAX = 240;
/** Batas teks satu opsi/item. */
export const CHALLENGE_ITEM_TEXT_MAX = 120;
/** Batas satu jawaban `short_answer`. */
export const SHORT_ANSWER_TEXT_MAX = 60;
/** Batas `summary` chapter. */
export const CHAPTER_SUMMARY_MAX = 240;
/** Batas `synopsis` cerita. */
export const STORY_SYNOPSIS_MAX = 400;
/** Jumlah beat per scene, scene per chapter, chapter per cerita. */
export const BEATS_PER_SCENE_MAX = 10;
export const BEATS_PER_SCENE_MIN = 3;
export const SCENES_PER_CHAPTER_MAX = 6;
export const CHAPTERS_MIN = 3;
/** Opsi pilihan ganda dan item urutan. */
export const CHALLENGE_OPTIONS_MIN = 2;
export const CHALLENGE_OPTIONS_MAX = 5;
/** Jawaban yang diterima untuk `short_answer`. */
export const SHORT_ANSWERS_MAX = 5;

/* -------------------------------------------------------------------------- */
/* Label tampilan                                                             */
/* -------------------------------------------------------------------------- */

export const EXPRESSION_LABELS = {
  neutral: "Netral",
  happy: "Senang",
  sad: "Sedih",
  angry: "Marah",
  shocked: "Kaget",
  thinking: "Berpikir",
} as const;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Mudah",
  2: "Sedang",
  3: "Sulit",
};

export const CHALLENGE_TYPE_LABELS = {
  multiple_choice: "Pilihan ganda",
  true_false: "Benar / salah",
  ordering: "Urutkan",
  short_answer: "Jawaban singkat",
} as const;

/** Label tipe beat untuk kepala kartu beat. */
export const BEAT_TYPE_LABELS = {
  narration: "Narasi",
  dialogue: "Dialog",
  challenge: "Soal",
  transition: "Transisi",
} as const;

/* -------------------------------------------------------------------------- */
/* Utilitas                                                                   */
/* -------------------------------------------------------------------------- */

const clone = <T>(value: T): T => structuredClone(value);

/** Terapkan patch, dan hapus field yang nilainya `undefined`. */
function applyPatch<T extends object>(target: T, patch: Partial<T>): void {
  for (const [key, value] of Object.entries(patch)) {
    const record = target as Record<string, unknown>;
    if (value === undefined) delete record[key];
    else record[key] = value;
  }
}

/**
 * Daftar aset yang dipakai cerita — **sama persis** dengan pemeriksaan
 * `checkAssetUsageConsistency` di `src/story/validate.ts`.
 */
export function deriveAssetUsage(
  story: Pick<Story, "chapters" | "cast">,
): AssetUsage {
  const backgrounds = new Set<string>();
  const music = new Set<string>();

  for (const chapter of story.chapters) {
    backgrounds.add(chapter.backgroundId);
    music.add(chapter.musicId);
    for (const scene of chapter.scenes) {
      if (scene.backgroundId) backgrounds.add(scene.backgroundId);
      if (scene.musicId) music.add(scene.musicId);
    }
  }

  return {
    backgrounds: [...backgrounds],
    music: [...music],
    sprites: [...new Set(story.cast.map((character) => character.spriteId))],
  };
}

/** Sunting cerita lalu turunkan ulang `assetUsage`. */
function edit(story: Story, mutate: (draft: Story) => void): Story {
  const draft = clone(story);
  mutate(draft);
  draft.assetUsage = deriveAssetUsage(draft);
  return draft;
}

/** Id baru dengan pola yang diminta schema, mis. `chl_baru1`. */
export function nextId(prefix: string, used: Iterable<string>): string {
  const taken = new Set(used);
  let index = 1;
  while (taken.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

/** Jumlah karakter per code point, sama dengan validator. */
export function charCount(value: string): number {
  return [...value].length;
}

/** `true` bila cerita berubah dibanding snapshot terakhir yang disimpan. */
export function isDirty(story: Story, savedSnapshot: string): boolean {
  return JSON.stringify(story) !== savedSnapshot;
}

/* -------------------------------------------------------------------------- */
/* Meta                                                                       */
/* -------------------------------------------------------------------------- */

export function updateMeta(story: Story, patch: Partial<StoryMeta>): Story {
  return edit(story, (draft) => {
    applyPatch(draft.meta, patch);
  });
}

/* -------------------------------------------------------------------------- */
/* Chapter dan scene                                                          */
/* -------------------------------------------------------------------------- */

export function updateChapter(
  story: Story,
  chapterIndex: number,
  patch: Partial<Chapter>,
): Story {
  return edit(story, (draft) => {
    const chapter = draft.chapters[chapterIndex];
    if (!chapter) return;
    applyPatch(chapter, patch);
  });
}

export function updateScene(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  patch: Partial<Scene>,
): Story {
  return edit(story, (draft) => {
    const scene = draft.chapters[chapterIndex]?.scenes[sceneIndex];
    if (!scene) return;
    applyPatch(scene, patch);
  });
}

/** Pindahkan scene di dalam chapternya (tombol naik/turun, bukan drag). */
export function moveScene(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  delta: -1 | 1,
): Story {
  const target = sceneIndex + delta;
  const scenes = story.chapters[chapterIndex]?.scenes;
  if (!scenes || target < 0 || target >= scenes.length) return story;

  return edit(story, (draft) => {
    const list = draft.chapters[chapterIndex]?.scenes;
    if (!list) return;
    const [moved] = list.splice(sceneIndex, 1);
    if (moved) list.splice(target, 0, moved);
  });
}

/* -------------------------------------------------------------------------- */
/* Beat                                                                       */
/* -------------------------------------------------------------------------- */

export function updateBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  beatIndex: number,
  beat: Beat,
): Story {
  return edit(story, (draft) => {
    const scene = draft.chapters[chapterIndex]?.scenes[sceneIndex];
    if (!scene || !scene.beats[beatIndex]) return;
    scene.beats[beatIndex] = beat;
  });
}

export function moveBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  beatIndex: number,
  delta: -1 | 1,
): Story {
  const beats = story.chapters[chapterIndex]?.scenes[sceneIndex]?.beats;
  const target = beatIndex + delta;
  if (!beats || target < 0 || target >= beats.length) return story;

  return edit(story, (draft) => {
    const list = draft.chapters[chapterIndex]?.scenes[sceneIndex]?.beats;
    if (!list) return;
    const [moved] = list.splice(beatIndex, 1);
    if (moved) list.splice(target, 0, moved);
  });
}

/**
 * Hapus beat. Kalau beat itu merujuk tantangan dan tidak ada beat lain yang
 * merujuknya, tantangannya ikut dihapus — kalau tidak, cerita menyisakan
 * `E_ORPHAN_CHALLENGE` dan guru tidak punya cara memperbaikinya dari editor.
 */
export function removeBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  beatIndex: number,
): Story {
  const scene = story.chapters[chapterIndex]?.scenes[sceneIndex];
  const beat = scene?.beats[beatIndex];
  if (!scene || !beat || scene.beats.length <= BEATS_PER_SCENE_MIN)
    return story;

  return edit(story, (draft) => {
    const target = draft.chapters[chapterIndex]?.scenes[sceneIndex];
    if (!target) return;
    target.beats.splice(beatIndex, 1);

    if (beat.type !== "challenge") return;

    const stillUsed = draft.chapters.some((chapter) =>
      chapter.scenes.some((item) =>
        item.beats.some(
          (candidate) =>
            candidate.type === "challenge" &&
            candidate.challengeId === beat.challengeId,
        ),
      ),
    );
    if (!stillUsed) {
      draft.challenges = draft.challenges.filter(
        (challenge) => challenge.id !== beat.challengeId,
      );
    }
  });
}

/** `true` bila scene masih boleh menerima beat baru (maks. 10). */
export function canAddBeat(scene: Scene): boolean {
  return scene.beats.length < BEATS_PER_SCENE_MAX;
}

/** Tambah beat narasi/dialog/transisi di akhir scene. */
export function addBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  type: "narration" | "dialogue" | "transition",
): Story {
  const scene = story.chapters[chapterIndex]?.scenes[sceneIndex];
  if (!scene || !canAddBeat(scene)) return story;

  const defaultSpeaker = story.cast[0]?.id;

  const beat: Beat =
    type === "narration"
      ? { type: "narration", text: "Tulis narasi di sini." }
      : type === "transition"
        ? { type: "transition", effect: "fade" }
        : {
            type: "dialogue",
            speakerId: defaultSpeaker ?? "char_mc",
            text: "Tulis dialog di sini.",
            expression: "neutral",
          };

  return edit(story, (draft) => {
    draft.chapters[chapterIndex]?.scenes[sceneIndex]?.beats.push(beat);
  });
}

/** Hapus soal dari daftar bila tidak ada beat yang merujuknya lagi. */
function pruneChallengeIfUnused(draft: Story, challengeId: string): void {
  const used = new Set<string>();
  for (const chapter of draft.chapters) {
    for (const scene of chapter.scenes) {
      for (const beat of scene.beats) {
        if (beat.type === "challenge") used.add(beat.challengeId);
      }
    }
  }

  if (!used.has(challengeId)) {
    draft.challenges = draft.challenges.filter(
      (challenge) => challenge.id !== challengeId,
    );
  }
}

/** Soal pilihan ganda awal yang tetap lolos schema. */
function newMultipleChoice(
  chapter: Chapter,
  id: string,
): MultipleChoiceChallenge {
  return {
    id,
    type: "multiple_choice",
    prompt: "Tulis pertanyaan di sini.",
    conceptTag: chapter.concept,
    difficulty: 1,
    explanation: "Tulis penjelasan jawaban di sini.",
    points: 10,
    options: [
      { id: "opt_baru1", text: "Opsi pertama" },
      { id: "opt_baru2", text: "Opsi kedua" },
    ],
    correctOptionId: "opt_baru1",
  };
}

/**
 * Tambah beat `challenge`.
 *
 * Menurut `docs/02-data-model/validation-rules.md`, satu soal hanya boleh
 * dirujuk **satu** beat (`E_DUPLICATE_CHALLENGE_REF`), jadi beat baru selalu
 * membawa soalnya sendiri. `soal sendiri` dibuat kosong dengan pilihan ganda
 * dan tetap lolos schema; guru tinggal memperbaiki isinya.
 *
 * Mengembalikan `challengeId` supaya UI bisa langsung membuka form soalnya.
 */
export function addChallengeBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
): { story: Story; challengeId: string | null } {
  const scene = story.chapters[chapterIndex]?.scenes[sceneIndex];
  const chapter = story.chapters[chapterIndex];
  if (!scene || !chapter || !canAddBeat(scene)) {
    return { story, challengeId: null };
  }

  let challengeId: string | null = null;

  const next = edit(story, (draft) => {
    challengeId = nextId(
      "chl_baru",
      draft.challenges.map((challenge) => challenge.id),
    );

    const challenge = newMultipleChoice(chapter, challengeId);

    draft.challenges.push(challenge);
    draft.chapters[chapterIndex]?.scenes[sceneIndex]?.beats.push({
      type: "challenge",
      challengeId: challenge.id,
    });
  });

  return { story: next, challengeId };
}

/** Berapa beat cerita yang memakai satu soal. */
export function challengeUsageCount(story: Story, challengeId: string): number {
  let count = 0;
  for (const chapter of story.chapters) {
    for (const scene of chapter.scenes) {
      for (const beat of scene.beats) {
        if (beat.type === "challenge" && beat.challengeId === challengeId) {
          count += 1;
        }
      }
    }
  }
  return count;
}

/**
 * Soal yang boleh dipilih sebuah beat `challenge`.
 *
 * Hanya soal yang belum dipakai beat lain (plus soal yang sedang dipakai beat
 * ini), karena validator menolak satu soal dirujuk dua kali. Soal yatim — mis.
 * sisa cerita lama — tetap ditawarkan supaya bisa dipakai kembali alih-alih
 * menganggur dan memicu `E_ORPHAN_CHALLENGE`.
 */
export function selectableChallenges(
  story: Story,
  currentChallengeId: string,
): Challenge[] {
  return story.challenges.filter(
    (challenge) =>
      challenge.id === currentChallengeId ||
      challengeUsageCount(story, challenge.id) === 0,
  );
}

/* -------------------------------------------------------------------------- */
/* Tantangan                                                                  */
/* -------------------------------------------------------------------------- */

export function updateChallenge(
  story: Story,
  challengeId: string,
  updater: (challenge: Challenge) => Challenge,
): Story {
  return edit(story, (draft) => {
    const index = draft.challenges.findIndex(
      (challenge) => challenge.id === challengeId,
    );
    const current = draft.challenges[index];
    if (index < 0 || !current) return;
    draft.challenges[index] = updater(current);
  });
}

/** Field yang dimiliki semua tipe tantangan. */
function challengeBase(challenge: Challenge) {
  return {
    id: challenge.id,
    prompt: challenge.prompt,
    conceptTag: challenge.conceptTag,
    difficulty: challenge.difficulty,
    explanation: challenge.explanation,
    ...(challenge.hints ? { hints: challenge.hints } : {}),
    ...(challenge.points === undefined ? {} : { points: challenge.points }),
  };
}

/**
 * Ubah field bersama tanpa menyentuh isian khusus tipe.
 *
 * `points` sengaja diperlakukan khusus: `undefined` berarti field dihapus,
 * bukan disimpan sebagai `undefined` (JSON tidak punya `undefined`, dan schema
 * memakai `strictObject`).
 */
export function updateChallengeBase(
  story: Story,
  challengeId: string,
  patch: Partial<ChallengeBase>,
): Story {
  return updateChallenge(story, challengeId, (challenge) => {
    const next = {
      ...challenge,
      ...(patch.prompt === undefined ? {} : { prompt: patch.prompt }),
      ...(patch.conceptTag === undefined
        ? {}
        : { conceptTag: patch.conceptTag }),
      ...(patch.difficulty === undefined
        ? {}
        : { difficulty: patch.difficulty }),
      ...(patch.explanation === undefined
        ? {}
        : { explanation: patch.explanation }),
    } as Challenge;

    if ("points" in patch) {
      if (patch.points === undefined)
        delete (next as { points?: number }).points;
      else (next as { points?: number }).points = patch.points;
    }

    return next;
  });
}

/**
 * Ganti tipe tantangan tanpa kehilangan isi yang masih relevan.
 *
 * Isian khusus tipe lama tidak bisa dipertahankan (opsi tidak ada artinya di
 * soal benar/salah), jadi dipakai nilai awal yang tetap lolos schema. Guru
 * tetap harus memeriksa hasilnya sebelum menyimpan.
 */
export function changeChallengeType(
  challenge: Challenge,
  type: Challenge["type"],
): Challenge {
  if (challenge.type === type) return challenge;

  const base = challengeBase(challenge);

  if (type === "multiple_choice") {
    const options = [
      { id: "opt_baru1", text: "Opsi pertama" },
      { id: "opt_baru2", text: "Opsi kedua" },
    ];
    return {
      ...base,
      type,
      options,
      correctOptionId: options[0].id,
    };
  }

  if (type === "true_false") {
    return {
      ...base,
      type,
      statement:
        challenge.prompt.length >= 5 && challenge.prompt.length <= 240
          ? challenge.prompt
          : "Tulis pernyataan di sini.",
      correctAnswer: true,
    };
  }

  if (type === "ordering") {
    const items = [
      { id: "itm_baru1", text: "Item pertama" },
      { id: "itm_baru2", text: "Item kedua" },
    ];
    return {
      ...base,
      type,
      items,
      correctOrder: items.map((item) => item.id),
    };
  }

  return {
    ...base,
    type: "short_answer",
    acceptedAnswers: ["jawaban"],
    caseSensitive: false,
  };
}

/* --- pilihan ganda -------------------------------------------------------- */

export function setOptionText(
  challenge: MultipleChoiceChallenge,
  index: number,
  text: string,
): MultipleChoiceChallenge {
  const options = challenge.options.map((option, optionIndex) =>
    optionIndex === index ? { ...option, text } : option,
  );
  return { ...challenge, options };
}

export function addOption(
  challenge: MultipleChoiceChallenge,
): MultipleChoiceChallenge {
  if (challenge.options.length >= CHALLENGE_OPTIONS_MAX) return challenge;
  const id = nextId(
    "opt_baru",
    challenge.options.map((option) => option.id),
  );
  return {
    ...challenge,
    options: [...challenge.options, { id, text: "Opsi baru" }],
  };
}

export function removeOption(
  challenge: MultipleChoiceChallenge,
  index: number,
): MultipleChoiceChallenge {
  if (challenge.options.length <= CHALLENGE_OPTIONS_MIN) return challenge;
  const removed = challenge.options[index];
  const options = challenge.options.filter(
    (_, optionIndex) => optionIndex !== index,
  );
  return {
    ...challenge,
    options,
    correctOptionId:
      removed && challenge.correctOptionId === removed.id
        ? (options[0]?.id ?? challenge.correctOptionId)
        : challenge.correctOptionId,
  };
}

/* --- urutkan -------------------------------------------------------------- */

/**
 * Item dalam urutan benar. Game mengacak urutannya sendiri, jadi urutan array
 * `items` di cerita tidak perlu berbeda dari `correctOrder`; editor memakai
 * satu daftar supaya guru hanya perlu menyusun sekali.
 */
export function orderingSequence(challenge: OrderingChallenge) {
  return challenge.correctOrder
    .map((id) => challenge.items.find((item) => item.id === id))
    .filter((item): item is OrderingChallenge["items"][number] =>
      Boolean(item),
    );
}

export function setOrderingText(
  challenge: OrderingChallenge,
  itemId: string,
  text: string,
): OrderingChallenge {
  return {
    ...challenge,
    items: challenge.items.map((item) =>
      item.id === itemId ? { ...item, text } : item,
    ),
  };
}

export function addOrderingItem(
  challenge: OrderingChallenge,
): OrderingChallenge {
  if (challenge.items.length >= CHALLENGE_OPTIONS_MAX) return challenge;
  const id = nextId(
    "itm_baru",
    challenge.items.map((item) => item.id),
  );
  return {
    ...challenge,
    items: [...challenge.items, { id, text: "Item baru" }],
    correctOrder: [...challenge.correctOrder, id],
  };
}

export function removeOrderingItem(
  challenge: OrderingChallenge,
  itemId: string,
): OrderingChallenge {
  if (challenge.items.length <= CHALLENGE_OPTIONS_MIN) return challenge;
  return {
    ...challenge,
    items: challenge.items.filter((item) => item.id !== itemId),
    correctOrder: challenge.correctOrder.filter((id) => id !== itemId),
  };
}

/** Geser satu item pada urutan benar. */
export function moveOrderingItem(
  challenge: OrderingChallenge,
  itemId: string,
  delta: -1 | 1,
): OrderingChallenge {
  const index = challenge.correctOrder.indexOf(itemId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= challenge.correctOrder.length) {
    return challenge;
  }

  const correctOrder = [...challenge.correctOrder];
  const [moved] = correctOrder.splice(index, 1);
  if (moved) correctOrder.splice(target, 0, moved);
  return { ...challenge, correctOrder };
}

/* --- jawaban singkat ------------------------------------------------------ */

export function setAcceptedAnswer(
  challenge: ShortAnswerChallenge,
  index: number,
  value: string,
): ShortAnswerChallenge {
  return {
    ...challenge,
    acceptedAnswers: challenge.acceptedAnswers.map((answer, answerIndex) =>
      answerIndex === index ? value : answer,
    ),
  };
}

export function addAcceptedAnswer(
  challenge: ShortAnswerChallenge,
): ShortAnswerChallenge {
  if (challenge.acceptedAnswers.length >= SHORT_ANSWERS_MAX) return challenge;
  return {
    ...challenge,
    acceptedAnswers: [...challenge.acceptedAnswers, "jawaban baru"],
  };
}

export function removeAcceptedAnswer(
  challenge: ShortAnswerChallenge,
  index: number,
): ShortAnswerChallenge {
  if (challenge.acceptedAnswers.length <= 1) return challenge;
  return {
    ...challenge,
    acceptedAnswers: challenge.acceptedAnswers.filter(
      (_, answerIndex) => answerIndex !== index,
    ),
  };
}

/* --- benar/salah ---------------------------------------------------------- */

export function setTrueFalseAnswer(
  challenge: TrueFalseChallenge,
  correctAnswer: boolean,
): TrueFalseChallenge {
  return { ...challenge, correctAnswer };
}

/* -------------------------------------------------------------------------- */
/* Lokasi masalah validasi                                                    */
/* -------------------------------------------------------------------------- */

const FIELD_LABELS: Record<string, string> = {
  text: "teks",
  speakerId: "pembicara",
  expression: "ekspresi",
  challengeId: "soal",
  backgroundId: "latar",
  musicId: "musik",
  title: "judul",
  concept: "konsep",
  summary: "ringkasan",
  synopsis: "sinopsis",
  prompt: "pertanyaan",
  explanation: "penjelasan",
  statement: "pernyataan",
  options: "pilihan",
  items: "item",
  acceptedAnswers: "jawaban diterima",
  correctOptionId: "jawaban benar",
  correctAnswer: "jawaban benar",
  correctOrder: "urutan benar",
  hints: "petunjuk",
  concepts: "konsep",
  pageCount: "jumlah halaman",
  assetUsage: "daftar aset",
  cast: "tokoh",
  challenges: "tantangan",
  chapters: "chapter",
  scenes: "scene",
  beats: "beat",
  meta: "pengaturan cerita",
  source: "materi sumber",
  maxAttempts: "jumlah percobaan",
  onWrong: "konsekuensi jawaban salah",
};

export type IssueLocation = {
  /** Teks siap tampil, mis. `Chapter 2 · Scene 1 · beat 3 · teks`. */
  label: string;
  chapterIndex: number | null;
  sceneIndex: number | null;
  beatIndex: number | null;
};

const CHAPTER_INDEX = /chapters\[(\d+)\]/;
const SCENE_INDEX = /chapters\[\d+\]\.scenes\[(\d+)\]/;
const BEAT_INDEX = /chapters\[\d+\]\.scenes\[\d+\]\.beats\[(\d+)\]/;

/** Terjemahkan path validator menjadi lokasi yang bisa ditunjuk guru. */
export function describeIssuePath(story: Story, path: string): IssueLocation {
  const chapterMatch = CHAPTER_INDEX.exec(path);
  const sceneMatch = SCENE_INDEX.exec(path);
  const beatMatch = BEAT_INDEX.exec(path);

  const chapterIndex = chapterMatch ? Number(chapterMatch[1]) : null;
  const sceneIndex = sceneMatch ? Number(sceneMatch[1]) : null;
  const beatIndex = beatMatch ? Number(beatMatch[1]) : null;

  const parts: string[] = [];

  if (chapterIndex !== null) {
    const chapter = story.chapters[chapterIndex];
    parts.push(
      chapter
        ? `Chapter ${chapterIndex + 1} “${chapter.title}”`
        : `Chapter ${chapterIndex + 1}`,
    );
  }

  if (sceneIndex !== null) {
    const scene = story.chapters[chapterIndex ?? 0]?.scenes[sceneIndex];
    parts.push(
      scene?.title
        ? `Scene ${sceneIndex + 1} “${scene.title}”`
        : `Scene ${sceneIndex + 1}`,
    );
  }

  if (beatIndex !== null) parts.push(`beat ${beatIndex + 1}`);

  const lastKey = path
    .replace(/\[\d+\]/g, "")
    .split(".")
    .filter(Boolean)
    .at(-1);

  if (lastKey) parts.push(FIELD_LABELS[lastKey] ?? lastKey);

  return {
    label: parts.length > 0 ? parts.join(" · ") : "Cerita",
    chapterIndex,
    sceneIndex,
    beatIndex,
  };
}

/** Kelompokkan issue: error memblokir simpan, warning tidak. */
export function splitIssues(issues: readonly ValidationIssue[]) {
  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
}

/* -------------------------------------------------------------------------- */
/* Bantuan UI                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Scene yang sedang dibuka. `null` berarti panel pengaturan cerita (meta),
 * bukan scene mana pun.
 */
export type EditorSelection = {
  chapterIndex: number;
  sceneIndex: number;
} | null;

/** Issue yang path-nya berada di bawah `prefix`, mis. `chapters[0].scenes[1]`. */
export function issuesAt(
  issues: readonly ValidationIssue[],
  prefix: string,
): ValidationIssue[] {
  return issues.filter(
    (issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
  );
}

/** Ambil satu soal; `null` bila sudah tidak ada (mis. setelah undo). */
export function challengeById(
  story: Story,
  challengeId: string,
): Challenge | null {
  return (
    story.challenges.find((challenge) => challenge.id === challengeId) ?? null
  );
}

/**
 * Arahkan beat `challenge` ke soal lain. Beat tetap di tempatnya; hanya
 * `challengeId` yang berubah, sehingga guru bisa memakai ulang soal yang sama
 * tanpa menyalin isinya.
 */
export function setBeatChallenge(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  beatIndex: number,
  challengeId: string,
): Story {
  const beat =
    story.chapters[chapterIndex]?.scenes[sceneIndex]?.beats[beatIndex];
  if (!beat || beat.type !== "challenge") return story;

  return edit(story, (draft) => {
    const target =
      draft.chapters[chapterIndex]?.scenes[sceneIndex]?.beats[beatIndex];
    if (!target || target.type !== "challenge") return;

    const previous = target.challengeId;
    target.challengeId = challengeId;

    // Soal yang tidak lagi dipakai beat mana pun harus dibuang, kalau tidak
    // cerita menyisakan `E_ORPHAN_CHALLENGE` yang tidak bisa dibereskan guru.
    if (previous !== challengeId) pruneChallengeIfUnused(draft, previous);
  });
}

/**
 * Buat soal baru untuk beat `challenge` yang sudah ada.
 *
 * Dipakai tombol "Buat soal baru" di kartu beat. Beat tidak berpindah; hanya
 * `challengeId`-nya yang diarahkan ke soal baru, dan soal lama dibiarkan
 * (mungkin masih dipakai beat lain).
 */
export function createChallengeForBeat(
  story: Story,
  chapterIndex: number,
  sceneIndex: number,
  beatIndex: number,
): { story: Story; challengeId: string | null } {
  const beat =
    story.chapters[chapterIndex]?.scenes[sceneIndex]?.beats[beatIndex];
  const chapter = story.chapters[chapterIndex];
  if (!beat || beat.type !== "challenge" || !chapter) {
    return { story, challengeId: null };
  }

  const challengeId = nextId(
    "chl_baru",
    story.challenges.map((challenge) => challenge.id),
  );
  const challenge = newMultipleChoice(chapter, challengeId);
  const previous = beat.challengeId;

  const next = edit(story, (draft) => {
    draft.challenges.push(challenge);
    const target =
      draft.chapters[chapterIndex]?.scenes[sceneIndex]?.beats[beatIndex];
    if (target?.type === "challenge") target.challengeId = challengeId;
    pruneChallengeIfUnused(draft, previous);
  });

  return { story: next, challengeId };
}
