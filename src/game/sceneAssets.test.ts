import { describe, expect, it } from "vitest";

import { DEMO_STORY } from "@/game/demoStory";
import type { Chapter, Scene, Story } from "@/story/schema";

import {
  collectStoryAssets,
  DEFAULT_BACKGROUND_ID,
  DEFAULT_CHARACTER_ID,
  DEFAULT_MUSIC_ID,
  resolveSceneLook,
} from "./sceneAssets";

describe("resolveSceneLook", () => {
  const chapter = DEMO_STORY.chapters[0]!;

  it("memakai nilai chapter bila scene tidak punya override", () => {
    const scene = chapter.scenes[0]!;
    expect(resolveSceneLook(chapter, scene)).toEqual({
      backgroundId: "bg_classroom_day",
      musicId: "bgm_school_calm",
    });
  });

  it("override scene menang atas chapter", () => {
    const scene = chapter.scenes[0]!;
    const override: Scene = {
      ...scene,
      backgroundId: "bg_river_day",
      musicId: "bgm_ending",
    };

    expect(resolveSceneLook(chapter, override)).toEqual({
      backgroundId: "bg_river_day",
      musicId: "bgm_ending",
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

  it("memuat background chapter, override scene, dan default", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "bg_classroom_day",
        "bg_cloud_sky",
        "bg_river_day",
        "bg_schoolyard_day",
        "bg_mountain_night",
        DEFAULT_BACKGROUND_ID,
      ]),
    );
  });

  it("memuat semua musik chapter, karakter cast, UI, dan SFX runtime", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "bgm_school_calm",
        "bgm_adventure",
        "bgm_ending",
        DEFAULT_MUSIC_ID,
        "char_nara",
        "char_pak_bima",
        "char_tirta",
        DEFAULT_CHARACTER_ID,
        "ui_textbox",
        "ui_portrait_frame",
        "sfx_click",
        "sfx_correct",
        "sfx_wrong",
        "sfx_page",
      ]),
    );
  });

  it("tidak memuat aset yang tidak dipakai cerita", () => {
    // Rani dan perpustakaan tidak ada di cast/chapter cerita demo.
    expect(ids).not.toContain("char_rani");
    expect(ids).not.toContain("bg_library_evening");
  });

  it("karakter membawa portraitPath dari manifest", () => {
    const nara = aset.find((entry) => entry.id === "char_nara");
    expect(nara?.portraitPath).toBe("/assets/portrait/nara.png");
  });

  it("cerita kosong tetap mendapat aset runtime", () => {
    const kosong: Story = { ...DEMO_STORY, cast: [], chapters: [] };
    const runtime = collectStoryAssets(kosong).map((entry) => entry.id);

    expect(runtime).toEqual(
      expect.arrayContaining([
        DEFAULT_BACKGROUND_ID,
        DEFAULT_MUSIC_ID,
        DEFAULT_CHARACTER_ID,
        "ui_textbox",
      ]),
    );
  });
});
