/**
 * Gerbang rate limit siap pakai untuk endpoint yang dilindungi.
 *
 * Tiga perilaku yang dibedakan dengan sengaja
 * (`docs/06-backend/api-contract.md`, bagian Rate limit):
 *
 * | Endpoint                     | Penyimpanan | Saat limiter gagal |
 * | ---------------------------- | ----------- | ------------------ |
 * | `POST /api/auth/login`       | database    | **fail closed**    |
 * | `POST /api/upload`           | database    | **fail closed**    |
 * | `savePlayResult`             | database    | fail open          |
 * | `GET /api/stories/[storyId]` | memori      | fail open          |
 * | Gerbang kode kelas `/play`   | memori      | fail open          |
 *
 * Login dan upload mahal (satu upload memicu generasi AI), jadi kalau
 * penghitungnya tidak bisa dipakai, permintaan ditolak dengan `500` generik.
 * Hasil bermain dan baca cerita publik murah dan dipakai siswa, jadi
 * kegagalan limiter tidak boleh menghalangi mereka.
 *
 * Tidak ada IP, key, hash, atau nama tabel di pesan/`details` respons.
 */

import "server-only";

import { apiErrorResponse, INTERNAL_ERROR_MESSAGE } from "../api-error";

import { checkPolicy, type RateLimitResult } from "./check";
import {
  clientIpRateLimitKey,
  globalRateLimitKey,
  teacherRateLimitKey,
} from "./identity";
import {
  CLASSROOM_RATE_LIMIT,
  JOIN_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  PLAY_RESULT_RATE_LIMIT,
  PUBLIC_STORY_RATE_LIMIT,
  UPLOAD_GLOBAL_RATE_LIMIT,
  UPLOAD_IP_RATE_LIMIT,
  UPLOAD_TEACHER_RATE_LIMIT,
  type RateLimitPolicy,
} from "./limits";
import { memoryRateLimits } from "./memory";
import { rateLimitResponseIfBlocked } from "./response";

/**
 * Hasil gerbang yang mungkin mengembalikan respons penolakan.
 *
 * `response` diisi 429 (batas terlampaui) atau 500 (limiter gagal pada endpoint
 * fail closed). Bila `response` kosong, permintaan boleh dilanjutkan.
 */
export type RateLimitGate = {
  response: Response | null;
  /** Sisa kuota pada pemeriksaan terakhir; `null` bila tidak dihitung. */
  result: RateLimitResult | null;
};

const ALLOWED: RateLimitGate = { response: null, result: null };

/** Respons 500 generik saat penghitung database tidak bisa dipakai. */
function limiterFailureResponse(): Response {
  // Pesan statis; error asli tidak pernah diteruskan ke klien atau log.
  return apiErrorResponse("INTERNAL", 500, INTERNAL_ERROR_MESSAGE);
}

/**
 * Periksa satu kebijakan database untuk key tertentu.
 *
 * @param failMode `closed` menolak (500) saat limiter error; `open` mengizinkan.
 */
async function guardWithDatabase(
  policy: RateLimitPolicy,
  key: string,
  failMode: "closed" | "open",
): Promise<RateLimitGate> {
  try {
    const result = await checkPolicy(policy, key);
    return { response: rateLimitResponseIfBlocked(result), result };
  } catch {
    return {
      response: failMode === "closed" ? limiterFailureResponse() : null,
      result: null,
    };
  }
}

/**
 * `POST /api/auth/login` — 10 percobaan per 10 menit per IP.
 *
 * Hitung **semua** percobaan, termasuk yang berhasil dan yang formatnya salah,
 * dan panggil sebelum kode diverifikasi. Fail closed.
 */
export function guardLogin(): Promise<RateLimitGate> {
  return clientIpRateLimitKey(LOGIN_RATE_LIMIT.name).then((key) =>
    guardWithDatabase(LOGIN_RATE_LIMIT, key, "closed"),
  );
}

/**
 * `POST /api/upload` — tahap 1: batas per IP.
 *
 * Dipanggil paling awal di handler, sebelum body multipart dibaca. Fail closed.
 */
export function guardUploadIp(): Promise<RateLimitGate> {
  return clientIpRateLimitKey(UPLOAD_IP_RATE_LIMIT.name).then((key) =>
    guardWithDatabase(UPLOAD_IP_RATE_LIMIT, key, "closed"),
  );
}

/**
 * `POST /api/upload` — tahap 2: batas per guru.
 *
 * **Hanya** dipanggil setelah `requireTeacher()` berhasil dan sebelum file
 * dibaca. Permintaan tanpa sesi (401) tidak pernah sampai ke sini, jadi tidak
 * menambah hitungan. Fail closed.
 */
export function guardUploadTeacher(teacherId: string): Promise<RateLimitGate> {
  return guardWithDatabase(
    UPLOAD_TEACHER_RATE_LIMIT,
    teacherRateLimitKey(UPLOAD_TEACHER_RATE_LIMIT.name, teacherId),
    "closed",
  );
}

/**
 * `POST /api/upload` — tahap 3: batas global semua guru (pelindung biaya AI).
 *
 * Sama seperti batas per guru: hanya setelah sesi sah, sebelum file dibaca.
 * Dijalankan **setelah** batas per guru supaya guru yang sudah kehabisan kuota
 * tidak ikut memakan kuota global. Fail closed.
 */
export function guardUploadGlobal(): Promise<RateLimitGate> {
  return guardWithDatabase(
    UPLOAD_GLOBAL_RATE_LIMIT,
    globalRateLimitKey(UPLOAD_GLOBAL_RATE_LIMIT.name),
    "closed",
  );
}

/**
 * `savePlayResult` — 120 per 10 menit per IP, di database.
 *
 * Fail open: siswa tetap bisa menyimpan hasil walau limiter bermasalah. Hasil
 * `null` berarti "tidak dihitung"; pemanggil tidak boleh menolak permintaan.
 */
export async function guardPlayResult(): Promise<RateLimitGate> {
  const key = await clientIpRateLimitKey(PLAY_RESULT_RATE_LIMIT.name);
  return guardWithDatabase(PLAY_RESULT_RATE_LIMIT, key, "open");
}

/**
 * `GET /api/stories/[storyId]` — 120 per menit per IP, **di memori saja**.
 *
 * Tidak ada tulis database. Kegagalan apa pun diperlakukan sebagai izin.
 */
export async function guardPublicStoryRead(): Promise<RateLimitGate> {
  try {
    const key = await clientIpRateLimitKey(PUBLIC_STORY_RATE_LIMIT.name);
    const result = memoryRateLimits.check({
      key,
      limit: PUBLIC_STORY_RATE_LIMIT.limit,
      windowSeconds: PUBLIC_STORY_RATE_LIMIT.windowSeconds,
    });

    return { response: rateLimitResponseIfBlocked(result), result };
  } catch {
    return ALLOWED;
  }
}

/**
 * Gerbang kode kelas `/play` — 30 percobaan per 10 menit per IP, di memori.
 *
 * Sama seperti baca cerita publik: tidak ada tulis database, dan kegagalan
 * limiter diperlakukan sebagai izin (fail open) supaya siswa tidak tertahan
 * karena masalah penghitung. Pemanggil (Server Action) tidak memakai
 * `response` — ia hanya membaca `result.allowed`.
 */
export async function guardJoinClassCode(): Promise<RateLimitGate> {
  try {
    const key = await clientIpRateLimitKey(JOIN_RATE_LIMIT.name);
    const result = memoryRateLimits.check({
      key,
      limit: JOIN_RATE_LIMIT.limit,
      windowSeconds: JOIN_RATE_LIMIT.windowSeconds,
    });

    return { response: rateLimitResponseIfBlocked(result), result };
  } catch {
    return ALLOWED;
  }
}

/**
 * Server Action kelas/siswa — 60 tulisan per jam per guru.
 *
 * Dipanggil **setelah** `requireTeacher()` berhasil, jadi percobaan tanpa sesi
 * tidak menambah hitungan. Fail open: guru yang sah tetap bisa menambah siswa
 * walau penghitung bermasalah; batas ini pelindung penyalahgunaan, bukan
 * gerbang keamanan utama (otorisasi tetap `requireTeacher()`).
 */
export function guardClassroomWrite(teacherId: string): Promise<RateLimitGate> {
  return guardWithDatabase(
    CLASSROOM_RATE_LIMIT,
    teacherRateLimitKey(CLASSROOM_RATE_LIMIT.name, teacherId),
    "open",
  );
}
