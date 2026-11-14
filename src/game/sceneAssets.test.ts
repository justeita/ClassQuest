import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import { EXPRESSIONS } from "@/story/expression";
import type { Chapter, Scene, Story } from "@/story/schema";

import {
  collectStoryAssets,
  DEFAULT_BACKGROUND_ID,
  DEFAULT_MUSIC_ID,
  GAMEPLAY_MUSIC_IDS,
  musikSesiBerikutnya,
  pilihMusikAcak,
  resolveSceneLook,
} from "./sceneAssets";

describe("resolveSceneLook", () => {
  const chapter = DEMO_STORY.chapters[0]!;

  it("memakai nilai chapter bila scene tidak punya override", () => {
    const scene = chapter.scenes[0]!;
    expect(resolveSceneLook(chapter, scene)).toEqual({
      backgroundId: "bg_default",
      musicId: "bgm_default",
    });
  });

  it("override scene menang atas chapter", () => {
    const scene = chapter.scenes[0]!;
    // Id contoh: `resolveSceneLook` murni dan tidak memeriksa manifest, jadi tes
    // ini bisa memakai nilai apa pun untuk membuktikan urutan prioritas.
    const override: Scene = {
      ...scene,
      backgroundId: "bg_contoh",
      musicId: "bgm_contoh",
    };

    expect(resolveSceneLook(chapter, override)).toEqual({
      backgroundId: "bg_contoh",
      musicId: "bgm_contoh",
    });
  });

  it("jatuh ke default hanya saat nilai chapter juga kosong", () => {
    const tanpaAset = {
      ...chapter,
      backgroundId: undefined,
      musicId: undefined,
    } as unknown as Chapter;

    expect(resolveSceneLook(tanpaAset, null)).toEqual({
      backgroundId: DEFAULT_BACKGROUND_ID,
      musicId: DEFAULT_MUSIC_ID,
    });
  });
});

describe("pilihMusikAcak", () => {
  it("selalu mengembalikan track dari daftar permainan", () => {
    for (const nilai of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(GAMEPLAY_MUSIC_IDS).toContain(pilihMusikAcak(() => nilai));
    }
  });

  it("memetakan angka acak ke track pertama dan terakhir", () => {
    expect(pilihMusikAcak(() => 0)).toBe(GAMEPLAY_MUSIC_IDS[0]);
    expect(pilihMusikAcak(() => 0.999)).toBe(
      GAMEPLAY_MUSIC_IDS[GAMEPLAY_MUSIC_IDS.length - 1],
    );
  });

  it("menjepit angka di luar rentang dan tetap aman untuk daftar kosong", () => {
    expect(pilihMusikAcak(() => -1)).toBe(GAMEPLAY_MUSIC_IDS[0]);
    expect(pilihMusikAcak(() => 1)).toBe(
      GAMEPLAY_MUSIC_IDS[GAMEPLAY_MUSIC_IDS.length - 1],
    );
    expect(pilihMusikAcak(() => Number.NaN)).toBe(GAMEPLAY_MUSIC_IDS[0]);
    expect(pilihMusikAcak(() => 0.5, [])).toBe(DEFAULT_MUSIC_ID);
  });

  it("berisi dua BGM termasuk track runtime", () => {
    expect(GAMEPLAY_MUSIC_IDS).toHaveLength(2);
    expect(GAMEPLAY_MUSIC_IDS).toContain(DEFAULT_MUSIC_ID);
    expect(GAMEPLAY_MUSIC_IDS).toContain("bgm_vellore");
  });
});

describe("musikSesiBerikutnya", () => {
  it("bergantian antara dua track lalu kembali ke pilihan awal", () => {
    const [pertama, kedua] = GAMEPLAY_MUSIC_IDS;

    expect(musikSesiBerikutnya(pertama!)).toBe(kedua);
    expect(musikSesiBerikutnya(kedua!)).toBe(pertama);
  });

  it("mengikuti urutan pool dan berputar di ujung", () => {
    const pool = ["a", "b", "c"];

    expect(musikSesiBerikutnya("a", pool)).toBe("b");
    expect(musikSesiBerikutnya("b", pool)).toBe("c");
    expect(musikSesiBerikutnya("c", pool)).toBe("a");
  });

  it("memulai dari track pertama untuk id di luar pool", () => {
    expect(musikSesiBerikutnya("bgm_override")).toBe(GAMEPLAY_MUSIC_IDS[0]);
  });

  it("aman untuk daftar kosong", () => {
    expect(musikSesiBerikutnya("bgm_default", [])).toBe(DEFAULT_MUSIC_ID);
  });
});

describe("collectStoryAssets", () => {
  const aset = collectStoryAssets(DEMO_STORY);
  const ids = aset.map((entry) => entry.id);

  it("tidak menghasilkan id ganda", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("memuat background dan musik chapter beserta default", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "bg_default",
        DEFAULT_BACKGROUND_ID,
        "bgm_default",
        DEFAULT_MUSIC_ID,
      ]),
    );
  });

  it("memuat kedua track musik permainan walau cerita hanya menyebut default", () => {
    expect(
      DEMO_STORY.chapters.some((chapter) => chapter.musicId === "bgm_vellore"),
    ).toBe(false);
    expect(ids).toEqual(expect.arrayContaining([...GAMEPLAY_MUSIC_IDS]));
  });

  it("memuat semua karakter cast dan SFX runtime", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "char_mc",
        "char_npc_1",
        "char_npc_3",
        "char_npc_4",
        "char_npc_5",
        "char_npc_6",
        "char_npc_7",
        "char_npc_8",
        "char_npc_9",
        "char_npc_10",
        "sfx_click",
        "sfx_correct",
        "sfx_wrong",
        "sfx_page",
      ]),
    );
  });

  it("tidak memuat aset dunia yang tidak dirujuk cerita", () => {
    // Peta desa dan potongan objeknya milik sisi game, bukan kontrak cerita.
    expect(ids).not.toContain("world_map_village");
    expect(ids.some((id) => id.startsWith("world_"))).toBe(false);
    expect(ids).not.toContain("char_npc_2");
  });

  it("karakter membawa potret lengkap dari manifest", () => {
    const mc = aset.find((entry) => entry.id === "char_mc");
    expect(Object.keys(mc?.portraits ?? {})).toHaveLength(EXPRESSIONS.length);
    expect(mc?.portraits?.happy).toBe("/assets/portrait/mc/happy.png");
  });

  it("cerita kosong tetap mendapat aset runtime", () => {
    const kosong: Story = { ...DEMO_STORY, cast: [], chapters: [] };
    const runtime = collectStoryAssets(kosong).map((entry) => entry.id);

    expect(runtime).toEqual(
      expect.arrayContaining([
        DEFAULT_BACKGROUND_ID,
        DEFAULT_MUSIC_ID,
        "sfx_click",
      ]),
    );
  });
});
