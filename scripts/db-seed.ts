/**
 * Isi akun guru dan siswa dari environment.
 *
 * Pemakaian:
 *
 * ```bash
 * bun run db:seed
 * ```
 *
 * Database dipilih lewat `DATABASE_URL` (dan `DATABASE_AUTH_TOKEN` bila remote),
 * sama seperti `bun run db:migrate`. Migrasi yang belum jalan diterapkan lebih
 * dulu karena `getReadyDb()` memastikan skema terbaru.
 *
 * Aturan:
 *
 * - Password hanya masuk database sebagai hash scrypt (`src/server/password.ts`).
 * - Username dinormalisasi (huruf kecil, tanpa spasi tepi) sebelum disimpan.
 * - Akun yang sudah ada diperbarui (idempoten), bukan diduplikasi.
 * - Yang dicetak hanya username dan peran; password tidak pernah dicetak.
 * - Tanpa `TEACHER_SEED_*`/`STUDENT_SEED_*`, akun demo bawaan
 *   (`DEFAULT_SEED_ACCOUNTS`) yang dipakai. Ganti lewat environment sebelum
 *   deploy sungguhan.
 */

import { loadSeedConfig } from "../src/server/config";
import { normalizeUsername } from "../src/server/auth";
import { getReadyDb } from "../src/server/db";
import { DatabaseError } from "../src/server/db";
import {
  checkPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../src/server/password";

const TEACHER_ID = "teacher_demo";
const TEACHER_DISPLAY_NAME = "Guru Demo";
const STUDENT_ID = "student_demo";
const STUDENT_DISPLAY_NAME = "Siswa Demo";

type Account = {
  role: "guru" | "siswa";
  id: string;
  displayName: string;
  username: string;
  password: string;
};

function accountProblem(account: Account): string | null {
  const username = normalizeUsername(account.username);
  if (username === "") return `Username ${account.role} kosong.`;
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    return `Username ${account.role} hanya boleh huruf kecil, angka, titik, garis bawah, atau strip (3–64 karakter).`;
  }

  const problem = checkPassword(account.password);
  if (problem === "TOO_SHORT") {
    return `Sandi ${account.role} minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (problem === "TOO_LONG") {
    return `Sandi ${account.role} maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }

  return null;
}

async function main(): Promise<void> {
  const seed = loadSeedConfig();

  const accounts: Account[] = [
    {
      role: "guru",
      id: TEACHER_ID,
      displayName: TEACHER_DISPLAY_NAME,
      username: seed.teacherUsername,
      password: seed.teacherPassword,
    },
    {
      role: "siswa",
      id: STUDENT_ID,
      displayName: STUDENT_DISPLAY_NAME,
      username: seed.studentUsername,
      password: seed.studentPassword,
    },
  ];

  for (const account of accounts) {
    const problem = accountProblem(account);
    if (problem !== null) {
      console.error(problem);
      process.exitCode = 1;
      return;
    }
  }

  const db = await getReadyDb();

  const teacher = accounts[0]!;
  await db.execute({
    sql: `insert into teachers (id, display_name, username, password_hash)
          values (?, ?, ?, ?)
          on conflict(id) do update set
            display_name = excluded.display_name,
            username = excluded.username,
            password_hash = excluded.password_hash`,
    args: [
      teacher.id,
      teacher.displayName,
      normalizeUsername(teacher.username),
      await hashPassword(teacher.password),
    ],
  });

  const student = accounts[1]!;
  await db.execute({
    sql: `insert into students (id, teacher_id, display_name, username, password_hash)
          values (?, ?, ?, ?, ?)
          on conflict(id) do update set
            teacher_id = excluded.teacher_id,
            display_name = excluded.display_name,
            username = excluded.username,
            password_hash = excluded.password_hash`,
    args: [
      student.id,
      teacher.id,
      student.displayName,
      normalizeUsername(student.username),
      await hashPassword(student.password),
    ],
  });

  console.log(
    `Akun siap: guru "${normalizeUsername(teacher.username)}", siswa "${normalizeUsername(student.username)}".`,
  );
  console.log(
    "Sandi tidak dicetak. Ganti TEACHER_SEED_PASSWORD/STUDENT_SEED_PASSWORD sebelum deploy sungguhan.",
  );
}

try {
  await main();
} catch (error) {
  // Hanya pesan DatabaseError yang sudah dijamin bebas URL/token.
  const message =
    error instanceof DatabaseError
      ? error.message
      : "Seed akun gagal. Periksa konfigurasi DATABASE_URL, DATABASE_AUTH_TOKEN, dan hak akses database.";
  console.error(message);
  process.exitCode = 1;
}
