/**
 * Validator cerita ClassQuest.
 *
 * Dua lapis, sesuai `docs/02-data-model/validation-rules.md`:
 *
 * 1. **Struktural** — `docs/02-data-model/story.schema.json` dijalankan dengan
 *    Ajv. Sumber bentuk tetap satu: schema dokumen. File ini hanya
 *    menerjemahkan error Ajv ke kode yang dilihat guru/AI.
 * 2. **Semantik** — referensi yang menggantung, cakupan konsep, keunikan id,
 *    aturan per tipe tantangan, `assetUsage`, dan warning penyebaran.
 *
 * Fungsi ini murni: tanpa I/O, jaringan, atau import khusus Node/server, supaya
 * bisa dipakai di browser (editor) dan server (pipeline). Manifest aset
 * di-inject pemanggil; kalau tidak diberikan, pemeriksaan keberadaan aset
 * dilewati dan dicatat di `skippedChecks`.
 */

import Ajv2020 from "ajv/dist/2020.js";

import storyJsonSchema from "../../docs/02-data-model/story.schema.json";
import type {
  AssetUsage,
  Beat,
  Challenge,
  Character,
  Chapter,
  DetourBeat,
  Scene,
  Story,
  TextVariant,
} from "./schema";

/* -------------------------------------------------------------------------- */
/* Kode dan bentuk hasil                                                      */
/* -------------------------------------------------------------------------- */

export const ERROR_CODES = [
  "E_JSON_PARSE",
  "E_SCHEMA",
  "E_SCHEMA_VERSION",
  "E_MISSING_FIELD",
  "E_DUPLICATE_ID",
  "E_CHAPTER_COUNT",
  "E_SCENE_COUNT",
  "E_BEAT_COUNT",
  "E_CHAPTER_NO_CHALLENGE",
  "E_ORPHAN_CHALLENGE",
  "E_DANGLING_CHALLENGE",
  "E_TRANSITION_LAST",
  "E_UNKNOWN_ASSET",
  "E_UNKNOWN_SPEAKER",
  "E_UNKNOWN_CONCEPT",
  "E_ASSET_USAGE_MISMATCH",
  "E_CAST_COUNT",
  "E_PLAYER_COUNT",
  "E_NO_MENTOR",
  "E_OPTION_COUNT",
  "E_CORRECT_OPTION",
  "E_ORDER_PERMUTATION",
  "E_EMPTY_ANSWERS",
  "E_DUPLICATE_CHALLENGE_REF",
  "E_TEXT_TOO_LONG",
  "E_TEXT_EMPTY",
  "E_RETRY_COUNT",
  "E_FLAG_UNDECLARED",
  "E_DETOUR_TOO_LONG",
  // Hanya muncul dari `validateChapter` (validate-parts.ts): `onWrong` wajib
  // bersama `maxAttempts` 2 atau 3. Validator cerita penuh tidak memeriksanya
  // lagi karena pipeline sudah menolak chapter ini lebih dulu.
  "E_ONWRONG_WITHOUT_ATTEMPTS",
  // Tidak ada di tabel dokumen (lihat laporan tugas): dibutuhkan oleh opsi
  // `pageCount`, jadi sengaja diekspor supaya konsumen bisa membedakannya.
  "E_PAGE_COUNT_MISMATCH",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const WARNING_CODES = [
  "W_CONCEPT_NOT_IN_CHAPTER",
  "W_NO_CHALLENGE_IN_SCENE",
  "W_DIFFICULTY_SKEW",
  "W_TRUE_FALSE_BIAS",
  "W_SHORT_ANSWER_ONLY",
  "W_LONG_DIALOGUE_RUN",
  "W_GAP_RECORDED",
  // Hanya muncul dari `validateChapter` (validate-parts.ts): flag `textVariants`
  // yang belum pernah di-set. Tidak diproduksi validator cerita penuh.
  "W_TEXT_VARIANT_FLAG_UNSET",
] as const;

export type WarningCode = (typeof WARNING_CODES)[number];

export type ValidationCode = ErrorCode | WarningCode;

export type ValidationIssue = {
  code: ValidationCode;
  severity: "error" | "warning";
  /** Path gaya dokumen, mis. `chapters[0].scenes[1].beats[2].text`. */
  path: string;
  /** Pesan bahasa Indonesia yang siap ditampilkan ke guru. */
  message: string;
  /** Instruksi singkat untuk prompt repair AI. */
  hint?: string;
};

export type SkippedCheck = "asset-existence" | "page-count";

export type ValidationResult = {
  /** `true` bila tidak ada error. Warning tidak memblokir. */
  ok: boolean;
  /** Cerita ternormalisasi; hanya diisi bila `ok` true. */
  story: Story | null;
  /** Maksimal 20, sesuai batas repair di validation-rules.md. */
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Pemeriksaan opsional yang tidak dijalankan karena input opsinya kosong. */
  skippedChecks: SkippedCheck[];
  /** Jumlah error yang dipotong karena batas 20. */
  truncatedErrorCount: number;
};

/* -------------------------------------------------------------------------- */
/* Manifest aset (di-inject)                                                  */
/* -------------------------------------------------------------------------- */

export type AssetKind = "background" | "character" | "music" | "sfx" | "ui";

/**
 * Bentuk minimal `AssetEntry` di `asset-manifest.md`. Manifest asli boleh punya
 * field lain (path, label, tags); validator hanya butuh `id` dan `kind`.
 */
export type ManifestAsset = {
  readonly id: string;
  readonly kind: AssetKind;
};

/**
 * `ASSETS` dari `src/assets/manifest.ts` bisa langsung diberikan. Urutan entri
 * tidak penting; yang dipakai validator hanya himpunan id per kind.
 */
export type AssetManifest = readonly ManifestAsset[];

export type ValidateStoryOptions = {
  /** Bila kosong, semua pemeriksaan keberadaan aset dilewati. */
  manifest?: AssetManifest;
  /** Jumlah halaman PDF asli. Bila diberikan, harus sama dengan `source.pageCount`. */
  pageCount?: number;
};

/* -------------------------------------------------------------------------- */
/* Utilitas path                                                              */
/* -------------------------------------------------------------------------- */

const decodePointerSegment = (segment: string) =>
  segment.replace(/~1/g, "/").replace(/~0/g, "~");

/** JSON pointer Ajv → path gaya dokumen (`/chapters/0/scenes/1` → `chapters[0].scenes[1]`). */
export const toFieldPath = (pointer: string): string => {
  if (!pointer) return "";

  let path = "";
  for (const segment of pointer.split("/").slice(1)) {
    const key = decodePointerSegment(segment);
    if (/^\d+$/.test(key)) {
      path += `[${key}]`;
    } else {
      path += path ? `.${key}` : key;
    }
  }
  return path;
};

const childPointer = (pointer: string, key: string) =>
  `${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;

const valueAtPointer = (data: unknown, pointer: string): unknown => {
  if (!pointer) return data;

  let current: unknown = data;
  for (const segment of pointer.split("/").slice(1)) {
    const key = decodePointerSegment(segment);
    if (Array.isArray(current)) {
      current = current[Number(key)];
    } else if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
};

const stringIdAt = (data: unknown, pointer: string, fallback: string) => {
  const value = valueAtPointer(data, childPointer(pointer, "id"));
  return typeof value === "string" && value ? value : fallback;
};

const textLength = (value: unknown) =>
  typeof value === "string" ? [...value].length : 0;

/* -------------------------------------------------------------------------- */
/* Lapis struktural: Ajv                                                     */
/* -------------------------------------------------------------------------- */

export type AjvIssue = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message?: string;
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
const storyValidator = ajv.compile(storyJsonSchema as object);

/**
 * Cabang `challenges[].oneOf` memakai `$ref`, sehingga Ajv tidak menuliskan
 * indeks cabang di `schemaPath`. Untuk memilih cabang yang benar, tiap varian
 * divalidasi sendiri memakai definisi yang sama dari schema dokumen.
 */
const CHALLENGE_VARIANT_BY_TYPE: Record<string, string> = {
  multiple_choice: "multipleChoice",
  true_false: "trueFalse",
  ordering: "ordering",
  short_answer: "shortAnswer",
};

const challengeVariantValidators = new Map(
  Object.values(CHALLENGE_VARIANT_BY_TYPE).map((name) => {
    const schemaId = (storyJsonSchema as { $id?: string }).$id ?? "";
    return [name, ajv.getSchema(`${schemaId}#/$defs/${name}`)];
  }),
);

const errorPath = (issue: AjvIssue): string => {
  if (issue.keyword === "required") {
    const missing = issue.params.missingProperty;
    if (typeof missing === "string") {
      return toFieldPath(childPointer(issue.instancePath, missing));
    }
  }

  if (issue.keyword === "additionalProperties") {
    const additional = issue.params.additionalProperty;
    if (typeof additional === "string") {
      return toFieldPath(childPointer(issue.instancePath, additional));
    }
  }

  return toFieldPath(issue.instancePath);
};

const countCodeFor = (path: string): ErrorCode | null => {
  if (path === "cast") return "E_CAST_COUNT";
  if (path === "chapters") return "E_CHAPTER_COUNT";
  if (/^chapters\[\d+\]\.scenes$/.test(path)) return "E_SCENE_COUNT";
  if (/^chapters\[\d+\]\.scenes\[\d+\]\.beats$/.test(path))
    return "E_BEAT_COUNT";
  // Payload per chapter (`{ chapter, challenges, continuity }`) yang divalidasi
  // `validateChapter` di `validate-parts.ts`; akar path-nya `chapter`, bukan
  // `chapters[i]`. Tidak dipakai `validateStory`.
  if (path === "chapter.scenes") return "E_SCENE_COUNT";
  if (/^chapter\.scenes\[\d+\]\.beats$/.test(path)) return "E_BEAT_COUNT";
  if (/^challenges\[\d+\]\.options$/.test(path)) return "E_OPTION_COUNT";
  if (/^challenges\[\d+\]\.acceptedAnswers$/.test(path))
    return "E_EMPTY_ANSWERS";
  if (/^challenges\[\d+\]\.correctOrder$/.test(path))
    return "E_ORDER_PERMUTATION";
  return null;
};

const countMessage = (
  code: ErrorCode,
  data: unknown,
  pointer: string,
  path: string,
): string => {
  const chapterPointer = pointer.replace(/\/scenes$/, "");
  const scenePointer = pointer.replace(/\/beats$/, "");
  const challengePointer = pointer.replace(
    /\/(options|acceptedAnswers|correctOrder)$/,
    "",
  );

  switch (code) {
    case "E_CAST_COUNT":
      return "Cerita harus punya 2–10 karakter.";
    case "E_CHAPTER_COUNT":
      return "Cerita harus punya 3–6 chapter.";
    case "E_SCENE_COUNT":
      return `Chapter "${stringIdAt(data, chapterPointer, path)}" harus punya 2–6 scene.`;
    case "E_BEAT_COUNT":
      return `Scene "${stringIdAt(data, scenePointer, path)}" harus punya 3–10 beat.`;
    case "E_OPTION_COUNT":
      return `Tantangan "${stringIdAt(data, challengePointer, path)}" harus punya 2–5 opsi.`;
    case "E_EMPTY_ANSWERS":
      return `Tantangan "${stringIdAt(data, challengePointer, path)}" harus punya minimal satu jawaban yang diterima.`;
    case "E_ORDER_PERMUTATION":
      return `Urutan jawaban tantangan "${stringIdAt(data, challengePointer, path)}" harus memuat semua item tepat sekali.`;
    default:
      return `Struktur cerita tidak lengkap pada bagian "${path}".`;
  }
};

const structuralIssue = (data: unknown, issue: AjvIssue): ValidationIssue => {
  const path = errorPath(issue);
  const limit = issue.params.limit;

  switch (issue.keyword) {
    case "required":
      return {
        code: "E_MISSING_FIELD",
        severity: "error",
        path,
        message: `Bagian "${path}" belum diisi.`,
        hint: `Tambahkan field ${path}.`,
      };

    case "maxLength":
      return {
        code: "E_TEXT_TOO_LONG",
        severity: "error",
        path,
        message:
          typeof limit === "number"
            ? `Teks pada bagian "${path}" ${textLength(valueAtPointer(data, issue.instancePath))} karakter, maksimal ${limit}.`
            : `Teks pada bagian "${path}" terlalu panjang.`,
        hint:
          typeof limit === "number"
            ? `Pendekkan ${path} menjadi maksimal ${limit} karakter tanpa menghilangkan fakta.`
            : `Pendekkan ${path}.`,
      };

    case "minLength":
      if (limit === 1) {
        return {
          code: "E_TEXT_EMPTY",
          severity: "error",
          path,
          message: `Bagian "${path}" belum diisi.`,
          hint: `Isi ${path} dengan teks yang bermakna.`,
        };
      }
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Teks pada bagian "${path}" minimal ${String(limit)} karakter.`,
        hint: `Perpanjang ${path} sampai minimal ${String(limit)} karakter.`,
      };

    case "minItems":
    case "maxItems": {
      const code = countCodeFor(toFieldPath(issue.instancePath));
      if (code) {
        return {
          code,
          severity: "error",
          path,
          message: countMessage(code, data, issue.instancePath, path),
          hint: countMessage(code, data, issue.instancePath, path),
        };
      }
      break;
    }

    case "additionalProperties":
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Field "${path}" tidak dikenal.`,
        hint: `Hapus field ${path} atau gunakan field yang ada di schema.`,
      };

    case "type":
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Bagian "${path}" memiliki tipe data yang salah.`,
        hint: `Perbaiki tipe data ${path}.`,
      };

    case "enum":
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Pilihan pada bagian "${path}" tidak dikenal.`,
        hint: `Ganti ${path} dengan salah satu nilai yang diizinkan schema.`,
      };

    case "pattern":
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Format bagian "${path}" tidak sesuai.`,
        hint: `Perbaiki format ${path}.`,
      };

    case "uniqueItems":
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Nilai pada bagian "${path}" tidak boleh berulang.`,
        hint: `Hapus nilai yang berulang di ${path}.`,
      };

    case "const":
      if (toFieldPath(issue.instancePath) === "schemaVersion") {
        return {
          code: "E_SCHEMA_VERSION",
          severity: "error",
          path,
          message: "Cerita dibuat dengan versi format yang tidak dikenal.",
          hint: 'Gunakan schemaVersion "1.0".',
        };
      }
      return {
        code: "E_SCHEMA",
        severity: "error",
        path,
        message: `Nilai bagian "${path}" tidak dikenal.`,
        hint: `Ganti ${path} dengan nilai yang diizinkan schema.`,
      };

    default:
      break;
  }

  if (toFieldPath(issue.instancePath).startsWith("schemaVersion")) {
    return {
      code: "E_SCHEMA_VERSION",
      severity: "error",
      path,
      message: "Cerita dibuat dengan versi format yang tidak dikenal.",
      hint: 'Gunakan schemaVersion "1.0".',
    };
  }

  return {
    code: "E_SCHEMA",
    severity: "error",
    path,
    message: `Struktur cerita tidak lengkap pada bagian "${path}".`,
    hint: `Perbaiki bagian ${path}.`,
  };
};

/**
 * Ganti error `oneOf` tantangan dengan error dari varian yang sesuai `type`.
 * Tanpa ini, satu field yang salah akan dilaporkan oleh keempat tipe tantangan
 * sekaligus. Kalau `type` tidak dikenal, cukup satu error struktur.
 */
const normalizeChallengeErrors = (
  data: unknown,
  errors: AjvIssue[],
): AjvIssue[] => {
  const challenges = (data as { challenges?: unknown } | null)?.challenges;
  if (!Array.isArray(challenges)) return errors;

  let next = errors;

  challenges.forEach((challenge, index) => {
    const base = `/challenges/${index}`;
    const related = errors.filter(
      (issue) =>
        issue.instancePath === base ||
        issue.instancePath.startsWith(`${base}/`),
    );
    if (related.length === 0) return;

    next = next.filter(
      (issue) =>
        !(
          issue.instancePath === base ||
          issue.instancePath.startsWith(`${base}/`)
        ),
    );

    const type =
      challenge && typeof challenge === "object"
        ? (challenge as { type?: unknown }).type
        : undefined;
    const variant =
      typeof type === "string" ? CHALLENGE_VARIANT_BY_TYPE[type] : undefined;
    const validateVariant = variant
      ? challengeVariantValidators.get(variant)
      : undefined;

    if (validateVariant) {
      if (!validateVariant(challenge)) {
        for (const issue of (validateVariant.errors ?? []) as AjvIssue[]) {
          next.push({
            ...issue,
            instancePath: `${base}${issue.instancePath}`,
          });
        }
      }
      return;
    }

    // `type` hilang atau tidak dikenal: jangan tampilkan error dari semua
    // cabang. Cukup satu error pada `type` (atau item itu sendiri bila bukan
    // objek) supaya guru/AI tahu apa yang harus diperbaiki lebih dulu.
    const concise = related.filter(
      (issue) =>
        issue.instancePath === `${base}/type` ||
        (issue.instancePath === base && issue.keyword === "type") ||
        (issue.instancePath === base &&
          issue.keyword === "required" &&
          issue.params.missingProperty === "type"),
    );
    next.push(
      ...(concise.length > 0
        ? concise
        : [
            {
              instancePath: base,
              schemaPath: "",
              keyword: "oneOf",
              params: {},
              message: "must match exactly one challenge type",
            },
          ]),
    );
  });

  return next;
};

/**
 * Ajv melaporkan error dari semua cabang `oneOf`. Untuk satu beat/tantangan,
 * cabang yang paling cocok dipilih supaya guru tidak melihat error dari empat
 * tipe tantangan sekaligus. Cabang dengan error paling sedikit menang; kalau
 * `type` sudah cocok, cabang itu yang dipakai.
 */
const selectBestOneOfBranch = (errors: AjvIssue[]): AjvIssue[] => {
  let selected = errors.filter((issue) => issue.keyword !== "oneOf");

  for (const group of errors.filter((issue) => issue.keyword === "oneOf")) {
    const prefix = `${group.schemaPath}/`;
    const branchErrors = selected.filter((issue) =>
      issue.schemaPath.startsWith(prefix),
    );
    if (branchErrors.length === 0) continue;

    const byBranch = new Map<number, AjvIssue[]>();
    for (const issue of branchErrors) {
      const rest = issue.schemaPath.slice(prefix.length);
      const index = Number(rest.split("/")[0]);
      if (!Number.isInteger(index)) continue;
      const bucket = byBranch.get(index) ?? [];
      bucket.push(issue);
      byBranch.set(index, bucket);
    }

    if (byBranch.size === 0) continue;

    const typeMatches = [...byBranch.entries()].filter(
      ([, issues]) =>
        !issues.some(
          (issue) =>
            issue.keyword === "const" && issue.instancePath.endsWith("/type"),
        ),
    );
    const candidates =
      typeMatches.length > 0 ? typeMatches : [...byBranch.entries()];

    candidates.sort((a, b) => a[1].length - b[1].length);
    const keep = new Set(candidates[0][1]);

    selected = selected.filter(
      (issue) => !branchErrors.includes(issue) || keep.has(issue),
    );
  }

  return selected;
};

const dedupeIssues = (issues: ValidationIssue[]): ValidationIssue[] => {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}\u0000${issue.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Terjemahkan error Ajv menjadi issue dokumen: pilih cabang `oneOf` yang paling
 * cocok, ringkas error tantangan, buang duplikat.
 *
 * Dipakai `validateStory` dan `validate-parts.ts`, supaya kedua jalur memakai
 * pemetaan kode dan path yang sama.
 */
export const issuesFromAjv = (
  data: unknown,
  errors: readonly AjvIssue[],
): ValidationIssue[] =>
  dedupeIssues(
    selectBestOneOfBranch(normalizeChallengeErrors(data, [...errors])).map(
      (issue) => structuralIssue(data, issue),
    ),
  );

/* -------------------------------------------------------------------------- */
/* Lapis semantik                                                             */
/* -------------------------------------------------------------------------- */

type ErrorCollector = (issue: ValidationIssue) => void;

export const errorIssue = (
  code: ErrorCode,
  path: string,
  message: string,
  hint: string,
): ValidationIssue => ({ code, severity: "error", path, message, hint });

export const warningIssue = (
  code: WarningCode,
  path: string,
  message: string,
): ValidationIssue => ({ code, severity: "warning", path, message });

const challengeRefsOf = (story: Story) => {
  const refs: {
    challengeId: string;
    chapterIndex: number;
    chapter: Chapter;
    chapterPointer: string;
    scene: Scene;
    scenePointer: string;
    beatPointer: string;
    beatIndex: number;
  }[] = [];

  story.chapters.forEach((chapter, chapterIndex) => {
    const chapterPointer = `/chapters/${chapterIndex}`;
    chapter.scenes.forEach((scene, sceneIndex) => {
      const scenePointer = `${chapterPointer}/scenes/${sceneIndex}`;
      scene.beats.forEach((beat, beatIndex) => {
        if (beat.type !== "challenge") return;
        refs.push({
          challengeId: beat.challengeId,
          chapterIndex,
          chapter,
          chapterPointer,
          scene,
          scenePointer,
          beatPointer: `${scenePointer}/beats/${beatIndex}`,
          beatIndex,
        });
      });
    });
  });

  return refs;
};

const checkDuplicateIds = (story: Story, report: ErrorCollector) => {
  const seen = new Set<string>();

  const claim = (id: string, path: string) => {
    if (seen.has(id)) {
      report(
        errorIssue(
          "E_DUPLICATE_ID",
          path,
          `Id "${id}" dipakai lebih dari sekali.`,
          `Id "${id}" dipakai lebih dari sekali; buat unik.`,
        ),
      );
      return;
    }
    seen.add(id);
  };

  claim(story.meta.id, "meta.id");
  story.flags?.forEach((flag, index) => {
    claim(flag.id, `flags[${index}].id`);
  });
  story.cast.forEach((character, index) => {
    claim(character.id, `cast[${index}].id`);
  });
  story.chapters.forEach((chapter, chapterIndex) => {
    claim(chapter.id, `chapters[${chapterIndex}].id`);
    chapter.scenes.forEach((scene, sceneIndex) => {
      claim(scene.id, `chapters[${chapterIndex}].scenes[${sceneIndex}].id`);
    });
  });
  story.challenges.forEach((challenge, index) => {
    claim(challenge.id, `challenges[${index}].id`);

    if (challenge.type === "multiple_choice") {
      const optionIds = new Set<string>();
      challenge.options.forEach((option, optionIndex) => {
        const path = `challenges[${index}].options[${optionIndex}].id`;
        if (optionIds.has(option.id)) {
          report(
            errorIssue(
              "E_DUPLICATE_ID",
              path,
              `Id opsi "${option.id}" dipakai lebih dari sekali dalam tantangan ini.`,
              `Id "${option.id}" dipakai lebih dari sekali; buat unik.`,
            ),
          );
        }
        optionIds.add(option.id);
      });
    }

    if (challenge.type === "ordering") {
      const itemIds = new Set<string>();
      challenge.items.forEach((item, itemIndex) => {
        const path = `challenges[${index}].items[${itemIndex}].id`;
        if (itemIds.has(item.id)) {
          report(
            errorIssue(
              "E_DUPLICATE_ID",
              path,
              `Id item "${item.id}" dipakai lebih dari sekali dalam tantangan ini.`,
              `Id "${item.id}" dipakai lebih dari sekali; buat unik.`,
            ),
          );
        }
        itemIds.add(item.id);
      });
    }
  });
};

const checkReferences = (
  story: Story,
  options: ValidateStoryOptions,
  report: ErrorCollector,
) => {
  const castIds = new Set(story.cast.map((character) => character.id));
  const challengeIds = new Set(
    story.challenges.map((challenge) => challenge.id),
  );
  const concepts = new Set(story.source.concepts);

  story.chapters.forEach((chapter, chapterIndex) => {
    const chapterPath = `chapters[${chapterIndex}]`;

    if (!concepts.has(chapter.concept)) {
      report(
        errorIssue(
          "E_UNKNOWN_CONCEPT",
          `${chapterPath}.concept`,
          `Konsep "${chapter.concept}" tidak ada di daftar konsep materi.`,
          `"${chapter.concept}" tidak ada di source.concepts.`,
        ),
      );
    }

    chapter.scenes.forEach((scene, sceneIndex) => {
      const scenePath = `${chapterPath}.scenes[${sceneIndex}]`;

      if (options.manifest) {
        checkAssetExists(
          options.manifest,
          "background",
          chapter.backgroundId,
          `${chapterPath}.backgroundId`,
          report,
        );
        checkAssetExists(
          options.manifest,
          "music",
          chapter.musicId,
          `${chapterPath}.musicId`,
          report,
        );

        if (scene.backgroundId) {
          checkAssetExists(
            options.manifest,
            "background",
            scene.backgroundId,
            `${scenePath}.backgroundId`,
            report,
          );
        }
        if (scene.musicId) {
          checkAssetExists(
            options.manifest,
            "music",
            scene.musicId,
            `${scenePath}.musicId`,
            report,
          );
        }
      }

      scene.beats.forEach((beat, beatIndex) => {
        const beatPath = `${scenePath}.beats[${beatIndex}]`;

        if (beat.type === "dialogue" && !castIds.has(beat.speakerId)) {
          report(
            errorIssue(
              "E_UNKNOWN_SPEAKER",
              `${beatPath}.speakerId`,
              `Karakter "${beat.speakerId}" tidak ada di daftar cast.`,
              `"${beat.speakerId}" tidak ada di cast.`,
            ),
          );
        }

        if (beat.type === "challenge" && !challengeIds.has(beat.challengeId)) {
          report(
            errorIssue(
              "E_DANGLING_CHALLENGE",
              `${beatPath}.challengeId`,
              `Beat ini merujuk tantangan "${beat.challengeId}" yang tidak ada.`,
              `challengeId "${beat.challengeId}" tidak ada di daftar challenges.`,
            ),
          );
        }

        if (beat.type === "challenge" && beat.onWrong?.detour) {
          beat.onWrong.detour.forEach((detourBeat, detourIndex) => {
            if (
              detourBeat.type === "dialogue" &&
              !castIds.has(detourBeat.speakerId)
            ) {
              report(
                errorIssue(
                  "E_UNKNOWN_SPEAKER",
                  `${beatPath}.onWrong.detour[${detourIndex}].speakerId`,
                  `Karakter "${detourBeat.speakerId}" tidak ada di daftar cast.`,
                  `"${detourBeat.speakerId}" tidak ada di cast.`,
                ),
              );
            }
          });
        }
      });
    });
  });

  story.challenges.forEach((challenge, index) => {
    if (!concepts.has(challenge.conceptTag)) {
      report(
        errorIssue(
          "E_UNKNOWN_CONCEPT",
          `challenges[${index}].conceptTag`,
          `Konsep "${challenge.conceptTag}" tidak ada di daftar konsep materi.`,
          `"${challenge.conceptTag}" tidak ada di source.concepts.`,
        ),
      );
    }
  });

  story.cast.forEach((character, index) => {
    if (options.manifest) {
      checkAssetExists(
        options.manifest,
        "character",
        character.spriteId,
        `cast[${index}].spriteId`,
        report,
      );
    }
  });

  if (options.manifest) {
    checkAssetUsage(story.assetUsage, options.manifest, report);
  }
};

const manifestIdsByKind = (manifest: AssetManifest) => {
  const ids: Record<AssetKind, Set<string>> = {
    background: new Set(),
    character: new Set(),
    music: new Set(),
    sfx: new Set(),
    ui: new Set(),
  };

  for (const asset of manifest) {
    if (asset && typeof asset.id === "string" && asset.kind in ids) {
      ids[asset.kind].add(asset.id);
    }
  }

  return ids;
};

export const checkAssetExists = (
  manifest: AssetManifest,
  kind: AssetKind,
  id: string,
  path: string,
  report: ErrorCollector,
) => {
  const ids = manifestIdsByKind(manifest)[kind];
  if (!ids.has(id)) {
    report(
      errorIssue(
        "E_UNKNOWN_ASSET",
        path,
        `Aset "${id}" tidak ada di daftar aset yang tersedia.`,
        `"${id}" bukan aset yang tersedia. Pilih dari daftar.`,
      ),
    );
  }
};

const checkAssetUsage = (
  assetUsage: AssetUsage,
  manifest: AssetManifest,
  report: ErrorCollector,
) => {
  const ids = manifestIdsByKind(manifest);
  const groups: { key: keyof AssetUsage; kind: AssetKind }[] = [
    { key: "backgrounds", kind: "background" },
    { key: "music", kind: "music" },
    { key: "sprites", kind: "character" },
  ];

  for (const group of groups) {
    assetUsage[group.key].forEach((id, index) => {
      if (!ids[group.kind].has(id)) {
        report(
          errorIssue(
            "E_UNKNOWN_ASSET",
            `assetUsage.${group.key}[${index}]`,
            `Aset "${id}" tidak ada di daftar aset yang tersedia.`,
            `"${id}" bukan aset yang tersedia. Pilih dari daftar.`,
          ),
        );
      }
    });
  }
};

const checkStructureRules = (story: Story, report: ErrorCollector) => {
  const refs = challengeRefsOf(story);
  const refsByChallenge = new Map<string, typeof refs>();

  for (const ref of refs) {
    const bucket = refsByChallenge.get(ref.challengeId) ?? [];
    bucket.push(ref);
    refsByChallenge.set(ref.challengeId, bucket);
  }

  story.chapters.forEach((chapter, chapterIndex) => {
    const chapterRefs = refs.filter((ref) => ref.chapterIndex === chapterIndex);
    if (chapterRefs.length === 0) {
      report(
        errorIssue(
          "E_CHAPTER_NO_CHALLENGE",
          `chapters[${chapterIndex}]`,
          `Chapter "${chapter.id}" belum punya satu pun tantangan.`,
          `Tambahkan minimal satu beat challenge di chapter ${chapter.id}.`,
        ),
      );
    }

    chapter.scenes.forEach((scene, sceneIndex) => {
      const lastBeat = scene.beats.at(-1);
      if (lastBeat?.type === "transition") {
        report(
          errorIssue(
            "E_TRANSITION_LAST",
            `chapters[${chapterIndex}].scenes[${sceneIndex}].beats[${scene.beats.length - 1}]`,
            `Scene "${scene.id}" diakhiri transisi; transisi tidak boleh menjadi beat terakhir.`,
            `Hapus transition di akhir scene ${scene.id}.`,
          ),
        );
      }
    });
  });

  story.challenges.forEach((challenge, index) => {
    const usedIn = refsByChallenge.get(challenge.id) ?? [];

    if (usedIn.length === 0) {
      report(
        errorIssue(
          "E_ORPHAN_CHALLENGE",
          `challenges[${index}].id`,
          `Tantangan "${challenge.id}" dideklarasikan tetapi tidak dipakai.`,
          `Tantangan "${challenge.id}" tidak dipakai; rujuk dari sebuah beat atau hapus.`,
        ),
      );
    }

    for (const ref of usedIn.slice(1)) {
      report(
        errorIssue(
          "E_DUPLICATE_CHALLENGE_REF",
          `${toFieldPath(ref.beatPointer)}.challengeId`,
          `Tantangan "${challenge.id}" dirujuk lebih dari sekali.`,
          `Rujuk tantangan "${challenge.id}" hanya sekali.`,
        ),
      );
    }
  });
};

const checkChallengeRules = (story: Story, report: ErrorCollector) => {
  story.challenges.forEach((challenge, index) => {
    if (challenge.type === "multiple_choice") {
      const optionIds = new Set(challenge.options.map((option) => option.id));
      if (!optionIds.has(challenge.correctOptionId)) {
        report(
          errorIssue(
            "E_CORRECT_OPTION",
            `challenges[${index}].correctOptionId`,
            `Jawaban benar tantangan "${challenge.id}" bukan salah satu opsi.`,
            `correctOptionId harus salah satu options[].id.`,
          ),
        );
      }
    }

    if (challenge.type === "ordering") {
      const itemIds = challenge.items.map((item) => item.id);
      const order = challenge.correctOrder;
      const expected = new Set(itemIds);
      const actual = new Set(order);
      const isPermutation =
        order.length === itemIds.length &&
        actual.size === expected.size &&
        [...expected].every((id) => actual.has(id));

      if (!isPermutation) {
        report(
          errorIssue(
            "E_ORDER_PERMUTATION",
            `challenges[${index}].correctOrder`,
            `Urutan jawaban tantangan "${challenge.id}" bukan permutasi lengkap dari item.`,
            `correctOrder harus memuat semua item tepat sekali.`,
          ),
        );
      }
    }
  });
};

/**
 * Aturan percabangan "konsekuensi jawaban salah" (opsional, semuanya aditif
 * terhadap kontrak v1.0). Struktur `onWrong` sendiri sudah dijaga schema;
 * fungsi ini memeriksa hal yang butuh konteks seluruh cerita: deklarasi flag,
 * jumlah teks soal ulang, dan panjang detour.
 */
const checkBranchingRules = (story: Story, report: ErrorCollector) => {
  const declaredFlags = new Set((story.flags ?? []).map((flag) => flag.id));

  const rejectUndeclaredFlag = (flagId: string, path: string) => {
    if (declaredFlags.has(flagId)) return;
    report(
      errorIssue(
        "E_FLAG_UNDECLARED",
        path,
        `Flag "${flagId}" dipakai tetapi tidak dideklarasikan di daftar flags.`,
        `Tambahkan "${flagId}" ke flags atau ganti dengan flag yang sudah ada.`,
      ),
    );
  };

  story.chapters.forEach((chapter, chapterIndex) => {
    chapter.scenes.forEach((scene, sceneIndex) => {
      scene.beats.forEach((beat, beatIndex) => {
        const beatPath = `chapters[${chapterIndex}].scenes[${sceneIndex}].beats[${beatIndex}]`;

        if (beat.type === "dialogue") {
          beat.textVariants?.forEach((variant, variantIndex) => {
            rejectUndeclaredFlag(
              variant.when.flag,
              `${beatPath}.textVariants[${variantIndex}].when.flag`,
            );
          });
          return;
        }

        if (beat.type !== "challenge") return;

        const maxAttempts = beat.maxAttempts ?? 1;
        const expectedRetries = maxAttempts - 1;
        const retryQuestions = beat.onWrong?.retryQuestions ?? [];

        if (retryQuestions.length !== expectedRetries) {
          report(
            errorIssue(
              "E_RETRY_COUNT",
              `${beatPath}.onWrong.retryQuestions`,
              `Tantangan "${beat.challengeId}" memakai ${maxAttempts} percobaan, jadi butuh ${expectedRetries} teks soal ulang, bukan ${retryQuestions.length}.`,
              `Isi retryQuestions tepat ${expectedRetries} entri.`,
            ),
          );
        }

        if (beat.onWrong?.setFlags) {
          for (const flagId of Object.keys(beat.onWrong.setFlags)) {
            rejectUndeclaredFlag(
              flagId,
              `${beatPath}.onWrong.setFlags.${flagId}`,
            );
          }
        }

        const detour = beat.onWrong?.detour ?? [];

        if (detour.length > 3) {
          report(
            errorIssue(
              "E_DETOUR_TOO_LONG",
              `${beatPath}.onWrong.detour`,
              `Detour tantangan "${beat.challengeId}" berisi ${detour.length} beat, maksimal 3.`,
              "Pendekkan detour menjadi maksimal 3 beat narasi/dialog.",
            ),
          );
        }

        detour.forEach((detourBeat, detourIndex) => {
          if (detourBeat.type !== "dialogue") return;
          detourBeat.textVariants?.forEach((variant, variantIndex) => {
            rejectUndeclaredFlag(
              variant.when.flag,
              `${beatPath}.onWrong.detour[${detourIndex}].textVariants[${variantIndex}].when.flag`,
            );
          });
        });
      });
    });
  });
};

const checkCastRules = (story: Story, report: ErrorCollector) => {
  const players = story.cast.filter((character) => character.role === "player");
  if (players.length !== 1) {
    report(
      errorIssue(
        "E_PLAYER_COUNT",
        "cast",
        "Cerita harus punya tepat satu karakter pemain.",
        'Tandai tepat satu karakter sebagai role "player".',
      ),
    );
  }

  if (!story.cast.some((character) => character.role === "mentor")) {
    report(
      errorIssue(
        "E_NO_MENTOR",
        "cast",
        "Cerita harus punya minimal satu karakter mentor.",
        'Tambahkan satu karakter dengan role "mentor".',
      ),
    );
  }
};

const checkAssetUsageConsistency = (story: Story, report: ErrorCollector) => {
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

  const sprites = new Set(story.cast.map((character) => character.spriteId));

  const groups: {
    key: keyof AssetUsage;
    expected: Set<string>;
  }[] = [
    { key: "backgrounds", expected: backgrounds },
    { key: "music", expected: music },
    { key: "sprites", expected: sprites },
  ];

  for (const group of groups) {
    const actual = story.assetUsage[group.key];
    const same =
      actual.length === group.expected.size &&
      actual.every((id) => group.expected.has(id));

    if (!same) {
      report(
        errorIssue(
          "E_ASSET_USAGE_MISMATCH",
          `assetUsage.${group.key}`,
          `Daftar aset "${group.key}" tidak sama dengan aset yang dipakai cerita.`,
          "Perbarui assetUsage agar sama dengan aset yang dipakai.",
        ),
      );
    }
  }
};

const checkPageCount = (
  story: Story,
  options: ValidateStoryOptions,
  report: ErrorCollector,
) => {
  if (options.pageCount === undefined) return;
  if (story.source.pageCount === options.pageCount) return;

  report(
    errorIssue(
      "E_PAGE_COUNT_MISMATCH",
      "source.pageCount",
      `Jumlah halaman cerita (${story.source.pageCount}) tidak sama dengan jumlah halaman materi (${options.pageCount}).`,
      `Samakan source.pageCount dengan jumlah halaman PDF (${options.pageCount}).`,
    ),
  );
};

/* -------------------------------------------------------------------------- */
/* Warning                                                                    */
/* -------------------------------------------------------------------------- */

const collectWarnings = (story: Story): ValidationIssue[] => {
  const warnings: ValidationIssue[] = [];
  const refs = challengeRefsOf(story);
  const chapterByChallenge = new Map<string, Chapter>();

  for (const ref of refs) {
    if (!chapterByChallenge.has(ref.challengeId)) {
      chapterByChallenge.set(ref.challengeId, ref.chapter);
    }
  }

  story.challenges.forEach((challenge, index) => {
    const chapter = chapterByChallenge.get(challenge.id);
    if (chapter && chapter.concept !== challenge.conceptTag) {
      warnings.push(
        warningIssue(
          "W_CONCEPT_NOT_IN_CHAPTER",
          `challenges[${index}].conceptTag`,
          `Tantangan "${challenge.id}" memakai konsep "${challenge.conceptTag}" di luar konsep chapter "${chapter.concept}".`,
        ),
      );
    }
  });

  story.chapters.forEach((chapter, chapterIndex) => {
    chapter.scenes.forEach((scene, sceneIndex) => {
      const hasChallenge = scene.beats.some(
        (beat) => beat.type === "challenge",
      );
      if (!hasChallenge) {
        warnings.push(
          warningIssue(
            "W_NO_CHALLENGE_IN_SCENE",
            `chapters[${chapterIndex}].scenes[${sceneIndex}]`,
            `Scene "${scene.id}" tidak punya tantangan.`,
          ),
        );
      }
    });
  });

  if (story.challenges.length > 0) {
    const difficulties = new Set(
      story.challenges.map((challenge) => challenge.difficulty),
    );
    if (difficulties.size === 1) {
      const level = [...difficulties][0];
      if (level === 1 || level === 3) {
        warnings.push(
          warningIssue(
            "W_DIFFICULTY_SKEW",
            "challenges",
            `Semua tantangan memakai tingkat kesulitan ${level}.`,
          ),
        );
      }
    }
  }

  const trueFalse = story.challenges.filter(
    (challenge) => challenge.type === "true_false",
  );
  if (trueFalse.length > 0) {
    const trueCount = trueFalse.filter(
      (challenge) => challenge.type === "true_false" && challenge.correctAnswer,
    ).length;
    const ratio = trueCount / trueFalse.length;
    if (ratio > 0.7 || 1 - ratio > 0.7) {
      warnings.push(
        warningIssue(
          "W_TRUE_FALSE_BIAS",
          "challenges",
          `Sebagian besar soal benar-salah memiliki jawaban ${ratio > 0.7 ? "benar" : "salah"}.`,
        ),
      );
    }
  }

  story.chapters.forEach((chapter, chapterIndex) => {
    const chapterRefs = refs.filter((ref) => ref.chapterIndex === chapterIndex);
    if (chapterRefs.length === 0) return;

    const types = chapterRefs.map(
      (ref) => story.challenges.find((c) => c.id === ref.challengeId)?.type,
    );
    if (types.length > 0 && types.every((type) => type === "short_answer")) {
      warnings.push(
        warningIssue(
          "W_SHORT_ANSWER_ONLY",
          `chapters[${chapterIndex}]`,
          `Chapter "${chapter.id}" hanya berisi soal jawaban singkat.`,
        ),
      );
    }
  });

  let dialogueRun = 0;
  let runReported = false;
  story.chapters.forEach((chapter, chapterIndex) => {
    chapter.scenes.forEach((scene, sceneIndex) => {
      scene.beats.forEach((beat, beatIndex) => {
        if (beat.type === "narration" || beat.type === "dialogue") {
          dialogueRun += 1;
          if (dialogueRun > 6 && !runReported) {
            runReported = true;
            warnings.push(
              warningIssue(
                "W_LONG_DIALOGUE_RUN",
                `chapters[${chapterIndex}].scenes[${sceneIndex}].beats[${beatIndex}]`,
                "Ada lebih dari 6 beat dialog/narasi berturut-turut tanpa interaksi.",
              ),
            );
          }
        } else {
          dialogueRun = 0;
          runReported = false;
        }
      });
    });
  });

  if (story.source.gaps && story.source.gaps.length > 0) {
    warnings.push(
      warningIssue(
        "W_GAP_RECORDED",
        "source.gaps",
        `Materi mencatat ${story.source.gaps.length} kekurangan yang perlu dicek.`,
      ),
    );
  }

  return warnings;
};

/* -------------------------------------------------------------------------- */
/* Normalisasi                                                                */
/* -------------------------------------------------------------------------- */

/** Buang karakter kontrol, rapikan spasi ganda, lalu trim. */
export const tidyText = (value: string): string =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tidyOptional = (value: string | undefined) =>
  value === undefined ? undefined : tidyText(value);

const normalizeTextVariants = (
  variants: readonly TextVariant[] | undefined,
): TextVariant[] | undefined =>
  variants?.map((variant) => ({
    when: { flag: variant.when.flag, is: variant.when.is },
    text: tidyText(variant.text),
  }));

const normalizeDetourBeat = (beat: DetourBeat): DetourBeat => {
  switch (beat.type) {
    case "narration":
      return { type: "narration", text: tidyText(beat.text) };
    case "dialogue": {
      const textVariants = normalizeTextVariants(beat.textVariants);
      return {
        type: "dialogue",
        speakerId: beat.speakerId,
        text: tidyText(beat.text),
        ...(textVariants === undefined ? {} : { textVariants }),
      };
    }
  }
};

const normalizeBeat = (beat: Beat): Beat => {
  switch (beat.type) {
    case "narration":
      return { type: "narration", text: tidyText(beat.text) };
    case "dialogue": {
      const textVariants = normalizeTextVariants(beat.textVariants);
      return {
        type: "dialogue",
        speakerId: beat.speakerId,
        text: tidyText(beat.text),
        ...(textVariants === undefined ? {} : { textVariants }),
      };
    }
    case "challenge": {
      const onWrong =
        beat.onWrong === undefined
          ? undefined
          : {
              ...(beat.onWrong.setFlags === undefined
                ? {}
                : { setFlags: { ...beat.onWrong.setFlags } }),
              ...(beat.onWrong.retryQuestions === undefined
                ? {}
                : {
                    retryQuestions: beat.onWrong.retryQuestions.map(tidyText),
                  }),
              ...(beat.onWrong.detour === undefined
                ? {}
                : { detour: beat.onWrong.detour.map(normalizeDetourBeat) }),
            };

      return {
        type: "challenge",
        challengeId: beat.challengeId,
        ...(beat.maxAttempts === undefined
          ? {}
          : { maxAttempts: beat.maxAttempts }),
        ...(onWrong === undefined ? {} : { onWrong }),
      };
    }
    case "transition": {
      const text = tidyOptional(beat.text);
      return {
        type: "transition",
        effect: beat.effect,
        ...(text === undefined ? {} : { text }),
      };
    }
  }
};

const normalizeChallenge = (challenge: Challenge): Challenge => {
  const base = {
    id: challenge.id,
    prompt: tidyText(challenge.prompt),
    conceptTag: tidyText(challenge.conceptTag),
    difficulty: challenge.difficulty,
    explanation: tidyText(challenge.explanation),
    ...(challenge.hints === undefined
      ? {}
      : { hints: challenge.hints.map(tidyText) }),
    points: challenge.points ?? 10,
  };

  switch (challenge.type) {
    case "multiple_choice":
      return {
        ...base,
        type: "multiple_choice",
        options: challenge.options.map((option) => ({
          id: option.id,
          text: tidyText(option.text),
        })),
        correctOptionId: challenge.correctOptionId,
      };
    case "true_false":
      return {
        ...base,
        type: "true_false",
        statement: tidyText(challenge.statement),
        correctAnswer: challenge.correctAnswer,
      };
    case "ordering":
      return {
        ...base,
        type: "ordering",
        items: challenge.items.map((item) => ({
          id: item.id,
          text: tidyText(item.text),
        })),
        correctOrder: [...challenge.correctOrder],
      };
    case "short_answer":
      return {
        ...base,
        type: "short_answer",
        acceptedAnswers: challenge.acceptedAnswers.map(tidyText),
        ...(challenge.caseSensitive === undefined
          ? {}
          : { caseSensitive: challenge.caseSensitive }),
      };
  }
};

const normalizeCharacter = (character: Character): Character => ({
  id: character.id,
  name: tidyText(character.name),
  role: character.role,
  spriteId: character.spriteId,
  ...(character.description === undefined
    ? {}
    : { description: tidyText(character.description) }),
});

const normalizeScene = (scene: Scene): Scene => ({
  id: scene.id,
  ...(scene.title === undefined ? {} : { title: tidyText(scene.title) }),
  ...(scene.backgroundId === undefined
    ? {}
    : { backgroundId: scene.backgroundId }),
  ...(scene.musicId === undefined ? {} : { musicId: scene.musicId }),
  beats: scene.beats.map(normalizeBeat),
});

const normalizeChapter = (chapter: Chapter): Chapter => ({
  id: chapter.id,
  title: tidyText(chapter.title),
  concept: tidyText(chapter.concept),
  summary: tidyText(chapter.summary),
  backgroundId: chapter.backgroundId,
  musicId: chapter.musicId,
  scenes: chapter.scenes.map(normalizeScene),
});

const sortedUnique = (values: readonly string[]): string[] =>
  [...new Set(values)].sort();

const normalizeStory = (story: Story): Story => ({
  schemaVersion: story.schemaVersion,
  meta: {
    id: story.meta.id,
    title: tidyText(story.meta.title),
    subject: tidyText(story.meta.subject),
    gradeLevel: tidyText(story.meta.gradeLevel),
    language: story.meta.language,
    tone: tidyText(story.meta.tone),
    synopsis: tidyText(story.meta.synopsis),
    estimatedMinutes: story.meta.estimatedMinutes,
  },
  source: {
    fileName: tidyText(story.source.fileName),
    pageCount: story.source.pageCount,
    concepts: story.source.concepts.map(tidyText),
    ...(story.source.gaps === undefined
      ? {}
      : { gaps: story.source.gaps.map(tidyText) }),
  },
  cast: story.cast.map(normalizeCharacter),
  chapters: story.chapters.map(normalizeChapter),
  challenges: story.challenges.map(normalizeChallenge),
  assetUsage: {
    backgrounds: sortedUnique(story.assetUsage.backgrounds),
    music: sortedUnique(story.assetUsage.music),
    sprites: sortedUnique(story.assetUsage.sprites),
  },
  ...(story.flags === undefined
    ? {}
    : {
        flags: story.flags.map((flag) => ({
          id: flag.id,
          default: flag.default,
        })),
      }),
  ...(story.scoring === undefined
    ? {}
    : { scoring: { basis: story.scoring.basis } }),
});

/* -------------------------------------------------------------------------- */
/* API publik                                                                 */
/* -------------------------------------------------------------------------- */

const JSON_PARSE_ISSUE: ValidationIssue = {
  code: "E_JSON_PARSE",
  severity: "error",
  path: "",
  message: "Hasil AI tidak bisa dibaca. Coba buat ulang.",
  hint: "Kembalikan JSON lengkap yang valid, bukan teks lain atau diff.",
};

/**
 * Validasi cerita. Menerima objek mentah atau string JSON.
 *
 * Input tidak pernah diubah. Cerita ternormalisasi hanya dikembalikan bila
 * tidak ada error.
 */
export function validateStory(
  input: unknown,
  options: ValidateStoryOptions = {},
): ValidationResult {
  const skippedChecks: SkippedCheck[] = [];
  if (!options.manifest) skippedChecks.push("asset-existence");
  if (options.pageCount === undefined) skippedChecks.push("page-count");

  let value: unknown = input;

  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return {
        ok: false,
        story: null,
        errors: [JSON_PARSE_ISSUE],
        warnings: [],
        skippedChecks,
        truncatedErrorCount: 0,
      };
    }
  }

  if (!storyValidator(value)) {
    const ajvErrors = (storyValidator.errors ?? []) as AjvIssue[];
    const issues = issuesFromAjv(value, ajvErrors);

    return {
      ok: false,
      story: null,
      errors: issues.slice(0, 20),
      warnings: [],
      skippedChecks,
      truncatedErrorCount: Math.max(0, issues.length - 20),
    };
  }

  const story = value as Story;
  const errors: ValidationIssue[] = [];
  const report: ErrorCollector = (issue) => errors.push(issue);

  // Urutan mengikuti validation-rules.md bagian "Urutan pemeriksaan".
  checkDuplicateIds(story, report);
  checkReferences(story, options, report);
  checkStructureRules(story, report);
  checkChallengeRules(story, report);
  checkBranchingRules(story, report);
  checkCastRules(story, report);
  checkAssetUsageConsistency(story, report);
  checkPageCount(story, options, report);

  const issues = dedupeIssues(errors);
  const ok = issues.length === 0;
  const warnings = ok ? collectWarnings(story) : [];

  return {
    ok,
    story: ok ? normalizeStory(story) : null,
    errors: issues.slice(0, 20),
    warnings,
    skippedChecks,
    truncatedErrorCount: Math.max(0, issues.length - 20),
  };
}
