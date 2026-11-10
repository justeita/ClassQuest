"use server";

/**
 * Server Actions manajemen cerita guru (task 20).
 *
 * Kontrak: `docs/06-backend/api-contract.md` bagian "Server Actions" dan
 * `docs/05-frontend/routes.md` (nama wajib `saveStoryDraft`, `publishStory`,
 * `archiveStory`, `deleteStory` — jangan membuat nama lain).
 *
 * Semua action tipis: `requireTeacher()` → panggil fungsi inti yang sama di
 * `src/server/stories` → `revalidatePath`. Input dari client dianggap tidak
 * tepercaya dan dinormalisasi lebih dulu; error domain diterjemahkan ke bentuk
 * hasil kontrak, bukan HTTP (action tidak punya status code).
 */

import { revalidatePath } from "next/cache";

import type {
  PublishStoryInput,
  PublishStoryResult,
  SaveStoryInput,
  SaveStoryResult,
  SimpleActionResult,
} from "@/server/contracts";
import { requireTeacher } from "@/server/auth";
import { getReadyDb } from "@/server/db";
import {
  archiveStory as archiveStoryCore,
  deleteStory as deleteStoryCore,
  MAX_STORY_ID_LENGTH,
  publishStory as publishStoryCore,
  saveStoryVersion,
  STORY_NOT_FOUND_ISSUE,
  STORY_TOO_LARGE_ISSUE,
  StoryNotFoundError,
  StoryTooLargeError,
} from "@/server/stories";

/** Batas aman untuk `baseVersion`/`version` dari client. */
const MAX_VERSION_NUMBER = 1_000_000;

const isStoryId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_STORY_ID_LENGTH;

const isVersionNumber = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= MAX_VERSION_NUMBER;

/** Jalur yang perlu direvalidasi setelah mutasi. */
const revalidateStoryPaths = (storyId: string): void => {
  revalidatePath("/guru");
  revalidatePath(`/guru/materi/${storyId}`);
};

export async function saveStoryDraft(
  input: SaveStoryInput,
): Promise<SaveStoryResult> {
  const { teacherId } = await requireTeacher();

  if (
    input === null ||
    typeof input !== "object" ||
    !isStoryId(input.storyId) ||
    !isVersionNumber(input.baseVersion)
  ) {
    return { ok: false, errors: [STORY_NOT_FOUND_ISSUE] };
  }

  try {
    const result = await saveStoryVersion(await getReadyDb(), {
      teacherId,
      storyId: input.storyId,
      story: input.story,
      expectedVersion: input.baseVersion,
    });

    if (result.ok) revalidateStoryPaths(input.storyId);
    return result;
  } catch (error) {
    if (error instanceof StoryNotFoundError) {
      return { ok: false, errors: [STORY_NOT_FOUND_ISSUE] };
    }
    if (error instanceof StoryTooLargeError) {
      return { ok: false, errors: [STORY_TOO_LARGE_ISSUE] };
    }
    throw error;
  }
}

export async function publishStory(
  input: PublishStoryInput,
): Promise<PublishStoryResult> {
  const { teacherId } = await requireTeacher();

  if (
    input === null ||
    typeof input !== "object" ||
    !isStoryId(input.storyId) ||
    !isVersionNumber(input.version)
  ) {
    return { ok: false, errors: [STORY_NOT_FOUND_ISSUE] };
  }

  try {
    const result = await publishStoryCore(await getReadyDb(), {
      teacherId,
      storyId: input.storyId,
      expectedVersion: input.version,
    });

    if (result.ok) revalidateStoryPaths(input.storyId);
    return result;
  } catch (error) {
    if (error instanceof StoryNotFoundError) {
      return { ok: false, errors: [STORY_NOT_FOUND_ISSUE] };
    }
    throw error;
  }
}

export async function archiveStory(input: {
  storyId: string;
}): Promise<SimpleActionResult> {
  const { teacherId } = await requireTeacher();

  if (
    input === null ||
    typeof input !== "object" ||
    !isStoryId(input.storyId)
  ) {
    return { ok: false };
  }

  try {
    const result = await archiveStoryCore(await getReadyDb(), {
      teacherId,
      storyId: input.storyId,
    });

    if (result.ok) revalidateStoryPaths(input.storyId);
    return result;
  } catch (error) {
    if (error instanceof StoryNotFoundError) return { ok: false };
    throw error;
  }
}

export async function deleteStory(input: {
  storyId: string;
}): Promise<SimpleActionResult> {
  const { teacherId } = await requireTeacher();

  if (
    input === null ||
    typeof input !== "object" ||
    !isStoryId(input.storyId)
  ) {
    return { ok: false };
  }

  try {
    const result = await deleteStoryCore(await getReadyDb(), {
      teacherId,
      storyId: input.storyId,
    });

    if (result.ok) revalidateStoryPaths(input.storyId);
    return result;
  } catch (error) {
    if (error instanceof StoryNotFoundError) return { ok: false };
    throw error;
  }
}
