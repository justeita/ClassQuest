/**
 * Identitas klien untuk rate limit — **tanpa menyimpan IP mentah**.
 *
 * Alur:
 *
 * 1. Ambil IP dari header `x-real-ip`, lalu entri pertama `x-forwarded-for`,
 *    kalau tidak ada keduanya `"unknown"`.
 * 2. Hash IP dengan HMAC-SHA256 dan `TEACHER_SESSION_SECRET` (dibaca lewat
 *    `src/server/config.ts`, sama seperti sesi guru) sehingga isi tabel
 *    `rate_limits` tidak membocorkan IP guru/siswa.
 * 3. Key yang dipakai adalah `"<nama-limit>:<hash>"`.
 *
 * Batasan yang harus disadari: header IP hanya bisa dipercaya di belakang proxy
 * hosting (Vercel, Cloudflare, dsb.) yang menimpanya. Kalau server terbuka
 * langsung, klien bisa mengirim header apa pun dan batas per IP menjadi tidak
 * bermakna. Karena itu ada juga batas per guru dan batas global untuk upload.
 *
 * Modul ini hanya untuk server: membaca environment dan `headers()`.
 */

import "server-only";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { loadTeacherAuthConfig } from "../config";

/** Nilai yang dipakai bila request tidak membawa IP sama sekali. */
export const UNKNOWN_CLIENT_IP = "unknown";

/** Identitas tetap untuk batas yang berlaku untuk semua klien (upload global). */
export const GLOBAL_RATE_LIMIT_IDENTITY = "global";

/**
 * Kunci HMAC tetap bila `TEACHER_SESSION_SECRET` kosong.
 *
 * Dipakai supaya demo lokal tetap jalan tanpa konfigurasi. Nilainya bukan
 * rahasia (tertulis di repo); kalau secret kosong, penyerang yang bisa menebak
 * IP bisa memverifikasi hash — diterima karena skema auth juga sudah menolak
 * login saat secret kosong. Jangan dipakai untuk data sungguhan.
 */
export const RATE_LIMIT_HASH_FALLBACK_SECRET =
  "classquest-rate-limit-hash-fallback-v1";

/**
 * Ambil IP dari header request (fungsi murni, mudah dites).
 *
 * Urutan mengikuti kontrak: `x-real-ip` dulu, lalu entri pertama
 * `x-forwarded-for` (dipisah koma, di-trim). Nilai kosong dianggap tidak ada.
 */
export function clientIpFromHeaders(
  read: (name: string) => string | null,
): string {
  const realIp = read("x-real-ip")?.trim();
  if (realIp !== undefined && realIp !== "") return realIp;

  const forwarded = read("x-forwarded-for");
  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();
    if (first !== undefined && first !== "") return first;
  }

  return UNKNOWN_CLIENT_IP;
}

/**
 * IP klien dari request yang sedang ditangani.
 *
 * `headers()` di Next 16 async; aman dipanggil dari route handler maupun
 * Server Action. Di luar request (mis. test tanpa mock) hasilnya `"unknown"`.
 */
export async function getClientIp(): Promise<string> {
  try {
    const store = await headers();
    return clientIpFromHeaders((name) => store.get(name));
  } catch {
    return UNKNOWN_CLIENT_IP;
  }
}

/** Hash identitas dengan HMAC-SHA256; panjang selalu 64 karakter heksadesimal. */
export function hashRateLimitIdentity(identity: string): string {
  const { sessionSecret } = loadTeacherAuthConfig();
  const secret =
    sessionSecret === null || sessionSecret === ""
      ? RATE_LIMIT_HASH_FALLBACK_SECRET
      : sessionSecret;

  return createHmac("sha256", secret).update(identity, "utf8").digest("hex");
}

/**
 * Bentuk key yang disimpan di `rate_limits`: `"<nama-limit>:<hash>"`.
 *
 * `identity` adalah nilai mentah (mis. `"ip:203.0.113.10"`); hanya hash-nya
 * yang keluar dari fungsi ini. Jangan pernah menyusun key secara manual.
 */
export function rateLimitKey(limitName: string, identity: string): string {
  return `${limitName}:${hashRateLimitIdentity(identity)}`;
}

/** Identitas IP dengan awalan supaya tidak bertabrakan dengan identitas lain. */
export function ipRateLimitIdentity(ip: string): string {
  return `ip:${ip}`;
}

/** Identitas guru; `teacherId` tidak disimpan mentah. */
export function teacherRateLimitIdentity(teacherId: string): string {
  return `teacher:${teacherId}`;
}

/** Key rate limit untuk IP pada request saat ini. */
export async function clientIpRateLimitKey(limitName: string): Promise<string> {
  return rateLimitKey(limitName, ipRateLimitIdentity(await getClientIp()));
}

/** Key rate limit per guru. */
export function teacherRateLimitKey(
  limitName: string,
  teacherId: string,
): string {
  return rateLimitKey(limitName, teacherRateLimitIdentity(teacherId));
}

/** Key rate limit global (tidak per klien). */
export function globalRateLimitKey(limitName: string): string {
  return rateLimitKey(limitName, GLOBAL_RATE_LIMIT_IDENTITY);
}
