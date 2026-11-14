import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_STORY } from "./demoStory";
import { hapusProgres, simpanProgres, type KursorProgres } from "./progress";
import {
  bacaKursorProgres,
  kabariProgres,
  langgananProgres,
} from "./progressStore";

const kursor: KursorProgres = {
  chapterIndex: 1,
  sceneIndex: 0,
  beatIndex: -1,
  answers: [
    {
      challengeId: DEMO_STORY.challenges[0]!.id,
      type: "multiple_choice",
      selectedId: "opsi_a",
    },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("progressStore", () => {
  it("null saat belum ada progres", () => {
    expect(bacaKursorProgres(DEMO_STORY)).toBeNull();
  });

  it("snapshot stabil antar-render selama isi storage tidak berubah", () => {
    simpanProgres(window.localStorage, DEMO_STORY, kursor);

    const pertama = bacaKursorProgres(DEMO_STORY);
    const kedua = bacaKursorProgres(DEMO_STORY);

    // `useSyncExternalStore` membandingkan identitas: objek baru tiap render
    // akan memicu render tak berujung.
    expect(kedua).toBe(pertama);
    expect(pertama).toEqual(kursor);
  });

  it("membaca isi terbaru setelah kabariProgres", () => {
    expect(bacaKursorProgres(DEMO_STORY)).toBeNull();

    simpanProgres(window.localStorage, DEMO_STORY, kursor);
    kabariProgres();

    expect(bacaKursorProgres(DEMO_STORY)).toEqual(kursor);

    hapusProgres(window.localStorage, DEMO_STORY.meta.id);
    kabariProgres();

    expect(bacaKursorProgres(DEMO_STORY)).toBeNull();
  });

  it("kabariProgres memanggil setiap pelanggan sampai dilepas", () => {
    const pendengar = vi.fn();
    const lepas = langgananProgres(pendengar);

    kabariProgres();
    expect(pendengar).toHaveBeenCalledTimes(1);

    lepas();
    kabariProgres();
    expect(pendengar).toHaveBeenCalledTimes(1);
  });

  it("simpanan kedaluwarsa dibaca sebagai null, bukan error", () => {
    window.localStorage.setItem(
      `classquest:progress:${DEMO_STORY.meta.id}`,
      "{bukan json",
    );

    expect(bacaKursorProgres(DEMO_STORY)).toBeNull();
  });
});
