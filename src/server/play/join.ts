/**
 * Gerbang kode kelas `/play` — siswa masuk tanpa tautan guru.
 *
 * Kontrak: `docs/05-frontend/game-player.md` bagian "Gerbang kode kelas" dan
 * `docs/09-decisions/0039-kode-kelas-masuk-game.md`.
 *
 * Alur (ADR 0041):
 *
 * ```text
 * kode QST-XXXX ─► kelas + guru ─► NIS terdaftar milik guru itu?
 *                                     ├─ tidak → nis_not_found (tidak bisa masuk)
 *                                     └─ ya → daftar game terbit guru itu
 *                                                ├─ 1 game  → langsung dimainkan
 *                                                └─ >1 game → siswa memilih dulu
 * ```
 *
 * Aturan yang dipegang:
 *
 * - **Kode divalidasi di server**, bukan di client. Bentuk salah, kode tidak
 *   ada, dan kode milik guru lain dijawab pesan berbeda hanya sejauh yang
 *   membantu siswa; tidak ada data kelas/guru yang dikirim sebelum cocok.
 * - **Kelas menentukan guru, bukan sebaliknya.** Game yang boleh dibuka hanya
 *   game terbit milik guru pemilik kelas itu, jadi kode kelas satu guru tidak
 *   pernah membuka cerita guru lain.
 * - **Identitas dari NIS, bukan nama** (ADR 0041). NIS dibandingkan dengan NIS
 *   murid milik guru kelas itu — bukan hanya kelas ini — karena NIS memang unik
 *   per guru. Titik dan strip diabaikan saat membandingkan supaya `2026.001`
 *   dan `2026001` dianggap sama. NIS yang tidak ada di daftar **ditolak
 *   `nis_not_found`**: siswa tidak bisa masuk. NIS yang cocok tepat satu →
 *   `studentId` + nama lengkap dari baris `students` (yang ditampilkan UI
 *   sebagai konfirmasi "sudah benar orangnya?"). Cocok lebih dari satu →
 *   `nis_ambiguous` beserta daftar calon, bukan ditebak.
 * - **Isi cerita diambil dari `getPlayEntry`**, bukan query kedua: kelas, daftar
 *   siswa, dan `classLinkInvalid` dijamin sama dengan jalur tautan guru. Nama
 *   lengkap yang dikonfirmasi siswa diambil dari daftar itu, bukan dari input.
 */

import "server-only";

import type { Client } from "@libsql/client";

import {
  cleanNis,
  getClassroomByCode,
  MAX_NIS_LENGTH,
  normalizeClassCode,
} from "@/server/classrooms";
import { getReadyDb } from "@/server/db";
import { getPlayEntry, type PlayEntry } from "@/server/play/entry";
import { listPublishedGames } from "@/server/stories";
import type {
  JoinFailureReason,
  JoinGame,
  JoinNisCandidate,
  JoinOutcome,
  PlayClassroom,
} from "@/server/contracts";

/** Batas panjang kode kelas yang diterima dari form (bentuk baku 8 karakter). */
const MAX_CODE_LENGTH = 16;

/**
 * Batas jumlah murid satu guru yang ikut dicari saat mencocokkan NIS.
 * Sengaja lebih longgar dari `MAX_STUDENTS_PER_CLASS` karena satu guru bisa
 * punya beberapa kelas.
 */
const MAX_STUDENTS_PER_TEACHER = 2000;

export type JoinResolution =
  | {
      ok: true;
      classroom: PlayClassroom;
      /** Guru pemilik kelas; hanya dipakai di server. */
      teacherId: string;
      games: JoinGame[];
    }
  | {
      ok: false;
      reason: Extract<JoinFailureReason, "invalid_code" | "not_found">;
    };

/** Kelas + daftar game terbit gurunya untuk satu kode. */
export async function resolveClassCode(
  db: Client,
  code: unknown,
): Promise<JoinResolution> {
  if (typeof code !== "string" || code.trim() === "") {
    return { ok: false, reason: "invalid_code" };
  }
  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, reason: "invalid_code" };
  }

  // Bentuk kode diperiksa lebih dulu supaya "QST-12" (salah bentuk) dijawab
  // `invalid_code`, bukan `not_found` yang membuat siswa mengira kodenya salah
  // ketik padahal polanya memang tidak sah.
  const normalized = normalizeClassCode(code);
  if (normalized === null) return { ok: false, reason: "invalid_code" };

  const classroom = await getClassroomByCode(db, normalized);
  if (classroom === null) return { ok: false, reason: "not_found" };

  const games = await listPublishedGames(db, {
    teacherId: classroom.teacherId,
  });

  return {
    ok: true,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
    },
    teacherId: classroom.teacherId,
    games: games.map((game) => ({
      storyId: game.storyId,
      title: game.title,
      subject: game.subject,
      gradeLevel: game.gradeLevel,
    })),
  };
}

export type JoinInput = {
  /** Kode kelas mentah dari form. */
  code: unknown;
  /** NIS yang diketik siswa. */
  nis: unknown;
  /** Game yang dipilih; kosong = biarkan server memilih. */
  storyId?: unknown;
};

/**
 * Bentuk pembanding NIS: titik dan strip dibuang, huruf disamakan besar/kecil.
 *
 * Hanya untuk **membandingkan**; nilai yang dikirim balik ke UI tetap NIS asli
 * dari baris `students`. Untungnya pemisah seperti titik sering hilang saat NIS
 * ditulis ulang dari kartu atau papan tulis.
 */
export function normalizeForCompare(nis: string): string {
  return nis.replace(/[._-]/g, "").toLowerCase();
}

/**
 * Cari murid dari NIS yang diketik siswa.
 *
 * `students` adalah **seluruh murid guru pemilik kelas** (bukan hanya kelas
 * ini), karena NIS unik per guru: siswa yang salah mengetik kode kelas tetap
 * dikenali, dan NIS yang tidak ada di daftar guru itu ditolak.
 *
 * - `invalid` — kosong atau bentuknya bukan NIS (`cleanNis`);
 * - `none` — tidak ada murid dengan NIS itu → siswa tidak bisa masuk;
 * - `ambiguous` — beberapa murid (mis. `2026.001` vs `2026001`) cocok; server
 *   tidak menebak, UI menampilkan calonnya;
 * - `ok` — tepat satu murid: nama lengkap diambil dari daftar, bukan dari input.
 */
export type NisLookup =
  | { status: "invalid" }
  | { status: "none" }
  | { status: "ambiguous"; candidates: JoinNisCandidate[] }
  | { status: "ok"; student: JoinNisCandidate };

export function findStudentByNis(
  students: {
    id: string;
    name: string;
    nis: string | null;
    classroomId: string | null;
  }[],
  nis: unknown,
): NisLookup {
  const dicari = cleanNis(nis);
  if (dicari === null) return { status: "invalid" };

  const target = normalizeForCompare(dicari);
  const cocok = students.flatMap((student) => {
    if (student.nis === null) return [];
    if (normalizeForCompare(student.nis) !== target) return [];
    return [{ studentId: student.id, name: student.name, nis: student.nis }];
  });

  if (cocok.length === 0) return { status: "none" };
  if (cocok.length > 1) return { status: "ambiguous", candidates: cocok };
  return { status: "ok", student: cocok[0] };
}

/** NIS dalam bentuk baku untuk disimpan di sesi main; `""` bila tidak sah. */
export function cleanPlayerNis(value: unknown): string {
  return cleanNis(value) ?? "";
}

/**
 * Mulai bermain dari kode kelas + NIS.
 *
 * `storyId` diisi saat siswa memilih dari daftar (guru punya beberapa game);
 * tanpa `storyId`, satu-satunya game terbit langsung dipakai. Game yang bukan
 * milik guru kelas itu ditolak `story_not_found`, bukan diam-diam diganti.
 *
 * NIS diperiksa **sebelum** siswa diminta memilih game: siswa yang NIS-nya
 * tidak ada di daftar guru itu tidak boleh masuk sama sekali (ADR 0041).
 */
export async function startJoin(
  db: Client,
  input: JoinInput,
): Promise<JoinOutcome> {
  const resolved = await resolveClassCode(db, input.code);
  if (!resolved.ok) return { ok: false, reason: resolved.reason };

  if (resolved.games.length === 0) return { ok: false, reason: "no_games" };

  const nis = cleanPlayerNis(input.nis);
  if (nis === "") return { ok: false, reason: "invalid_nis" };

  // Pembanding NIS tidak boleh lebih panjang dari yang diterima `cleanNis`;
  // batas ini hanya menjaga kunci pencarian tetap wajar.
  if (nis.length > MAX_NIS_LENGTH) return { ok: false, reason: "invalid_nis" };

  const diminta = typeof input.storyId === "string" ? input.storyId : null;

  if (diminta === null) {
    // Tanpa pilihan eksplisit: satu game langsung dibuka, beberapa game harus
    // dipilih dulu supaya siswa tidak masuk ke game yang bukan tugasnya.
    if (resolved.games.length > 1) {
      // NIS tetap harus terdaftar sebelum siswa melihat daftar game.
      const daftar = await listTeacherStudents(db, resolved.teacherId);
      const cari = findStudentByNis(daftar, nis);
      if (cari.status === "ambiguous") {
        return {
          ok: false,
          reason: "nis_ambiguous",
          candidates: cari.candidates,
        };
      }
      if (cari.status !== "ok") return { ok: false, reason: "nis_not_found" };

      return {
        ok: true,
        jenis: "pilih",
        classroom: resolved.classroom,
        games: resolved.games,
      };
    }
  } else if (!resolved.games.some((game) => game.storyId === diminta)) {
    return { ok: false, reason: "story_not_found" };
  }

  const storyId = diminta ?? resolved.games[0].storyId;

  // `getPlayEntry` memakai kode kelas yang sama, jadi pengecekan kepemilikan
  // kelas terhadap guru cerita terjadi sekali lagi di jalur yang sudah teruji.
  const entry: PlayEntry | null = await getPlayEntry(
    storyId,
    resolved.classroom.code,
  );
  if (entry === null || entry.classroom === null) {
    return { ok: false, reason: "story_not_found" };
  }

  // Dicari di seluruh murid guru itu (bukan hanya `entry.students`): NIS unik
  // per guru, dan siswa yang salah mengetik kode kelas tetap dikenali. Nama
  // lengkap diambil dari baris `students`, bukan dari input siswa.
  const cari = findStudentByNis(
    await listTeacherStudents(db, resolved.teacherId),
    nis,
  );
  if (cari.status === "ambiguous") {
    return {
      ok: false,
      reason: "nis_ambiguous",
      candidates: cari.candidates,
    };
  }
  if (cari.status !== "ok") return { ok: false, reason: "nis_not_found" };

  return {
    ok: true,
    jenis: "main",
    story: entry.story,
    classroom: entry.classroom,
    students: entry.students,
    pemain: { studentId: cari.student.studentId, name: cari.student.name },
  };
}

/**
 * Seluruh murid milik satu guru lintas kelas, untuk mencocokkan NIS.
 *
 * `classroom_id` ikut dibaca supaya pemanggil bisa membedakan murid kelas ini
 * dari kelas lain tanpa query kedua. Dibatasi jumlahnya supaya guru dengan
 * daftar sangat panjang tidak membuat satu percobaan masuk jadi mahal.
 */
async function listTeacherStudents(
  db: Client,
  teacherId: string,
): Promise<
  { id: string; name: string; nis: string | null; classroomId: string | null }[]
> {
  const result = await db.execute({
    sql: `select id, classroom_id, display_name, nis
          from students
          where teacher_id = ?
          order by display_name collate nocase
          limit ?`,
    args: [teacherId, MAX_STUDENTS_PER_TEACHER],
  });

  return result.rows.map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.display_name ?? ""),
    nis: row.nis === null || row.nis === undefined ? null : String(row.nis),
    classroomId:
      row.classroom_id === null || row.classroom_id === undefined
        ? null
        : String(row.classroom_id),
  }));
}

/** Versi siap pakai untuk Server Action: membuka database sendiri. */
export async function startJoinWithDb(input: JoinInput): Promise<JoinOutcome> {
  return startJoin(await getReadyDb(), input);
}
