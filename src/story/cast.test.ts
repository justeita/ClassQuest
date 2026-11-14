import { describe, expect, it } from "vitest";

import { VILLAGE } from "../game/world/village";
import {
  CAST_EXPERTISE,
  CAST_PLACES,
  FIXED_CAST,
  locationOf,
  MENTOR_ID,
  PLAYER_ID,
} from "./cast";

/**
 * Data prompt harus menutup seluruh cast tetap.
 *
 * `CAST_EXPERTISE` dan `CAST_PLACES` bukan bagian schema cerita, jadi tidak ada
 * validator yang menegur kalau satu tokoh terlewat. Test ini yang menjaga:
 * setiap tokoh tetap punya keahlian dan tepat satu lokasi, dan setiap NPC yang
 * benar-benar dipasang di peta (`village.json`) punya lokasi di blok prompt.
 * Kalau tidak, model bisa mengarang tempat untuk tokoh itu.
 */

const castIds = FIXED_CAST.map((member) => member.id);

describe("data prompt cast", () => {
  it("setiap tokoh tetap punya keahlian", () => {
    for (const id of castIds) {
      expect(CAST_EXPERTISE[id], `${id} tanpa keahlian`).toBeTruthy();
    }
    expect(Object.keys(CAST_EXPERTISE).sort()).toEqual([...castIds].sort());
  });

  it("setiap tokoh tetap punya tepat satu lokasi", () => {
    for (const id of castIds) {
      const tempat = CAST_PLACES.filter((place) => place.members.includes(id));
      expect(tempat, `${id} punya ${tempat.length} lokasi`).toHaveLength(1);
      expect(locationOf(id)).toBe(tempat[0]?.label);
    }
  });

  it("tidak ada lokasi untuk tokoh yang tidak ada di cast", () => {
    const penghuni = CAST_PLACES.flatMap((place) => place.members);
    for (const id of penghuni) {
      expect(castIds).toContain(id);
    }
  });

  it("id tempat unik dan tidak kosong", () => {
    const ids = CAST_PLACES.map((place) => place.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const place of CAST_PLACES) {
      expect(place.id.length).toBeGreaterThan(0);
      expect(place.label.length).toBeGreaterThan(0);
      expect(place.note.length).toBeGreaterThan(0);
      expect(place.members.length).toBeGreaterThan(0);
    }
  });

  it("setiap NPC di peta punya lokasi di prompt", () => {
    for (const npc of VILLAGE.npcs) {
      expect(locationOf(npc.id), `${npc.id} tidak punya lokasi`).toBeTruthy();
    }
  });

  it("pemain dan mentor tetap dikenali", () => {
    expect(locationOf(PLAYER_ID)).toBeTruthy();
    expect(locationOf(MENTOR_ID)).toBeTruthy();
  });
});
