import { describe, expect, it } from "vitest";

import {
  FONT_GAME_FALLBACK,
  FONT_GAME_KELUARGA,
  fontGame,
  KELAS_FONT_GAME,
} from "./font";

describe("fontGame", () => {
  it("memakai font handwriting lokal sebagai keluarga pertama", () => {
    expect(FONT_GAME_KELUARGA).toBe("Patrick Hand");
    expect(fontGame().startsWith(`"${FONT_GAME_KELUARGA}"`)).toBe(true);
    expect(fontGame()).toBe(FONT_GAME_FALLBACK);
  });

  it("menyediakan fallback sans sistem, bukan monospace", () => {
    expect(fontGame().toLowerCase()).toContain("system-ui");
    expect(fontGame().toLowerCase()).not.toContain("monospace");
  });

  it("kelas DOM menunjuk utility font game", () => {
    expect(KELAS_FONT_GAME).toBe("font-game");
  });
});
