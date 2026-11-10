import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "./demoStory";
import { buildQuestState, judulQuest, pilihPemberiQuest } from "./questLog";
import type { StoryRunnerState } from "./StoryRunner";

const chapter = DEMO_STORY.chapters[0]!;
const sceneAwal = chapter.scenes[0]!;

function stateDari(overrides: Partial<StoryRunnerState>): StoryRunnerState {
  return {
    phase: "explore",
    chapterIndex: 0,
    sceneIndex: 0,
    beatIndex: -1,
    beat: null,
    chapter,
    chapterNumber: 1,
    chapterTotal: DEMO_STORY.chapters.length,
    ...overrides,
  };
}

const tidakAdaJawaban = () => false;

describe("buildQuestState", () => {
  it("menandai scene pertama aktif dan sisanya terkunci", () => {
    const view = buildQuestState(DEMO_STORY, stateDari({}), tidakAdaJawaban);

    expect(view).not.toBeNull();
    expect(view!.activeQuestId).toBe("sc_01_01");
    expect(view!.quests.map((quest) => quest.status)).toEqual([
      "aktif",
      "terkunci",
      "terkunci",
    ]);
    expect(view!.sceneTitle).toBe(sceneAwal.title);
  });

  it("scene sebelumnya selesai dan tantangan yang dijawab terhitung", () => {
    const adalahJawaban = (id: string) => id === "chl_01_01";
    const view = buildQuestState(
      DEMO_STORY,
      stateDari({ sceneIndex: 1, beatIndex: 0, phase: "challenge" }),
      adalahJawaban,
    );

    expect(view!.activeQuestId).toBe("sc_01_02");
    expect(view!.quests[0]!.status).toBe("selesai");
    expect(view!.quests[1]!.status).toBe("aktif");
    expect(view!.quests[1]!.tantangan).toEqual({ total: 1, dijawab: 1 });
    expect(view!.quests[2]!.status).toBe("terkunci");
  });

  it("akhir bab menandai semua quest selesai tanpa quest aktif", () => {
    const view = buildQuestState(
      DEMO_STORY,
      stateDari({ phase: "chapter_end", sceneIndex: -1, beatIndex: -1 }),
      tidakAdaJawaban,
    );

    expect(view!.activeQuestId).toBeNull();
    expect(view!.quests.every((quest) => quest.status === "selesai")).toBe(
      true,
    );
  });

  it("tidak memberi quest saat cerita selesai", () => {
    const view = buildQuestState(
      DEMO_STORY,
      stateDari({
        phase: "done",
        chapter: null,
        sceneIndex: -1,
        beatIndex: -1,
      }),
      tidakAdaJawaban,
    );

    expect(view).toBeNull();
  });
});

describe("judulQuest", () => {
  it("memakai judul scene bila ada", () => {
    expect(judulQuest(sceneAwal, chapter)).toBe(sceneAwal.title);
  });

  it("jatuh ke judul chapter bila scene tanpa judul", () => {
    const tanpaJudul = { ...sceneAwal, title: "" };
    expect(judulQuest(tanpaJudul, chapter)).toBe(chapter.title);
  });
});

describe("pilihPemberiQuest", () => {
  const npcs = [{ id: "char_pak_bima" }, { id: "char_tirta" }];

  it("memilih pembicara dialog pertama yang hadir di ruangan", () => {
    expect(pilihPemberiQuest(sceneAwal, npcs)).toBe("char_pak_bima");
  });

  it("jatuh ke NPC pertama bila pembicara tidak ada di ruangan", () => {
    const hanyaTirta = [{ id: "char_tirta" }];
    // Scene pertama dibuka Pak Bima, tetapi ia tidak ada di ruangan ini.
    expect(pilihPemberiQuest(sceneAwal, hanyaTirta)).toBe("char_tirta");
  });

  it("jatuh ke NPC pertama saat scene kosong", () => {
    expect(pilihPemberiQuest(null, npcs)).toBe("char_pak_bima");
  });

  it("mengembalikan null bila ruangan tidak punya NPC", () => {
    expect(pilihPemberiQuest(sceneAwal, [])).toBeNull();
  });
});
