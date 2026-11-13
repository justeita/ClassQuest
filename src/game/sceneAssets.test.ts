import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import type { Chapter, Scene, Story } from "@/story/schema";

import {
  collectStoryAssets,
  DEFAULT_BACKGROUND_ID,
  DEFAULT_MUSIC_ID,
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

  it("memuat semua karakter cast, UI, dan SFX runtime", () => {
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
        "ui_textbox",
        "ui_portrait_frame",
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

  it("karakter membawa portraitPath dari manifest", () => {
    const mc = aset.find((entry) => entry.id === "char_mc");
    expect(mc?.portraitPath).toBe("/assets/portrait/mc.png");
  });

  it("cerita kosong tetap mendapat aset runtime", () => {
    const kosong: Story = { ...DEMO_STORY, cast: [], chapters: [] };
    const runtime = collectStoryAssets(kosong).map((entry) => entry.id);

    expect(runtime).toEqual(
      expect.arrayContaining([
        DEFAULT_BACKGROUND_ID,
        DEFAULT_MUSIC_ID,
        "ui_textbox",
      ]),
    );
  });
});
