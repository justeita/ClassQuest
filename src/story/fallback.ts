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
 * - **Jujur.** Tidak mengarang fakta tentang PDF. Teks hanya menyebut *nama*
 *   konsep; penjelasan isi tetap tugas guru lewat editor. Penanda
 *   `usedFallback` hidup di record job, bukan di dalam `Story`
 *   (`validation-and-repair.md`).
 *
 * Karena itu cerita ini sengaja generik: satu chapter = satu konsep, dengan
 * pertanyaan "kata kunci apa yang ditulis di papan?" yang jawabannya ada di
 * cerita itu sendiri. Tidak ada klaim faktual tentang materi asli.
 */

import { fixedCast } from "./cast";
import type {
  Challenge,
  Chapter,
  Character,
  CharacterRole,
  Story,
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

/* -------------------------------------------------------------------------- */
/* Tantangan                                                                  */
/* -------------------------------------------------------------------------- */

/** Pilihan pengecoh yang tidak mengklaim apa pun tentang materi. */
const GENERIC_DISTRACTORS = [
  "Jadwal piket kelas",
  "Daftar hadir",
  "Kegiatan olahraga",
] as const;

/**
 * Flag cerita cadangan. Dua flag ini dinyalakan oleh jawaban salah pada dua
 * tantangan chapter pertama, lalu dibaca `textVariants` di dialog sesudahnya.
 * Id mengikuti pola `flg_[a-z0-9_]+` dan tidak menambah aset apa pun.
 */
const FLAG_SALAH_PAPAN = "flg_salah_papan";
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
  index: 1 | 2;
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
): { chapter: Chapter; challenges: Challenge[] } => {
  const number = String(index + 1).padStart(2, "0");
  const difficulty = ((index % 3) + 1) as 1 | 2 | 3;
  const playerId = idForRole(cast, "player");
  const mentorId = idForRole(cast, "mentor");

  const boardChallenge = buildChallenge({
    concept,
    concepts,
    chapterNumber: number,
    index: 1,
    difficulty,
    prompt: `${mentorName} menulis satu kata kunci di papan tulis. Kata kunci apa itu?`,
    explanation: `Kata kunci yang ditulis di papan adalah ${concept}. Itulah konsep yang dibahas di chapter ini.`,
    hint: `Perhatikan kalimat ${mentorName} sebelum papan tulis dibahas.`,
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

  const chapter: Chapter = {
    id: `ch_${number}`,
    title: clip(`Mengenal ${concept}`, 60),
    concept,
    summary: clip(
      `${playerName} dan ${mentorName} membahas ${concept} lewat percakapan singkat di kelas.`,
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
              `Bel berbunyi. ${playerName} dan ${mentorName} duduk di kelas untuk membahas ${concept}.`,
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
                        `Coba ingat lagi. Kata kunci apa yang barusan ditulis ${mentorName} di papan tulis?`,
                        300,
                      ),
                    ],
                    detour: [
                      {
                        type: "narration",
                        text: `${playerName} menatap papan tulis sekali lagi. Ada satu kata kunci yang baru saja disebut sebelum soal ini.`,
                      },
                      {
                        type: "dialogue",
                        speakerId: mentorId,
                        // `{{jawaban}}` diisi jawaban salah terakhir (ADR 0020),
                        // jadi cerita cadangan pun mengakui jawaban siswa.
                        text: "Kau menjawab {{jawaban}}. Tarik napas dulu, lalu baca ulang kalimat terakhir yang tadi kusebut.",
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
                    },
                  ],
                }
              : {}),
          },
        ],
      },
      {
        id: `sc_${number}_02`,
        title: "Penutup",
        beats: [
          {
            type: "transition",
            effect: "fade",
            text: "Suasana kelas kembali tenang.",
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
                    },
                  ],
                }
              : {}),
          },
        ],
      },
    ],
  };

  return { chapter, challenges: [boardChallenge, notebookChallenge] };
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
  const playerName =
    cast.find((entry) => entry.role === "player")?.name ?? DEFAULT_PLAYER.name;
  const mentorName =
    cast.find((entry) => entry.role === "mentor")?.name ?? DEFAULT_MENTOR.name;

  const chapterCount = Math.min(
    MAX_CHAPTERS,
    Math.max(MIN_CHAPTERS, concepts.length),
  );

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
      synopsis: clip(
        `Cerita cadangan tentang ${concepts.join(", ")}. ${playerName} dan ${mentorName} membahas beberapa konsep utamanya lewat percakapan singkat di kelas.`,
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
