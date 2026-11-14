import { describe, expect, it } from "vitest";

import type { Answer } from "@/story/scoring";
import type { Story } from "@/story/schema";

import { DEMO_STORY } from "./demoStory";
import {
  AWALAN_KUNCI_PROGRES,
  bacaProgres,
  hapusProgres,
  kunciProgres,
  sidikCerita,
  simpanProgres,
  type KursorProgres,
} from "./progress";

/** Storage tiruan: cukup untuk modul ini, dan bisa disuruh gagal. */
function storagePalsu(awal: Record<string, string> = {}) {
  const isi = new Map(Object.entries(awal));
  return {
    isi,
    getItem: (kunci: string) => isi.get(kunci) ?? null,
    setItem: (kunci: string, nilai: string) => {
      isi.set(kunci, nilai);
    },
    removeItem: (kunci: string) => {
      isi.delete(kunci);
    },
  };
}

/** Storage yang menolak semua operasi (mode privat / kuota penuh). */
const storagePenuh = {
  getItem: () => {
    throw new Error("ditolak");
  },
  setItem: () => {
    throw new Error("ditolak");
  },
  removeItem: () => {
    throw new Error("ditolak");
  },
};

const jawaban: Answer = {
  challengeId: DEMO_STORY.challenges[0]!.id,
  type: "short_answer",
  text: "uap air",
};

const kursor: KursorProgres = {
  chapterIndex: 1,
  sceneIndex: 0,
  beatIndex: -1,
  answers: [jawaban],
};

describe("progress", () => {
  it("kunci per cerita, bukan satu kunci bersama", () => {
    expect(kunciProgres("st_a")).toBe(`${AWALAN_KUNCI_PROGRES}st_a`);
    expect(kunciProgres("st_a")).not.toBe(kunciProgres("st_b"));
  });

  it("simpan lalu baca mengembalikan kursor dan jawaban yang sama", () => {
    const storage = storagePalsu();

    const tersimpan = simpanProgres(storage, DEMO_STORY, kursor);
    const hasil = bacaProgres(storage, DEMO_STORY);

    expect(tersimpan).not.toBeNull();
    expect(hasil.status).toBe("siap");
    if (hasil.status !== "siap") return;
    expect(hasil.progres.chapterIndex).toBe(1);
    expect(hasil.progres.sceneIndex).toBe(0);
    expect(hasil.progres.beatIndex).toBe(-1);
    expect(hasil.progres.answers).toEqual([jawaban]);
    expect(hasil.progres.storyId).toBe(DEMO_STORY.meta.id);
    expect(hasil.progres.updatedAt).toBe(tersimpan!.updatedAt);
  });

  it("tanpa simpanan → kosong, bukan error", () => {
    expect(bacaProgres(storagePalsu(), DEMO_STORY)).toEqual({
      status: "kosong",
    });
    expect(bacaProgres(null, DEMO_STORY)).toEqual({ status: "kosong" });
  });

  it("storage yang menolak dibaca dianggap belum ada progres", () => {
    expect(bacaProgres(storagePenuh, DEMO_STORY)).toEqual({ status: "kosong" });
    expect(simpanProgres(storagePenuh, DEMO_STORY, kursor)).toBeNull();
    expect(() => hapusProgres(storagePenuh, DEMO_STORY.meta.id)).not.toThrow();
  });

  it("JSON rusak → kedaluwarsa", () => {
    const storage = storagePalsu({
      [kunciProgres(DEMO_STORY.meta.id)]: "{bukan json",
    });

    expect(bacaProgres(storage, DEMO_STORY)).toEqual({ status: "kedaluwarsa" });
  });

  it("progres milik cerita lain tidak dipakai", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, kursor);

    // Cerita lain punya kunci sendiri, jadi tidak melihat simpanan itu.
    const ceritaLain = {
      ...DEMO_STORY,
      meta: { ...DEMO_STORY.meta, id: "st_lain" },
    } as Story;

    expect(bacaProgres(storage, ceritaLain)).toEqual({ status: "kosong" });
  });

  it("sidik cerita berubah saat isi cerita disunting → kedaluwarsa", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, kursor);

    const bab = DEMO_STORY.chapters[0]!;
    const ceritaDisunting = {
      ...DEMO_STORY,
      chapters: [
        {
          ...bab,
          scenes: [
            { ...bab.scenes[0]!, beats: bab.scenes[0]!.beats.slice(1) },
            ...bab.scenes.slice(1),
          ],
        },
        ...DEMO_STORY.chapters.slice(1),
      ],
    } as Story;

    expect(sidikCerita(ceritaDisunting)).not.toBe(sidikCerita(DEMO_STORY));
    expect(bacaProgres(storage, ceritaDisunting)).toEqual({
      status: "kedaluwarsa",
    });
  });

  it("kursor di luar cerita → kedaluwarsa", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, { ...kursor, chapterIndex: 99 });

    expect(bacaProgres(storage, DEMO_STORY)).toEqual({ status: "kedaluwarsa" });
  });

  it("akhir bab (sceneIndex -1) sah dan dibaca apa adanya", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, {
      chapterIndex: 0,
      sceneIndex: -1,
      beatIndex: -1,
      answers: [],
    });

    const hasil = bacaProgres(storage, DEMO_STORY);
    expect(hasil.status).toBe("siap");
    if (hasil.status !== "siap") return;
    expect(hasil.progres.sceneIndex).toBe(-1);
  });

  it("jawaban berbentuk asing dibuang, bukan membatalkan progres", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, kursor);

    const kunci = kunciProgres(DEMO_STORY.meta.id);
    const mentah = JSON.parse(storage.getItem(kunci)!);
    mentah.answers = [
      { challengeId: DEMO_STORY.challenges[0]!.id, type: "entah", x: 1 },
      jawaban,
    ];
    storage.setItem(kunci, JSON.stringify(mentah));

    const hasil = bacaProgres(storage, DEMO_STORY);
    expect(hasil.status).toBe("siap");
    if (hasil.status !== "siap") return;
    expect(hasil.progres.answers).toEqual([jawaban]);
  });

  it("hapusProgres menghapus simpanan cerita itu saja", () => {
    const storage = storagePalsu();
    simpanProgres(storage, DEMO_STORY, kursor);

    hapusProgres(storage, DEMO_STORY.meta.id);

    expect(storage.isi.size).toBe(0);
    expect(bacaProgres(storage, DEMO_STORY)).toEqual({ status: "kosong" });
  });
});
