/**
 * Auth guru berbasis akun (username + password).
 *
 * Akun disimpan di tabel `teachers` (`username`, `password_hash`); password
 * hanya pernah masuk database sebagai hash scrypt (`src/server/password.ts`).
 * Setelah kredensial benar, server menerbitkan cookie sesi bertanda tangan
 * HMAC-SHA256. Ini tetap **penghalang demo**, bukan sistem keamanan penuh
 * (`docs/01-architecture/security-and-privacy.md`): belum ada pendaftaran
 * mandiri, reset password, atau multi-sekolah.
 *
 * Aturan yang dipegang:
 *
 * - `TEACHER_SESSION_SECRET` hanya dibaca lewat `src/server/config.ts`.
 * - Tidak ada nilai default dan tidak ada secret acak per proses. Instance
 *   serverless berbeda harus bisa memverifikasi token yang sama.
 * - Gagal dengan aman: secret kosong berarti login selalu gagal dan token
 *   tidak pernah dianggap sah.
 * - Username tidak dikenal, password salah, dan akun tanpa hash dijawab sama
 *   (`AuthError` 401). Verifikasi tetap dijalankan walau username tidak ada
 *   supaya waktu respons tidak membocorkan akun mana yang terdaftar.
 * - Tidak ada password, hash, atau secret yang masuk ke pesan error.
 *
 * Modul ini hanya boleh diimpor dari server code. `import "server-only"` di
 * bawah membuat impor dari komponen client gagal saat build.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { loadTeacherAuthConfig } from "./config";
import { getReadyDb } from "./db";
import { verifyPassword } from "./password";

/** Nama cookie sesi guru. */
export const TEACHER_SESSION_COOKIE = "classquest_teacher_session";

/** Masa berlaku sesi: 8 jam. */
export const TEACHER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** `maxAge` cookie dalam detik, diturunkan dari `TEACHER_SESSION_TTL_MS`. */
export const TEACHER_SESSION_TTL_SECONDS = TEACHER_SESSION_TTL_MS / 1000;

/** Batas wajar panjang token; mencegah payload raksasa diproses. */
const MAX_TOKEN_LENGTH = 2048;

/** Batas panjang nilai identitas di payload token. */
const MAX_TEACHER_ID_LENGTH = 200;
const MAX_DISPLAY_NAME_LENGTH = 120;

/** Kode error auth yang dikenal kontrak API. */
export const AUTH_ERROR_STATUS = {
  UNAUTHORIZED: 401,
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_STATUS;

/**
 * Pesan statis. Tidak pernah memuat username, password, token, atau secret dari
 * runtime. Jangan menyisipkan nilai input ke sini.
 */
const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  UNAUTHORIZED: "Username atau sandi tidak dikenali, atau sesi sudah berakhir.",
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
  displayName: string;
  exp: number;
};

/** Identitas guru yang terautentikasi, dipakai halaman dan Server Action. */
export type TeacherIdentity = {
  teacherId: string;
  displayName: string;
};

/** Kredensial yang dikirim form masuk. */
export type LoginCredentials = {
  username: string;
  password: string;
};

/**
 * Hash scrypt sah untuk password acak yang tidak pernah dipakai siapa pun.
 *
 * Dipakai saat username tidak ditemukan supaya jalur "akun tidak ada" tetap
 * menjalankan scrypt dengan biaya yang sama seperti jalur "password salah".
 * Nilainya bukan rahasia: yang dilindungi adalah waktu respons, bukan hash ini.
 */
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$rDbvw0hfM5O1RoqHT4lN2A==$" +
  "+8/6HHGk779JnZKHzuFELC8NLNLwf5XBupnDTYBdeY/wmuFXMlpdrfI3TNB0kYYdJBjvHv+s+mO1UAECmJ4dbQ==";

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

/** Username disimpan dan dicari dalam bentuk huruf kecil tanpa spasi tepi. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Buat token sesi: `base64url(JSON payload).base64url(HMAC-SHA256)`.
 *
 * @param identity id + nama tampilan guru (bukan data rahasia).
 * @param now waktu acuan dalam epoch milidetik; bisa diganti di test.
 * @throws {AuthError} bila `TEACHER_SESSION_SECRET` kosong atau identitas tidak
 * sah.
 */
export function createSessionToken(
  identity: TeacherIdentity,
  now: number = Date.now(),
): string {
  const { sessionSecret } = loadTeacherAuthConfig();
  if (sessionSecret === null) throw new AuthError();

  const { teacherId, displayName } = identity;

  if (
    typeof teacherId !== "string" ||
    teacherId === "" ||
    teacherId.length > MAX_TEACHER_ID_LENGTH
  ) {
    throw new AuthError();
  }

  if (
    typeof displayName !== "string" ||
    displayName === "" ||
    displayName.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    throw new AuthError();
  }

  if (!Number.isSafeInteger(now)) throw new AuthError();

  const payload: TeacherSession = {
    teacherId,
    displayName,
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
  const { teacherId, displayName, exp } = payload;

  if (
    typeof teacherId !== "string" ||
    teacherId === "" ||
    teacherId.length > MAX_TEACHER_ID_LENGTH
  ) {
    return null;
  }

  // Token lama (sebelum akun ada) tidak punya `displayName`. Token itu tetap
  // ditandatangani secret yang sama, jadi terima dengan nama netral daripada
  // memaksa semua guru login ulang saat deploy.
  if (
    displayName !== undefined &&
    (typeof displayName !== "string" ||
      displayName === "" ||
      displayName.length > MAX_DISPLAY_NAME_LENGTH)
  ) {
    return null;
  }

  if (typeof exp !== "number" || !Number.isSafeInteger(exp) || exp <= 0) {
    return null;
  }

  return {
    teacherId,
    displayName: typeof displayName === "string" ? displayName : "Guru",
    exp,
  };
}

/**
 * Verifikasi token sesi.
 *
 * Menolak token kosong/terlalu panjang, format selain `payload.signature`,
 * base64url yang tidak sah, tanda tangan salah (termasuk secret berbeda),
 * payload yang bukan `{ teacherId, displayName, exp }`, dan token kedaluwarsa.
 * Mengembalikan `null` untuk semua kegagalan; pemanggil memutuskan cara gagal.
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

type TeacherRow = {
  id: string;
  display_name: string;
  password_hash: string | null;
};

/** Cari akun guru berdasarkan username ternormalisasi. */
async function findTeacherByUsername(
  username: string,
): Promise<TeacherRow | null> {
  const db = await getReadyDb();
  const result = await db.execute({
    sql: "select id, display_name, password_hash from teachers where username = ? limit 1",
    args: [username],
  });

  const row = result.rows[0];
  if (row === undefined) return null;

  return {
    id: String(row.id),
    display_name: String(row.display_name),
    password_hash:
      row.password_hash === null || row.password_hash === undefined
        ? null
        : String(row.password_hash),
  };
}

/**
 * Verifikasi username + password lalu terbitkan cookie sesi.
 *
 * Username dinormalisasi (huruf kecil, tanpa spasi tepi) sebelum dicari. Bila
 * akun tidak ada, scrypt tetap dijalankan terhadap hash dummy supaya waktu
 * respons tidak menunjukkan akun mana yang terdaftar.
 *
 * @throws {AuthError} dengan kode `UNAUTHORIZED` (HTTP 401) untuk semua
 * kegagalan kredensial, termasuk konfigurasi sesi yang belum diisi.
 */
export async function loginTeacher(
  credentials: LoginCredentials,
): Promise<void> {
  const { sessionSecret } = loadTeacherAuthConfig();
  if (sessionSecret === null) throw new AuthError();

  const username = normalizeUsername(credentials.username);
  if (
    username === "" ||
    typeof credentials.password !== "string" ||
    credentials.password === ""
  ) {
    throw new AuthError();
  }

  const teacher = await findTeacherByUsername(username);

  const passwordHash = teacher?.password_hash ?? DUMMY_PASSWORD_HASH;
  const passwordOk = await verifyPassword(credentials.password, passwordHash);

  if (!passwordOk || teacher === null || teacher.password_hash === null) {
    throw new AuthError();
  }

  const token = createSessionToken({
    teacherId: teacher.id,
    displayName: teacher.display_name,
  });

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
 * @returns `{ teacherId, displayName }` dari token yang sah.
 * @throws {AuthError} dengan kode `UNAUTHORIZED` (HTTP 401) bila cookie tidak
 * ada, rusak, kedaluwarsa, atau ditandatangani secret lain.
 */
export async function requireTeacher(): Promise<TeacherIdentity> {
  const store = await cookies();
  const token = store.get(TEACHER_SESSION_COOKIE)?.value;

  if (typeof token !== "string" || token === "") throw new AuthError();

  const session = verifySessionToken(token);
  if (session === null) throw new AuthError();

  return {
    teacherId: session.teacherId,
    displayName: session.displayName,
  };
}
