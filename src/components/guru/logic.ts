/**
 * Logika murni Portal Guru.
 *
 * Dipisahkan dari komponen supaya bisa diuji tanpa DOM: penyaringan materi,
 * penyusunan prompt untuk LLM eksternal, dan pembacaan berkas. Semua fungsi di
 * sini deterministik dan tidak menyentuh jaringan. Bagian draf AI Studio di
 * bawah memang membaca `localStorage`/`sessionStorage`, tetapi hanya lewat
 * fungsi kecil ber-guard `typeof window` sehingga tetap aman dipanggil saat
 * render di server.
 */

import {
  THEMES,
  THEME_KEYS,
  type Material,
  type MaterialFormat,
  type ThemeKey,
} from "./data";

/** Batas unggah yang ditampilkan di form (desain awal: 10 MB). */
export const MAX_FILE_SIZE_MB = 10;

export type MaterialFilter = {
  query: string;
  subject: string;
  grade: string;
  format: "" | MaterialFormat;
};

export const EMPTY_FILTER: MaterialFilter = {
  query: "",
  subject: "",
  grade: "",
  format: "",
};

/**
 * Saring daftar materi. Kueri dicocokkan ke nama berkas **dan** deskripsi,
 * mengikuti perilaku form awal; filter kosong berarti "semua".
 */
export function filterMaterials(
  items: readonly Material[],
  filter: MaterialFilter,
): Material[] {
  const query = filter.query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery =
      query === "" ||
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    const matchesSubject =
      filter.subject === "" || item.subject === filter.subject;
    const matchesGrade = filter.grade === "" || item.grade === filter.grade;
    const matchesFormat = filter.format === "" || item.format === filter.format;

    return matchesQuery && matchesSubject && matchesGrade && matchesFormat;
  });
}

export type PromptInput = {
  subject: string;
  grade: string;
  objective: string;
  theme: ThemeKey;
};

/** Prompt siap tempel untuk ChatGPT/Claude (mode "AI Luar Website"). */
export function buildStructuredPrompt(input: PromptInput): string {
  const subject = input.subject.trim() || "[Mata Pelajaran]";
  const grade = input.grade.trim() || "[Tingkat Pendidikan]";
  const objective = input.objective.trim() || "[Capaian Pembelajaran]";
  const theme = THEMES[input.theme].name;

  return `Anda bertindak sebagai Pengembang Kurikulum Akademik & Instruksional. Buatkan rancangan modul pembelajaran terstruktur berdasarkan parameter:
- Bidang Studi: ${subject}
- Tingkat Pendidikan Target: ${grade}
- Kerangka Pendekatan: ${theme}
- Capaian Pembelajaran: ${objective}`;
}

/** Ukuran berkas dalam MB dengan dua desimal, seperti teks di form awal. */
export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type JsonValidation =
  { ok: true; keys: number } | { ok: false; message: string };

/**
 * Validasi sintaks berkas JSON yang diunggah guru.
 *
 * Hanya memeriksa `JSON.parse`, sama seperti form awal: struktur cerita tetap
 * divalidasi validator server saat wiring, bukan di browser.
 */
export function validateJsonText(text: string): JsonValidation {
  try {
    const parsed: unknown = JSON.parse(text);
    // Array lolos `typeof === "object"`, padahal berkas cerita harus berupa
    // objek dengan atribut bernama.
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ok: false, message: "Isi berkas bukan objek JSON." };
    }
    return { ok: true, keys: Object.keys(parsed).length };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "JSON tidak valid.",
    };
  }
}

/** Kode kelas acak untuk kelas baru, mis. `QST-482`. */
export function buatKodeKelas(random: () => number = Math.random): string {
  return `QST-${Math.floor(100 + random() * 900)}`;
}

/* --------------------------------------------------------------------------
 * Draf AI Studio
 *
 * Desain asalnya menyimpan draf di `localStorage` supaya isian tidak hilang
 * saat berpindah menu. Kunci dan bentuk datanya dipertahankan di sini, dengan
 * penguraian defensif: isi `localStorage` bisa berasal dari versi lama atau
 * diubah manual, jadi jangan pernah dipercaya mentah-mentah.
 * ------------------------------------------------------------------------ */

export const AI_STUDIO_DRAFT_KEY = "classquest.guru.ai-studio.draft";
export const AI_STUDIO_SEED_KEY = "classquest.guru.ai-studio.seed";

export type AiStudioFile = {
  name: string;
  size: string;
};

export type AiStudioDraft = {
  subject: string;
  grade: string;
  objective: string;
  theme: ThemeKey;
  file: AiStudioFile | null;
};

/** Seed dikirim dari kartu materi: tiga kolom isian + berkas referensi. */
export type AiStudioSeed = Pick<
  AiStudioDraft,
  "subject" | "grade" | "objective"
> & {
  file: AiStudioFile;
};

export const EMPTY_AI_STUDIO_DRAFT: AiStudioDraft = {
  subject: "",
  grade: "",
  objective: "",
  theme: "case_study",
  file: null,
};

function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && THEME_KEYS.includes(value as ThemeKey);
}

function isAiStudioFile(value: unknown): value is AiStudioFile {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.size === "string";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseAiStudioDraft(raw: string | null): AiStudioDraft | null {
  const record = asRecord(parseJson(raw));
  if (!record) return null;

  return {
    subject: typeof record.subject === "string" ? record.subject : "",
    grade: typeof record.grade === "string" ? record.grade : "",
    objective: typeof record.objective === "string" ? record.objective : "",
    theme: isThemeKey(record.theme) ? record.theme : "case_study",
    file: isAiStudioFile(record.file) ? record.file : null,
  };
}

export function parseAiStudioSeed(raw: string | null): AiStudioSeed | null {
  const record = asRecord(parseJson(raw));
  if (!record) return null;

  const { subject, grade, objective, file } = record;
  if (
    typeof subject !== "string" ||
    typeof grade !== "string" ||
    typeof objective !== "string" ||
    !isAiStudioFile(file)
  ) {
    return null;
  }

  return { subject, grade, objective, file };
}

export function readAiStudioDraft(): AiStudioDraft | null {
  if (typeof window === "undefined") return null;
  return parseAiStudioDraft(window.localStorage.getItem(AI_STUDIO_DRAFT_KEY));
}

export function writeAiStudioDraft(draft: AiStudioDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_STUDIO_DRAFT_KEY, JSON.stringify(draft));
}

export function clearAiStudioDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_STUDIO_DRAFT_KEY);
}

export function writeAiStudioSeed(seed: AiStudioSeed): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AI_STUDIO_SEED_KEY, JSON.stringify(seed));
}

export function takeAiStudioSeed(): AiStudioSeed | null {
  if (typeof window === "undefined") return null;
  const seed = parseAiStudioSeed(
    window.sessionStorage.getItem(AI_STUDIO_SEED_KEY),
  );
  window.sessionStorage.removeItem(AI_STUDIO_SEED_KEY);
  return seed;
}
