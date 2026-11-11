/**
 * Menerbitkan cerita untuk guru demo langsung dari CLI.
 *
 * Pemakaian:
 *
 * ```bash
 * bun run dev:publish <storyId>
 * ```
 *
 * Berguna untuk menguji endpoint publik `GET /api/stories/[storyId]` dan alur
 * permainan siswa sebelum antarmuka guru selesai dibuat.
 *
 * Script ini tidak pernah mencetak credential atau URL koneksi.
 */

import { TEACHER_ID } from "../src/server/auth";
import { getReadyDb } from "../src/server/db";
import { publishStory, StoryNotFoundError } from "../src/server/stories";

async function main(): Promise<void> {
  const storyId = process.argv[2]?.trim();

  if (!storyId) {
    console.error("Pemakaian: bun run dev:publish <storyId>");
    process.exitCode = 1;
    return;
  }

  try {
    const db = await getReadyDb();

    const versionQuery = await db.execute({
      sql: "select coalesce(max(version), 0) as latest from story_versions where story_id = ?",
      args: [storyId],
    });

    const latestVersion = Number(versionQuery.rows[0]?.latest ?? 0);
    if (latestVersion === 0) {
      console.error(
        `Cerita "${storyId}" tidak memiliki versi draft untuk diterbitkan.`,
      );
      process.exitCode = 1;
      return;
    }

    const outcome = await publishStory(db, {
      teacherId: TEACHER_ID,
      storyId,
      expectedVersion: latestVersion,
    });

    if (outcome.ok) {
      console.log(
        `Cerita "${storyId}" versi ${latestVersion} berhasil diterbitkan.`,
      );
    } else if ("conflict" in outcome) {
      console.error(
        `Gagal menerbitkan cerita "${storyId}": terjadi konflik versi.`,
      );
      process.exitCode = 1;
    } else {
      const messages = outcome.errors.map((e) => e.message).join("; ");
      console.error(
        `Gagal menerbitkan cerita "${storyId}": validasi gagal (${messages}).`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof StoryNotFoundError) {
      console.error(
        `Cerita "${storyId}" tidak ditemukan atau bukan milik guru demo.`,
      );
    } else {
      console.error("Terjadi kesalahan internal saat menerbitkan cerita.");
    }
    process.exitCode = 1;
  }
}

await main();
