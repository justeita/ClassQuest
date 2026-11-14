import { describe, expect, it } from "vitest";

import type { Beat, Scene } from "@/story/schema";

import { sceneMelibatkanPemain } from "./potret";

const MC = "char_mc";

function scene(beats: Beat[]): Scene {
  return { id: "sc_uji", beats };
}

describe("sceneMelibatkanPemain", () => {
  it("benar saat MC mendapat beat dialog", () => {
    const panggung = scene([
      { type: "dialogue", speakerId: "char_npc_1", text: "Halo." },
      { type: "dialogue", speakerId: MC, text: "Halo juga." },
      { type: "narration", text: "Mereka tersenyum." },
    ]);

    expect(sceneMelibatkanPemain(panggung, MC)).toBe(true);
  });

  it("benar saat MC hanya muncul di beat narasi", () => {
    const panggung = scene([
      { type: "dialogue", speakerId: "char_npc_1", text: "Hmm." },
      { type: "narration", speakerId: MC, text: "Aku mengangguk." },
      { type: "narration", text: "Angin bertiup." },
    ]);

    expect(sceneMelibatkanPemain(panggung, MC)).toBe(true);
  });

  it("salah untuk dialog antar-NPC tanpa giliran pemain", () => {
    const panggung = scene([
      { type: "dialogue", speakerId: "char_npc_1", text: "Halo." },
      { type: "dialogue", speakerId: "char_npc_3", text: "Hai." },
      { type: "narration", text: "Mereka berbisik." },
    ]);

    expect(sceneMelibatkanPemain(panggung, MC)).toBe(false);
  });

  it("salah untuk scene kosong, tantangan saja, atau tanpa id pemain", () => {
    const tantangan = scene([
      { type: "challenge", challengeId: "chl_uji" },
      { type: "transition", effect: "fade" },
      { type: "narration", text: "Selesai." },
    ]);

    expect(sceneMelibatkanPemain(null, MC)).toBe(false);
    expect(sceneMelibatkanPemain(undefined, MC)).toBe(false);
    expect(sceneMelibatkanPemain(tantangan, MC)).toBe(false);
    expect(sceneMelibatkanPemain(tantangan, "")).toBe(false);
  });
});
