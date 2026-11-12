"use server";

/**
 * Server Actions halaman `/guru/kelas`: buat kelas dan tambah siswa.
 *
 * Pola sama dengan `src/app/guru/actions.ts`: `requireTeacher()` → fungsi inti
 * di `src/server/classrooms` → `revalidatePath`. Input dari client dianggap
 * tidak tepercaya dan dinormalisasi di core; error domain diterjemahkan ke
 * bentuk hasil kontrak (`AddStudentResult` / `CreateClassroomResult`), bukan
 * HTTP, karena action tidak punya status code.
 *
 * Hanya dua hal yang bisa dilakukan: membuat kelas dan menambah siswa. Daftar
 * awal sengaja kosong — tidak ada data contoh yang disisipkan otomatis.
 *
 * Pengaman tambahan:
 *
 * - `guardClassroomWrite()` membatasi tulisan per guru (60/jam). Fail open: bila
 *   penghitung bermasalah, guru sah tetap bisa menyimpan.
 * - Empat pesan error di file ini statis. Tidak ada teks dari input, nama
 *   tabel, atau pesan driver yang pernah ikut dikirim ke browser.
 */

import { revalidatePath } from "next/cache";

import type {
  AddStudentResult,
  CreateClassroomResult,
} from "@/server/contracts";
import { requireTeacher } from "@/server/auth";
import {
  addStudent as addStudentCore,
  ClassroomNotFoundError,
  createClassroom as createClassroomCore,
  DATABASE_FAILURE_MESSAGE,
} from "@/server/classrooms";
import { getReadyDb } from "@/server/db";
import { guardClassroomWrite } from "@/server/rate-limit";

/** Pesan saat guru menulis terlalu sering; tanpa angka dari server. */
const RATE_LIMITED_MESSAGE =
  "Terlalu banyak perubahan kelas dalam waktu singkat. Tunggu sebentar, lalu coba lagi.";

/** Jalur yang menampilkan jumlah kelas/siswa. */
const revalidateClassPaths = (): void => {
  revalidatePath("/guru/kelas");
  revalidatePath("/guru");
};

/** Bentuk input dari form kelas baru. */
export type CreateClassroomActionInput = {
  name: string;
  subject: string;
  grade: string;
  year: string;
};

/** Bentuk input dari form tambah siswa. */
export type AddStudentActionInput = {
  classroomId: string;
  name: string;
  nis: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toText = (value: unknown): unknown =>
  typeof value === "string" ? value : "";

export async function createClassroom(
  input: CreateClassroomActionInput,
): Promise<CreateClassroomResult> {
  const { teacherId } = await requireTeacher();

  if (!isObject(input)) {
    return { ok: false, message: "Data kelas tidak terbaca. Coba lagi." };
  }

  const gate = await guardClassroomWrite(teacherId);
  if (gate.response !== null) {
    return { ok: false, message: RATE_LIMITED_MESSAGE };
  }

  try {
    const result = await createClassroomCore(await getReadyDb(), {
      teacherId,
      name: toText(input.name),
      subject: toText(input.subject),
      grade: toText(input.grade),
      year: toText(input.year),
    });

    if (result.ok) revalidateClassPaths();
    return result;
  } catch {
    return { ok: false, message: DATABASE_FAILURE_MESSAGE };
  }
}

export async function addStudent(
  input: AddStudentActionInput,
): Promise<AddStudentResult> {
  const { teacherId } = await requireTeacher();

  if (!isObject(input) || typeof input.classroomId !== "string") {
    return { ok: false, message: "Data siswa tidak terbaca. Coba lagi." };
  }

  const gate = await guardClassroomWrite(teacherId);
  if (gate.response !== null) {
    return { ok: false, message: RATE_LIMITED_MESSAGE };
  }

  try {
    const result = await addStudentCore(await getReadyDb(), {
      teacherId,
      classroomId: input.classroomId,
      name: toText(input.name),
      nis: toText(input.nis),
    });

    if (result.ok) revalidateClassPaths();
    return result;
  } catch (error) {
    if (error instanceof ClassroomNotFoundError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: DATABASE_FAILURE_MESSAGE };
  }
}
