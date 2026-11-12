/**
 * Hash password guru dengan scrypt.
 *
 * Ini penghalang demo, bukan sistem keamanan penuh
 * (`docs/01-architecture/security-and-privacy.md`). Tapi password tidak boleh
 * disimpan sebagai teks biasa, jadi satu-satunya bentuk yang boleh masuk
 * database adalah hash scrypt dengan salt acak per baris:
 *
 * ```text
 * scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 * ```
 *
 * Kenapa scrypt dan bukan bcrypt/argon2:
 *
 * - `node:crypto` sudah menyediakannya, jadi tidak ada dependency baru
 *   (`docs/08-workflow/ai-agent-rules.md` aturan dependency).
 * - Parameter ditulis di dalam hash, sehingga nilai lama tetap bisa diverifikasi
 *   walau parameter default berubah.
 *
 * Pembandingan memakai `timingSafeEqual`. Hash yang tidak dikenal atau rusak
 * dianggap tidak cocok, bukan melempar error — baris database yang rusak tidak
 * boleh membuat endpoint auth menjadi `500` yang membocorkan status internal.
 *
 * Modul ini murni Node (`node:crypto`, `Buffer`); tidak membaca environment,
 * tidak menyentuh database, dan tidak boleh diimpor dari komponen client.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `scrypt` versi promise. Tipenya ditulis eksplisit karena `promisify` hanya
 * mengenali overload tanpa opsi, padahal opsi (N, r, p, maxmem) justru wajib
 * kita kirim.
 */
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** Parameter scrypt yang dipakai untuk hash baru. N=2^14 (~16 MB, ~50 ms). */
const DEFAULT_PARAMS = { N: 16_384, r: 8, p: 1 } as const;

/**
 * Batas memori scrypt. Bawaan Node (32 MB) sudah terlampaui oleh N=2^15, jadi
 * batasnya dinaikkan agar parameter di hash lama tetap bisa diverifikasi.
 */
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const ALGORITHM = "scrypt";

/**
 * Batas atas parameter yang diterima dari database. Tanpa batas ini, baris yang
 * sengaja dibuat mahal bisa menghabiskan memori/CPU proses (scrypt sendiri
 * menolak N besar, tapi `r`/`p` tidak).
 */
const MAX_PARAMS = { N: 1_048_576, r: 32, p: 16 } as const;

/** Panjang password minimal. Cukup mencegah salah ketik, tidak menuntut sandi kuat. */
export const MIN_PASSWORD_LENGTH = 6;
/** Panjang password maksimal; mencegah hash atas input raksasa. */
export const MAX_PASSWORD_LENGTH = 200;

/** Alasan password ditolak, dipakai untuk pesan yang bisa ditampilkan. */
export type PasswordProblem = "TOO_SHORT" | "TOO_LONG";

/**
 * Periksa bentuk password sebelum di-hash. Aturannya sengaja sederhana agar
 * guru demo tidak terhalang aturan komposisi.
 */
export function checkPassword(password: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "TOO_SHORT";
  if (password.length > MAX_PASSWORD_LENGTH) return "TOO_LONG";
  return null;
}

/**
 * Buat hash password baru. Salt acak membedakan dua guru dengan password sama.
 *
 * Satu-satunya cara password teks biasa masuk database adalah lewat fungsi ini;
 * tidak ada jalur lain yang boleh menulis ke `teachers.password_hash`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEY_BYTES, {
    ...DEFAULT_PARAMS,
    maxmem: SCRYPT_MAX_MEMORY,
  });

  return [
    ALGORITHM,
    DEFAULT_PARAMS.N,
    DEFAULT_PARAMS.r,
    DEFAULT_PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Hasil `parsePasswordHash()`: nilai yang siap dipakai `scrypt`. */
type ParsedHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
};

function toPositiveInt(text: string, max: number, min = 1): number | null {
  if (!/^\d{1,7}$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < min || value > max) return null;
  return value;
}

/**
 * Urai hash tersimpan. `null` berarti hash tidak dikenal/rusak dan pemanggil
 * harus memperlakukannya sebagai "tidak cocok".
 */
function parsePasswordHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6) return null;

  const [algorithm, nText, rText, pText, saltText, keyText] = parts;
  if (algorithm !== ALGORITHM) return null;

  // N harus pangkat dua — syarat scrypt.
  const N = toPositiveInt(nText, MAX_PARAMS.N, 2);
  if (N === null || (N & (N - 1)) !== 0) return null;
  const r = toPositiveInt(rText, MAX_PARAMS.r);
  if (r === null) return null;
  const p = toPositiveInt(pText, MAX_PARAMS.p);
  if (p === null) return null;

  const salt = Buffer.from(saltText, "base64");
  const key = Buffer.from(keyText, "base64");
  if (salt.length < SALT_BYTES || key.length !== KEY_BYTES) return null;

  return { N, r, p, salt, key };
}

/**
 * Bandingkan password dengan hash tersimpan, waktu konstan.
 *
 * @param password password yang diketik guru.
 * @param stored   nilai `teachers.password_hash`.
 * @returns `true` hanya bila hashnya sah dan password cocok.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (parsed === null) return false;
  if (checkPassword(password) !== null) return false;

  try {
    const derived = await scrypt(password, parsed.salt, parsed.key.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: SCRYPT_MAX_MEMORY,
    });

    return timingSafeEqual(derived, parsed.key);
  } catch {
    // Parameter yang tidak bisa dijalankan (mis. terlalu mahal) diperlakukan
    // sebagai hash rusak, bukan error 500.
    return false;
  }
}
