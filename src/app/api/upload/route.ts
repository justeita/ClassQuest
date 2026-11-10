/**
 * `POST /api/upload` — guru mengunggah PDF materi.
 *
 * Kontrak: `docs/06-backend/api-contract.md` (field form, bentuk 202, kode
 * error) dan `docs/06-backend/jobs-and-limits.md` (batas ukuran, progres awal).
 *
 * Keputusan produk yang mengikat di sini: PDF **hanya** diproses di memori.
 * Tidak ada penulisan disk, bucket, atau penyimpanan bytes PDF di database.
 * Yang dibuat: satu baris `stories` (`processing`) dan satu baris `jobs`
 * (`queued`) dalam satu transaksi, lalu bytes dioper ke `scheduleJob()`
 * (`src/server/jobs/schedule.ts`; dijalankan task 18 lewat `after()`).
 *
 * Catatan Next 16: sesuai `docs/08-workflow/ai-agent-rules.md` (MUST NOT #7) dan
 * docs Next 16 dengan Cache Components, route ini **sengaja tidak** mengekspor
 * `export const runtime` — ekspor itu tidak didukung, termasuk `runtime =
 * "nodejs"`. Runtime default sudah Node.js.
 *
 * `maxDuration` mengikuti docs Next 16 (`after` berjalan selama batas durasi
 * route). Nilai 300 detik adalah asumsi: pipeline punya deadline 120 detik dan
 * satu panggilan bisa menggantung sampai 60 detik, jadi 300 memberi ruang
 * untuk ekstraksi + penyimpanan. Batas hosting bisa lebih kecil.
 */

import { z } from "zod";

import { AuthError, ensureTeacherRow, requireTeacher } from "@/server/auth";
import {
  apiErrorResponse,
  INTERNAL_ERROR_MESSAGE,
  type ApiErrorCode,
} from "@/server/api-error";
import { getReadyDb } from "@/server/db";
import { scheduleJob } from "@/server/jobs/schedule";
import { MAX_PDF_BYTES, readPdfUpload, UploadError } from "@/server/upload";
import type { PdfUploadInput } from "@/server/upload";

export const maxDuration = 300;

/**
 * Margin di atas `MAX_PDF_BYTES` untuk overhead multipart (boundary dan field
 * teks). Tidak ada angka ini di docs, jadi 64 KB adalah asumsi konservatif;
 * pemeriksaan ukuran sebenarnya tetap dijalankan oleh `readPdfUpload()`.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const MEGABYTE = 1024 * 1024;

/**
 * Pesan statis. Tidak pernah memuat isi request, nama file, atau detail
 * runtime; jangan menyisipkan nilai input ke sini.
 */
const UPLOAD_ERROR_MESSAGES = {
  NOT_MULTIPART: "Unggahan harus dikirim sebagai multipart/form-data.",
  INVALID_FIELDS: "Data form tidak valid. Periksa kembali isian.",
  UNREADABLE_FORM: "Unggahan tidak bisa dibaca. Coba lagi.",
} as const;

/** Kode `400` untuk field teks yang tidak valid; belum ada di kontrak. */
const INVALID_INPUT_CODE: ApiErrorCode = "INVALID_INPUT";

/**
 * Field teks sesuai tabel request `api-contract.md`. `tone` opsional dengan
 * nilai default dari kontrak; batas 200 karakter adalah asumsi karena kontrak
 * tidak menetapkannya.
 */
const uploadFieldsSchema = z.object({
  title: z.string().trim().min(3).max(80),
  subject: z.string().trim().min(1).max(40),
  gradeLevel: z.string().trim().min(1).max(40),
  language: z.enum(["id", "en"]),
  tone: z.string().trim().max(200).default("hangat dan penasaran"),
});

function fileTooLargeResponse(): Response {
  return apiErrorResponse(
    "FILE_TOO_LARGE",
    413,
    `Ukuran file melebihi batas ${MAX_PDF_BYTES / MEGABYTE} MB.`,
    { maxBytes: MAX_PDF_BYTES },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    // a. Otorisasi guru lebih dulu; tanpa sesi tidak ada body yang dibaca.
    const { teacherId } = await requireTeacher();

    // b. Tolak lebih awal berdasarkan Content-Length, sebelum body dibaca.
    const contentLength = Number.parseInt(
      request.headers.get("content-length") ?? "",
      10,
    );
    if (
      Number.isSafeInteger(contentLength) &&
      contentLength > MAX_PDF_BYTES + MULTIPART_OVERHEAD_BYTES
    ) {
      return fileTooLargeResponse();
    }

    // c. Harus multipart/form-data; kode 400 dari kontrak adalah FILE_MISSING.
    const contentType = (request.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "multipart/form-data") {
      return apiErrorResponse(
        "FILE_MISSING",
        400,
        UPLOAD_ERROR_MESSAGES.NOT_MULTIPART,
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      // Body multipart rusak. Pesan statis; detail runtime tidak dilaporkan.
      return apiErrorResponse(
        INVALID_INPUT_CODE,
        400,
        UPLOAD_ERROR_MESSAGES.UNREADABLE_FORM,
      );
    }

    const upload = await readPdfUpload(form.get("file") as PdfUploadInput);

    // d. Validasi field teks dengan zod.
    const fields = uploadFieldsSchema.safeParse({
      title: form.get("title"),
      subject: form.get("subject"),
      gradeLevel: form.get("gradeLevel"),
      language: form.get("language"),
      tone: form.get("tone") ?? undefined,
    });
    if (!fields.success) {
      return apiErrorResponse(
        INVALID_INPUT_CODE,
        400,
        UPLOAD_ERROR_MESSAGES.INVALID_FIELDS,
      );
    }

    // e. Satu story + satu job dalam satu transaksi; bytes PDF tidak disimpan.
    const storyId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    await ensureTeacherRow();
    const db = await getReadyDb();
    const tx = await db.transaction("write");

    try {
      await tx.execute({
        sql: `insert into stories (id, teacher_id, title, subject, grade_level, language, status, source_file_name)
              values (?, ?, ?, ?, ?, ?, 'processing', ?)`,
        args: [
          storyId,
          teacherId,
          fields.data.title,
          fields.data.subject,
          fields.data.gradeLevel,
          fields.data.language,
          upload.filename,
        ],
      });
      await tx.execute({
        sql: `insert into jobs (id, story_id, stage, progress)
              values (?, ?, 'queued', 5)`,
        args: [jobId, storyId],
      });
      await tx.commit();
    } catch (error) {
      if (!tx.closed) {
        try {
          await tx.rollback();
        } catch {
          // Transaksi sudah tidak bisa di-rollback; error aslinya yang
          // dilaporkan ke pemanggil.
        }
      }
      throw error;
    }

    // f. Serahkan bytes PDF ke penjadwal job (dijalankan lewat `after()`).
    scheduleJob({
      jobId,
      storyId,
      pdf: {
        bytes: upload.bytes,
        filename: upload.filename,
        sizeBytes: upload.sizeBytes,
      },
      tone: fields.data.tone,
    });

    // g. Bentuk 202 persis dari api-contract.md.
    return Response.json(
      { storyId, jobId, status: "queued" },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return apiErrorResponse(
        error.code,
        error.status,
        error.message,
        error.details,
      );
    }
    if (error instanceof AuthError) {
      return apiErrorResponse(error.code, error.status, error.message);
    }
    // Error tak terduga: 500 generik tanpa detail apa pun. Jangan log bytes
    // PDF, isi PDF, atau cookie.
    return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
  }
}
