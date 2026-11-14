import type { Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

/**
 * Progres main siswa di `localStorage` (docs/04-game/interaction-loop.md →
 * Progres dan resume).
 *
 * Yang disimpan hanya **kursor cerita** (bab/scene/beat) dan jawaban percobaan
 * pertama, bukan posisi piksel pemain: peta desa sama untuk semua scene, dan
 * resume selalu membuka **awal scene** tempat beat terakhir — bukan tengah beat.
 * Dengan begitu refresh tidak pernah memunculkan soal yang sudah dijawab di
 * tengah kalimat.
 *
 * `storyVersion` adalah sidik isi cerita, bukan nomor versi database: cerita
 * yang disunting guru membuat kursor lama tidak lagi bermakna, jadi progres
 * dibuang dan siswa mulai dari awal (docs/04-game/interaction-loop.md).
 *
 * Modul ini murni: storage disuntik dari luar supaya bisa dites di jsdom, dan
 * kegagalan storage (penuh, ditolak, JSON rusak) tidak pernah menghentikan
 * permainan.
 */

/** Posisi cerita + jawaban; bagian yang bergerak selama bermain. */
export type KursorProgres = {
  /** Indeks bab 0-based. */
  chapterIndex: number;
  /** Indeks scene 0-based; -1 berarti bab sudah selesai (menunggu bab baru). */
  sceneIndex: number;
  /** Indeks beat 0-based; -1 berarti scene baru dibuka dalam fase explore. */
  beatIndex: number;
  /** Jawaban percobaan pertama, urut kemunculan. */
  answers: Answer[];
};

/** Bentuk yang ditulis ke storage, sesuai `PlayProgress` di docs. */
export type ProgresMain = KursorProgres & {
  storyId: string;
  /** Sidik isi cerita; beda berarti cerita sudah berubah. */
  storyVersion: string;
  /** Waktu simpan terakhir (ISO 8601), untuk diagnosis. */
  updatedAt: string;
};

/**
 * Hasil membaca storage:
 * - `kosong` — belum ada simpanan (atau storage tidak bisa dibaca).
 * - `kedaluwarsa` — ada simpanan tetapi rusak / milik cerita lain / dibuat
 *   untuk versi cerita yang berbeda. Pemanggil menghapusnya.
 * - `siap` — simpanan sah dan cocok dengan cerita yang sedang dimainkan.
 */
export type HasilBacaProgres =
  | { status: "kosong" }
  | { status: "kedaluwarsa" }
  | { status: "siap"; progres: ProgresMain };

export const AWALAN_KUNCI_PROGRES = "classquest:progress:";

type Penyimpanan = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Kunci per cerita: satu cerita tidak boleh menimpa progres cerita lain. */
export function kunciProgres(storyId: string): string {
  return `${AWALAN_KUNCI_PROGRES}${storyId}`;
}

/** Sidik jari FNV-1a 32-bit: stabil lintas browser dan Node, tanpa `crypto`. */
function sidikJari(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Sidik isi cerita yang relevan untuk kursor: id dan panjang bagian, bukan
 * seluruh teks. Cukup untuk menolak progres dari cerita yang sudah disunting
 * (scene ditambah/dihapus/diurutkan ulang), tanpa menyalin isi cerita ke
 * `localStorage`.
 */
export function sidikCerita(story: Story): string {
  const bagian = story.chapters.map((chapter) =>
    [
      chapter.id,
      chapter.scenes
        .map((scene) => `${scene.id}:${scene.beats.length}`)
        .join(","),
    ].join(">"),
  );
  return sidikJari(
    [
      story.schemaVersion,
      story.meta.id,
      ...bagian,
      story.challenges.map((challenge) => challenge.id).join(","),
    ].join("|"),
  );
}

function bilanganBulat(nilai: unknown): nilai is number {
  return typeof nilai === "number" && Number.isInteger(nilai);
}

/** Apakah kursor menunjuk posisi yang benar-benar ada di cerita ini. */
function kursorSah(kursor: KursorProgres, story: Story): boolean {
  const { chapterIndex, sceneIndex, beatIndex } = kursor;
  const chapter = story.chapters[chapterIndex];
  if (!bilanganBulat(chapterIndex) || !chapter) return false;
  if (!bilanganBulat(sceneIndex)) return false;
  if (!bilanganBulat(beatIndex)) return false;

  // `sceneIndex` -1 = akhir bab; `beatIndex` harus -1 karena belum di scene.
  if (sceneIndex === -1) return beatIndex === -1;
  const scene = chapter.scenes[sceneIndex];
  if (!scene) return false;
  // `beatIndex` -1 = scene baru dibuka (explore); selain itu harus di dalam
  // deretan beat scene tersebut.
  return beatIndex >= -1 && beatIndex < scene.beats.length;
}

/**
 * Jawaban hanya diterima bila bentuknya dikenal dan tantangannya ada di cerita
 * ini. Butir yang tidak sah dibuang, bukan membuat seluruh progres gugur.
 */
function jawabanSah(nilai: unknown, story: Story): Answer | null {
  if (typeof nilai !== "object" || nilai === null) return null;
  const kandidat = nilai as Record<string, unknown>;
  if (typeof kandidat.challengeId !== "string") return null;
  if (!story.challenges.some((c) => c.id === kandidat.challengeId)) return null;

  switch (kandidat.type) {
    case "multiple_choice":
      return typeof kandidat.selectedId === "string"
        ? {
            challengeId: kandidat.challengeId,
            type: "multiple_choice",
            selectedId: kandidat.selectedId,
          }
        : null;
    case "true_false":
      return typeof kandidat.answer === "boolean"
        ? {
            challengeId: kandidat.challengeId,
            type: "true_false",
            answer: kandidat.answer,
          }
        : null;
    case "ordering":
      return Array.isArray(kandidat.order) &&
        kandidat.order.every((id) => typeof id === "string")
        ? {
            challengeId: kandidat.challengeId,
            type: "ordering",
            order: kandidat.order as string[],
          }
        : null;
    case "short_answer":
      return typeof kandidat.text === "string"
        ? {
            challengeId: kandidat.challengeId,
            type: "short_answer",
            text: kandidat.text,
          }
        : null;
    default:
      return null;
  }
}

/** Ubah isi storage menjadi `ProgresMain`, atau `null` bila tidak bisa dipakai. */
function validasiProgres(nilai: unknown, story: Story): ProgresMain | null {
  if (typeof nilai !== "object" || nilai === null) return null;
  const kandidat = nilai as Record<string, unknown>;

  if (kandidat.storyId !== story.meta.id) return null;
  if (kandidat.storyVersion !== sidikCerita(story)) return null;
  if (typeof kandidat.updatedAt !== "string") return null;
  if (!Array.isArray(kandidat.answers)) return null;

  const kursor: KursorProgres = {
    chapterIndex: kandidat.chapterIndex as number,
    sceneIndex: kandidat.sceneIndex as number,
    beatIndex: kandidat.beatIndex as number,
    answers: kandidat.answers
      .map((jawaban) => jawabanSah(jawaban, story))
      .filter((jawaban): jawaban is Answer => jawaban !== null),
  };
  if (!kursorSah(kursor, story)) return null;

  return {
    ...kursor,
    storyId: story.meta.id,
    storyVersion: kandidat.storyVersion,
    updatedAt: kandidat.updatedAt,
  };
}

/**
 * Baca progres cerita ini. Kegagalan storage diperlakukan sebagai "belum ada
 * progres", bukan error: siswa tetap bisa main dari awal.
 */
export function bacaProgres(
  storage: Penyimpanan | null | undefined,
  story: Story,
): HasilBacaProgres {
  if (!storage) return { status: "kosong" };

  let mentah: string | null;
  try {
    mentah = storage.getItem(kunciProgres(story.meta.id));
  } catch {
    return { status: "kosong" };
  }
  if (!mentah) return { status: "kosong" };

  let data: unknown;
  try {
    data = JSON.parse(mentah);
  } catch {
    return { status: "kedaluwarsa" };
  }

  const progres = validasiProgres(data, story);
  return progres === null
    ? { status: "kedaluwarsa" }
    : { status: "siap", progres };
}

/**
 * Tulis progres. Mengembalikan progres yang tersimpan, atau `null` bila storage
 * menolak (penuh / mode privat) — pemanggil boleh lanjut tanpa memberi tahu
 * berulang kali.
 */
export function simpanProgres(
  storage: Penyimpanan | null | undefined,
  story: Story,
  kursor: KursorProgres,
): ProgresMain | null {
  const progres: ProgresMain = {
    ...kursor,
    storyId: story.meta.id,
    storyVersion: sidikCerita(story),
    updatedAt: new Date().toISOString(),
  };
  if (!storage) return null;

  try {
    storage.setItem(kunciProgres(story.meta.id), JSON.stringify(progres));
  } catch {
    return null;
  }
  return progres;
}

/** Hapus progres satu cerita (selesai main, atau simpanan kedaluwarsa). */
export function hapusProgres(
  storage: Penyimpanan | null | undefined,
  storyId: string,
): void {
  if (!storage) return;
  try {
    storage.removeItem(kunciProgres(storyId));
  } catch {
    // Storage ditolak: tidak ada yang bisa dilakukan, dan permainan berjalan
    // tanpa simpanan.
  }
}
