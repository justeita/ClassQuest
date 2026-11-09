/**
 * Auth guru berbasis satu access code.
 *
 * Ini **penghalang demo**, bukan sistem keamanan penuh
 * (`docs/01-architecture/security-and-privacy.md`). Satu kode akses dari
 * environment berlaku untuk semua guru. Setelah kode benar, server menerbitkan
 * cookie sesi bertanda tangan HMAC-SHA256; tidak ada akun, pendaftaran, atau
 * reset password.
 *
 * Aturan yang dipegang:
 *
 * - `TEACHER_ACCESS_CODE` dan `TEACHER_SESSION_SECRET` hanya dibaca lewat
 *   `src/server/config.ts`.
 * - Tidak ada nilai default dan tidak ada secret acak per proses. Instance
 *   serverless berbeda harus bisa memverifikasi token yang sama.
 * - Gagal dengan aman: konfigurasi kosong berarti login selalu gagal dan token
 *   tidak pernah dianggap sah.
 * - Tidak ada kode, token, atau secret yang disimpan di database atau masuk ke
 *   pesan error. Kolom `teachers.access_code` dibiarkan `null` karena sumber
 *   kebenaran kode ada di environment; menyimpan hash di sana hanya akan menjadi
 *   salinan basi yang tidak dipakai.
 *
 * Modul ini hanya boleh diimpor dari server code. Jangan menambahkan
 * `import "server-only"` sebelum paketnya dipasang (task 5b).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { loadTeacherAuthConfig } from "./config";
import { getReadyDb } from "./db";

/** Id baris `teachers` tetap untuk demo (satu guru, bukan multi-akun). */
export const TEACHER_ID = "teacher_demo";

/** Nama tampilan bawaan; docs tidak menetapkan nilai lain. */
export const TEACHER_DISPLAY_NAME = "Guru Demo";

/** Nama cookie sesi guru. */
export const TEACHER_SESSION_COOKIE = "classquest_teacher_session";

/** Masa berlaku sesi: 8 jam. */
export const TEACHER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** `maxAge` cookie dalam detik, diturunkan dari `TEACHER_SESSION_TTL_MS`. */
export const TEACHER_SESSION_TTL_SECONDS = TEACHER_SESSION_TTL_MS / 1000;

/** Batas wajar panjang token; mencegah payload raksasa diproses. */
const MAX_TOKEN_LENGTH = 2048;

/** Batas panjang `teacherId` di payload. */
const MAX_TEACHER_ID_LENGTH = 200;

/** Kode error auth yang dikenal kontrak API. */
export const AUTH_ERROR_STATUS = {
  UNAUTHORIZED: 401,
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_STATUS;

/**
 * Pesan statis. Tidak pernah memuat kode akses, token, secret, atau pesan dari
 * runtime. Jangan menyisipkan nilai input ke sini.
 */
const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  UNAUTHORIZED: "Kode akses guru tidak valid atau sesi sudah berakhir.",
};

/** Error auth yang aman dikirim ke klien (bentuk `ApiError` di route). */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode = "UNAUTHORIZED") {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = "AuthError";
    this.code = code;
    this.status = AUTH_ERROR_STATUS[code];
  }
}

/** Isi payload token sesi. `exp` adalah epoch milidetik. */
export type TeacherSession = {
  teacherId: string;
  exp: number;
};

/** Hash SHA-256 supaya kedua sisi `timingSafeEqual` selalu sama panjang. */
function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function hmac(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
}

/** Decode base64url tanpa menerima padding atau karakter di luar alfabet. */
function decodeBase64Url(value: string): Buffer | null {
  if (value === "" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, "base64url");
  if (decoded.length === 0) return null;

  // Tolak encoding non-kanonik (bit sisa di karakter terakhir), supaya token
  // yang formatnya aneh tidak lolos hanya karena byte-nya kebetulan sama.
  return decoded.toString("base64url") === value ? decoded : null;
}

/**
 * Bandingkan kode akses dengan `TEACHER_ACCESS_CODE`.
 *
 * Kedua sisi di-hash SHA-256 lebih dulu agar panjangnya selalu sama, lalu
 * dibandingkan dengan `timingSafeEqual`. Kode kosong, konfigurasi kosong, dan
 * kode salah semuanya menghasilkan `false`.
 */
export function verifyAccessCode(code: string): boolean {
  const { accessCode } = loadTeacherAuthConfig();

  if (accessCode === null) return false;
  if (typeof code !== "string" || code === "") return false;

  return timingSafeEqual(sha256(accessCode), sha256(code));
}

/**
 * Buat token sesi: `base64url(JSON payload).base64url(HMAC-SHA256)`.
 *
 * @param teacherId id guru yang ditandatangani, bukan data rahasia.
 * @param now waktu acuan dalam epoch milidetik; bisa diganti di test.
 * @throws {AuthError} bila `TEACHER_SESSION_SECRET` kosong atau `teacherId`
 * tidak sah.
 */
export function createSessionToken(
  teacherId: string,
  now: number = Date.now(),
): string {
  const { sessionSecret } = loadTeacherAuthConfig();
  if (sessionSecret === null) throw new AuthError();

  if (
    typeof teacherId !== "string" ||
    teacherId === "" ||
    teacherId.length > MAX_TEACHER_ID_LENGTH
  ) {
    throw new AuthError();
  }

  if (!Number.isSafeInteger(now)) throw new AuthError();

  const payload: TeacherSession = {
    teacherId,
    exp: now + TEACHER_SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = hmac(encoded, sessionSecret).toString("base64url");

  return `${encoded}.${signature}`;
}

function readSessionPayload(value: unknown): TeacherSession | null {
  if (typeof value !== "object" || value === null) return null;

  const payload = value as Record<string, unknown>;
  const { teacherId, exp } = payload;

  if (
    typeof teacherId !== "string" ||
    teacherId === "" ||
    teacherId.length > MAX_TEACHER_ID_LENGTH
  ) {
    return null;
  }

  if (typeof exp !== "number" || !Number.isSafeInteger(exp) || exp <= 0) {
    return null;
  }

  return { teacherId, exp };
}

/**
 * Verifikasi token sesi.
 *
 * Menolak token kosong/terlalu panjang, format selain `payload.signature`,
 * base64url yang tidak sah, tanda tangan salah (termasuk secret berbeda),
 * payload yang bukan `{ teacherId, exp }`, dan token kedaluwarsa. Mengembalikan
 * `null` untuk semua kegagalan; pemanggil memutuskan cara gagal.
 *
 * @param now waktu acuan dalam epoch milidetik; bisa diganti di test.
 */
export function verifySessionToken(
  token: string,
  now: number = Date.now(),
): TeacherSession | null {
  const { sessionSecret } = loadTeacherAuthConfig();
  if (sessionSecret === null) return null;

  if (
    typeof token !== "string" ||
    token === "" ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return null;
  }

  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) return null;

  const encoded = token.slice(0, separator);
  const encodedPayload = decodeBase64Url(encoded);
  if (encodedPayload === null) return null;

  const providedSignature = decodeBase64Url(token.slice(separator + 1));
  if (providedSignature === null) return null;

  const expectedSignature = hmac(encoded, sessionSecret);
  if (providedSignature.length !== expectedSignature.length) return null;
  if (!timingSafeEqual(providedSignature, expectedSignature)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(encodedPayload.toString("utf8"));
  } catch {
    return null;
  }

  const payload = readSessionPayload(parsed);
  if (payload === null) return null;

  const currentTime = Number.isFinite(now) ? now : Date.now();
  if (payload.exp <= currentTime) return null;

  return payload;
}

/**
 * Pastikan baris guru demo ada. Insert idempoten, aman dipanggil berkali-kali.
 *
 * `access_code` sengaja tidak diisi (tetap `null`): kode mentah tidak pernah
 * disimpan, dan hash di kolom itu tidak dipakai untuk verifikasi karena sumber
 * kebenaran ada di environment.
 *
 * @throws {DatabaseError} bila database tidak bisa diakses.
 */
export async function ensureTeacherRow(): Promise<string> {
  const db = await getReadyDb();

  await db.execute({
    sql: "insert into teachers (id, display_name) values (?, ?) on conflict(id) do nothing",
    args: [TEACHER_ID, TEACHER_DISPLAY_NAME],
  });

  return TEACHER_ID;
}

/** Atribut cookie sesi. `secure` hanya aktif di production. */
function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: TEACHER_SESSION_TTL_SECONDS,
  };
}

/**
 * Verifikasi kode lalu terbitkan cookie sesi.
 *
 * Bila kode salah atau konfigurasi tidak lengkap, tidak ada cookie yang diset
 * dan `AuthError` dilempar. Baris guru hanya dipastikan ada setelah kode benar,
 * supaya percobaan kode salah tidak menyentuh database.
 *
 * @throws {AuthError} dengan kode `UNAUTHORIZED` (HTTP 401).
 */
export async function loginTeacher(code: string): Promise<void> {
  if (!verifyAccessCode(code)) throw new AuthError();

  // `verifyAccessCode` hanya memeriksa kode; secret tetap wajib ada sebelum
  // token dibuat. Keduanya kosong atau salah satu kosong = gagal.
  const { sessionSecret } = loadTeacherAuthConfig();
  if (sessionSecret === null) throw new AuthError();

  const teacherId = await ensureTeacherRow();
  const token = createSessionToken(teacherId);

  const store = await cookies();
  store.set(TEACHER_SESSION_COOKIE, token, sessionCookieOptions());
}

/** Hapus cookie sesi. Aman dipanggil walau cookie belum ada. */
export async function logoutTeacher(): Promise<void> {
  const store = await cookies();
  store.delete({ name: TEACHER_SESSION_COOKIE, path: "/" });
}

/**
 * Lindungi route/Server Action guru.
 *
 * @returns `{ teacherId }` dari token yang sah.
 * @throws {AuthError} dengan kode `UNAUTHORIZED` (HTTP 401) bila cookie tidak
 * ada, rusak, kedaluwarsa, atau ditandatangani secret lain.
 */
export async function requireTeacher(): Promise<{ teacherId: string }> {
  const store = await cookies();
  const token = store.get(TEACHER_SESSION_COOKIE)?.value;

  if (typeof token !== "string" || token === "") throw new AuthError();

  const session = verifySessionToken(token);
  if (session === null) throw new AuthError();

  return { teacherId: session.teacherId };
}
