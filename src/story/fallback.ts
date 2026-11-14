/**
 * Cerita cadangan (fallback) — jaring pengaman "tidak pernah layar error".
 *
 * Aturan: `docs/03-ai-pipeline/validation-and-repair.md` bagian **Fallback** dan
 * `docs/03-ai-pipeline/pipeline.md` bagian **Fallback**.
 *
 * Sifat yang dijanjikan:
 *
 * - **Deterministik.** Input sama → output sama. Tidak ada `Math.random`,
 *   `Date`, jaringan, atau panggilan AI.
 * - **Tidak pernah melempar.** Input kosong, `null`, atau berbentuk aneh tetap
 *   menghasilkan cerita yang valid.
 * - **Valid.** Lolos `validateStory` tanpa error, memakai aset yang ada di
 *   `docs/07-assets/inventory.md`.
 * - **Memakai konsep materi.** Minimal 3 chapter, satu konsep per chapter, dan
 *   satu tantangan sederhana di setiap scene. Setiap chapter punya dua scene,
 *   jadi dua tantangan per chapter. Tambahan itu disengaja: `W_NO_CHALLENGE_IN_SCENE`
 *   akan muncul untuk setiap scene tanpa tantangan, dan cerita cadangan tidak
 *   boleh membebani guru dengan warning yang tidak mereka picu.
 * - **Bisa didemokan penuh.** Chapter pertama memberi dua tantangan dengan
 *   `maxAttempts` dan `onWrong` (retry + detour), plus dialog `textVariants`
 *   yang bereaksi pada flag hasil jawaban salah. Jadi fitur bercabang bisa
 *   dicoba tanpa kunci API. Detour hanya memakai speaker dan aset yang sudah
 *   dipakai cerita ini.
 * - **Banyak suara.** Setiap chapter memakai mentor dan dua NPC pendamping yang
 *   bergiliran dari roster desa, jadi dialog tidak dipegang satu tokoh
 *   (ADR 0036). Dialog pendamping tidak mengklaim keahlian atau fakta baru.
 * - **Jujur.** Tidak mengarang fakta tentang PDF. Teks hanya menyebut *nama*
 *   konsep; penjelasan isi tetap tugas guru lewat editor. Penanda
 *   `usedFallback` hidup di record job, bukan di dalam `Story`
 *   (`validation-and-repair.md`).
 *
 * Karena itu cerita ini sengaja generik: satu chapter = satu konsep, dengan
 * pertanyaan "kata kunci apa yang digores di tanah?" yang jawabannya ada di
 * cerita itu sendiri. Tidak ada klaim faktual tentang materi asli.
 *
 * Latarnya mengikuti satu-satunya peta game: tempat tetap mentor di desa
 * (`locationOf`). Cerita cadangan tidak boleh bercerita di kelas, karena latar
 * runtime selalu peta desa (`docs/04-game/scene-format.md`, ADR 0037).
 */

import { fixedCast, locationOf } from "./cast";
import { STORY_MODES } from "./schema";
import type {
  Challenge,
  Chapter,
  Character,
  CharacterRole,
  Story,
  StoryMode,
} from "./schema";

/* -------------------------------------------------------------------------- */
/* Bentuk input                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Bagian `meta` yang dikenal pipeline sebelum cerita ada. Semua field opsional
 * supaya pemanggil yang kehabisan waktu tetap bisa meminta cerita cadangan
 * tanpa data lengkap.
 */
export type StoryMetaInput = {
  title?: string;
  subject?: string;
  gradeLevel?: string;
  language?: string;
  tone?: string;
  /** Mode permainan pilihan guru (ADR 0028); menentukan bentuk cerita cadangan. */
  mode?: StoryMode;
  fileName?: string;
  pageCount?: number;
  estimatedMinutes?: number;
};

/**
 * Bentuk cast dari outline yang sempat jadi.
 *
 * Field-nya tetap diterima agar pemanggil lama tidak perlu berubah, tetapi
 * fallback mengabaikan nama/id di sini dan selalu memakai roster tetap desa.
 */
export type FallbackCastSeed = {
  id?: string;
  name?: string;
  role?: string;
};

/**
 * Input `buildFallbackStory`, mengikuti
 * `docs/03-ai-pipeline/validation-and-repair.md`. `reason` tidak masuk ke
 * `Story`; ia dipakai pipeline untuk banner dan telemetri.
 */
export type FallbackStoryInput = {
  meta?: StoryMetaInput;
  concepts?: readonly string[];
  castSeed?: readonly FallbackCastSeed[];
  reason?: string;
};

/* -------------------------------------------------------------------------- */
/* Aset (hanya id yang ada di docs/07-assets/inventory.md)                    */
/* -------------------------------------------------------------------------- */

/** Latar yang dipakai bergiliran antar chapter. */
const BACKGROUNDS = ["bg_default"] as const;

/** Musik yang dipakai bergiliran antar chapter. */
const MUSIC = ["bgm_default"] as const;

const FIXED_ROSTER: readonly Character[] = fixedCast();

const DEFAULT_PLAYER: Character =
  FIXED_ROSTER.find((character) => character.role === "player") ??
  FIXED_ROSTER[0];

const DEFAULT_MENTOR: Character =
  FIXED_ROSTER.find((character) => character.role === "mentor") ??
  FIXED_ROSTER[1];

/* -------------------------------------------------------------------------- */
/* Batas schema (docs/02-data-model/story.schema.json)                        */
/* -------------------------------------------------------------------------- */

const MIN_CHAPTERS = 3;
const MAX_CHAPTERS = 6;
const MAX_CONCEPTS = 12;
const MAX_CONCEPT_LENGTH = 60;
const DEFAULT_CONCEPT = "Materi pelajaran";
const DEFAULT_FILE_NAME = "materi.pdf";
const DEFAULT_SUBJECT = "Umum";
const DEFAULT_GRADE = "SMP";
const DEFAULT_TONE = "sederhana dan ramah";
const DEFAULT_LANGUAGE = "id";
const DEFAULT_MINUTES = 6;
const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/* -------------------------------------------------------------------------- */
/* Bantuan teks                                                               */
/* -------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Sama seperti `tidyText` di validator: buang kontrol, rapikan spasi, trim. */
const clean = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** Potong per code point, sama seperti `maxLength` di JSON Schema. */
const clip = (value: string, max: number): string => {
  const characters = [...value];
  if (characters.length <= max) return value;
  return characters.slice(0, max).join("").trimEnd();
};

/** Teks dari input; pakai cadangan bila kosong atau lebih pendek dari `min`. */
const text = (
  value: unknown,
  fallback: string,
  min: number,
  max: number,
): string => {
  const cleaned = clean(value);
  return clip(cleaned.length >= min ? cleaned : fallback, max);
};

/** Bilangan bulat dalam rentang; nilai aneh jatuh ke `fallback`. */
const integerInRange = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

/** Sidik jari FNV-1a 32-bit: stabil lintas browser dan Node, tanpa `crypto`. */
const fingerprint = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/* -------------------------------------------------------------------------- */
/* Konsep                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Rapikan daftar konsep: trim, buang kosong, buang duplikat (tanpa membedakan
 * huruf besar), potong panjang, dan batasi jumlahnya. Selalu minimal satu
 * konsep supaya `source.concepts` tidak melanggar `minItems: 1`.
 */
const normalizeConcepts = (input: unknown): string[] => {
  const source = Array.isArray(input) ? input : [];
  const concepts: string[] = [];

  for (const raw of source) {
    const concept = clip(clean(raw), MAX_CONCEPT_LENGTH);
    if (concept.length === 0) continue;
    if (
      concepts.some(
        (existing) => existing.toLowerCase() === concept.toLowerCase(),
      )
    ) {
      continue;
    }
    concepts.push(concept);
    if (concepts.length === MAX_CONCEPTS) break;
  }

  return concepts.length > 0 ? concepts : [DEFAULT_CONCEPT];
};

/* -------------------------------------------------------------------------- */
/* Cast                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cast cerita cadangan selalu roster tetap (`src/story/cast.ts`).
 *
 * `input` masih diterima supaya kontrak pemanggil lama tetap jalan, tetapi nama,
 * id, dan role dari outline yang gagal **diabaikan**. Dengan begitu fallback
 * tidak bisa memperkenalkan tokoh yang tidak ada di dunia desa.
 */
const normalizeCast = (input: unknown): Character[] => {
  void input;
  return fixedCast();
};

const idForRole = (cast: readonly Character[], role: CharacterRole): string =>
  cast.find((character) => character.role === role)?.id ??
  (role === "mentor" ? DEFAULT_MENTOR.id : DEFAULT_PLAYER.id);

/**
 * Dua NPC pendamping untuk satu chapter, berputar mengikuti nomor chapter.
 *
 * Cerita cadangan dulu hanya memakai mentor, sehingga seluruh dialog dipegang
 * satu tokoh (ADR 0036). Giliran ini membuat minimal tiga tokoh bicara per
 * chapter tanpa mengarang nama baru: pool-nya tetap roster desa. Kalau pool
 * hanya berisi satu tokoh, tokoh itu dipakai sekali saja supaya tidak ada
 * speaker ganda.
 */
const companionsFor = (
  cast: readonly Character[],
  index: number,
): Character[] => {
  const pool = cast.filter((character) => character.role === "npc");
  if (pool.length === 0) return [];

  const first = pool[(index * 2) % pool.length];
  const second = pool[(index * 2 + 1) % pool.length];

  return second.id === first.id ? [first] : [first, second];
};

/* -------------------------------------------------------------------------- */
/* Tantangan                                                                  */
/* -------------------------------------------------------------------------- */

/** Pilihan pengecoh yang tidak mengklaim apa pun tentang materi. */
const GENERIC_DISTRACTORS = [
  "Jadwal panen desa",
  "Daftar tamu pesta",
  "Kegiatan kerja bakti",
] as const;

/**
 * Flag cerita cadangan. Dua flag ini dinyalakan oleh jawaban salah pada dua
 * tantangan chapter pertama, lalu dibaca `textVariants` di dialog sesudahnya.
 * Id mengikuti pola `flg_[a-z0-9_]+` dan tidak menambah aset apa pun.
 */
const FLAG_SALAH_PAPAN = "flg_salah_petunjuk";
const FLAG_SALAH_CATATAN = "flg_salah_catatan";

const buildOptions = (
  concept: string,
  concepts: readonly string[],
  chapterNumber: string,
): { id: string; text: string }[] => {
  const options = [
    {
      id: `opt_${chapterNumber}_a`,
      text: clip(concept, 120),
    },
  ];

  const others = concepts.filter(
    (candidate) => candidate.toLowerCase() !== concept.toLowerCase(),
  );
  const pool = [...others, ...GENERIC_DISTRACTORS];

  for (const candidate of pool) {
    if (options.length >= 3) break;
    const optionText = clip(candidate, 120);
    if (optionText.length === 0) continue;
    if (
      options.some(
        (option) => option.text.toLowerCase() === optionText.toLowerCase(),
      )
    ) {
      continue;
    }
    options.push({
      id: `opt_${chapterNumber}_${String.fromCharCode(97 + options.length)}`,
      text: optionText,
    });
  }

  return options;
};

const buildChallenge = (input: {
  concept: string;
  concepts: readonly string[];
  chapterNumber: string;
  index: 1 | 2 | 3;
  difficulty: 1 | 2 | 3;
  prompt: string;
  explanation: string;
  hint: string;
}): Challenge => {
  const options = buildOptions(
    input.concept,
    input.concepts,
    `${input.chapterNumber}_${input.index}`,
  );

  return {
    id: `chl_${input.chapterNumber}_0${input.index}`,
    type: "multiple_choice",
    prompt: clip(input.prompt, 300),
    conceptTag: input.concept,
    difficulty: input.difficulty,
    explanation: clip(input.explanation, 400),
    hints: [clip(input.hint, 140)],
    points: 10,
    options,
    correctOptionId: options[0].id,
  };
};

/* -------------------------------------------------------------------------- */
/* Chapter                                                                    */
/* -------------------------------------------------------------------------- */

const buildChapter = (
  concept: string,
  concepts: readonly string[],
  index: number,
  cast: readonly Character[],
  playerName: string,
  mentorName: string,
  branching: boolean,
  mode: StoryMode | undefined,
): { chapter: Chapter; challenges: Challenge[] } => {
  const number = String(index + 1).padStart(2, "0");
  const difficulty = ((index % 3) + 1) as 1 | 2 | 3;
  const playerId = idForRole(cast, "player");
  const mentorId = idForRole(cast, "mentor");
  const quiz = mode === "pertanyaan";

  // Cerita cadangan tidak mengarang tempat: setiap chapter bermain di tempat
  // tetap mentor, sesuai peta desa (`CAST_PLACES`). Label diambil sebelum koma
  // supaya kalimat narasi tetap pendek.
  const tempatPenuh = locationOf(mentorId) ?? "alun-alun desa";
  const tempat = tempatPenuh.split(",")[0] || "alun-alun desa";

  // Pembicara pendamping; `undefined` bila roster tidak punya NPC lain.
  const [companionA, companionB] = companionsFor(cast, index);
  const companionAName = companionA?.name;
  const companionBName = companionB?.name;
  const hadir = [playerName, mentorName, companionAName, companionBName]
    .filter((name): name is string => name !== undefined)
    .join(", ");

  const boardChallenge = buildChallenge({
    concept,
    concepts,
    chapterNumber: number,
    index: 1,
    difficulty,
    prompt: `${mentorName} menggores satu kata kunci di tanah lembap dengan ranting. Kata kunci apa itu?`,
    explanation: `Kata kunci yang digores di tanah adalah ${concept}. Itulah konsep yang dibahas di chapter ini.`,
    hint: `Perhatikan kalimat ${mentorName} sebelum kata kunci digores.`,
  });

  const notebookChallenge = buildChallenge({
    concept,
    concepts,
    chapterNumber: number,
    index: 2,
    difficulty,
    prompt: `${playerName} menulis satu hal baru di buku catatan. Apa yang ditulis?`,
    explanation: `${playerName} mencatat ${concept} sebagai hal baru yang dipelajari di chapter ini.`,
    hint: `Lihat catatan ${playerName} di akhir chapter.`,
  });

  /**
   * Mode `pertanyaan` meminta 3–4 tantangan per chapter. Cerita cadangan hanya
   * punya dua scene, jadi tantangan ketiga ditaruh di scene penutup setelah
   * satu kalimat pengantar — cukup untuk memenuhi kepadatan kuis tanpa
   * melanggar batas beat (maksimal 10 per scene).
   */
  const recapChallenge = quiz
    ? buildChallenge({
        concept,
        concepts,
        chapterNumber: number,
        index: 3,
        difficulty,
        prompt: `Saat hari mulai sore, ${mentorName} meminta ${playerName} menyebutkan satu istilah yang baru dipelajari. Istilah apa itu?`,
        explanation: `Istilah yang diminta adalah ${concept}, konsep utama chapter ini.`,
        hint: `Ingat kata kunci yang digores ${mentorName} di tanah.`,
      })
    : null;

  const chapter: Chapter = {
    id: `ch_${number}`,
    title: clip(`Mengenal ${concept}`, 60),
    concept,
    summary: clip(
      `${hadir} membahas ${concept} lewat percakapan singkat di ${tempat}.`,
      240,
    ),
    backgroundId: BACKGROUNDS[index % BACKGROUNDS.length],
    musicId: MUSIC[index % MUSIC.length],
    scenes: [
      {
        id: `sc_${number}_01`,
        title: clip(`Pembuka: ${concept}`, 60),
        beats: [
          {
            type: "narration",
            text: clip(
              `Angin sore membawa aroma tanah. ${hadir} berkumpul di ${tempat} untuk membahas ${concept}.`,
              240,
            ),
          },
          {
            type: "dialogue",
            speakerId: mentorId,
            text: clip(
              `Hari ini kita belajar tentang ${concept}. Kita akan mencari tahu bersama.`,
              240,
            ),
            expression: "happy",
          },
          // Pendamping pertama: bukan ahli topik, hanya ikut mengamati. Dialog
          // ini yang membuat chapter tidak menjadi monolog mentor (ADR 0036).
          ...(companionA === undefined
            ? []
            : [
                {
                  type: "dialogue" as const,
                  speakerId: companionA.id,
                  text: clip(
                    `Aku ikut mendengarkan, ya. ${concept} ini menarik.`,
                    240,
                  ),
                  expression: "happy" as const,
                },
              ]),
          {
            type: "dialogue",
            speakerId: playerId,
            text: "Baik, Pak. Aku siap mencatat hal pentingnya.",
            expression: "happy",
          },
          {
            type: "challenge",
            challengeId: boardChallenge.id,
            // Dua tantangan di chapter pertama memberi contoh konsekuensi
            // jawaban salah; chapter lain tetap sederhana.
            ...(branching
              ? {
                  maxAttempts: 2,
                  onWrong: {
                    setFlags: { [FLAG_SALAH_PAPAN]: true },
                    retryQuestions: [
                      clip(
                        `Coba ingat lagi. Kata kunci apa yang barusan digores ${mentorName} di tanah?`,
                        300,
                      ),
                    ],
                    detour: [
                      {
                        type: "narration",
                        text: `${playerName} menatap goresan di tanah sekali lagi. Ada satu kata kunci yang baru saja disebut sebelum soal ini.`,
                      },
                      {
                        type: "dialogue",
                        speakerId: mentorId,
                        // `{{jawaban}}` diisi jawaban salah terakhir (ADR 0020),
                        // jadi cerita cadangan pun mengakui jawaban siswa.
                        text: "Kau menjawab {{jawaban}}. Tarik napas dulu, lalu baca ulang kalimat terakhir yang tadi kusebut.",
                        expression: "thinking",
                      },
                    ],
                  },
                }
              : {}),
          },
          {
            type: "dialogue",
            speakerId: mentorId,
            text: clip(
              `Bagus. Jadi kata kunci hari ini adalah ${concept}.`,
              240,
            ),
            expression: "happy",
            // Bereaksi pada flag yang dinyalakan jawaban salah di atas. Teks
            // utama tetap dipakai bila siswa menjawab benar pada percobaan
            // pertama (flag masih `false`).
            ...(branching
              ? {
                  textVariants: [
                    {
                      when: { flag: FLAG_SALAH_PAPAN, is: true },
                      text: clip(
                        `Tidak apa-apa sempat menjawab {{jawaban}}. Kata kunci hari ini tetap ${concept}; sekarang kamu sudah menemukannya sendiri.`,
                        240,
                      ),
                      expression: "sad",
                    },
                  ],
                }
              : {}),
          },
          // Pendamping kedua menanggapi penjelasan mentor, bukan mengulangnya.
          ...(companionB === undefined
            ? []
            : [
                {
                  type: "dialogue" as const,
                  speakerId: companionB.id,
                  text: "Aku juga mau mencatat bagian pentingnya.",
                  expression: "thinking" as const,
                },
              ]),
        ],
      },
      {
        id: `sc_${number}_02`,
        title: "Penutup",
        beats: [
          {
            type: "transition",
            effect: "fade",
            text: `Suasana di ${tempat} kembali tenang.`,
          },
          {
            type: "narration",
            text: clip(
              `${playerName} menulis ${concept} di buku catatan sebagai hal baru yang dipelajari hari ini.`,
              240,
            ),
          },
          {
            type: "challenge",
            challengeId: notebookChallenge.id,
            ...(branching
              ? {
                  maxAttempts: 2,
                  onWrong: {
                    setFlags: { [FLAG_SALAH_CATATAN]: true },
                    retryQuestions: [
                      clip(
                        `Perhatikan lagi buku catatan ${playerName}. Hal baru apa yang baru saja dicatat?`,
                        300,
                      ),
                    ],
                    detour: [
                      {
                        type: "narration",
                        text: `${playerName} membuka buku catatannya dan membaca baris paling bawah.`,
                      },
                      {
                        type: "dialogue",
                        speakerId: mentorId,
                        text: "Tidak apa-apa. Lihat lagi catatan yang baru saja kamu tulis.",
                        expression: "thinking",
                      },
                    ],
                  },
                }
              : {}),
          },
          {
            type: "dialogue",
            speakerId: playerId,
            text: "Sekarang aku tahu kata kunci yang kita pelajari hari ini.",
            expression: "happy",
            ...(branching
              ? {
                  textVariants: [
                    {
                      when: { flag: FLAG_SALAH_CATATAN, is: true },
                      text: "Aku sempat lupa tadi, tapi sekarang catatanku sudah benar.",
                      expression: "thinking",
                    },
                  ],
                }
              : {}),
          },
          // Dialog NPC juga muncul di scene penutup, bukan hanya di pembuka.
          ...(companionA === undefined
            ? []
            : [
                {
                  type: "dialogue" as const,
                  speakerId: companionA.id,
                  text: clip(`Aku juga mencatat ${concept} hari ini.`, 240),
                  expression: "happy" as const,
                },
              ]),
          ...(recapChallenge === null
            ? []
            : [
                {
                  type: "dialogue" as const,
                  speakerId: mentorId,
                  text: clip(
                    `Satu soal lagi. Sebutkan istilah yang baru kita pelajari hari ini.`,
                    240,
                  ),
                  expression: "thinking" as const,
                },
                {
                  type: "challenge" as const,
                  challengeId: recapChallenge.id,
                },
                {
                  type: "dialogue" as const,
                  speakerId: playerId,
                  text: clip(`${concept}. Sekarang aku ingat.`, 240),
                  expression: "happy" as const,
                },
              ]),
        ],
      },
    ],
  };

  return {
    chapter,
    challenges:
      recapChallenge === null
        ? [boardChallenge, notebookChallenge]
        : [boardChallenge, notebookChallenge, recapChallenge],
  };
};

/* -------------------------------------------------------------------------- */
/* Cerita                                                                     */
/* -------------------------------------------------------------------------- */

const assetUsageOf = (
  chapters: readonly Chapter[],
  cast: readonly Character[],
) => {
  const backgrounds = new Set<string>();
  const music = new Set<string>();
  const sprites = new Set<string>();

  for (const chapter of chapters) {
    backgrounds.add(chapter.backgroundId);
    music.add(chapter.musicId);
  }
  for (const character of cast) sprites.add(character.spriteId);

  return {
    backgrounds: [...backgrounds].sort(),
    music: [...music].sort(),
    sprites: [...sprites].sort(),
  };
};

/**
 * Bangun cerita cadangan yang deterministik dan selalu valid.
 *
 * Bentuk input mengikuti `validation-and-repair.md`. Semua field opsional:
 * pemanggil yang kehabisan anggaran waktu boleh hanya memberi `reason`.
 */
export function buildFallbackStory(input: FallbackStoryInput = {}): Story {
  const safe: Record<string, unknown> = isRecord(input) ? input : {};
  const metaInput: Record<string, unknown> = isRecord(safe.meta)
    ? safe.meta
    : {};

  const concepts = normalizeConcepts(safe.concepts);
  const cast = normalizeCast(safe.castSeed);
  const mode: StoryMode | undefined =
    typeof metaInput.mode === "string" &&
    (STORY_MODES as readonly string[]).includes(metaInput.mode)
      ? (metaInput.mode as StoryMode)
      : undefined;
  const playerName =
    cast.find((entry) => entry.role === "player")?.name ?? DEFAULT_PLAYER.name;
  const mentorName =
    cast.find((entry) => entry.role === "mentor")?.name ?? DEFAULT_MENTOR.name;

  /**
   * Bentuk cerita mengikuti mode (ADR 0028):
   *
   * - `pertanyaan` — tepat 3 chapter supaya kuis tetap padat.
   * - `mix` — minimal 4 chapter, jadi cerita terasa lebih panjang.
   * - `menjelaskan` dan pemanggil lama — minimal 3 chapter, sebanyak konsep.
   */
  const chapterTarget =
    mode === "pertanyaan"
      ? MIN_CHAPTERS
      : mode === "mix"
        ? Math.max(4, concepts.length)
        : Math.max(MIN_CHAPTERS, concepts.length);
  const chapterCount = Math.min(MAX_CHAPTERS, chapterTarget);

  const chapters: Chapter[] = [];
  const challenges: Challenge[] = [];

  for (let index = 0; index < chapterCount; index += 1) {
    const concept = concepts[index % concepts.length];
    const built = buildChapter(
      concept,
      concepts,
      index,
      cast,
      playerName,
      mentorName,
      // Hanya chapter pertama yang memberi contoh percabangan supaya cerita
      // cadangan tetap ringkas dan seragam untuk konsep apa pun.
      index === 0,
      mode,
    );
    chapters.push(built.chapter);
    challenges.push(...built.challenges);
  }

  const title = text(metaInput.title, `Belajar Bersama: ${concepts[0]}`, 3, 80);
  const language = clean(metaInput.language);

  return {
    schemaVersion: "1.0",
    meta: {
      // Dibuat deterministik supaya builder tetap fungsi murni. Pipeline boleh
      // mengganti dengan id record-nya sendiri sebelum menyimpan.
      id: `st_fallback_${fingerprint(`${title}|${concepts.join("|")}`)}`,
      title,
      subject: text(metaInput.subject, DEFAULT_SUBJECT, 1, 40),
      gradeLevel: text(metaInput.gradeLevel, DEFAULT_GRADE, 1, 40),
      language: LANGUAGE_PATTERN.test(language) ? language : DEFAULT_LANGUAGE,
      tone: text(metaInput.tone, DEFAULT_TONE, 1, 60),
      ...(mode === undefined ? {} : { mode }),
      synopsis: clip(
        `Cerita cadangan tentang ${concepts.join(", ")}. ${playerName}, ${mentorName}, dan beberapa warga desa membahas konsep utamanya lewat percakapan singkat di desa.`,
        400,
      ),
      estimatedMinutes: integerInRange(
        metaInput.estimatedMinutes,
        3,
        30,
        DEFAULT_MINUTES,
      ),
    },
    source: {
      fileName: text(metaInput.fileName, DEFAULT_FILE_NAME, 1, 200),
      pageCount: integerInRange(metaInput.pageCount, 1, 40, 1),
      concepts,
      gaps: [],
    },
    cast,
    chapters,
    challenges,
    assetUsage: assetUsageOf(chapters, cast),
    flags: [
      { id: FLAG_SALAH_PAPAN, default: false },
      { id: FLAG_SALAH_CATATAN, default: false },
    ],
  };
}
