/**
 * Logika inti kelas dan siswa (halaman `/guru/kelas`).
 *
 * Sebelumnya halaman ini memakai data contoh di `src/components/guru/data.ts`.
 * Sekarang kelas dan siswa dibaca dari tabel `classrooms`/`students`
 * (migrasi `0005_classrooms_students`), sehingga daftar awal **kosong**: guru
 * membuat kelas dulu, lalu menambahkan siswa satu per satu.
 *
 * Aturan yang dipegang:
 *
 * - **Kepemilikan.** Semua query memfilter `classrooms.teacher_id` /
 *   `students.teacher_id`; kelas atau siswa milik guru lain dan yang tidak ada
 *   sama-sama `null` → `ClassroomNotFoundError` / `StudentNotFoundError`
 *   (action menjawab pesan identik, tanpa membocorkan keberadaannya).
 * - **Validasi di server.** Nama dan NIS dinormalisasi di sini, tahun ajaran
 *   hanya diterima dalam bentuk baku `YYYY/YYYY`. Client tidak pernah
 *   dipercaya: picker di UI hanya kenyamanan, bukan pengaman.
 * - **Tanpa akun login siswa.** `username`/`password_hash` dibiarkan `null`;
 *   `/play/[storyId]` tetap berbasis tautan
 *   (`docs/00-product/personas-and-roles.md`).
 * - Ikut dibuat dalam satu transaksi: kelas + kode kelas, dan siswa + nomor
 *   urut NIS.
 */

import "server-only";

import { randomUUID } from "node:crypto";

import type { Client } from "@libsql/client";

import { normalizeAcademicYear } from "@/lib/academic-year";
import type {
  AddStudentResult,
  ClassroomDetail,
  CreateClassroomResult,
  StudentListItem,
} from "@/server/contracts";

/* -------------------------------------------------------------------------- */
/* Batas                                                                      */
/* -------------------------------------------------------------------------- */

/** Batas panjang id (uuid + awalan); cukup longgar, mencegah payload raksasa. */
const MAX_ID_LENGTH = 100;

/** Panjang maksimum nama kelas, mapel, jenjang, dan nama siswa. */
export const MAX_CLASS_NAME_LENGTH = 80;
export const MAX_SUBJECT_LENGTH = 60;
export const MAX_GRADE_LENGTH = 40;
export const MAX_STUDENT_NAME_LENGTH = 80;
export const MAX_NIS_LENGTH = 20;

/** Batas jumlah siswa yang dibaca per kelas (daftar kelas satu sekolah demo). */
export const MAX_STUDENTS_PER_CLASS = 500;

/** Pesan yang boleh dilihat guru. Statis, tanpa data dari input. */
export const CLASSROOM_NOT_FOUND_MESSAGE =
  "Kelas tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman ini.";
export const CLASSROOM_NAME_INVALID_MESSAGE =
  "Nama kelas wajib diisi (1–80 karakter).";
export const ACADEMIC_YEAR_INVALID_MESSAGE =
  "Tahun ajaran tidak sah. Pilih dari daftar (format 2026/2027).";
export const CLASSROOM_CODE_CONFLICT_MESSAGE =
  "Kode kelas bentrok dengan kelas lain. Coba lagi sekali lagi.";
export const STUDENT_NAME_INVALID_MESSAGE =
  "Nama siswa wajib diisi (1–80 karakter).";
export const STUDENT_NIS_INVALID_MESSAGE =
  "NIS tidak sah: isi angka/huruf tanpa spasi, maksimal 20 karakter.";
export const STUDENT_NIS_DUPLICATE_MESSAGE =
  "NIS itu sudah dipakai siswa lain di kelas-kelasmu.";
export const DATABASE_FAILURE_MESSAGE =
  "Perubahan belum tersimpan karena database tidak bisa diakses. Coba lagi sebentar lagi.";

/* -------------------------------------------------------------------------- */
/* Error                                                                      */
/* -------------------------------------------------------------------------- */

export class ClassroomNotFoundError extends Error {
  constructor() {
    super(CLASSROOM_NOT_FOUND_MESSAGE);
    this.name = "ClassroomNotFoundError";
  }
}

/* -------------------------------------------------------------------------- */
/* Normalisasi input                                                          */
/* -------------------------------------------------------------------------- */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/**
 * Karakter tak terlihat yang sering dipakai untuk menyamarkan teks: zero-width
 * space/joiner, word joiner, tanda arah (LTR/RTL override), dan BOM.
 *
 * Bukan cuma kosmetik: nama yang terlihat "Andi" bisa sebenarnya memuat
 * karakter RTL yang membalik tampilan daftar siswa, atau dua siswa dengan nama
 * tampak sama. Karakter ini dibuang, bukan diganti spasi.
 */
const INVISIBLE_CHARS =
  /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

/** Rapikan teks dari form: buang karakter kontrol & tak terlihat, spasi ganda, spasi tepi. */
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(CONTROL_CHARS, " ")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * NIS opsional: huruf, angka, titik, dan strip (mis. `2026.001` atau
 * `A-102`). Kosong = `null` (tidak semua sekolah memakai NIS).
 */
export function cleanNis(value: unknown): string | null {
  const text = cleanText(value, MAX_NIS_LENGTH + 1);
  if (text === "") return null;
  if (text.length > MAX_NIS_LENGTH) return null;
  return /^[A-Za-z0-9._-]+$/.test(text) ? text.toUpperCase() : null;
}

/** Kode kelas baru, mis. `QST-7K3M`. Huruf I/O/1/0 dihindari agar tidak salah baca. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateClassCode(random: () => number = Math.random): string {
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return `QST-${suffix}`;
}

/** Bentuk baku kode kelas yang diterima tautan siswa. */
export const CLASS_CODE_PATTERN = /^QST-[A-Z0-9]{4}$/;

/**
 * Normalisasi kode kelas dari query string: buang spasi tepi, jadikan huruf
 * besar, lalu pastikan bentuknya `QST-XXXX`. Nilai lain → `null` (bukan
 * ditebak atau dipotong), supaya tautan yang salah ketik tidak diam-diam
 * mengarah ke kelas lain.
 */
export function normalizeClassCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CLASS_CODE_PATTERN.test(code) ? code : null;
}

/* -------------------------------------------------------------------------- */
/* Query                                                                      */
/* -------------------------------------------------------------------------- */

const toText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const toNullableText = (value: unknown): string | null =>
  value === null || value === undefined || String(value) === ""
    ? null
    : String(value);

type StudentRow = Record<string, unknown>;

function toStudent(row: StudentRow): StudentListItem {
  return {
    id: toText(row.id),
    classroomId: toNullableText(row.classroom_id),
    name: toText(row.display_name),
    nis: toNullableText(row.nis),
    username: toNullableText(row.username),
    createdAt: toText(row.created_at),
  };
}

type ClassroomRow = Record<string, unknown>;

function toClassroom(
  row: ClassroomRow,
  students: StudentListItem[],
): ClassroomDetail {
  return {
    id: toText(row.id),
    name: toText(row.name),
    subject: toText(row.subject),
    grade: toText(row.grade_level),
    code: toText(row.code),
    year: toText(row.academic_year),
    students,
    createdAt: toText(row.created_at),
  };
}

async function readStudents(
  db: Client,
  teacherId: string,
  classroomId: string,
): Promise<StudentListItem[]> {
  const result = await db.execute({
    sql: `select id, classroom_id, display_name, nis, username, created_at
          from students
          where teacher_id = ? and classroom_id = ?
          order by created_at asc, display_name asc
          limit ?`,
    args: [teacherId, classroomId, MAX_STUDENTS_PER_CLASS],
  });

  return result.rows.map((row) => toStudent(row as StudentRow));
}

/**
 * Semua kelas milik guru, terbaru lebih dulu. Daftar awal kosong bila guru
 * belum pernah membuat kelas.
 */
export async function listClassrooms(
  db: Client,
  teacherId: string,
): Promise<ClassroomDetail[]> {
  const result = await db.execute({
    sql: `select id, name, subject, grade_level, code, academic_year, created_at
          from classrooms
          where teacher_id = ?
          order by created_at desc`,
    args: [teacherId],
  });

  const classrooms: ClassroomDetail[] = [];
  for (const row of result.rows) {
    const classroomRow = row as ClassroomRow;
    classrooms.push(
      toClassroom(
        classroomRow,
        await readStudents(db, teacherId, toText(classroomRow.id)),
      ),
    );
  }

  return classrooms;
}

/** Satu kelas milik guru, atau `null` bila tidak ada / milik guru lain. */
export async function getClassroom(
  db: Client,
  input: { teacherId: string; classroomId: string },
): Promise<ClassroomDetail | null> {
  const { teacherId, classroomId } = input;
  if (typeof classroomId !== "string" || classroomId === "") return null;
  if (classroomId.length > MAX_ID_LENGTH) return null;

  const result = await db.execute({
    sql: `select id, name, subject, grade_level, code, academic_year, created_at
          from classrooms
          where id = ? and teacher_id = ?
          limit 1`,
    args: [classroomId, teacherId],
  });

  const row = result.rows[0];
  if (row === undefined) return null;

  return toClassroom(
    row as ClassroomRow,
    await readStudents(db, teacherId, classroomId),
  );
}

/** Kelas + pemiliknya, dipakai server untuk mencocokkan tautan siswa. */
export type ClassroomWithOwner = ClassroomDetail & { teacherId: string };

/**
 * Satu kelas dari kode `QST-XXXX` (tautan siswa), atau `null` bila kode tidak
 * sah / tidak ada.
 *
 * Tidak memfilter guru: pemanggil (`getPlayEntry`) yang memastikan kelas ini
 * milik guru pemilik cerita. Fungsi ini tetap mengembalikan `teacherId` supaya
 * pengecekan itu tidak perlu query kedua.
 */
export async function getClassroomByCode(
  db: Client,
  code: unknown,
): Promise<ClassroomWithOwner | null> {
  const normalized = normalizeClassCode(code);
  if (normalized === null) return null;

  const result = await db.execute({
    sql: `select id, teacher_id, name, subject, grade_level, code, academic_year, created_at
          from classrooms
          where code = ?
          limit 1`,
    args: [normalized],
  });

  const row = result.rows[0];
  if (row === undefined) return null;

  const classroomRow = row as ClassroomRow;
  const teacherId = toText(classroomRow.teacher_id);
  if (teacherId === "") return null;

  return {
    ...toClassroom(
      classroomRow,
      await readStudents(db, teacherId, toText(classroomRow.id)),
    ),
    teacherId,
  };
}

export type CreateClassroomInput = {
  teacherId: string;
  name: unknown;
  subject: unknown;
  grade: unknown;
  year: unknown;
};

/**
 * Buat kelas baru. Daftar siswa kelas baru selalu kosong.
 *
 * Kode kelas dibuat acak; kalau bentrok (sangat jarang), dicoba beberapa kali
 * sebelum menyerah dengan pesan yang bisa dicoba ulang guru.
 */
export async function createClassroom(
  db: Client,
  input: CreateClassroomInput,
): Promise<CreateClassroomResult> {
  const name = cleanText(input.name, MAX_CLASS_NAME_LENGTH);
  if (name === "")
    return { ok: false, message: CLASSROOM_NAME_INVALID_MESSAGE };

  const subject = cleanText(input.subject, MAX_SUBJECT_LENGTH);
  const grade = cleanText(input.grade, MAX_GRADE_LENGTH);

  // Tahun ajaran bukan teks bebas: hanya `YYYY/YYYY` baku yang lolos. Nilai
  // lain (spasi, emoji, karakter kontrol, `2026-2027`, `2026/2028`) ditolak,
  // bukan dipotong atau diperbaiki diam-diam.
  const year = normalizeAcademicYear(input.year);
  if (year === null) {
    return { ok: false, message: ACADEMIC_YEAR_INVALID_MESSAGE };
  }

  const id = randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateClassCode();

    // Cek kode dulu: client database membungkus error driver, jadi pesan
    // "unique constraint failed" tidak bisa dibedakan setelah insert.
    const taken = await db.execute({
      sql: "select 1 from classrooms where code = ? limit 1",
      args: [code],
    });
    if (taken.rows.length > 0) continue;

    await db.execute({
      sql: `insert into classrooms
              (id, teacher_id, name, subject, grade_level, code, academic_year)
            values (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, input.teacherId, name, subject, grade, code, year],
    });

    const created = await getClassroom(db, {
      teacherId: input.teacherId,
      classroomId: id,
    });
    if (created === null) throw new ClassroomNotFoundError();

    return { ok: true, classroom: created };
  }

  return { ok: false, message: CLASSROOM_CODE_CONFLICT_MESSAGE };
}

export type AddStudentInput = {
  teacherId: string;
  classroomId: string;
  name: unknown;
  nis: unknown;
};

/**
 * Tambahkan satu siswa ke kelas. `nis` kosong diisi otomatis dengan nomor urut
 * (`1001`, `1002`, …) supaya daftar tetap rapi tanpa memaksa guru mengetik.
 */
export async function addStudent(
  db: Client,
  input: AddStudentInput,
): Promise<AddStudentResult> {
  const classroom = await getClassroom(db, {
    teacherId: input.teacherId,
    classroomId: input.classroomId,
  });
  if (classroom === null) throw new ClassroomNotFoundError();

  const name = cleanText(input.name, MAX_STUDENT_NAME_LENGTH);
  if (name === "") return { ok: false, message: STUDENT_NAME_INVALID_MESSAGE };

  const rawNis = cleanText(input.nis, MAX_NIS_LENGTH + 1);
  const nis = rawNis === "" ? null : cleanNis(rawNis);
  if (rawNis !== "" && nis === null) {
    return { ok: false, message: STUDENT_NIS_INVALID_MESSAGE };
  }

  const id = randomUUID();

  // NIS yang diketik guru harus belum terpakai; NIS otomatis dilewati sampai
  // ketemu nomor yang bebas (bisa saja nomor itu sudah dipakai kelas lain).
  let finalNis: string | null;
  if (nis !== null) {
    finalNis = (await nisExists(db, input.teacherId, nis)) ? null : nis;
    if (finalNis === null) {
      return { ok: false, message: STUDENT_NIS_DUPLICATE_MESSAGE };
    }
  } else {
    finalNis = await nextFreeNis(db, input.teacherId, classroom.students);
    if (finalNis === null) {
      return { ok: false, message: STUDENT_NIS_DUPLICATE_MESSAGE };
    }
  }

  await db.execute({
    sql: `insert into students
            (id, teacher_id, classroom_id, nis, display_name)
          values (?, ?, ?, ?, ?)`,
    args: [id, input.teacherId, classroom.id, finalNis, name],
  });

  return {
    ok: true,
    student: {
      id,
      classroomId: classroom.id,
      name,
      nis: finalNis,
      username: null,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Apakah NIS sudah dipakai siswa lain milik guru yang sama? */
async function nisExists(
  db: Client,
  teacherId: string,
  nis: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: "select 1 from students where teacher_id = ? and nis = ? limit 1",
    args: [teacherId, nis],
  });
  return result.rows.length > 0;
}

/**
 * NIS otomatis berikutnya: angka terbesar yang terlihat (di kelas ini atau di
 * database guru) + 1, minimal 1001. Bila nomor itu sudah terpakai, naik terus
 * sampai ketemu yang bebas.
 */
async function nextFreeNis(
  db: Client,
  teacherId: string,
  students: StudentListItem[],
): Promise<string | null> {
  const numeric = (value: string | null): number =>
    value !== null && /^\d{1,9}$/.test(value) ? Number(value) : 0;

  let highest = students.reduce(
    (max, student) => Math.max(max, numeric(student.nis)),
    0,
  );

  // NIS yang dipakai kelas lain milik guru yang sama juga harus dilewati.
  const result = await db.execute({
    sql: `select nis from students
          where teacher_id = ? and nis is not null and nis glob '[0-9]*'
          order by length(nis) desc, nis desc
          limit 1`,
    args: [teacherId],
  });
  highest = Math.max(highest, numeric(toNullableText(result.rows[0]?.nis)));

  const start = Math.max(1001, highest + 1);
  for (let offset = 0; offset < 200; offset += 1) {
    const candidate = String(start + offset);
    if (!(await nisExists(db, teacherId, candidate))) return candidate;
  }

  return null;
}
