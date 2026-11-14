/**
 * Data layar masuk siswa (`/play/[storyId]?kelas=QST-XXXX`).
 *
 * Kontrak: `docs/05-frontend/game-player.md` bagian "Layar masuk" dan
 * `docs/06-backend/persistence.md` (`play_results.classroom_id/student_id`).
 *
 * Aturan:
 *
 * - Cerita tetap harus `published`; sumbernya sama dengan `getPlayableStory`
 *   (`getPublishedStory`), hanya ditambah `teacherId` untuk pengecekan kelas.
 * - Kelas hanya dipakai bila kodenya sah **dan** pemiliknya guru pemilik
 *   cerita. Kelas guru lain diperlakukan seperti kode salah: `classroom: null`
 *   + `classLinkInvalid: true`, tanpa membocorkan kelas itu ada.
 * - Kode salah tidak membuat halaman 404. Siswa tetap bisa bermain dengan nama
 *   bebas; hasilnya tersimpan tanpa `classroom_id`, jadi tidak masuk analytics
 *   kelas. Layar masuk menjelaskan hal ini apa adanya.
 * - Yang dikirim ke client hanya id, nama, dan NIS siswa — bukan username,
 *   password hash, tahun ajaran, atau data guru.
 */

import "server-only";

import { DEMO_STORY, DEMO_STORY_ID } from "@/game/demoStory";
import { getClassroomByCode } from "@/server/classrooms";
import { getReadyDb } from "@/server/db";
import { getPublishedStory, MAX_STORY_ID_LENGTH } from "@/server/stories";
import type { PlayClassroom, PlayStudent } from "@/server/contracts";
import type { Story } from "@/story/schema";

export type PlayEntry = {
  story: Story;
  /** `null` bila tautan tidak membawa kelas, kode salah, atau kelas guru lain. */
  classroom: PlayClassroom | null;
  /** Daftar siswa kelas; kosong bila tidak ada kelas. */
  students: PlayStudent[];
  /**
   * `true` bila query `?kelas=` ada tetapi tidak bisa dipakai. UI memakai ini
   * untuk memberi tahu siswa bahwa hasil tidak akan masuk analytics kelas.
   */
  classLinkInvalid: boolean;
};

const kosong = (story: Story, classLinkInvalid: boolean): PlayEntry => ({
  story,
  classroom: null,
  students: [],
  classLinkInvalid,
});

/**
 * Ambil cerita + kelas + daftar siswa untuk layar masuk, atau `null` bila
 * cerita tidak boleh dimainkan.
 */
export async function getPlayEntry(
  storyId: string,
  classCode: string | null,
): Promise<PlayEntry | null> {
  if (
    typeof storyId !== "string" ||
    storyId === "" ||
    storyId.length > MAX_STORY_ID_LENGTH
  ) {
    return null;
  }

  // Demo tidak punya baris `stories`, jadi tidak ada guru/kelas untuk dicek.
  if (storyId === DEMO_STORY_ID) {
    return kosong(DEMO_STORY, classCode !== null);
  }

  const db = await getReadyDb();
  const published = await getPublishedStory(db, { storyId });
  if (published === null || published.story === null) return null;

  if (classCode === null) return kosong(published.story, false);

  const classroom = await getClassroomByCode(db, classCode);
  if (classroom === null || classroom.teacherId !== published.teacherId) {
    return kosong(published.story, true);
  }

  return {
    story: published.story,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
    },
    students: classroom.students.map((student) => ({
      id: student.id,
      name: student.name,
      nis: student.nis,
    })),
    classLinkInvalid: false,
  };
}
