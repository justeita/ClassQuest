/**
 * Ekstraksi teks PDF per halaman.
 *
 * Kontrak: `docs/03-ai-pipeline/pipeline.md` (tahap ekstraksi, ambang
 * `NO_TEXT_LAYER`), `docs/06-backend/jobs-and-limits.md` (batas halaman), dan
 * `docs/06-backend/api-contract.md` (kode error job). Dipakai task 18 di
 * dalam job runner, setelah respons `202` terkirim — `NO_TEXT_LAYER` tidak
 * pernah muncul di route upload.
 *
 * Janji yang dipegang:
 *
 * - **Hanya di memori.** Tidak ada penulisan disk, tidak ada `node:fs`, dan
 *   bytes tidak pernah disimpan ke database.
 * - **Buffer pemanggil tetap utuh.** pdf.js bisa mentransfer (detach) buffer
 *   yang diberikan, jadi unpdf selalu menerima salinan
 *   (`new Uint8Array(bytes)`).
 * - **Teks PDF adalah data tidak tepercaya.** Teks tidak pernah di-log dan
 *   tidak pernah masuk pesan error; pesan error selalu statis.
 *
 * Pembagian kerja batas (menurut docs, tidak digandakan di sini):
 *
 * - `TOO_MANY_PAGES` (> 40 halaman) ditegakkan **di sini**, sebelum teks
 *   diekstrak (`jobs-and-limits.md`: "Tolak sebelum diproses").
 * - Hanya 15 halaman pertama yang diproses dan pemotongan 30.000 karakter
 *   ditegakkan di `prepareMaterial()` (`src/ai/prompt.ts`) — di sana keputusan
 *   halaman/karakter yang dibuang harus dilaporkan ke `source.gaps`. Modul ini
 *   mengembalikan semua halaman utuh agar keputusan itu tetap satu tempat.
 */

import { getDocumentProxy, extractText } from "unpdf";
import { createPdfExtractError } from "./errors";

/** Batas absolut jumlah halaman (`jobs-and-limits.md`, tabel Upload). */
export const MAX_PDF_PAGES = 40;

/**
 * Ambang total karakter di bawahnya PDF dianggap tidak punya text layer
 * (`pipeline.md`: "kalau < 200 karakter → `NO_TEXT_LAYER`").
 */
export const MIN_TEXT_LAYER_CHARS = 200;

/** Teks satu halaman hasil ekstraksi, sudah dinormalisasi. */
export type ExtractedPage = {
  /** Nomor halaman mulai dari 1; tidak bergeser walau halamannya kosong. */
  pageNumber: number;
  /** Teks halaman; string kosong untuk halaman tanpa teks. */
  text: string;
};

/** Hasil ekstraksi yang bisa langsung dipakai pipeline (task 18). */
export type PdfTextExtraction = {
  /** Jumlah halaman PDF menurut parser, termasuk halaman tanpa teks. */
  pageCount: number;
  /** Satu entri per halaman, urut dari halaman 1. */
  pages: ExtractedPage[];
  /** Total karakter teks setelah normalisasi, termasuk halaman kosong. */
  totalChars: number;
};

/** Opsi test: batas halaman bisa diturunkan supaya test cepat. */
export type ExtractPdfTextOptions = {
  maxPages?: number;
};

/**
 * Normalisasi teks satu halaman: buang karakter kontrol (C0, DEL, C1, dan
 * zero-width) lalu ratakan whitespace berlebih. Isi kalimat tidak diubah.
 */
function normalizePageText(raw: string): string {
  return raw
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F\u200B-\u200D\uFEFF]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kembalikan teks bersih per halaman dari bytes PDF.
 *
 * @param bytes isi PDF dari `readPdfUpload()`; tidak diubah oleh fungsi ini.
 * @throws {PdfExtractError} `PDF_UNREADABLE` (rusak, terpotong, atau
 * terenkripsi), `TOO_MANY_PAGES`, atau `NO_TEXT_LAYER`.
 */
export async function extractPdfText(
  bytes: Uint8Array,
  options: ExtractPdfTextOptions = {},
): Promise<PdfTextExtraction> {
  const maxPages = options.maxPages ?? MAX_PDF_PAGES;

  // Salinan wajib: pdf.js bisa mentransfer buffer yang diberikan kepadanya.
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    // Rusak, terpotong, atau butuh password. Pesan mentah pdf.js bisa memuat
    // isi file, jadi hanya kode statis yang dibawa keluar.
    throw createPdfExtractError("PDF_UNREADABLE");
  }

  try {
    // Cek jumlah halaman SEBELUM ekstraksi teks (jobs-and-limits.md).
    if (pdf.numPages > maxPages) {
      throw createPdfExtractError("TOO_MANY_PAGES");
    }

    const { text } = await extractText(pdf, { mergePages: false });

    const pages: ExtractedPage[] = text.map((raw, index) => ({
      pageNumber: index + 1,
      text: normalizePageText(raw),
    }));

    const totalChars = pages.reduce(
      (total, page) => total + page.text.length,
      0,
    );

    if (totalChars < MIN_TEXT_LAYER_CHARS) {
      throw createPdfExtractError("NO_TEXT_LAYER");
    }

    return { pageCount: pdf.numPages, pages, totalChars };
  } finally {
    // Lepas resource parser apa pun yang terjadi; jangan biarkan pdf.js
    // menyimpan bytes di memori lebih lama dari job. Teardown resmi pdf.js
    // ada di loading task; `cleanup()` hanya cadangan bila bentuknya lain.
    const task = (pdf as { loadingTask?: { destroy?: () => Promise<void> } })
      .loadingTask;
    try {
      if (typeof task?.destroy === "function") {
        await task.destroy();
      } else if (typeof pdf.cleanup === "function") {
        await pdf.cleanup();
      }
    } catch {
      // Kegagalan teardown tidak boleh menimpa hasil atau error asli.
    }
  }
}
